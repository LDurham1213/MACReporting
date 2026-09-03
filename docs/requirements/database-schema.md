# MACReporting Database Schema Specification

## Purpose

This document defines the production database structure for MACReporting.

It translates the approved UML data model and application workflow into a PostgreSQL-focused database specification for the production version of the application.

**Production database platform: PostgreSQL 17**

The schema supports the Phase 1 reporting application while preserving historical reporting accuracy and providing a foundation for future Phase 2 reporting and analytics.

---

# 1. Database Design Principles

The production database must support:

- Multi-user access
- Role-based permissions
- Committee-level access
- Historical reporting
- Report Template versioning
- Question versioning
- Report workflow and approval history
- Report locking/finalization
- Image and attachment metadata
- PDF generation after locking
- Excel export
- Future Phase 2 reporting and analytics

The database must preserve historical meaning.

Existing Report data must not silently change because:

- A Question was edited
- A Committee Chair changed
- A User's role changed
- A Report Template was updated
- Committee membership changed
- A Report moved through the approval workflow
- A Report was later locked
- A PDF was later generated

Historical records must remain tied to the values, versions, Users, and relationships that were valid when the Report was created, answered, submitted, reviewed, approved, or locked.

Dates should use the `YYYY-MM-DD` format where applicable.

PostgreSQL timestamps should use timezone-aware timestamps where appropriate.

---

# 2. User

## Purpose

The `User` entity represents an individual who can access MACReporting.

Users are identified for authentication purposes through their unique individual email address.

Email identifies the person but is not the database primary key.

## Proposed Fields

| Field | Purpose |
|---|---|
| `user_id` | Primary key |
| `first_name` | User first name |
| `last_name` | User last name |
| `email` | Unique individual email address |
| `active` | Indicates whether the User currently has application access |
| `created_at` | Date/time the User record was created |
| `updated_at` | Date/time the User record was most recently updated |

## Key Rules

- `user_id` is the primary key.
- `email` must be unique.
- Email must not be used as the primary key.
- Users referenced by historical data should normally be deactivated rather than deleted.
- A User may have multiple chapter-wide Roles over time.
- A User may belong to multiple Committees.
- A User may have different responsibilities in different Committees.

## Relationships

```text
User 1 -> Many UserRole

User 1 -> Many UserCommittee

User 1 -> Many Report
         through created_by_user_id

User 1 -> Many Answer
         through answered_by

User 1 -> Many Attachment
         through uploaded_by

User 1 -> Many ReportStatusHistory
         through changed_by_user_id

User 1 -> Many Report
         through locked_by_user_id

User 1 -> Many Report
         through pdf_created_by_user_id
```

## Historical Data Consideration

If a User leaves, changes email address, or no longer requires MACReporting access, historical Reports, Answers, Attachments, status changes, and assignments must continue to retain their original User relationships.

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

Chapter-wide roles provide different levels of authority.

### President

The President may:

- View Reports across all Committees
- Access approved Reports
- Lock approved Reports
- Generate PDFs for locked Reports
- Archive Reports where authorized
- Access administrative functionality where authorized

### VP1 / VP2

The appropriate Vice President may:

- View Reports routed to their area of responsibility
- Review submitted Reports
- Return Reports for changes
- Approve Reports
- View historical Reports as authorized

VP assignment/routing rules are enforced by the application authorization layer.

### Technology Chair

The Technology Chair may:

- Access system administration functionality where authorized
- Manage Report Templates where authorized
- Support application configuration and maintenance

Technology Chair system access does not automatically grant business approval, Report locking, or PDF-generation authority.

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

For the current access model:

- Committee Chair: create/update Reports for the Committee they chair.
- Committee Chair: submit Reports for the Committee they chair.
- Committee Member: view Reports where permitted.
- Elevated chapter Roles: broader access based on role.

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
- `question_code` must identify the logical Question consistently over time.
- `question_code` should be unique.
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

---

# 9. ReportTemplateVersion

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

---

# 10. ReportQuestion

## Purpose

The `ReportQuestion` entity associates a specific Report Template version with a specific Question version.

