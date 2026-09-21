# MACReporting

MACReporting is a web-based reporting and analytics application developed for the Middletown (DE) Alumnae Chapter of Delta Sigma Theta Sorority, Incorporated.

The application was created to modernize a reporting process that relied on Google Forms and Google Apps Script by providing a centralized system for creating, submitting, reviewing, approving, storing, retrieving, and analyzing chapter reports.

MACReporting currently supports:

- Committee Reports
- Post-Mortem / Event Reports
- Multi-step report approval workflows
- Report status tracking
- PDF report generation
- Supporting file attachments
- Report search
- Dashboard analytics
- Reporting period and committee filtering
- Role-based application functionality

---

## Project Purpose

Chapter reports contain valuable information about programs, attendance, expenses, accomplishments, action items, and upcoming activities.

Previously, much of this information was collected through individual form submissions. While the information could be reviewed, it was more difficult to use the collected data for broader analysis and historical reporting.

MACReporting was designed to make chapter reporting information easier to:

- Enter
- Review
- Approve
- Retrieve
- Preserve
- Analyze

Rather than treating each report as an isolated form submission, MACReporting stores reporting data in a structured relational database so that information can support both operational reporting and chapter-level analytics.

---

## Application Architecture

MACReporting uses a three-tier application architecture consisting of a React frontend, Flask backend, and relational database.

### Frontend

The user interface is built with React.

The frontend handles:

- Application navigation
- Report entry
- Report review
- Report searches
- Dashboard displays
- File attachments
- User interactions with the reporting workflow

### Backend

The application backend is built with Python and Flask.

Flask provides REST API endpoints used by the React frontend for:

- Reports
- Questions
- Report templates
- Lookups
- Attachments
- Dashboard analytics
- PDF generation

### Database

The current development version uses SQLite with SQLAlchemy as the Object-Relational Mapper (ORM).

SQLAlchemy separates much of the application's data-access logic from database-specific SQL and provides a foundation for migrating to another relational database, such as PostgreSQL, if needed for a production deployment.

---

## Tech Stack

### Frontend

- React
- JavaScript
- HTML
- CSS
- Vite
- React Icons

### Backend

- Python
- Flask
- Flask-CORS
- SQLAlchemy

### Database and Data

- SQLite
- Relational database design
- SQL
- Data modeling

### Development and Testing Tools

- Git
- GitHub
- Visual Studio Code
- Postman
- Terminal / zsh

### Reporting

- PDF report generation
- Structured report data
- File attachment storage

---

## Major Features

### Committee Reports

Committee members can create monthly reports containing information such as:

- Committee activities
- Accomplishments
- Budget information
- Action items
- Dates to remember
- Supporting attachments

Committee Reports move through an approval workflow before becoming final.

The workflow includes review by the appropriate Vice President followed by review and approval by the President.

Reports may be returned for changes during the approval process.

---

### Post-Mortem Reports

Post-Mortem Reports capture information about completed programs and events.

Information collected can include:

- Event information
- Event date
- Attendance
- Program outcomes
- Budget information
- Committee feedback
- Action items
- Supporting documentation

The structured data captured through these reports can later be used for chapter-level analytics.

---

### Report Workflow

Reports support workflow statuses including:

- Draft
- Submitted
- Reviewed
- Returned for Changes
- Approved
- Locked
- Archived

Report status history is maintained so that workflow changes can be tracked.

Submitted and finalized reports become read-only based on their workflow status.

---

### Attachments

Users can upload supporting documentation to reports.

Attachments can:

- Be uploaded to a report
- Be downloaded
- Be marked for inclusion in generated report output
- Be removed while the report remains editable

Attachments remain available when the report becomes read-only.

---

### PDF Reports

MACReporting can generate formatted PDF versions of reports.

PDF output provides a consistent version of report information that can be used for:

- Viewing
- Printing
- Record retention
- Historical documentation

Additional PDF access and printing functionality is planned for a future enhancement.

---

### Reports Search

The Reports Search feature allows users to locate previously created reports rather than relying on individual form responses or manually stored files.

Reports can be retrieved from the centralized reporting system for review and historical reference.

---

## Analytics Dashboard

Phase 2 of MACReporting introduces an analytics dashboard that uses the structured reporting data collected by the application.

Current dashboard metrics include:

- Programs Held
- Total Attendance
- Total Expenses
- Reports Submitted
- Committee Activity
- Report Status Overview

Current dashboard filters include:

- Reporting Period
- Committee

