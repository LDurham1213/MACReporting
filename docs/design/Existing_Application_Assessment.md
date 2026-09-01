# MACReporting Existing Application Assessment

## Purpose

This document reviews the existing MACReporting class-project application to determine which components can be reused for the passion-project MVP and future production application.

The original application was developed as a one-to-many class project and serves as a working proof of concept. The passion-project version expands the application into a full reporting and data-management solution intended for eventual chapter use.

The purpose of this assessment is to avoid unnecessarily rebuilding working functionality while identifying the areas that must change to support the new requirements.

Each component is classified as:

- **KEEP** - Can be reused with little or no modification.
- **MODIFY** - Existing functionality provides a useful foundation but requires changes.
- **REPLACE** - Existing implementation should be redesigned.
- **RETIRE** - Existing functionality or technology belongs to the class-project implementation and will not be used for continued production development.
- **NEW** - Required functionality does not currently exist.

---

# 1. Database Assessment

## Current Schema

The class-project database currently uses SQLite and contains two primary tables:

- `report_templates`
- `questions`

The existing relationship is:

`ReportTemplate 1 -> Many Questions`

The `questions` table currently stores:

- Report Template ID
- Section Name
- Question Text
- Question Type
- Required Indicator
- Display Order

The existing schema also uses a foreign-key relationship between `questions` and `report_templates`.

Deleting a Report Template currently cascades to the associated Questions.

---

## Assessment

| Component | Classification | Notes |
|---|---|---|
| SQLite database platform | RETIRE | Used for the original class-project proof of concept. The passion-project application will move to a server-based relational database suitable for multi-user production use. |
| `report_templates` | MODIFY | Retain the template concept but update it for the production data model. |
| `questions` | MODIFY | Retain the Question concept but add Question versioning and separate template-placement information. |
| Template-to-Question relationship | MODIFY | Replace the direct relationship with `TemplateQuestion` so a Template references a specific Question ID and Version. |
| Foreign-key enforcement | KEEP / MODIFY | Relational integrity remains required. Implementation details may change based on the selected production database. |
| Cascade behavior | KEEP / REVIEW | Cascade behavior is useful where appropriate, but delete rules must protect historical reporting data. |
| `template_questions` | NEW | Associates a Template with a specific Question ID and Version and stores section/display information. |
| `reports` | NEW | Stores individual Committee and Post-Mortem Report instances. |
| `answers` | NEW | Stores Report responses and the exact Question version answered. |
| `committees` | NEW | Stores the committee list. |
| `users` | NEW | Stores individual application users identified by unique email. |
| `user_roles` | NEW | Stores application/chapter-wide roles and effective dates. |
| `user_committees` | NEW | Stores committee membership/chair assignments and effective dates. |
| `attachments` | NEW | Stores metadata for Report images and supporting files. |

---

## Database Platform Strategy

The existing application uses SQLite because it was appropriate for the original class-project proof of concept.

MACReporting is now being designed as a multi-user application intended for eventual production use. Rather than continue expanding the application around SQLite and migrate the completed application later, continued passion-project development will transition to a server-based relational database.

The final database platform will be selected after the chapter's existing hosting capabilities are confirmed.

Current options include:

- **PostgreSQL** - preferred production option if supported
- **MySQL/MariaDB** - alternative if better supported by the existing hosting environment

The existing SQLite database will be preserved as a reference and backup of the completed class-project version but will not be the target database platform for continued passion-project development.

This approach allows the new production schema and application functionality to be developed against the same database technology intended for eventual deployment, reducing future migration and rework.

The production database decision should consider:

- Existing chapter hosting capabilities
- Compatibility with Python/Flask
- Multi-user access
- Concurrent database operations
- Security
- Backup and recovery
- Cost
- Long-term maintenance
- Reporting and analytics requirements
- Phase 2 dashboard requirements

---

## Question Versioning

The current application allows a Question record to be edited directly.

For the production application, Questions with existing Answers must not be overwritten in a way that changes the historical meaning of those Answers.

The production model will use:

`question_id + version`

