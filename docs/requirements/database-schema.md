# MACReporting Database Schema Specification

## Purpose

This document defines the proposed production database structure for MACReporting.

It translates the approved UML data model into a database-focused specification that can later be implemented in the selected production relational database.

The final database platform is pending confirmation of the production hosting environment. The schema design should remain portable across PostgreSQL and MySQL/MariaDB where practical.

---

# 1. Database Design Principles

The production database should support:

- Multi-user access
- Role-based permissions
- Committee-level access
- Historical reporting
- Report Template versioning
- Question versioning
- Report locking/finalization
- Image and attachment metadata
- PDF generation
- Excel export
- Future Phase 2 reporting and analytics

The database should preserve historical meaning.

Existing Report data must not silently change because:

- A Question was edited
- A Committee Chair changed
- A User's role changed
- A Report Template was updated
- Committee membership changed
- A Report was later locked

Historical records should remain tied to the values, versions, and relationships that were valid when the Report was created or answered.

Dates should use the `YYYY-MM-DD` format where applicable.

---

# 2. User

## Purpose

The `User` entity represents an individual who can access MACReporting.

Users are identified through their unique individual email address.

Email identifies the person for authentication purposes but is not the database primary key.

## Proposed Fields

| Field | Purpose |
|---|---|
| `user_id` | Primary key |
| `first_name` | User first name |
| `last_name` | User last name |
| `email` | Unique individual email address |
| `active` | Indicates whether the User currently has application access |

## Key Rules

- `user_id` is the primary key.
- `email` must be unique.
- Email should not be used as the primary key.
- Users referenced by historical data should normally be deactivated rather than deleted.
- A User may have multiple chapter-wide Roles over time.
- A User may belong to multiple Committees.
- A User may have different responsibilities in different Committees.

## Relationships

```text
User 1 -> Many UserRole

User 1 -> Many UserCommittee

User 1 -> Many Report

User 1 -> Many Answer
         through answered_by

User 1 -> Many Attachment
         through uploaded_by
```

## Historical Data Consideration

If a User leaves, changes email address, or no longer requires MACReporting access, historical Reports, Answers, Attachments, and assignments must continue to retain their original User relationships.

Users referenced by historical records should therefore not normally be physically deleted.

---

# 3. UserRole

## Purpose

The `UserRole` entity represents chapter-wide application roles assigned to a User.

These roles determine permissions that apply across MACReporting rather than within a single Committee.

Examples include:

- President
- VP1
- VP2
- Technology Chair

## Proposed Fields

| Field | Purpose |
|---|---|
| `user_role_id` | Primary key |
| `user_id` | Foreign key to User |
| `role` | Name/code of the assigned chapter-wide role |
| `effective_start_date` | Date the role becomes effective |
| `effective_end_date` | Date the role ends; null while current |
| `active` | Indicates whether the assignment is currently active |

## Key Rules

- `user_role_id` is the primary key.
- `user_id` references `User.user_id`.
- A User may have more than one Role over time.
- Role history must be retained.
- Ending a Role should not delete the historical assignment.
- `effective_end_date` may be null for a current assignment.
- Role changes must not alter historical Report information.

## Relationships

```text
User 1 -> Many UserRole
```

## Access Considerations

The following Roles are currently expected to have elevated application access:

- President
- VP1
- VP2
- Technology Chair

These Users may:

- View Reports across all Committees
- Create and update Reports as authorized
- Access administrative functionality
- Lock Reports
- Unlock Reports
- Place Reports into final/read-only status
- Manage Report Templates where authorized

Exact permissions must be enforced by the application authorization layer rather than only by frontend controls.

## Historical Data Consideration

Leadership Roles may change annually, biannually, or at other times when necessary.

MACReporting must retain the dates during which a User held a particular Role rather than replacing previous assignments.

---

# 4. Committee

## Purpose

The `Committee` entity represents a Committee participating in the MACReporting reporting process.

Reports, User assignments, and Committee-specific permissions are associated with a Committee.

## Proposed Fields

| Field | Purpose |
|---|---|
| `committee_id` | Primary key |
| `committee_name` | Name of the Committee |
| `active` | Indicates whether the Committee is currently active |

