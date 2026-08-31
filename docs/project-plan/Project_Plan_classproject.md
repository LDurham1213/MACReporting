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
- React (builds the UI)
- Vite (Develops and runs the React Interface)

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
# -----------------------------------------------------------------------
# How to Run MACReporting
# -----------------------------------------------------------------------

This section explains how to start and use MACReporting.

MACReporting currently has **two web interfaces**:

1. **Vanilla JavaScript Version**
   Runs through Flask and is available at:

   `http://127.0.0.1:5000`

2. **React Version**
   Runs through Vite and is available at:

   `http://localhost:5173`

Both versions use the same Flask REST API and SQLite database.

---

## Before You Begin

Open the MACReporting project in **Visual Studio Code (VS Code)**.

The main project folder should look similar to this:

```text
MACReporting/
│
├── app.py
├── database/
├── static/
├── templates/
├── react-frontend/
├── Project_Plan.md
└── README.md
```

The most important thing is that you begin in the main:

```text
MACReporting
```

folder.

---

# Part 1 - Running the Vanilla JavaScript Version

The Vanilla JavaScript version only requires the Flask server.

## Step 1 - Open a Terminal

In VS Code, select:

**Terminal → New Terminal**

A terminal window will open at the bottom of the screen.

Make sure the terminal is inside the main MACReporting project folder.

The prompt should end with something similar to:

```text
MACReporting %
```

---

## Step 2 - Start the Flask Server

In the terminal, enter:

```bash
python3 app.py
```

Press **Enter**.

If Flask starts correctly, the terminal should display information that includes:

```text
http://127.0.0.1:5000
```

### Important

Leave this terminal open.

The terminal is running the Flask server. If the terminal is closed or the server is stopped, the application will no longer be available.

---

## Step 3 - Open MACReporting

Open a web browser such as:

* Chrome
* Safari
* Edge
* Firefox

Enter the following address:

```text
http://127.0.0.1:5000
```

The MACReporting Vanilla JavaScript application should appear.

---

## What You Can Do in the Vanilla JavaScript Version

The current application allows you to:

* View Report Templates
* Add Report Templates
* Edit Report Templates
* Delete Report Templates
* View Questions associated with a Report Template
* Add Questions
* Edit Questions
* Delete Questions

The Template and Question management features are included to demonstrate CRUD functionality for this project.

In a future production version of MACReporting, these functions would most likely be available only to an administrator.

---

# Part 2 - Running the React Version

The React version requires **two servers to run at the same time**.

The first server runs Flask.

The second server runs React using Vite.

Think of the setup like this:

```text
React Web Page
      ↓
Flask REST API
      ↓
SQLite Database
```

React displays the application.

Flask retrieves and updates the data.

SQLite stores the data.

---

## Step 1 - Start Flask

Open a terminal in VS Code.

Make sure the terminal is in the main:

```text
MACReporting
```

folder.

Enter:

```bash
python3 app.py
```

Press **Enter**.

Flask should start at:

```text
http://127.0.0.1:5000
```

### Leave this terminal open.

Do not stop Flask while using the React application.

---

## Step 2 - Open a Second Terminal

In VS Code, select:

**Terminal → New Terminal**

You should now have:

```text
Terminal 1 → Flask
Terminal 2 → React
```

The Flask terminal should remain running.

---

## Step 3 - Move Into the React Folder

In the second terminal, enter:

```bash
cd react-frontend
```

Press **Enter**.

The terminal prompt should now indicate that you are inside the React frontend folder.

For example:

```text
react-frontend %
```

---

## Step 4 - Install React Packages

This step is usually only required:

* the first time the project is run on a computer
* after cloning the project from GitHub
* after React dependencies have changed

Run:

```bash
npm install
```

Press **Enter**.

Wait until the installation finishes.

### Note

You do not normally need to run `npm install` every time you start the application.

---

## Step 5 - Start the React Server

In the same terminal, enter:

```bash
npm run dev
```

Press **Enter**.

If React/Vite starts successfully, the terminal should display something similar to:

```text
Local: http://localhost:5173/
```