to identify a specific version of a Question.

A `TemplateQuestion` record will identify the exact Question version used by a Template.

An `Answer` will also identify the exact Question version that was answered.

This allows a Question to change in the future without changing the meaning of previously submitted Report data.

---

## TemplateQuestion Relationship

The existing application stores the following directly on the `questions` table:

- `report_template_id`
- `section_name`
- `display_order`

The production design will separate the Question itself from its placement within a Report Template.

The intended structure is:

```text
ReportTemplate
      |
      +----< TemplateQuestion >---- Question
```

The `Question` entity will contain information about the Question itself.

Example:

```text
Question
-------------------------
question_id
version
question_text
question_type
required
active
```

The `TemplateQuestion` entity will define where a particular Question version appears within a Template.

Example:

```text
TemplateQuestion
-------------------------
template_id
question_id
question_version
section_name
display_order
```

This allows the application to preserve Question history while maintaining control over the organization and display of each Report Template.

---

# 2. Seed Data Assessment

## Classification

**MODIFY**

The existing `seed_data.sql` contains useful starting data for:

- Committee Report
- Post-Mortem Report
- Section names
- Question text
- Question types
- Required indicators
- Display order

The existing question content can be reused as the starting point for the production Templates.

The seed structure must be updated to support:

- Question versioning
- `TemplateQuestion`
- New production entities
- The selected production database platform
- Controlled values/dropdowns where appropriate

---

## Existing Report Templates

The existing seed data already defines the two primary Report types:

1. Committee Report
2. Post-Mortem Report

These Report types remain part of the passion-project design and can be retained.

---

## Existing Questions

The existing Questions provide a useful starting point for the production application.

The Committee Report currently includes sections such as:

- Event Logistics / Program Overview
- Goals / Objective
- Overview

The Post-Mortem Report currently includes sections such as:

- Report Information
- Event Logistics
- Goals / Objective
- Financial Information / Metrics
- Outcome / Metrics
- Committee Feedback

The final Questions and sections will continue to be reviewed with stakeholders.

---

## Future Seed Data Considerations

Some existing Questions may eventually be replaced by system-derived information.

For example:

`Submitted By`

may eventually be populated from the authenticated User rather than entered manually.

Other fields may become controlled selections instead of free-text values.

Examples may include:

- Program Thrust
- Committee
- Submitted By
- Report Type
- Report Status

These decisions will be finalized during development and stakeholder review.

---

# 3. Flask / Backend Assessment

## Current Backend

The existing Flask application is implemented primarily in the root-level:

`app.py`

Current functionality includes:

- Flask application setup
- CORS support
- SQLite database connection
- SQLite foreign-key enforcement
- Report Template CRUD
- Question CRUD
- Retrieve Questions for a specific Report Template
- JSON export
- JSON import
- Vanilla JavaScript page rendering through Flask

---

## Current Flask Route Inventory

The existing Flask application currently includes:

- `GET /`
- `GET /report-templates`
- `POST /report-templates`
- `PUT /report-templates/<template_id>`
- `DELETE /report-templates/<template_id>`
- `GET /questions`
- `POST /questions`
- `PUT /questions/<question_id>`
- `DELETE /questions/<question_id>`
- `GET /report-templates/<template_id>/questions`
- `GET /export`
- `POST /import`

No Report-instance, Answer, User, Committee, Role, Attachment, PDF, Excel, or lock/unlock endpoints currently exist.

---

## Backend Assessment

**Overall Classification: MODIFY**

The current Flask backend provides a usable API foundation and should not be discarded.

However, the passion-project version requires:

- Production database connectivity
- Expanded data model
- Report-instance APIs
- Answer APIs
- Question versioning
- User management
- Committee management
- Role-based authorization
- Report locking
- Image/attachment handling
- PDF generation
- Excel export
- Improved validation
- Improved error handling

---

## Component Assessment