## Key Rules

- `committee_id` is the primary key.
- Committee names should be unique where appropriate.
- Committees referenced by historical Reports should normally be deactivated rather than deleted.
- A Committee may have many Users through `UserCommittee`.
- A Committee may have many Reports.
- Committee leadership may change over time.

## Relationships

```text
Committee 1 -> Many UserCommittee

Committee 1 -> Many Report
```

## Historical Data Consideration

Committee membership or leadership may change while historical Reports remain.

Those changes must not alter or remove historical Report relationships.

---

# 5. UserCommittee

## Purpose

The `UserCommittee` entity associates Users with Committees and identifies the User's role within that Committee.

This allows a User to participate in multiple Committees while having different responsibilities in each.

For example, the same User may be:

- Chair of Committee A
- Member of Committee B
- Member of Committee C

## Proposed Fields

| Field | Purpose |
|---|---|
| `user_committee_id` | Primary key |
| `user_id` | Foreign key to User |
| `committee_id` | Foreign key to Committee |
| `committee_role` | User's role within the Committee |
| `effective_start_date` | Date the assignment begins |
| `effective_end_date` | Date the assignment ends; null while current |
| `active` | Indicates whether the assignment is currently active |

## Key Rules

- `user_committee_id` is the primary key.
- `user_id` references `User.user_id`.
- `committee_id` references `Committee.committee_id`.
- A User may belong to multiple Committees.
- A Committee may contain multiple Users.
- A User's role may differ by Committee.
- Committee assignments must preserve historical effective dates.
- Ending an assignment should not delete its historical record.

## Relationships

```text
User      1 -> Many UserCommittee

Committee 1 -> Many UserCommittee
```

Together these relationships create:

```text
User Many <-> Many Committee
          through
      UserCommittee
```

## Committee Roles

Initial Committee-level roles include:

- Committee Chair
- Committee Member

Additional Committee roles may be introduced later if required.

## Access Considerations

A current Committee Chair should have elevated permissions for the Committee they chair.

A Committee Member may access Reports associated with Committees to which they are assigned, subject to the final authorization rules.

For the current access model:

- Chair: create/update Reports for the Committee they chair.
- Other Committee Reports: view-only where permitted.
- Elevated chapter Roles: broader access across Committees.

Email identifies **who the User is**.

`UserCommittee` determines **which Committee the User belongs to and what responsibility they have there**.

## Historical Data Consideration

Committee assignments must be preserved rather than overwritten so the system can determine historical membership and leadership.

---

# 6. ReportTemplate

## Purpose

The `ReportTemplate` entity represents the master identity of a Report Template.

It defines the type of Report available in MACReporting but does not store the exact historical composition of Questions used by a specific version.

Initial Report Templates include:

- Committee Report
- Post-Mortem Report

## Proposed Fields

| Field | Purpose |
|---|---|
| `report_template_id` | Primary key |
| `name` | Name of the Report Template |
| `description` | Description of the Template |
| `active` | Indicates whether the Template is currently available |

## Key Rules

- `report_template_id` is the primary key.
- A Report Template may have many versions.
- The master Template record remains stable when Template composition changes.
- Historical Template versions are stored separately in `ReportTemplateVersion`.
- Templates referenced by historical Reports should normally be deactivated rather than deleted.

## Relationships

```text
ReportTemplate 1 -> Many ReportTemplateVersion
```

## Historical Data Consideration

Changes to the structure of a Template must not overwrite historical Template configurations.

Instead, MACReporting creates a new `ReportTemplateVersion`.

Example:

```text
ReportTemplate
-------------------------
report_template_id: 1
name: Committee Report

ReportTemplateVersion
-------------------------
Version 1
Version 2
Version 3
```

All versions belong to the same logical Report Template.

---

# 7. Question

## Purpose

The `Question` entity represents the master identity of a logical Question.

The master Question remains stable while wording, type, and other version-specific properties are stored separately in `QuestionVersion`.

## Proposed Fields

| Field | Purpose |
|---|---|
| `question_id` | Primary key |
| `question_code` | Stable logical identifier/code for the Question |
| `active` | Indicates whether the logical Question is currently active |

## Key Rules

