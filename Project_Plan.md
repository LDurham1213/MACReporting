# MACReporting Project Plan

## Project Overview

MACReporting is a chapter reporting application designed to manage report
templates and the questions associated with each report.

The application was inspired by an existing reporting process using Google Forms
and Google Apps Script. MACReporting begins the process of moving that workflow
into a standalone application where report templates, questions, and eventually
completed reports can be managed in one place.

The current version was developed as a 3-tier web application using a relational
database, REST API, and web-based frontend.

For this project, development focused on the relationship between Report
Templates and Questions.

---

## Master-Detail Relationship

### Master: Report Template

A Report Template represents a type of report that can be created within
MACReporting.

Initial report templates include:

- Committee Report
- Post-Mortem Report

### Detail: Question

A Question represents an individual question associated with a Report Template.

Each Report Template can contain multiple Questions, while each Question belongs
to one Report Template.

### Relationship

**Report Template (1) → Questions (Many)**

The relationship is established through `report_template_id` in the Questions
table.

Example:

```text
Committee Report
    ├── Question 1
    ├── Question 2
    ├── Question 3
    └── Question 4
```

This allows the application to retrieve only the Questions associated with a
selected Report Template.

---

## Application Architecture

MACReporting uses a 3-tier architecture:

```text
Frontend
   ↓
Flask REST API
   ↓
SQLite Database
```

Two frontend implementations were created during the project:

```text
                 Flask REST API
                      ↓
                   SQLite
                  ↗       ↖
                 /         \
      Vanilla JavaScript   React
           Frontend        Frontend
```

Both frontends use the same Flask REST API and SQLite database.

---

## Technology Stack

The project uses the following technologies:

### Backend

- Python
- Flask
- Flask-CORS
- SQLite
- SQL
- REST API
- JSON

### Frontend

- HTML
- CSS
- Vanilla JavaScript
- React
- Vite

### Development and Testing

- Postman
- curl
- Node.js
- npm
- Git
- GitHub

---

## Project Scope

The current MACReporting project focuses on:

- Creating and managing Report Templates
- Creating and managing Questions
- Establishing a one-to-many relationship between Report Templates and Questions
- Storing application data in a relational SQLite database
- Creating REST API endpoints for CRUD operations
- Testing REST API endpoints
- Importing and exporting application data
- Creating a Vanilla JavaScript frontend
- Creating a React frontend
- Connecting both frontends to the Flask REST API
- Displaying Questions associated with a selected Report Template

### CRUD and the Future Application

Full CRUD functionality for Report Templates and Questions was implemented to
meet the requirements of the current project and demonstrate CRUD operations
through the web interface.

In the planned production version of MACReporting, a typical user would not
need to create, edit, or delete Report Templates or Questions.

Instead, a typical user would:

1. Select a Report Type
2. Complete the Questions associated with that Report Template
3. Submit the completed Report

Template and Question management would eventually be administrative
functionality.

---

# Phase 1 - Database and REST API

## Goal

Establish the database and REST API foundation of MACReporting.

## Completed

- [x] Designed the Report Template and Question data objects
- [x] Created the relational database schema
- [x] Created synthetic seed data
- [x] Created the Flask REST server
- [x] Connected Flask to SQLite
- [x] Implemented Create operations for Report Templates
- [x] Implemented Read operations for Report Templates
- [x] Implemented Update operations for Report Templates
- [x] Implemented Delete operations for Report Templates
- [x] Implemented Create operations for Questions
- [x] Implemented Read operations for Questions
- [x] Implemented Update operations for Questions
- [x] Implemented Delete operations for Questions
- [x] Tested API endpoints using curl

### Phase 1 Result

At the completion of Phase 1, both the master and detail resources supported
full CRUD operations through the Flask REST API.

---

# Phase 2 - One-to-Many Relationship

## Goal

Implement and test the relationship between Report Templates and Questions.

## Completed

- [x] Established the one-to-many relationship between Report Templates and Questions
- [x] Used `report_template_id` to associate Questions with Report Templates
- [x] Created a REST API endpoint for retrieving Questions belonging to a specific Report Template
- [x] Tested REST API endpoints using Postman
- [x] Tested POST operations
- [x] Tested GET operations
- [x] Tested PUT operations
- [x] Tested DELETE operations
- [x] Added application data export functionality
- [x] Added application data import functionality