| Component | Classification | Notes |
|---|---|---|
| Flask framework | KEEP | Flask remains appropriate for the application backend. |
| Flask application structure | MODIFY | The current single-file application can support the immediate MVP, but should eventually be organized into clearer modules or Blueprints as functionality grows. |
| `get_db_connection()` | REPLACE / MODIFY | The connection-helper pattern is useful, but the SQLite-specific implementation will change when the production database is selected. |
| SQLite `PRAGMA foreign_keys` | RETIRE | SQLite-specific behavior. Relational integrity will instead be implemented using the selected production database. |
| CORS configuration | KEEP / REVIEW | Required for the React frontend during development. Production settings should be restricted appropriately. |
| Report Template GET/POST/PUT/DELETE | MODIFY | Existing CRUD provides a strong foundation but must support the production Template model and selected database. |
| Question GET/POST/PUT/DELETE | MODIFY | Existing CRUD is reusable conceptually but must support Question versioning instead of overwriting historical Questions. |
| Template-specific Question endpoint | MODIFY | Useful pattern, but must retrieve the specific Question versions associated through `TemplateQuestion`. |
| JSON Export | MODIFY | Useful proof of concept. Production export requirements will expand to Reports/Answers and Excel export. |
| JSON Import | REVIEW / MODIFY | Useful development functionality but must be reviewed before production use because import behavior can affect historical data integrity. |
| Root Flask-rendered page | REVIEW | The production user-facing interface is expected to use React. Flask will primarily provide API functionality. |
| Validation | MODIFY | Current endpoints assume expected request fields are present. Production APIs require validation and clear error responses. |
| Error handling | MODIFY | More consistent API errors and HTTP status handling are required. |
| Authentication | NEW | No authenticated-user integration currently exists. |
| Authorization | NEW | No role/committee permission enforcement currently exists. |
| Report CRUD | NEW | Production Reports do not currently exist. |
| Answer CRUD | NEW | Report responses do not currently exist. |
| Committee APIs | NEW | Committee management does not currently exist. |
| User APIs | NEW | User identification and management do not currently exist. |
| User Role APIs | NEW | Chapter-wide Role assignments do not currently exist. |
| User Committee APIs | NEW | Committee assignments and effective dates do not currently exist. |
| Question Versioning Logic | NEW | Updating a Question must create/manage versions rather than changing historical meaning. |
| Report Lock/Unlock | NEW | Backend must enforce final/read-only status. |
| Image / Attachment API | NEW | Upload and Report-attachment support does not currently exist. |
| PDF Generation | NEW | Final Report PDF generation does not currently exist. |
| Excel Export | NEW | Structured reporting-data export to Excel does not currently exist. |

---

## Existing Backend Strengths

The current backend already demonstrates several concepts that can be reused:

- Flask REST endpoints
- Relational database access patterns
- JSON request/response handling
- CRUD patterns
- One-to-many data retrieval
- React-compatible CORS configuration
- Import/export proof of concept

This reduces the amount of Phase 1 MVP work required compared with starting a new application from scratch.

The goal is to reuse the application logic and API patterns where practical while replacing the SQLite-specific database implementation.

---

## Key Backend Changes Required

### Database Connection

The current `get_db_connection()` function uses Python's SQLite connection library.

The connection-helper concept can remain, but its implementation must be updated when the production relational database is selected.

Database configuration should ultimately be separated from application code and use environment/configuration settings rather than hard-coded production connection information.

---

### Question Updates

The current endpoint:

`PUT /questions/<question_id>`

updates the existing Question row directly.

This behavior must change for the production application when a Question already has historical Answers.

Question changes must preserve the prior Question version and create or activate a new version as appropriate.

---

### Template Questions

The current endpoint retrieves Questions directly through:

`questions.report_template_id`

The production data model will instead use `TemplateQuestion` to associate a Report Template with a specific Question ID and Question Version.

---

### Authorization

The production backend must determine whether a User is authorized to perform an action before changing data.

Examples:

- Committee Chair may create/update unlocked Reports for the Committee they chair.
- Standard Users may have view-only access to other Committees, subject to final stakeholder approval.
- President, VP1, VP2, and Technology Chair may access all Reports and lock/unlock Reports.