- `question_id` is the primary key.
- `question_code` should identify the logical Question consistently over time.
- The master Question should not be overwritten when wording changes.
- Wording/type changes are handled through `QuestionVersion`.
- A Question may have many versions.
- Questions referenced historically should normally be deactivated rather than deleted.

## Relationships

```text
Question 1 -> Many QuestionVersion
```

## Historical Data Consideration

Example:

```text
Question
-------------------------
question_id: 17
question_code: PROGRAM_ATTENDANCE

QuestionVersion
-------------------------
Version 1
Version 2
Version 3
```

This stable identity also supports future analytics across different versions of the same logical Question.

---

# 8. QuestionVersion

## Purpose

The `QuestionVersion` entity stores the exact wording and type of a Question at a specific point in time.

Question versions become immutable once used by a Report Template version.

## Proposed Fields

| Field | Purpose |
|---|---|
| `question_id` | Foreign key to Question and part of composite primary key |
| `version` | Version number and part of composite primary key |
| `question_text` | Exact wording displayed to the User |
| `question_type` | Type of response expected |
| `created_by` | Foreign key to User who created the Question version |
| `created_at` | Date/time the Question version was created |
| `active` | Indicates whether this Question version is currently active |

## Primary Key

```text
question_id + version
```

Example:

```text
question_id = 17, version = 1
question_id = 17, version = 2
```

## Question Types

Initial Question types may include:

- text
- textarea
- number
- date
- currency
- dropdown
- checkbox

Additional types may be added if future requirements require them.

File/image uploads are handled through `Attachment` rather than being stored as Answer values.

## Key Rules

- Existing Question versions must not be overwritten after use.
- A change to Question wording or type creates a new version.
- Previous versions remain available for historical reporting.
- Only appropriate/current versions should be available for new Template configuration.
- `created_by` identifies who created the version.
- `created_at` records when the version was introduced.

## Relationships

```text
Question 1 -> Many QuestionVersion

QuestionVersion 1 -> Many ReportQuestion

QuestionVersion 1 -> Many Answer
```

## Versioning Example

Version 1:

```text
Question ID: 17
Version: 1
"How many people attended the program?"
```

Later:

```text
Question ID: 17
Version: 2
"How many unique attendees participated?"
```

Version 1 remains intact for historical Reports.

New Template versions may use Version 2.

---

# 9. ReportQuestion

## Purpose

The `ReportQuestion` entity associates a specific Report Template version with a specific Question version.

It defines the exact Questions that make up a particular Template version and controls their placement and requirements.

## Proposed Fields

| Field | Purpose |
|---|---|
| `report_template_id` | Foreign key to ReportTemplateVersion |
| `report_version` | Template version number |
| `question_id` | Foreign key to QuestionVersion |
| `question_version` | Question version number |
| `section_name` | Section in which the Question appears |
| `display_order` | Order in which the Question is displayed |
| `required` | Indicates whether the Question is required for this Template version |
| `created_by` | Foreign key to User who created the relationship |
| `created_at` | Date/time the relationship was created |
| `active` | Indicates whether the relationship is active |

## Composite Primary Key

The approved model identifies the relationship using:

```text
report_template_id
+ report_version
+ question_id
+ question_version
```

## Foreign Key Relationships

The Template pair:

```text
report_template_id + report_version
```

references an exact `ReportTemplateVersion`.

The Question pair:

```text
question_id + question_version
```

references an exact `QuestionVersion`.

## Key Rules

- A Template version references the exact Question version it uses.
- `section_name` belongs to the Template composition.
- `display_order` belongs to the Template composition.
- `required` may vary by Template version.
- The same Question version may appear in multiple Template versions.
- Once a Template version is used, its ReportQuestion composition should be treated as immutable.
- Template changes require a new `ReportTemplateVersion`.

## Relationships

```text
ReportTemplateVersion 1 -> Many ReportQuestion

QuestionVersion       1 -> Many ReportQuestion
```

## Versioning Example

Template Version 1:

```text
Q1 Version 1
Q2 Version 1
Q3 Version 1
```

Q2 changes, creating:

```text
Q2 Version 2
```

Template Version 2 becomes:

```text
Q1 Version 1
Q2 Version 2
Q3 Version 1
```

