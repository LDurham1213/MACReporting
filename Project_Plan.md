# MACReporting Project Plan

## Project Overview

MACReporting is a chapter reporting application designed to manage report
templates and the questions associated with each report.

The initial version of MACReporting is being developed as a 3-tier web
application using a relational database, REST API, and web-based frontend.

For the current project, development will focus on the relationship between
Report Templates and Questions.

---

## Master-Detail Relationship

### Master: Report Template

A Report Template represents a type of report that can be created within
MACReporting.

Initial report templates may include:

- Monthly Committee Report
- Post-Event Report

### Detail: Question

A Question represents an individual question associated with a Report Template.

Each Report Template can contain multiple Questions, while each Question
belongs to one Report Template.

### Relationship

**Report Template (1) → Questions (Many)**

Example:

Monthly Committee Report

- Did your committee meet this month?
- What activities were completed?
- How much money was spent?
- What are your plans for next month?

---

## Technology Stack

The project will use the following technologies:

- Python
- Flask
- SQLite
- REST API
- SQL
- JSON
- Postman
- Vanilla JavaScript
- React

---

## Project Scope

The current MACReporting project will focus on:

- Creating and managing Report Templates
- Creating and managing Questions
- Establishing a one-to-many relationship between Report Templates and Questions
- Storing application data in a relational database
- Creating REST API endpoints for CRUD operations
- Testing REST API endpoints
- Importing and exporting application data
- Creating web interfaces that interact with the REST API

---

## Phase 1 - Database and REST API

Phase 1 will establish the foundation of the application.

Tasks include:

- Design the Report Template and Question data objects
- Create the relational database schema
- Create synthetic test data
- Create the REST server
- Connect the REST server to the database
- Implement CRUD operations for Report Templates
- Implement CRUD operations for Questions
- Test initial API endpoints using curl

---

## Phase 2 - One-to-Many Relationship

Phase 2 will implement the relationship between Report Templates and Questions.

Tasks include:

- Establish the one-to-many relationship between Report Templates and Questions
- Create REST API endpoints for accessing Questions belonging to a specific Report Template
- Test REST API endpoints using a GUI-based REST client such as Postman
- Add functionality to dump and load application data using SQL and/or JSON

Example relationship endpoint:

`GET /report-templates/{id}/questions`

---

## Phase 3 - Web Interface

Phase 3 will create web interfaces that interact with the REST API.

Tasks include:

- Create a Vanilla JavaScript application
- Create a React application
- Add CRUD pages for Report Templates
- Add CRUD pages for Questions
- Create a user interface that displays Questions associated with a selected Report Template

---

## Future Enhancements

MACReporting is intended to eventually grow beyond the scope of the current
project.

Possible future enhancements include:

- Monthly committee report submissions
- Post-event report submissions
- Conditional questions based on previous answers
- PDF report generation
- Google Drive or cloud document storage
- User authentication
- Role-based access
- Committee management
- Budget and expense tracking
- Report history and searching
- Email notifications

These features are outside the scope of the current project.