These rules must be enforced by Flask/API logic and not only by the React interface.

---

### Report Locking

A locked/final Report must reject unauthorized update requests at the backend even if an API request is sent directly.

---

### JSON Import Consideration

The current JSON import uses:

`INSERT OR REPLACE`

This was acceptable for the class-project proof of concept.

Production behavior must be reviewed carefully because replacing existing records could affect historical data integrity, especially after Question versioning, Reports, and Answers are introduced.

---

## Backend Assessment Summary

The Flask backend should be **MODIFIED AND EXPANDED**, not replaced.

The current API provides a working foundation for:

- REST API patterns
- Template-driven Question retrieval
- CRUD operations
- React/API communication

The SQLite-specific portions of the backend will be replaced when the production database platform is selected.

---

# 4. React Frontend Assessment

## Current React Structure

The existing React source contains:

```text
App.css
App.jsx
assets/
components/
index.css
main.jsx
```

The `components` directory currently contains:

```text
ReportTemplate.jsx
```

The majority of the existing React application logic remains within `App.jsx`.

---

## ReportTemplate Component

### `ReportTemplate.jsx`

**Classification: MODIFY**

The existing `ReportTemplate` component is a reusable foundation for displaying selectable Report Templates.

Current behavior:

- Displays Template name
- Displays Template description
- Highlights the selected Template
- Calls a parent callback when selected

The current component accepts:

- `template`
- `selected`
- `onViewQuestions`

---

## Production Changes

The production workflow is changing from:

```text
Select Template
      ↓
View Questions
```

to:

```text
Select Report Type
      ↓
Committee Report / Post-Mortem Report
      ↓
Create New or Select Existing
      ↓
Open Report
      ↓
Render Template Questions
```

The existing `ReportTemplate` component can therefore be repurposed rather than discarded.

Potential changes include:

- Repurpose as a Report Type selection card
- Update click behavior to begin the Create New / Select Existing workflow
- Update styling to match the approved MACReporting UI mockups
- Rename the component later if a clearer production name is appropriate

A possible future name is:

`ReportTypeCard`

The final decision will be made during implementation.

---

## App.jsx Assessment

**Overall Classification: MODIFY HEAVILY / REFACTOR**

The existing `App.jsx` contains useful state-management and API patterns, but the current application is primarily an administrative interface for Report Templates and Questions.

The passion-project user workflow is different and will require the React application to be reorganized around Report creation, Report retrieval, dynamic form rendering, Report history, and future role-based access.

---

## Reusable State / Logic

| Component | Classification | Notes |
|---|---|---|
| `reportTemplates` state | KEEP / MODIFY | Still required for Report Type selection and Template-driven rendering. |
| `selectedTemplate` state | KEEP / MODIFY | Useful for identifying the selected Report Type. |
| `questions` state | KEEP / MODIFY | Reusable for dynamically rendering the selected Template Questions. |
| Template form state | MODIFY | Should move toward an administrative/configuration workflow rather than the primary user experience. |
| Question form state | MODIFY | Useful for administrative Template maintenance but must support Question versioning. |
| `addingNewSection` | KEEP / MODIFY | Useful for administrative management of sections/questions. |

---

## Reusable Functions

| Function | Classification | Notes |
|---|---|---|
| `loadQuestions()` | KEEP / MODIFY | Core pattern remains useful for Template-driven Report forms. |
| `editTemplate()` | MODIFY | Likely retained for administrative Users only. |
| `saveTemplate()` | MODIFY | Reusable CRUD pattern but production validation and authorization are required. |
| `deleteTemplate()` | REVIEW / MODIFY | Delete behavior must protect historical Reports and Answers. |
| `editQuestion()` | MODIFY | Must load/edit a specific Question version. |
| `saveQuestion()` | MODIFY | Must support Question-version creation rather than overwriting historical Questions. |
| `deleteQuestion()` | REVIEW / MODIFY | Historical-data rules must be defined before deletion is allowed. |

---

## React Application Structure

The existing `App.jsx` follows a clear high-level structure:

1. React state declarations
2. Initial data loading through `useEffect`
3. Report Template functions
4. Question functions
5. JSX / user-interface rendering

The initial `useEffect()` loads Report Templates from the Flask API when the React application starts.

The JSX currently renders the Template/Question administration interface.

---

## Startup Data Loading

**Classification: KEEP / MODIFY**

The existing startup pattern is reusable.

Current behavior:

- React starts
- `useEffect()` calls the Flask API
- Report Templates are loaded into React state

Production behavior will expand this pattern to load additional information as needed, such as:

- Authenticated User information
- User Roles
- Committee assignments
- Available Report Templates
- Existing Reports
- Role-based navigation options

The current `useEffect()` pattern can therefore be retained and expanded rather than replaced.

---

## Major New React Functionality

The following functionality does not currently exist and will be added:

- Report Type Selection screen
- Create New / Select Existing workflow
- Report form screen
- Dynamic section navigation
- Report save/update workflow
- Report history/search
- User/Role-aware navigation
- Read-only locked Report state
- Image/attachment upload interface
- PDF generation/preview workflow
- Excel export controls
- Phase 2 dashboard

---

## React Assessment Summary

The current React application should not be discarded.

It provides useful proof-of-concept patterns for:

- API calls
- State management
- CRUD behavior
- Dynamic Question loading

However, the application should be refactored so the existing Template/Question CRUD becomes an administrative feature, while the main User experience is rebuilt around the approved Report workflow.

---

# 5. Testing Assessment

## Current State

No automated test files were found in the existing repository.

The current class-project application appears to have been validated primarily through:

- Manual browser testing
- Postman/API testing
- Direct application interaction
- SQLite/database verification

---

## Assessment

**Overall Classification: NEW**

The passion-project application should introduce automated testing for the most important application behavior.

---

## Testing Areas Needed

### Backend / API

- Report Template endpoints
- Question endpoints
- Question versioning
- Report creation
- Report update
- Answer persistence
- Committee access rules
- User Role access rules
- Report locking
- Validation and error handling

### Database

- Foreign-key relationships
- Question version preservation
- Report/Answer relationships
- Committee/User assignments
- Lock fields
- Delete behavior
- Historical-data protection

### Frontend

- Report Type selection
- Dynamic Question rendering
- Create New / Select Existing workflow
- Save/update behavior
- Locked/read-only behavior

### Integration

- React to Flask API
- Flask to production database
- PDF generation
- Excel export
- Image/attachment handling

---

## School MVP Testing Priority

Because the school MVP deadline is short, automated testing should focus first on the critical end-to-end workflow:

1. Select Report Type
2. Create Report
3. Load Questions
4. Save Answers
5. Retrieve Existing Report
6. Update Report
7. Generate PDF

Additional production-grade testing can be expanded after the school MVP.

---

## Testing Assessment Summary

Automated testing is a **NEW** capability for the passion-project version.

The existing manual testing experience remains useful but should be supplemented with automated tests as the application grows.

---

# 6. Project Structure and Legacy Frontend Assessment

## Current Structure

The repository currently contains both the original Flask/Vanilla JavaScript frontend and the newer React frontend.

Relevant folders include:

```text
app.py
database/
react-frontend/
templates/
static/
frontend/
backend/
docs/
```

The original Flask-served frontend currently consists of:

```text
templates/
└── index.html

static/
├── app.js
└── style.css
```

The `frontend/` and `backend/` directories were recently created for the passion-project structure and are currently empty.

---

## Vanilla JavaScript Frontend

**Classification: KEEP AS REFERENCE / RETIRE FROM PRIMARY DEVELOPMENT**

The original Vanilla JavaScript interface was useful for satisfying the class-project requirement and proving that the Flask API could support a browser-based frontend.

It should not remain the primary frontend for the production passion project.

### Reasons

- The approved passion-project UI mockups are significantly different from the class-project interface.
- React is already implemented and provides a better foundation for the multi-screen workflow.
- Maintaining two production frontends would create unnecessary duplication.
- The Vanilla JavaScript version may still be useful as a reference when reviewing existing API behavior.