Old Reports remain associated with Template Version 1.

New Reports use Template Version 2.

---

# 10. Report

## Purpose

The `Report` entity represents an individual Report created from an exact Report Template version.

Examples include:

- A monthly Committee Report
- A Post-Mortem Report for a completed event or program

The Report stores information about the Report instance itself. Individual Question responses are stored separately in `Answer`.

## Proposed Fields

| Field | Purpose |
|---|---|
| `report_id` | Primary key |
| `report_template_id` | Part of foreign key to exact ReportTemplateVersion |
| `report_template_version` | Part of foreign key to exact ReportTemplateVersion |
| `committee_id` | Foreign key to Committee |
| `submitted_by_user_id` | Foreign key to User |
| `report_title` | Descriptive title for the Report |
| `reporting_period` | Reporting month/period where applicable |
| `event_date` | Event/program date where applicable |
| `status` | Current Report status |
| `created_date` | Date/time the Report was created |
| `updated_date` | Date/time the Report was most recently updated |
| `locked` | Indicates whether the Report is read-only |
| `locked_by_user_id` | Foreign key to User who locked the Report |
| `locked_date` | Date/time the Report was locked |
| `pdf_path` | Storage reference for generated PDF output |

## Key Rules

- `report_id` is the primary key.
- Every Report references an exact `ReportTemplateVersion`.
- Every Report is associated with a Committee.
- Submission information identifies the User responsible for submission.
- Reports containing historical Answers should not normally be physically deleted.
- Report status and lock status must be enforced by the backend.

## Exact Template Version Relationship

The pair:

```text
report_template_id
report_template_version
```

references:

```text
ReportTemplateVersion
(report_template_id + version)
```

This ensures that each Report retains the exact Template configuration used when it was created.

## Report Status

Initial statuses may include:

- `draft`
- `submitted`
- `final`

Typical progression:

```text
draft
  ↓
submitted
  ↓
final / locked
```

The exact workflow may be refined during implementation.

## Reporting Period

Committee Reports are expected to be associated with a reporting period.

Example:

```text
Committee: Technology Committee
Reporting Period: September 2026
```

Where business rules permit only one Committee Report for a Committee/reporting period, the application and/or database should prevent duplicates.

Post-Mortem Reports may instead be associated with a specific event through `event_date` and `report_title`.

## Relationships

```text
ReportTemplateVersion 1 -> Many Report

Committee             1 -> Many Report

User                  1 -> Many Report
                           through submitted_by_user_id

Report                1 -> Many Answer

Report                1 -> Many Attachment
```

## Access Considerations

### Committee Chair

A current Committee Chair may:

- Create Reports for the Committee they chair
- Update unlocked Reports for that Committee
- Submit Reports for that Committee
- View Reports for that Committee

### Committee Member

A Committee Member may have:

- Access to Reports for Committees to which they are assigned
- View-only access where appropriate

Final Committee Member editing permissions will be confirmed with stakeholders.

### Elevated Chapter Roles

President, VP1, VP2, and Technology Chair may have full application access, including lock/unlock authority.

## Report Locking

When:

```text
locked = true
```

normal Report, Answer, and Attachment changes must be rejected by the backend.

The frontend should also display the Report as read-only.

Authorized Users may unlock a Report when a legitimate correction is required.

## Historical Data Consideration

A Report must preserve its historical relationships even when:

- Committee membership changes
- Committee leadership changes
- User Roles change
- Question versions change
- Report Template versions change
- Users become inactive

---

# 11. Answer

## Purpose

The `Answer` entity stores an individual response to a specific Question version within a Report.

Structured Answers allow MACReporting data to be searched, analyzed, exported, and later consumed by Phase 2 analytics.

## Proposed Fields

| Field | Purpose |
|---|---|
| `answer_id` | Primary key |
| `report_id` | Foreign key to Report |
| `question_id` | Part of foreign key to exact QuestionVersion |
| `question_version` | Part of foreign key to exact QuestionVersion |
| `answer_value` | Stored response value |
| `answer_date` | Date/time the Answer was recorded |
| `answered_by` | Foreign key to User |
| `notes` | Optional notes associated with the Answer |