The filters can be combined so that dashboard metrics can be viewed for a specific reporting period and committee.

Additional dashboard analytics and filters are planned.

---

## Dashboard Metric Definitions

### Programs Held

Programs Held counts Post-Mortem Reports that have progressed beyond Draft status.

Eligible statuses currently include:

- Submitted
- Reviewed
- Approved
- Locked

---

### Total Attendance

Total Attendance uses the `TOTAL_ATTENDANCE` response recorded for eligible reports.

The dashboard uses the total attendance value rather than adding separate attendance fields, which prevents participants from being counted more than once.

---

### Total Expenses

Total Expenses represents actual costs recorded in report budget items for eligible reports.

Committee Report and Post-Mortem Report expenses may both contribute to this metric when they meet the dashboard's status and filter criteria.

---

### Reports Submitted

Reports Submitted includes reports that are currently Submitted as well as reports that were submitted and have since progressed farther through the workflow.

Eligible statuses currently include:

- Submitted
- Reviewed
- Approved
- Locked

---

# Running MACReporting Locally

## Prerequisites

Before running the application, make sure the following are installed:

- Python 3
- Node.js
- npm
- Git

---

## 1. Clone the Repository

Clone the repository:

```bash
git clone https://github.com/LDurham1213/MACReporting.git
```

Move into the project directory:

```bash
cd MACReporting
```

---

## 2. Create the Python Virtual Environment

If a virtual environment has not already been created:

```bash
python3 -m venv .venv
```

Activate the virtual environment on macOS or Linux:

```bash
source .venv/bin/activate
```

When the environment is active, the terminal should display something similar to:

```text
(.venv)
```

---

## 3. Install Backend Dependencies

If the repository contains a `requirements.txt` file, install the Python dependencies with:

```bash
pip install -r requirements.txt
```

---

## 4. Start the Flask Backend

From the root `MACReporting` directory, with the Python virtual environment active, run:

```bash
flask --app app run --port 5001
```

The Flask API will run at:

```text
http://127.0.0.1:5001
```

Keep this terminal window running while using the application.

---

## 5. Start the React Frontend

Open a second terminal window.

Navigate to the React frontend:

```bash
cd MACReporting/react-frontend
```

If this is the first time running the frontend, install the Node dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Vite will display the local application address.

The application normally runs at:

```text
http://localhost:5173
```

Open that address in a browser.

---

# Quick Start

If the application has already been installed and configured, use two terminal windows.

## Terminal 1 - Backend

From the MACReporting root directory:

```bash
source .venv/bin/activate
flask --app app run --port 5001
```

## Terminal 2 - Frontend

From the MACReporting root directory:

```bash
cd react-frontend
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

## Important Port Information

MACReporting currently expects the Flask backend to run on port:

```text
5001
```

The React frontend currently sends API requests to the backend using this port.

If Flask is started on another port, frontend API requests may fail unless the frontend API configuration is also updated.

---

## Restarting the Backend

The current local Flask startup configuration may require the server to be restarted after backend Python code changes.

Stop Flask using:

```text
Control + C
```

Then restart it:

```bash
flask --app app run --port 5001
```

---

## Frontend Development

While:

```bash
npm run dev
```

is running, Vite normally detects React, JavaScript, and CSS changes automatically.

In most cases, the frontend does not need to be manually restarted after a code change.

---

# Project Structure

A simplified view of the project structure:

```text
MACReporting/
│
├── app.py
├── db.py
├── models.py
├── README.md
│
├── routes/
│   ├── attachments.py
│   ├── dashboard.py
│   ├── lookups.py
│   ├── questions.py
│   ├── reports.py
│   └── templates.py
│
├── pdf_services/
│   └── pdf_service.py
│
├── database/
│   └── database and seed utilities
│
├── react-frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── App.css
│   │
│   └── package.json
│
└── uploads/
    └── local report attachments
```

The exact contents of individual directories may change as development continues.

---

# Core Data Model

MACReporting uses a relational data model that separates reports from their templates, questions, answers, and supporting information.

Major entities include:

- Users
- User Roles
- Committees
- User Committees
- Report Templates
- Report Template Versions
- Questions
- Question Versions
- Reports
- Report Questions
- Answers
- Report Status History
- Report Action Items
- Report Dates to Remember
- Report Budget Items
- Attachments

---

## Versioned Reports and Questions

Report templates and questions are versioned.

This allows a report to retain the structure and question wording associated with the version that existed when the report was created.

This design helps preserve historical reporting integrity even when future report templates or questions change.

---

# Report Approval Workflow

Committee Reports follow a multi-step approval workflow.

The general workflow is:

```text
Committee
    |
    v