### Recommendation

- Preserve the existing Vanilla JavaScript files in the repository for historical/reference purposes.
- Do not continue adding new production features to `templates/index.html` or `static/app.js`.
- Use `react-frontend/` as the primary user-interface codebase for the passion-project MVP.

---

## React Frontend

**Classification: MODIFY HEAVILY / REFACTOR**

The React application will become the primary frontend for MACReporting.

The current React application should be reorganized around the approved production workflow:

```text
Home
  ↓
Select Report Type
  ↓
Create New / Select Existing
  ↓
Complete Report
  ↓
Save / Update
  ↓
Generate PDF
  ↓
Report History
```

The existing Template/Question CRUD interface should eventually become an administrative feature rather than the main User experience.

---

## `frontend/` Directory

**Classification: REVIEW / POSSIBLY REMOVE**

The root-level `frontend/` directory is currently empty.

Because the active React application already exists under:

`react-frontend/`

the project should avoid maintaining two frontend directories.

Recommendation:

- Continue using `react-frontend/` for the school MVP.
- Do not move or rename the React project during the short MVP development window unless there is a strong technical reason.
- Revisit folder cleanup after the MVP to reduce unnecessary risk.

---

## `backend/` Directory

**Classification: FUTURE REFACTOR TARGET**

The root-level `backend/` directory is currently empty.

The existing Flask backend remains in:

`app.py`

For the school MVP, the application can continue using the current Flask structure while new functionality is added.

After the MVP, the Flask application should be considered for refactoring into a clearer backend structure using modules or Flask Blueprints.

Possible future organization:

```text
backend/
├── app.py
├── database.py
├── routes/
├── services/
└── models/
```

The school MVP should prioritize working functionality over repository restructuring.

---

# 7. Obsolete / Class-Project Functionality

The following features should be treated as class-project or administrative functionality rather than the primary passion-project workflow:

- SQLite as the target database platform
- Vanilla JavaScript frontend
- Primary Template CRUD screen
- Primary Question CRUD screen
- Direct Question overwrite behavior
- Class-project JSON import behavior using `INSERT OR REPLACE`

These components should not necessarily be deleted immediately.

Where useful, they may be:

- Reused as reference
- Modified
- Moved into an administrative workflow
- Preserved as part of the completed class-project version

The `class-project-complete` Git tag also preserves the completed class-project state before continued passion-project development.

---

# 8. Final Existing Application Assessment

## Overall Conclusion

The existing MACReporting application should **not be rebuilt from scratch**.

The class project provides a valuable working foundation that includes:

- Flask REST API structure
- Relational database concepts
- Report Template CRUD
- Question CRUD
- Template-driven Question retrieval
- React state management
- React API integration
- Vanilla JavaScript proof of concept
- Basic import/export functionality

The passion-project version should reuse these application patterns while introducing the production data model, production database platform, and new User-facing reporting workflow.

---

## KEEP / MODIFY / REPLACE / NEW Summary

| Component | Decision |
|---|---|
| Flask | KEEP / MODIFY |
| SQLite | RETIRE - Class-project database; preserve as reference/backup |
| Production relational database | NEW - Platform TBD pending hosting review |
| Database connection helper concept | KEEP / MODIFY |
| SQLite connection implementation | REPLACE |
| Relational integrity / foreign keys | KEEP |
| Report Template concept | MODIFY |
| Question concept | MODIFY |
| Existing seed Questions | MODIFY |
| Template CRUD patterns | MODIFY |
| Question CRUD patterns | MODIFY |
| Template Question retrieval pattern | MODIFY |
| React API/state patterns | KEEP / MODIFY |
| `ReportTemplate.jsx` | MODIFY |
| Current React admin UI | MODIFY HEAVILY / REFACTOR |
| Vanilla JavaScript UI | KEEP AS REFERENCE / RETIRE |
| JSON export | MODIFY |
| JSON import | REVIEW / MODIFY |
| Automated testing | NEW |
| Question versioning | NEW |
| TemplateQuestion relationship | NEW |
| Reports | NEW |
| Answers | NEW |
| Committees | NEW |
| Users | NEW |
| User Roles | NEW |
| User Committee assignments | NEW |
| Role-based authorization | NEW |
| Report locking | NEW |
| Attachments / images | NEW |
| PDF generation | NEW |
| Excel export | NEW |
| Report history/search | NEW |
| Phase 2 analytics dashboard | NEW - PHASE 2 |