## Key Rules

- `answer_id` is the primary key.
- Every Answer belongs to one Report.
- Every Answer references the exact Question version answered.
- Answers must not automatically move to newer Question versions.
- A Report should normally contain no more than one Answer for the same Question/version unless future Question behavior explicitly permits multiple responses.
- Answer changes must respect Report lock status.

## Relationships

```text
Report          1 -> Many Answer

QuestionVersion 1 -> Many Answer

User            1 -> Many Answer
                     through answered_by
```

## Question Version Relationship

The pair:

```text
question_id + question_version
```

references an exact `QuestionVersion`.

## Example

Historical Report:

```text
Report ID: 105

Question ID: 17
Question Version: 1
Answer Value: 125
```

Later, Question 17 Version 2 may be introduced.

The historical Answer remains associated with Version 1.

## Answer Value Storage

`answer_value` may represent:

- Text
- Long text
- Numbers
- Currency
- Dates
- Dropdown selections
- Boolean/checkbox responses

The application must validate the Answer according to the associated `QuestionVersion.question_type`.

## Required Questions

The `required` setting is defined by `ReportQuestion`.

Before submission, the backend must verify that all required ReportQuestions have valid Answers.

## Historical Data Consideration

Answers associated with submitted/final Reports should normally be retained for the life of the Report.

Deleting or changing a User, Committee, Template, or Question must not cause historical Answers to disappear or change meaning.

---

# 12. Attachment

## Purpose

The `Attachment` entity stores metadata about files associated with a Report.

Attachments allow Users with appropriate permissions to upload supporting files and images directly to a Report.

Examples include:

- Event photographs
- Flyers
- Supporting documents
- Evaluation summaries
- External coverage/articles
- Other Report-related files

The database stores metadata and a storage reference rather than the physical file itself.

## Proposed Fields

| Field | Purpose |
|---|---|
| `attachment_id` | Primary key |
| `report_id` | Foreign key to Report |
| `uploaded_by` | Foreign key to User |
| `original_filename` | Original uploaded filename |
| `storage_key` / `file_path` | External storage reference |
| `mime_type` / `file_type` | File MIME type or format |
| `file_size` | File size |
| `caption` / `description` | Optional description/caption |
| `include_in_pdf` | Indicates whether the Attachment should appear in generated PDF output |
| `uploaded_at` | Date/time the file was uploaded |
| `active` | Indicates whether the Attachment is currently active |

## Key Rules

- `attachment_id` is the primary key.
- Every Attachment belongs to one Report.
- `uploaded_by` references the User who uploaded it.
- Multiple Attachments may belong to one Report.
- Physical files should be stored outside the relational database.
- File type and size must be validated.
- Attachment changes must respect Report lock status.

## Relationships

```text
Report 1 -> Many Attachment

User   1 -> Many Attachment
             through uploaded_by
```

## File Storage

The storage reference may ultimately represent:

- Server file-system location
- Cloud/object-storage location
- Secure file identifier
- Another production-host-supported storage mechanism

The final storage method depends on the selected production hosting architecture.

## Image Uploads

Committee members with appropriate Report-editing permissions may upload images directly to an editable Report.

Conceptually:

```text
Upload Images / Attachments
        ↓
Select File(s)
        ↓
Validate
        ↓
Store File
        ↓
Create Attachment Record
        ↓
Associate with Report
```

Multiple images may be associated with one Report.

## Supported File Types

Initial candidates include:

### Images

- JPEG
- PNG

### Documents

- PDF

Additional formats should only be enabled when there is a defined business requirement.

## File Validation

The backend should validate:

- Allowed file type
- Maximum file size
- File extension
- MIME type
- Report existence
- User authorization
- Report lock status

## PDF Output

`include_in_pdf` determines whether an Attachment should be incorporated into generated Report output where supported.

The PDF-generation process may use:

- Storage reference
- Original filename
- Caption/description
- File type
- `include_in_pdf`

The actual PDF layout remains an application/output responsibility.

## Historical Data Consideration

Attachments are part of the supporting historical record for a Report.

Changes to Users, Roles, Committee membership, Templates, or Questions must not break the relationship between an Attachment and its Report.

---

# 13. ReportTemplateVersion