### Relationship Endpoint

```text
GET /report-templates/{id}/questions
```

This endpoint retrieves the Questions belonging to the selected Report
Template.

### Phase 2 Result

At the completion of Phase 2, the application could retrieve related Question
records based on the selected Report Template and could import and export
application data.

---

# Phase 3 - Web Interface

## Goal

Create web interfaces that interact with the existing Flask REST API.

## Vanilla JavaScript Frontend

### Completed

- [x] Created an HTML web interface
- [x] Added CSS styling
- [x] Created a Vanilla JavaScript application
- [x] Connected JavaScript to the Flask REST API using `fetch()`
- [x] Displayed Report Templates retrieved from the database
- [x] Created Report Templates through the web interface
- [x] Edited Report Templates through the web interface
- [x] Deleted Report Templates through the web interface
- [x] Displayed Questions belonging to a selected Report Template
- [x] Created Questions through the web interface
- [x] Edited Questions through the web interface
- [x] Deleted Questions through the web interface
- [x] Added automatic navigation to selected editing/viewing sections
- [x] Added basic page styling and layout

### Vanilla JavaScript Result

The Vanilla JavaScript frontend provides full CRUD functionality for both
Report Templates and Questions and demonstrates the one-to-many relationship
through the user interface.

---

## React Frontend

### Goal

Create a second frontend using React that communicates with the existing Flask
REST API.

### Completed

- [x] Installed Node.js and npm
- [x] Created the React project using Vite
- [x] Connected React to the Flask REST API
- [x] Added Flask-CORS support for communication between the React development server and Flask
- [x] Retrieved Report Templates from the Flask API
- [x] Stored API data using React state
- [x] Created a reusable `ReportTemplate` component
- [x] Passed Report Template data to components using props
- [x] Added View Questions functionality
- [x] Retrieved Questions associated with a selected Report Template
- [x] Displayed related Questions in the React interface

### Development Servers

During development, the two applications run separately:

```text
Flask / Vanilla JavaScript
http://127.0.0.1:5000

React / Vite
http://localhost:5173
```

The React frontend communicates with the Flask REST API running on port 5000.

### React Result

The React frontend demonstrates how the same Flask REST API can be consumed by
a component-based frontend.

The React implementation demonstrates:

- Components
- Props
- State
- `useEffect`
- API requests using `fetch()`
- Dynamic rendering of database data
- Displaying one-to-many related data

---

# Phase 3 Result

At the completion of Phase 3, MACReporting has two working frontend
implementations:

1. A Vanilla JavaScript frontend providing full CRUD functionality
2. A React frontend demonstrating component-based API interaction and the
   Report Template → Questions relationship

Both frontends use the existing Flask REST API and SQLite database.

---

# Current Project Status

**Phases 1, 2, and 3 are complete.**

The current version of MACReporting demonstrates:

- 3-tier application architecture
- Relational database design
- One-to-many relationships
- SQLite database development
- Flask REST API development
- CRUD operations
- API testing with curl and Postman
- JSON import and export
- Vanilla JavaScript frontend development
- React frontend development
- React components, props, and state
- Communication between separate frontend and backend development servers
- Multiple frontend implementations using the same REST API

---

# Future Enhancements

MACReporting is intended to eventually grow beyond the scope of the current
One-to-Many project.

Possible future enhancements include:

### Report Submission

- Monthly Committee Report submissions
- Post-Mortem Report submissions
- User-friendly report completion forms
- Conditional questions based on previous answers
- Required field validation

### Report Management

- Completed report storage
- Current and archived reports
- Report history
- Search and filtering
- PDF report generation

### Users and Administration

- User authentication
- Role-based access
- Administrative management of Report Templates and Questions
- Committee management
- Leadership access to submitted reports

### Additional Features

- Budget and expense tracking
- Google Drive or other cloud document storage
- Email notifications
- Leadership reporting dashboard

These features are outside the scope of the current project and represent
possible future development of MACReporting.