# MACReporting Project Plan

## Project Overview

MACReporting is a web-based reporting and data management application designed to improve how chapter committee and post-event information is collected, stored, retrieved, and used.

The goal of the project is to move from simply collecting reports to collecting usable data.

The application will allow authorized users to create and update Committee Reports and Post-Mortem Reports, generate standardized PDF output, and store the underlying information as structured data for future reporting, analysis, dashboards, and award submissions.

The project will be developed in phases.

---

# Project Goals

The primary goals of MACReporting are to:

- Standardize the chapter reporting process
- Reduce manual searching through individual reports
- Store report information as structured data
- Allow authorized users to retrieve and update prior reports
- Generate consistent PDF reports
- Support image and attachment uploads
- Allow leadership to finalize and lock reports
- Export report data to Excel
- Support role-based access
- Build a data foundation for future reporting and analytics dashboards

---

# Phase 1 - Minimum Viable Product

## Objective

Phase 1 will establish the core reporting application and data structure.

The focus is on creating a reliable workflow for entering, storing, retrieving, updating, finalizing, and exporting reports.

---

## Phase 1 Scope

### 1. Project Foundation

Tasks:

- Finalize project documentation
- Maintain One-Pager
- Maintain UML/Data Model
- Maintain UI mockups
- Maintain requirements document
- Set up GitHub Project Board
- Create GitHub Issues for development work
- Establish development branch workflow
- Review current class-project code for reusable components

Deliverable:

- Approved project structure and development plan

---

### 2. Data Model and Database Design

Tasks:

- Update relational database schema for production design
- Create ReportTemplate entity
- Create Question entity
- Add Question versioning
- Create TemplateQuestion relationship
- Create Report entity
- Create Answer entity
- Create Committee entity
- Create User entity
- Create UserRole entity
- Create UserCommittee entity
- Add report lock/finalization fields
- Add image/attachment support
- Define foreign-key relationships
- Define cascade behavior
- Create seed/test data

Important Design Rule:

Questions must be versioned so that changes to a question do not change the historical meaning of answers already submitted.

The combination of:

`question_id + version`

will identify the specific question version used by a report.

Deliverable:

- Production-ready database schema

---

### 3. User and Access Management

MACReporting will identify users using their unique individual email address.

The email address will be unique in the User table but will not be used as the primary key.

Example:

```text
User
-------------------------
user_id
email
first_name
last_name
active