## Purpose

The `ReportTemplateVersion` entity represents a specific immutable version of a Report Template.

Template versioning preserves the exact Template structure used when a historical Report was created.

## Proposed Fields

| Field | Purpose |
|---|---|
| `report_template_id` | Foreign key to ReportTemplate and part of composite primary key |
| `version` | Version number and part of composite primary key |
| `created_by` | Foreign key to User who created the Template version |
| `created_at` | Date/time the Template version was created |
| `active` | Indicates whether the Template version is currently active |

## Primary Key

```text
report_template_id + version
```

Example:

```text
report_template_id = 1, version = 1
report_template_id = 1, version = 2
```

Both represent versions of the same logical Report Template.

## Key Rules

- `report_template_id` references `ReportTemplate.report_template_id`.
- A Report Template may have multiple versions.
- A Template version is immutable once used.
- Template composition changes require creation of a new version.
- Historical versions must remain available for existing Reports.
- Deactivating a version must not affect Reports already referencing it.

## Relationships

```text
ReportTemplate        1 -> Many ReportTemplateVersion

ReportTemplateVersion 1 -> Many ReportQuestion

ReportTemplateVersion 1 -> Many Report
```

## Versioning Example

Template Version 1:

```text
Q1v1
Q2v1
Q3v1
```

Q2 wording changes.

Create:

```text
Q2v2
```

Then create Template Version 2:

```text
Q1v1
Q2v2
Q3v1
```

New Reports use Version 2.

Old Reports remain on Version 1.

Answers remain tied to their exact Question versions.

## Historical Data Protection

The complete historical chain is:

```text
ReportTemplate
      |
      +--> ReportTemplateVersion
                    |
                    +--> ReportQuestion
                              |
                              +--> QuestionVersion
                                          |
                                          +--> Answer
```

A Report references the exact `ReportTemplateVersion`.

An Answer references the exact `QuestionVersion`.

Together these relationships preserve the historical meaning and composition of the Report.

## Immutability

Once a Template version has been used:

1. Preserve the existing version.
2. Create a new Template version when changes are required.
3. Associate the appropriate Question versions through `ReportQuestion`.
4. Make the new version available for future Reports.

Existing Reports remain unchanged.

---

# 14. Relationship and Integrity Rules

## Primary Relationships

The Phase 1 model uses the following core relationships:

```text
ReportTemplate        1 -> Many ReportTemplateVersion

ReportTemplateVersion 1 -> Many ReportQuestion

Question              1 -> Many QuestionVersion

QuestionVersion       1 -> Many ReportQuestion

ReportTemplateVersion 1 -> Many Report

Committee             1 -> Many Report

User                  1 -> Many Report

Report                1 -> Many Answer

QuestionVersion       1 -> Many Answer

Report                1 -> Many Attachment

User                  1 -> Many UserRole

User                  1 -> Many UserCommittee

Committee             1 -> Many UserCommittee
```

## Composite Foreign Keys

Two version-aware composite foreign-key relationships are central to the design.

### Report to ReportTemplateVersion

```text
Report.report_template_id
+ Report.report_template_version
```

references:

```text
ReportTemplateVersion.report_template_id
+ ReportTemplateVersion.version
```

### Answer to QuestionVersion

```text
Answer.question_id
+ Answer.question_version
```

references:

```text
QuestionVersion.question_id
+ QuestionVersion.version
```

### ReportQuestion to ReportTemplateVersion

```text
ReportQuestion.report_template_id
+ ReportQuestion.report_version
```

references the exact `ReportTemplateVersion`.

### ReportQuestion to QuestionVersion

```text
ReportQuestion.question_id
+ ReportQuestion.question_version
```

references the exact `QuestionVersion`.

## Immutability

Once used by historical Reports:

- ReportTemplateVersion records should not be edited.
- QuestionVersion records should not be edited.
- ReportQuestion composition should not be edited.

Changes require new versions.

## Delete Behavior

Historical integrity takes priority over physical deletion.

Records referenced by historical Reports should generally be:

```text
active = false
```

rather than physically deleted.

Normal application behavior should avoid cascading deletion of historical:

- Reports
- Answers
- Attachments
- Template versions
- Question versions
- User assignments