It defines the exact Questions that make up a particular Template version and controls their placement and requirements.

## Proposed Fields

| Field | Purpose |
|---|---|
| `report_template_id` | Part of foreign key to ReportTemplateVersion |
| `report_version` | Template version number |
| `question_id` | Part of foreign key to QuestionVersion |
| `question_version` | Question version number |
| `section_name` | Section in which the Question appears |
| `display_order` | Order in which the Question is displayed |
| `required` | Indicates whether the Question is required for this Template version |
| `created_by` | Foreign key to User who created the relationship |
| `created_at` | Date/time the relationship was created |
| `active` | Indicates whether the relationship is active |

## Composite Primary Key

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
- Once a Template version is used, its ReportQuestion composition must be treated as immutable.
- Template changes require a new `ReportTemplateVersion`.

## Relationships

```text
ReportTemplateVersion 1 -> Many ReportQuestion

QuestionVersion       1 -> Many ReportQuestion
```

---

# 11. Report

## Purpose

The `Report` entity represents an individual Report created from an exact Report Template version.

Examples include:

- A monthly Committee Report
- A Post-Mortem Report for a completed event or program

The Report stores information about the Report instance itself.

Individual Question responses are stored separately in `Answer`.

Workflow transitions are stored separately in `ReportStatusHistory`.

## Proposed Fields

| Field | Purpose |
|---|---|
| `report_id` | Primary key |
| `report_template_id` | Part of foreign key to exact ReportTemplateVersion |
| `report_template_version` | Part of foreign key to exact ReportTemplateVersion |
| `committee_id` | Foreign key to Committee |
| `created_by_user_id` | Foreign key to User who created the Report |
| `report_title` | Descriptive title for the Report |
| `reporting_period` | Reporting month/period where applicable |
| `event_date` | Event/program date where applicable |
| `status` | Current Report workflow status |
| `created_at` | Date/time the Report was created |
| `updated_at` | Date/time the Report was most recently updated |
| `locked` | Indicates whether the Report is read-only |
| `locked_by_user_id` | Foreign key to User who locked the Report |
| `locked_at` | Date/time the Report was locked |
| `pdf_path` | Storage reference for generated PDF output |
| `pdf_created_by_user_id` | Foreign key to User who generated the PDF |
| `pdf_created_at` | Date/time the PDF was generated |

## Key Rules

- `report_id` is the primary key.
- Every Report references an exact `ReportTemplateVersion`.
- Every Report is associated with a Committee.
- `created_by_user_id` identifies the User who created the Report.
- Reports containing historical Answers should not normally be physically deleted.
- Report workflow status and lock status must be enforced by the backend.
- PDF output must not be generated before a Report is locked.
- Only the President may lock an approved Report under the current workflow.
- Only the President may initiate final PDF generation under the current workflow.

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

The approved Phase 1 workflow statuses are:

```text
draft
submitted
reviewed
approved
returned_for_changes
locked
archived
other
```

Normal progression:

```text
draft
  ↓
submitted
  ↓
reviewed
  ↓
approved
  ↓
locked
  ↓
archived
```

Return-for-changes progression:

```text
submitted / reviewed
        ↓
returned_for_changes
        ↓
draft
        ↓
submitted
```

`other` exists for exceptional cases and is not part of the normal workflow.

`final` is not used as a separate status. A locked Report represents the finalized, read-only state.

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
                           through created_by_user_id

Report                1 -> Many Answer

Report                1 -> Many Attachment