Submit Report
    |
    v
Appropriate Vice President
    |
    +---- Return for Changes ----> Committee
    |
    v
VP Approval
    |
    v
President
    |
    +---- Return for Changes ----> Committee
    |
    v
Final Approval / Lock
```

The application maintains report status information and status history throughout the workflow.

---

# Planned Notification Workflow

Email notifications are planned as a future enhancement.

Notifications will be triggered by meaningful report status changes rather than routine report saves.

Examples include:

- Report submitted for VP review
- Report returned to a committee for changes
- Revised report resubmitted
- Report forwarded to the President
- Report approved
- Report locked/finalized

Workflow notifications are intended to use permanent committee and leadership role email addresses rather than individual personal email addresses.

For example, a committee may have one permanent email address shared by its current chair or co-chairs.

This approach allows the MACReporting configuration to remain stable when chapter leadership changes.

---

# Current Development Status

MACReporting currently includes:

- Committee Report entry
- Post-Mortem Report entry
- Report persistence
- Report workflow/status management
- Read-only finalized reports
- Report status history
- Structured action items
- Dates to remember
- Budget items
- Supporting attachments
- PDF report generation
- My Reports
- Approvals
- Reports Search
- Phase 2 Analytics Dashboard
- Reporting Period dashboard filter
- Committee dashboard filter

---

# Planned Enhancements

Future development may include:

- Status-change email notifications
- Permanent committee and leadership notification addresses
- Expanded PDF viewing and printing permissions
- Additional dashboard filters
- Report Type filtering
- Program / Event filtering
- Spending by Committee analytics
- Spending trend analytics
- Program / Event spending analytics
- Workflow analytics
- Needs My Attention dashboard functionality
- Recent Reports dashboard functionality
- Export to Excel
- Additional loading states
- Additional error handling
- Dashboard empty states
- Additional dashboard UI polish
- Production hosting and deployment

---

# Data and Security Considerations

MACReporting is designed for chapter reporting and administrative use.

A production deployment should include appropriate controls for:

- Authentication
- Authorization
- Role-based access
- Secure file storage
- Database backups
- HTTPS
- Environment-based configuration
- Application secrets
- Database credentials
- Production logging
- Error handling
- Data retention
- Recovery procedures

Development credentials, local configuration, uploaded files, passwords, API keys, and other secrets should not be committed to Git.

---

# Git Workflow

Feature branches can be used for development work.

Create a feature branch:

```bash
git switch -c feature-name
```

Review changes:

```bash
git status
```

Stage the appropriate files:

```bash
git add <files>
```

Commit:

```bash
git commit -m "Describe the completed work"
```

Push the feature branch:

```bash
git push -u origin feature-name
```

After the feature has been tested, it can be merged into `main`.

The `main` branch should represent the stable version of MACReporting.

---

# Troubleshooting

## Frontend Loads but Data Does Not Appear

Confirm that the Flask backend is running on port `5001`:

```bash
flask --app app run --port 5001
```

Then confirm that the React frontend is running:

```bash
cd react-frontend
npm run dev
```

---

## Failed to Load Resource

If the browser displays a failed resource or API error:

1. Confirm Flask is running.
2. Confirm Flask is running on port `5001`.
3. Confirm the React frontend is running.
4. Check the browser developer console for the failed endpoint.
5. Check the Flask terminal for backend errors.

---

## Backend Route Changes Are Not Appearing

Stop the Flask server:

```text
Control + C
```

Restart it:

```bash
flask --app app run --port 5001
```

---

## Verify Flask Routes

Available Flask routes can be displayed with:

```bash
flask --app app routes
```

This can be useful when troubleshooting a `404` response from a backend endpoint.

---

# Project Background

MACReporting began as a data engineering passion project focused on improving an existing organizational reporting process.

The project combines application development and data engineering concepts to demonstrate how information collected during normal organizational operations can become reusable structured data.

The project incorporates:

- Relational data modeling
- Database design
- REST API development
- Frontend development
- Workflow design
- Data persistence
- Report generation
- File management
- Data analytics
- Dashboard development

The long-term goal is not simply to digitize an existing form, but to create a reporting system in which information collected by the chapter can be preserved, retrieved, and analyzed to support future planning and decision-making.

---

# Developer

**Leigh Durham**

MACReporting  