## Uniqueness

At minimum:

- `User.email` must be unique.
- `Question.question_code` should be unique.
- Version numbers must be unique within their parent master record.

Where business rules require one Committee Report per Committee/reporting period, an appropriate uniqueness rule should be implemented once the exact reporting-period behavior is finalized.

---

# 15. Access-Control Rules

Authorization is determined using both:

```text
UserRole
```

and:

```text
UserCommittee
```

These entities serve different purposes.

## UserRole

Defines chapter-wide authority.

Examples:

```text
PRESIDENT
VP1
VP2
TECHNOLOGY_CHAIR
```

## UserCommittee

Defines Committee membership and Committee-specific responsibility.

Examples:

```text
COMMITTEE_CHAIR
COMMITTEE_MEMBER
```

## Committee Chair

A current Committee Chair may:

- Create Reports for the Committee they chair
- Update editable Reports for that Committee
- Submit Reports for that Committee
- View Reports for that Committee

Access to other Committees may be view-only where permitted.

## Committee Member

A Committee Member may:

- Access Reports for Committees to which they are assigned
- Have view-only access where appropriate

Additional editing permissions may be introduced if approved by stakeholders.

## Elevated Roles

President, VP1, VP2, and Technology Chair may:

- View all Reports
- Create/update Reports where authorized
- Access administrative functionality
- Manage Templates where authorized
- Lock Reports
- Unlock Reports
- Place Reports into final/read-only status

## Backend Enforcement

Permissions must be enforced by the backend.

Hiding a button in React is not sufficient security.

Every protected API operation must verify:

1. The authenticated User.
2. The User's active UserRole assignments.
3. The User's active UserCommittee assignments.
4. The Committee associated with the requested Report.
5. The Report's lock status.
6. The requested action.

---

# 16. Report Locking and Historical Protection

Locked/finalized Reports are read-only except when an authorized User performs an approved unlock.

Users authorized to lock/unlock currently include:

- President
- VP1
- VP2
- Technology Chair

When a Report is locked:

```text
Report.locked = true
```

the backend should reject normal:

- Report updates
- Answer creation
- Answer updates
- Answer deletion
- Attachment uploads
- Attachment replacement/removal

Lock metadata must retain:

```text
locked
locked_by_user_id
locked_date
```

Unlock behavior should be auditable if additional audit-history requirements are introduced.

---

# 17. Versioning Workflow

MACReporting uses versioning to prevent historical Reports from changing when Templates or Questions evolve.

Example workflow:

```text
1. Template Version 1 uses:
   Q1v1
   Q2v1
   Q3v1

2. Q2 wording changes.

3. Preserve Q2v1.

4. Create Q2v2.

5. Create Template Version 2.

6. ReportQuestion for Template Version 2 uses:
   Q1v1
   Q2v2
   Q3v1

7. New Reports use Template Version 2.

8. Existing Reports remain on Template Version 1.

9. Existing Answers remain tied to their exact QuestionVersion.
```

This design allows MACReporting to evolve without rewriting history.

---

# 18. File and PDF Storage

Physical Attachments and generated PDF Reports should live outside the relational database.

The database retains storage references.

Examples:

```text
Attachment.storage_key / file_path

Report.pdf_path
```

The final storage implementation depends on the selected production hosting environment.

This separation:

- Keeps the relational database focused on structured data
- Avoids storing large binary files directly in database tables
- Supports future migration between storage providers
- Allows PDF and image files to be managed independently

---

# 19. Phase 2 Reporting and Analytics

Phase 2 will consume the structured and version-aware Phase 1 data without changing historical records.

The approved future model identifies the following entities:

- Dashboard
- DashboardWidget
- SavedReport
- DataSource

## Dashboard

Proposed fields:

```text
dashboard_id
dashboard_name
description
```

## DashboardWidget

Proposed fields:

```text
widget_id
dashboard_id
widget_type
title
query_config
display_order
active
```

Relationship:

```text
Dashboard 1 -> Many DashboardWidget
```

## SavedReport

Proposed fields:

```text
saved_report_id
user_id
report_name
report_config
created_at
updated_at
is_shared
```

A SavedReport belongs to a User.