---

# 9. Recommended Development Strategy

Because the school MVP deadline is short while the application is also intended for eventual chapter use, development should balance rapid delivery with avoiding unnecessary future rework.

The recommended approach is:

1. Keep the current Flask application operational while the passion-project functionality is developed.
2. Confirm the chapter's existing hosting and database capabilities.
3. Select a server-based production relational database platform.
4. Implement the approved production schema on the selected database platform.
5. Preserve the existing SQLite database as a reference/backup of the completed class project rather than expanding it as the production data store.
6. Reuse existing Flask API and CRUD patterns where practical.
7. Reuse React API/state patterns where practical.
8. Refactor the React User experience around the approved Report workflow.
9. Prioritize school-MVP functionality before the school deadline.
10. Defer major folder/module restructuring unless it becomes necessary for MVP development.
11. Continue documenting chapter-production requirements separately from the school MVP.
12. Complete production security, authentication, hosting, storage, and deployment decisions before the chapter production release.

---

# 10. School MVP vs. Chapter Production Release

MACReporting currently serves two project audiences with different timelines.

## School MVP

The school MVP is intended to demonstrate the core application concept and end-to-end reporting workflow.

The primary MVP workflow is:

```text
Select Report Type
        ↓
Create New / Select Existing
        ↓
Dynamically Load Template Questions
        ↓
Enter Report Information
        ↓
Save Structured Report Data
        ↓
Retrieve / Update Existing Report
        ↓
Generate Report PDF
```

The school MVP should demonstrate the core value of MACReporting without requiring every production feature to be complete.

---

## Chapter Production Release

The chapter production release will expand and harden the MVP for actual multi-user use.

Production requirements include:

- Production relational database
- Authentication
- User management
- Committee assignments
- Role-based authorization
- Report locking/unlocking
- Images and attachments
- Excel export
- Report history/search
- Production file storage
- Backup and recovery
- Security review
- Hosting integration
- Wix integration
- Stakeholder testing
- Production deployment

The chapter release timeline is separate from the school MVP deadline.

---

# 11. Hosting and Wix Dependency

The chapter currently uses an existing Wix-based website.

MACReporting should work with the existing website rather than require replacement of the current site.

The exact integration approach will depend on the chapter's current hosting capabilities.

Potential integration approaches include:

- Link from the existing Wix site to MACReporting
- Embed MACReporting where technically appropriate
- Integrate authentication where technically and securely feasible

The final production architecture is currently pending additional information regarding the chapter's existing hosting environment.

This dependency affects:

- Production database selection
- Production application hosting
- Authentication integration
- File storage
- Deployment architecture

It does **not** prevent continued development of the application requirements, data model, React workflow, Flask API design, or other hosting-independent functionality.

---

# 12. Assessment Status

## Completed Review Areas

- Database schema
- Database technology
- Seed data
- Flask/backend application
- Flask route inventory
- React structure
- `ReportTemplate.jsx`
- `App.jsx` high-level structure
- Existing React state/functions
- Testing
- Legacy frontend
- Project structure
- Obsolete class-project functionality
- KEEP / MODIFY / REPLACE / RETIRE / NEW classification

---

## Issue #1 Deliverable

This document satisfies the deliverable for:

**Review Existing Application Code for Passion Project**

The existing application has been reviewed and classified to guide continued development of the MACReporting school MVP and future chapter production application.

---

# Next Step

Proceed with:

**Issue #2 - Implement Production Database and Schema**

The database platform decision is pending confirmation of the chapter's existing hosting capabilities.

Hosting-independent development work may continue while that information is being obtained.