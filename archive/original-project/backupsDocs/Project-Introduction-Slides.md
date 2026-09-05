---
marp: true
theme: default
paginate: true
---

# OnesToManys Project
## Build a Full-Stack 3-Tier App Individually

### Week Overview
- Database design
- REST API development
- Frontend integration (Vanilla JS + React)

---

# Why This Project Matters

You are not just writing code. You are practicing how real systems are built.

- Model data that reflects real-world relationships
- Build APIs that teams can consume
- Connect backend logic to user-facing interfaces
- Work across database, server, and frontend layers

---

# What You Will Build

## A 3-tier application
- Presentation Layer: Web UI
- Business Logic Layer: REST API service
- Data Layer: Relational database

## Core capability
- Full CRUD for master and detail entities
- One-to-many relationship endpoints and UI flow

---

# Core Concept: Master-Detail (One-to-Many)

- Master record: can exist independently
- Detail record: belongs to exactly one master

Examples:
- Customer -> Orders
- Course -> Students
- Playlist -> Songs
- Project -> Tasks

Design goal: data integrity + intuitive navigation.

---

# You Will Choose Your Own Domain

Pick one scenario and build it end-to-end yourself.

Options:
- Customer-Orders
- Course-Students
- Blog-Comments
- Playlist-Songs
- Project-Tasks

Rule of thumb:
- Keep the model simple enough to finish
- Make it interesting enough to stay motivated

---

# Project Timeline (7 Days)

## Days 1-2: Foundation
- Plan entities and relationship
- Write schema SQL (DDL)
- Generate synthetic test data

## Days 3-4: Backend
- Implement REST CRUD endpoints
- Add one-to-many routes
- Test with curl + Postman/Insomnia/Everest

## Days 5-7: Frontend
- Build Vanilla JS client
- Build React client
- Implement CRUD + relationship views

---

# Required Deliverables

By the end of the project, submit:

- Database schema SQL file
- Synthetic data SQL file
- REST API with full CRUD
- Relationship endpoints for one-to-many navigation
- Data import/export support (SQL and/or JSON)
- Vanilla JS frontend
- React frontend

---

# Suggested Tech Paths

## Java Track
- Spring Boot
- Spring Data / JPA / Hibernate
- Maven

## Python Track
- Flask or FastAPI
- SQLAlchemy
- pip-based package management

Universal tools:
- Git
- curl
- Postman, Insomnia, or Everest

---

# How You Will Be Evaluated

- Correct relationship design and schema quality
- API completeness and HTTP correctness
- Code quality and maintainability
- Frontend usability for hierarchical data
- End-to-end integration and reliability

Success looks like:
A working application where users can manage both master and detail records smoothly.

---

# Kanban Setup: Offload Your Thinking

Use a simple board with 5 columns:
- Backlog
- Ready
- In Progress
- Review/Test
- Done

Create cards as tiny, testable tasks (30-120 minutes each).

Starter cards to create on day 1:
- Choose domain and define master/detail entities
- Draft schema SQL and validate foreign keys
- Generate synthetic data and load database
- Implement GET /masters and test with curl
- Implement GET /details and test with curl
- Create API test collection (Postman/Insomnia/Everest)

Rules to stay on-track:
- Keep only 1 card per person in In Progress
- If blocked for over 20 minutes, add a blocker note to the card
- End each day by moving cards and writing tomorrow's first 3 cards

---

# Kickoff: First 24 Hours

1. Pick your domain.
2. Draw master and detail entities.
3. Define keys and foreign key constraints.
4. Create schema SQL and load sample data.
5. Test first GET endpoints with curl.
6. Create your Kanban board and enter at least 12 starter cards.

## Milestone Checkpoint
If your schema, first GET endpoints, and Kanban board are working, you are on track.