Report                1 -> Many ReportStatusHistory
```

## Access Considerations

### Committee Chair

A current Committee Chair may:

- Create Reports for the Committee they chair
- Update Draft Reports for that Committee
- Update Reports returned for changes
- Review the complete Report before submission
- Submit Reports for that Committee
- View Reports for that Committee

### Committee Member

A Committee Member may have:

- Access to Reports for Committees to which they are assigned
- View-only access where appropriate

Final Committee Member editing permissions will be confirmed with stakeholders.

### Appropriate Vice President

The appropriate VP may:

- View Reports submitted to their area of responsibility
- Review submitted Reports
- Return Reports for changes
- Mark Reports reviewed
- Approve Reports

### President

The President may:

- View Reports across Committees
- View approved Reports
- Lock approved Reports
- Generate PDF output after locking
- Archive Reports where authorized

## Report Locking

When:

```text
locked = true
```

normal Report, Answer, and Attachment changes must be rejected by the backend.

The frontend must display the Report as read-only.

Under the current workflow:

```text
status = approved
locked = false
```

means:

```text
The VP has approved the Report.
The Report is awaiting President finalization.
```

After the President locks the Report:

```text
status = locked
locked = true
```

The Report is finalized and read-only.

Normal application users must not be able to unlock a locked Report through the standard workflow.

If a future administrative correction process is required, it should be separately authorized and audited rather than silently modifying the historical record.

## PDF Generation

PDF generation is not part of the Draft, Submitted, Reviewed, or Approved workflow.

A Report must first be locked.

Conceptually:

```text
approved
   ↓
President locks Report
   ↓
locked
   ↓
Create PDF enabled
```

Until a PDF is generated:

```text
pdf_path = null
pdf_created_by_user_id = null
pdf_created_at = null
```

Once generated, the PDF metadata identifies the stored output, the User who created it, and the creation date/time.

---

# 12. ReportStatusHistory

## Purpose

The `ReportStatusHistory` entity records every workflow-status transition for a Report.

It provides an auditable history of submission, review, approval, return-for-changes, locking, and archival activity.

## Proposed Fields

| Field | Purpose |
|---|---|
| `report_status_history_id` | Primary key |
| `report_id` | Foreign key to Report |
| `from_status` | Previous Report status |
| `to_status` | New Report status |
| `changed_by_user_id` | Foreign key to User who performed the transition |
| `changed_at` | Date/time the transition occurred |
| `comments` | Optional workflow comments |

## Key Rules

- Every workflow status change should create a `ReportStatusHistory` record.
- History records should not normally be edited.
- History records should not normally be deleted.
- `returned_for_changes` transitions should normally include comments explaining what must be corrected.
- Multiple return/resubmission cycles must be retained.
- `Report.status` represents the current state.
- `ReportStatusHistory` represents how the Report reached that state.

## Relationships

```text
Report 1 -> Many ReportStatusHistory

User   1 -> Many ReportStatusHistory
             through changed_by_user_id
```

## Example

```text
draft -> submitted
submitted -> returned_for_changes
returned_for_changes -> draft
draft -> submitted
submitted -> reviewed
reviewed -> approved
approved -> locked
```

The complete history remains available even when a Report passes through the same status more than once.

---

# 13. Answer

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

Answers associated with submitted and historical Reports should normally be retained for the life of the Report.

Deleting or changing a User, Committee, Template, or Question must not cause historical Answers to disappear or change meaning.

---

# 14. Attachment

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
| `storage_key` | External storage reference |
| `mime_type` | File MIME type |
| `file_size` | File size |
| `description` | Optional description/caption |
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

PDF generation is only available after the Report has been locked.

---

# 15. Relationship and Integrity Rules

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

Report                1 -> Many ReportStatusHistory

User                  1 -> Many ReportStatusHistory

Report                1 -> Many Answer

QuestionVersion       1 -> Many Answer

Report                1 -> Many Attachment

User                  1 -> Many UserRole

User                  1 -> Many UserCommittee

Committee             1 -> Many UserCommittee
```

## Composite Foreign Keys

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
- Status history
- Template versions
- Question versions
- User assignments

## Uniqueness

At minimum:

- `User.email` must be unique.
- `Question.question_code` must be unique.
- Version numbers must be unique within their parent master record.

Where business rules require one Committee Report per Committee/reporting period, an appropriate uniqueness rule should be implemented once the exact reporting-period behavior is finalized.

---

# 16. Access-Control Rules

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
- Update Draft Reports for that Committee
- Update Reports returned for changes
- Review Reports before submission
- Submit Reports for that Committee
- View Reports for that Committee

## Committee Member

A Committee Member may:

- Access Reports for Committees to which they are assigned
- Have view-only access where appropriate

Additional editing permissions may be introduced if approved by stakeholders.

## Appropriate VP

The appropriate VP may:

- View submitted Reports routed to them
- Review Reports
- Return Reports for changes
- Mark Reports reviewed
- Approve Reports

## President

The President may:

- View Reports across all Committees
- View approved Reports
- Lock approved Reports
- Generate PDF output after locking
- Archive Reports where authorized

## Technology Chair

The Technology Chair may:

- Perform authorized administrative functions
- Manage Templates and configuration where authorized
- Support application administration

Technology Chair authority does not automatically include Report approval, locking, or PDF generation.

## Backend Enforcement

Permissions must be enforced by the backend.

Hiding a button in React is not sufficient security.

Every protected API operation must verify:

1. The authenticated User.
2. The User's active UserRole assignments.
3. The User's active UserCommittee assignments.
4. The Committee associated with the requested Report.
5. The Report's current status.
6. The Report's lock status.
7. The requested action.

---

# 17. Report Workflow, Locking, and Historical Protection

## Workflow

The normal workflow is:

```text
DRAFT
  ↓
SUBMITTED
  ↓
REVIEWED
  ↓
APPROVED
  ↓
LOCKED
  ↓
ARCHIVED
```

A VP may return a Report for changes:

```text
SUBMITTED / REVIEWED
        ↓
RETURNED_FOR_CHANGES
        ↓
DRAFT
        ↓
SUBMITTED
```

Every status transition must be written to `ReportStatusHistory`.

## Draft

While a Report is in Draft:

- Authorized Users may edit it.
- Required-field validation may occur as the User progresses.
- The complete Report may be reviewed in HTML within the application.
- No PDF is generated.

## Submitted

When submitted:

- The Report is routed to the appropriate VP.
- Normal Committee-level editing stops.
- The Report remains viewable.
- The VP may review or return it for changes.

## Reviewed

A reviewed Report has been evaluated by the appropriate VP but has not yet received final VP approval.

The VP may:

- Approve the Report.
- Return it for changes.

## Returned for Changes

When returned:

- The reason for return should be recorded in `ReportStatusHistory.comments`.
- The Report becomes editable again for the authorized Committee User.
- The Report may be corrected and resubmitted.
- Previous workflow history remains intact.

## Approved

An approved Report has completed VP approval.

At this point:

```text
status = approved
locked = false
```

The Report awaits President finalization.

## Locked

Only the President may lock an approved Report under the current business workflow.

When locked:

```text
status = locked
locked = true
```

The backend must reject normal:

- Report updates
- Answer creation
- Answer updates
- Answer deletion
- Attachment uploads
- Attachment replacement/removal

The frontend must display the Report as read-only.

## Archived

Archived Reports remain part of the historical record.

Archiving must not physically delete the Report or its related data.

## Other

`other` exists for exceptional cases requiring a status outside the normal workflow.

Its use should be restricted and documented.

---

# 18. Versioning Workflow

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

## Historical Chain

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

---

# 19. File and PDF Storage

Physical Attachments and generated PDF Reports should live outside the relational database.

The database retains storage references.

Examples:

```text
Attachment.storage_key

Report.pdf_path
```

The final storage implementation depends on the selected production hosting environment.

This separation:

- Keeps the relational database focused on structured data
- Avoids storing large binary files directly in database tables
- Supports future migration between storage providers
- Allows PDF and image files to be managed independently

## PDF Lifecycle

PDF files are not generated while Reports are:

```text
draft
submitted
reviewed
approved
returned_for_changes
```

PDF generation becomes available only when:

```text
status = locked
locked = true
```

The President initiates PDF generation.

The resulting metadata is stored in:

```text
pdf_path
pdf_created_by_user_id
pdf_created_at
```

The PDF is therefore a final output artifact rather than a second editable version of the Report.

---

# 20. PostgreSQL Production Implementation

MACReporting uses PostgreSQL 17 as the production relational database platform.

The original class-project SQLite database is not the target production database.

## PostgreSQL Data Types