## DataSource

Proposed fields:

```text
data_source_id
source_name
source_type
connection_info
active
```

DataSource describes internal or external data sources.

## Phase 2 Capabilities

Future capabilities may include:

- Role-based dashboards
- Committee views
- Event/program views
- KPIs
- Drill-down reporting
- Browser-based queries
- Saved Reports
- Excel export

Phase 2 relationships shown conceptually in the UML are not Phase 1 foreign-key requirements.

---

# 20. Production Database Implementation Notes

The current class-project database uses SQLite.

SQLite will not be treated as the target production database for the multi-user production version of MACReporting.

The final production database platform will be selected after confirming the production hosting environment.

Potential relational database platforms include:

- PostgreSQL
- MySQL/MariaDB

The final SQL implementation must account for the selected platform's:

- Data types
- Auto-generated primary-key syntax
- Boolean handling
- Date/time types
- Composite foreign-key syntax
- Constraint behavior
- Indexing
- Connection configuration

The application should avoid unnecessary database-specific logic where practical.

---

# 21. Migration from Existing Class-Project Schema

The original class-project schema contains:

```text
report_templates
questions
```

The production model expands this significantly.

Existing concepts will be migrated into the new structure rather than treated as the final production schema.

Conceptually:

```text
Existing report_templates
        ↓
ReportTemplate
        +
ReportTemplateVersion

Existing questions
        ↓
Question
        +
QuestionVersion
        +
ReportQuestion
```

Existing seed data for:

```text
Committee Report
Post-Mortem Report
```

should be converted into initial production Template records and Template Version 1 configurations.

Existing Question data should become:

```text
Question master record
+
QuestionVersion 1
+
ReportQuestion relationship
```

The current SQLite database should remain available as a reference during migration until the production data model and seed process have been validated.

---

# 22. Production Schema Implementation Sequence

Once the production database platform is confirmed, implementation should proceed in dependency order.

Recommended sequence:

```text
1. User
2. Committee
3. UserRole
4. UserCommittee
5. ReportTemplate
6. ReportTemplateVersion
7. Question
8. QuestionVersion
9. ReportQuestion
10. Report
11. Answer
12. Attachment
```

This order allows referenced parent records to exist before dependent foreign-key records are created.

After table creation:

```text
Create constraints
        ↓
Create indexes
        ↓
Create initial Users/Committees as appropriate
        ↓
Migrate Report Templates
        ↓
Create Template Version 1
        ↓
Migrate Questions
        ↓
Create Question Version 1 records
        ↓
Create ReportQuestion relationships
        ↓
Validate relationships
        ↓
Update Flask data-access layer
```

---

# 23. Open Implementation Decisions

The following implementation details remain intentionally unresolved until hosting and stakeholder requirements are confirmed:

- Production database platform
- Production file-storage provider/location
- Authentication implementation
- Final Committee Member editing permissions
- Maximum Attachment size
- Final supported Attachment file types
- Exact duplicate-prevention rule for Committee reporting periods
- PDF storage location
- Whether additional audit-history tables are required
- Production deployment architecture

These items do not prevent implementation of the approved logical data model.

---

# 24. Schema Design Summary

MACReporting uses a version-aware relational design intended to preserve historical reporting accuracy.

The central structure is:

```text
User
 ├── UserRole
 └── UserCommittee
          |
          +---- Committee
                    |
                    +---- Report
                           |
                           ├── Answer
                           └── Attachment

ReportTemplate
      |
      +---- ReportTemplateVersion
                    |
                    +---- ReportQuestion
                               |
                               +---- QuestionVersion
                                            |
                                            +---- Question
```

A `Report` references the exact `ReportTemplateVersion` used to create it.

An `Answer` references the exact `QuestionVersion` answered.

`ReportQuestion` preserves the exact Question composition of each Template version.

`UserRole` preserves chapter-wide authority.

`UserCommittee` preserves Committee membership and Committee-role history.

`Attachment` stores metadata and an external storage reference for Report-related files.

This structure allows MACReporting to change over time without changing the historical meaning of previously submitted Reports.

Phase 2 analytics can then consume this structured Phase 1 data without redesigning or overwriting the historical reporting model.