### Leave this terminal open.

At this point, you should have two running terminals:

```text
Terminal 1
Flask
http://127.0.0.1:5000


Terminal 2
React / Vite
http://localhost:5173
```

---

## Step 6 - Open the React Application

Open a web browser and enter:

```text
http://localhost:5173
```

The React version of MACReporting should appear.

---

# Which Web Address Should I Use?

MACReporting currently has two different frontend versions.

| Address                 | Version                    |
| ----------------------- | -------------------------- |
| `http://127.0.0.1:5000` | Flask + Vanilla JavaScript |
| `http://localhost:5173` | React                      |

The two webpages may look different, but they both connect to the same Flask REST API and SQLite database.

---

# Quick Start Guide

## To Run the Vanilla JavaScript Version

Open the MACReporting project in VS Code.

Open a terminal and run:

```bash
python3 app.py
```

Then open:

```text
http://127.0.0.1:5000
```

---

## To Run the React Version

### Terminal 1

From the main MACReporting folder:

```bash
python3 app.py
```

Leave the terminal running.

### Terminal 2

Run:

```bash
cd react-frontend
```

Then:

```bash
npm run dev
```

Leave this terminal running.

Open:

```text
http://localhost:5173
```

---

# First-Time React Setup

If the React project has never been run on the computer before, use:

```bash
cd react-frontend
```

Then:

```bash
npm install
```

Then:

```bash
npm run dev
```

After the first setup, you normally only need:

```bash
cd react-frontend
npm run dev
```

---

# How to Stop MACReporting

To stop a running server:

1. Click the terminal where the server is running.
2. Press:

```text
Control + C
```

For the Vanilla JavaScript version, stop the Flask server.

For the React version, stop:

* the Flask server
* the React/Vite server

---

# Starting MACReporting Again Later

You do not need to reinstall everything each time.

## Vanilla JavaScript

1. Open MACReporting in VS Code.
2. Open a terminal.
3. Run:

```bash
python3 app.py
```

4. Open:

```text
http://127.0.0.1:5000
```

---

## React

1. Open MACReporting in VS Code.
2. Open Terminal 1.
3. Run:

```bash
python3 app.py
```

4. Open Terminal 2.
5. Run:

```bash
cd react-frontend
```

6. Run:

```bash
npm run dev
```

7. Open:

```text
http://localhost:5173
```

---

# Troubleshooting

## Problem: The Webpage Will Not Open

Check the terminal.

If Flask is not running, this address will not work:

```text
http://127.0.0.1:5000
```

If React/Vite is not running, this address will not work:

```text
http://localhost:5173
```

Restart the appropriate server.

---

## Problem: React Opens but No Report Data Appears

Make sure Flask is also running.

React displays the webpage, but Flask provides the Report Template and Question data.

For React to work correctly, both servers should be active:

```text
Flask
http://127.0.0.1:5000

React
http://localhost:5173
```

---

## Problem: `npm` Command Not Found

Node.js and npm must be installed to run the React frontend.

Verify that they are installed by running:

```bash
node --version
```

Then:

```bash
npm --version
```

Both commands should return version numbers.

---

## Problem: `python3 app.py` Does Not Work

Make sure:

1. The terminal is inside the main MACReporting folder.
2. Python is installed.
3. The correct Python environment is selected in VS Code.
4. Flask and Flask-CORS are installed.

---

## Problem: A Change to Flask Is Not Appearing

Stop the Flask server by pressing:

```text
Control + C
```

Then restart it:

```bash
python3 app.py
```

---

## Problem: A React Change Is Not Appearing

Vite normally updates the React page automatically when a file is saved.

If the change does not appear:

1. Save the file.
2. Refresh the browser.
3. Check the React terminal for errors.
4. Check the browser Developer Console for errors.

---

# Simple Reference

```text
FLASK / VANILLA JAVASCRIPT

Start:
python3 app.py

Open:
http://127.0.0.1:5000
```

```text
REACT

Terminal 1:
python3 app.py

Terminal 2:
cd react-frontend
npm run dev

Open:
http://localhost:5173
```