The physical schema should use PostgreSQL-appropriate data types, including:

```text
BIGINT GENERATED BY DEFAULT AS IDENTITY
VARCHAR
TEXT
BOOLEAN
DATE
TIMESTAMPTZ
INTEGER
NUMERIC
```

where appropriate.

## Primary Keys

Generated numeric primary keys should use PostgreSQL identity columns rather than SQLite-specific auto-increment behavior.

Example:

```sql
user_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY
```

## Boolean Values

Boolean fields should use PostgreSQL:

```sql
BOOLEAN
```

with explicit defaults where appropriate.

Example:

```sql
active BOOLEAN NOT NULL DEFAULT TRUE
```

## Timestamps

Audit and workflow timestamps should generally use:

```sql
TIMESTAMPTZ
```

to preserve timezone-aware date/time information.

## Report Status Constraint

Report status should initially use a `VARCHAR` field with a `CHECK` constraint rather than a PostgreSQL ENUM.

Conceptually:

```sql
status VARCHAR(30) NOT NULL DEFAULT 'draft'
CHECK (
    status IN (
        'draft',
        'submitted',
        'reviewed',
        'approved',
        'returned_for_changes',
        'locked',
        'archived',
        'other'
    )
)
```

This preserves database-level validation while allowing the workflow to evolve more easily than a database ENUM.

## Connection Configuration

Database credentials must not be hard-coded into source code.

The Flask application should obtain connection information through environment variables.

Expected configuration will include values such as:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

or a secure database connection URL.

Credentials must not be committed to GitHub.

---

# 21. Phase 2 Reporting and Analytics

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

# 22. Migration from Existing Class-Project Schema

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
```

and:

```text
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

The current SQLite database should remain available as a reference during migration until the PostgreSQL production data model and seed process have been validated.

SQLite should not remain a runtime dependency of the production application after migration is complete.

---

# 23. Production Schema Implementation Sequence

The PostgreSQL implementation should proceed in dependency order.

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
11. ReportStatusHistory
12. Answer
13. Attachment
```

After table creation:

```text
Create constraints
        ↓
Create indexes
        ↓
Validate foreign keys
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
Seed minimum development/test data
        ↓
Validate relationships
        ↓
Update Flask data-access layer
        ↓
Test PostgreSQL CRUD
        ↓
Connect Committee Report workflow
```

---

# 24. Open Implementation Decisions

The following implementation details remain unresolved until hosting and remaining stakeholder requirements are confirmed:

- Production file-storage provider/location
- Authentication implementation
- Final Committee Member editing permissions
- Maximum Attachment size
- Final supported Attachment file types
- Exact duplicate-prevention rule for Committee reporting periods
- PDF storage location
- Production deployment architecture
- Exact VP-to-Committee routing/configuration method
- Administrative correction process for a locked Report, if required

The following decisions are now resolved:

```text
Production database platform:
PostgreSQL 17

Report workflow:
Draft
Submitted
Reviewed
Approved
Returned for Changes
Locked
Archived
Other

Workflow audit history:
ReportStatusHistory is required.

Report locking:
Only the President may lock an approved Report under the current workflow.

PDF generation:
Available only after the President locks the Report.
```

These remaining open items do not prevent implementation of the approved Phase 1 PostgreSQL data model.

---

# 25. Schema Design Summary

MACReporting uses a version-aware relational design intended to preserve historical reporting accuracy while supporting a multi-user approval workflow.

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
                           ├── Attachment
                           └── ReportStatusHistory

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

`ReportStatusHistory` preserves every workflow transition without overwriting previous activity.

`Attachment` stores metadata and an external storage reference for Report-related files.

The Report itself remains the working and reviewable record throughout the workflow.

PDF output is not a parallel working copy.

Instead:

```text
Create/Edit Report
        ↓
Review HTML Report
        ↓
Submit
        ↓
VP Review
        ↓
VP Approval
        ↓
President Lock
        ↓
Generate Final PDF
```

This structure allows MACReporting to change over time without changing the historical meaning of previously submitted Reports and provides a stable PostgreSQL foundation for future Phase 2 analytics.