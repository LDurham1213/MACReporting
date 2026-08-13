# MACReporting

MACReporting is a 3-tier Python web application for creating and managing
chapter report templates and their associated questions.

The application uses a one-to-many relationship where one **Report Template**
can contain many **Questions**, and each Question belongs to one Report Template.

MACReporting was inspired by an existing reporting process using Google Forms
and Google Apps Script. This project begins the process of moving that workflow
into a standalone reporting application.

---

## Project Documentation

For detailed project requirements, development phases, database design,
implementation details, and future development plans, see
[Project_Plan.md](Project_Plan.md).

---

## MACReporting One-to-Many Relationship

For this implementation of the ListDetails project:

- **Master:** Report Template
- **Detail:** Question

The relationship is:

**Report Template (1) → Questions (Many)**

Each Question contains a `report_template_id` that associates it with a
specific Report Template.

Example:

```text
Committee Report
    ├── Question 1
    ├── Question 2
    └── Question 3

Post-Mortem Report
    ├── Question 1
    ├── Question 2
    └── Question 3
```

---

## Technology Stack

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

- curl
- Postman
- Node.js
- npm
- Git
- GitHub

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

Two frontend implementations were created:

```text
                  Flask REST API
                       ↓
                    SQLite
                   ↗       ↖
                  /         \
       Vanilla JavaScript   React
            Frontend        Frontend
```

Both frontends communicate with the same Flask REST API and SQLite database.

---

## Features Completed

### Report Templates

- Create Report Templates
- View Report Templates
- Edit Report Templates
- Delete Report Templates

### Questions

- Create Questions
- View Questions
- Edit Questions
- Delete Questions

### One-to-Many Relationship

- Select a Report Template
- Retrieve Questions associated with that Report Template
- Display the related Questions dynamically

### Additional Features

- JSON data import
- JSON data export
- Vanilla JavaScript frontend
- React frontend

The CRUD interface for Report Templates and Questions was created to meet the
requirements of this project.

In a future production version of MACReporting, Report Template and Question
management would primarily be administrative functionality. A typical user
would select a Report Type, answer the associated Questions, and submit the
completed report.

---

## REST API

### Report Templates

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/report-templates` | Retrieve all Report Templates |
| POST | `/report-templates` | Create a Report Template |
| PUT | `/report-templates/<template_id>` | Update a Report Template |
| DELETE | `/report-templates/<template_id>` | Delete a Report Template |

### Questions

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/questions` | Retrieve all Questions |
| POST | `/questions` | Create a Question |
| PUT | `/questions/<question_id>` | Update a Question |
| DELETE | `/questions/<question_id>` | Delete a Question |

### One-to-Many Relationship

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/report-templates/<template_id>/questions` | Retrieve Questions for a selected Report Template |

### Import / Export

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/export` | Export application data |
| POST | `/import` | Import application data |

---

## Frontends

### Vanilla JavaScript

The primary frontend uses HTML, CSS, and Vanilla JavaScript and provides full
CRUD functionality for Report Templates and Questions.

It also allows a user to select a Report Template and dynamically view the
Questions associated with that template.

### React

A second frontend was created using React and Vite.

The React frontend demonstrates:

- Retrieving data from the Flask REST API
- React components
- Props
- State
- `useEffect`
- API requests using `fetch()`
- Dynamic rendering
- Displaying Questions associated with a selected Report Template

The React frontend uses the same Flask REST API and SQLite database as the
Vanilla JavaScript frontend.

---

## Running the Application

### Flask / Vanilla JavaScript Frontend

From the main MACReporting directory, start the Flask application using the
Flask command used by the project.

The application is available at:

```text
http://127.0.0.1:5000
```

### React Frontend

The Flask server must be running for React to access the REST API.

Open a second terminal:

```bash
cd react-frontend
```

Install dependencies if they have not already been installed:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

The React frontend is available at:

```text
http://localhost:5173
```

During development:

```text
Flask / Vanilla JavaScript → Port 5000
React / Vite               → Port 5173
```

---

## Project Status

**Phases 1, 2, and 3 are complete.**

Detailed information about the implementation of each phase can be found in
[Project_Plan.md](Project_Plan.md).

---

# Original One-to-Many Project Instructions

## OnesToManys (ListDetails)

The point of this project is to explore what a 3-tier web application is like.
You can implment it in either Java (and Java frameworks) or Python (and Python frameworks).

Choosing one possible project relations below, you need to create a ListDetails application that allows users to manage their data in a 3-tier architecture.

This means it will have a REST API middle-end, with a relational database backend.

It has three phases.

### Phase 1 (days 1-2)

- build a plan for the project
- design the database schema by building out data objects
- write a SQL file with the schema
- generate another SQL file filled with synthetic generated data that can be loaded into the database
- create a REST server to create, read, update, and delete data objects
  - start with `curl` and doing a GET of your _master_ table
  - continue with `curl` and doing a GET of your _detail_ table
  - add the other CRUD operations for both master and detail tables

### Phase 2 (days 3-4)

- add a one to many relationship between your master and detail tables
- add REST API endpoints for the one to many relationship
- use a GUI based REST API client to test your endpoints
  - you might use Postman or Insomnia, or even Everest.
- add a means to dump and load your data to either SQL and/or JSON files

### Phase 3 (days 5-7)

- create a simple Vanilla JavaScript application to interact with your REST API
- do the same with React
- add web pages for CRUD operations for both master and detail tables
- add web pages for the one to many relationship, designing a UI that shows some dynamic data from the database

### Overall ListDetails Stacks

A basic SQL lab: tables, schema, selects, and crud in SQL repl; simple API access

Java: ListDetail phase 1,2 REST/DB app  
https://spring.io/guides/gs/accessing-data-rest

Spring; Data: ListDetail phase 1,2 REST/DB app  
(fastapi, flask, sqlite3)

https://zcw.guru/kristofer/ae5cb89250b14a6da2903a9cc613390b

---

## Understanding Master-Detail Relationships in Data Modeling

### What is a Master-Detail Relationship?

A master-detail relationship (sometimes called parent-child relationship) is a
fundamental data modeling concept where:

- **Master (Parent) Entity**: Contains primary information and can exist independently
- **Detail (Child) Entity**: Contains secondary information that depends on the master entity and cannot exist without it

### Why Master-Detail Relationships Matter

Understanding master-detail relationships is crucial for several reasons:

1. **Data Integrity**: Ensures related data remains consistent and valid
2. **Efficient Data Organization**: Provides logical structure to complex information
3. **Improved User Experience**: Enables intuitive navigation through hierarchical data
4. **Optimized Queries**: Allows for more efficient database operations
5. **Scalable Application Design**: Creates maintainable, extensible software architecture

---

## Real-World Examples Across Domains

### E-Commerce

- **Master**: Order
- **Detail**: Order Items

An order can contain multiple items, but each order item belongs to exactly one order.

### Finance

- **Master**: Invoice
- **Detail**: Line Items

An invoice contains multiple line items, but each line item is associated with exactly one invoice.

### Healthcare

- **Master**: Patient
- **Detail**: Medical Records

A patient has multiple medical records, but each record belongs to one patient.

### Education

- **Master**: Course
- **Detail**: Lectures/Assignments

A course consists of multiple lectures and assignments, but each lecture/assignment belongs to one course.

---

## Database Implementation

In relational databases, master-detail relationships are typically implemented using foreign keys:

```sql
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT,
    order_date DATE
);

CREATE TABLE order_items (
    item_id INT PRIMARY KEY,
    order_id INT REFERENCES orders(order_id),
    product_id INT,
    quantity INT
);
```

---

## Implementing in Java and Python

### Java Example (Spring Boot)

```java
@Entity
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Date orderDate;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items = new ArrayList<>();

    // Getters and setters
}
```

```java
@Entity
public class OrderItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "order_id")
    private Order order;

    private String productName;
    private int quantity;

    // Getters and setters
}
```

### Python Example (SQLAlchemy)

```python
from sqlalchemy import Column, Integer, String, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Order(Base):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True)
    order_date = Column(Date)
    items = relationship("OrderItem", back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_items'
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'))
    product_name = Column(String)
    quantity = Column(Integer)
    order = relationship("Order", back_populates="items")
```

---

## REST API Design for Master-Detail

A well-designed REST API should reflect the master-detail relationship in its endpoints.

### Resource Structure

- `/orders` - Get all orders
- `/orders/{id}` - Get a specific order
- `/orders/{id}/items` - Get all items for a specific order
- `/orders/{id}/items/{itemId}` - Get a specific item from a specific order

### Java Example (Spring Boot)

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    @Autowired
    private OrderService orderService;

    @GetMapping
    public List<Order> getAllOrders() {
        return orderService.findAll();
    }

    @GetMapping("/{id}")
    public Order getOrderById(@PathVariable Long id) {
        return orderService.findById(id);
    }

    @GetMapping("/{id}/items")
    public List<OrderItem> getOrderItems(@PathVariable Long id) {
        Order order = orderService.findById(id);
        return order.getItems();
    }
}
```

### Python Example (Flask)

```python
from flask import Flask, jsonify
from models import Order, OrderItem
from database import db_session

app = Flask(__name__)

@app.route('/api/orders', methods=['GET'])
def get_all_orders():
    orders = Order.query.all()
    return jsonify([{'id': o.id, 'order_date': o.order_date} for o in orders])

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify({
        'id': order.id,
        'order_date': order.order_date,
        'items': [{'id': item.id, 'product_name': item.product_name} for item in order.items]
    })

@app.route('/api/orders/<int:order_id>/items', methods=['GET'])
def get_order_items(order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify([{'id': item.id, 'product_name': item.product_name} for item in order.items])
```

---

## Administration Best Practices

1. **Cascade Operations**: Properly configure delete/update cascades
2. **Indexes**: Create appropriate indexes on foreign keys
3. **Constraints**: Implement referential integrity constraints
4. **Transactions**: Use transactions for operations involving both master and detail records
5. **Pagination**: Implement pagination for large detail collections
6. **Caching**: Consider caching frequently accessed master records

---

## Conclusion

Master-detail relationships are the backbone of effective data modeling and
application development. Understanding these relationships enables beginners to:

1. Design intuitive and efficient data models
2. Create scalable database schemas
3. Develop user-friendly applications
4. Build RESTful APIs that accurately represent business domains

As you progress in your Java or Python development journey, mastering this
concept will significantly enhance your ability to model real-world problems
and create robust solutions. Whether you're building a simple to-do app or an
enterprise-grade system, the master-detail pattern will be a constant companion
in your development toolkit.

---

## But wait...DTO?

What's a DTO? Why?

https://zcw.guru/kristofer/dtointro

---

## Possible Project Relations

These are some possible project relations for your ListDetail app.
You can also propose your own project relations, but it must be approved by an
instructor.

- Customer (master) - Orders (detail)
- Department (master) - Employees (detail)
- Course (master) - Students (detail)
- Author (master) - Books (detail)
- Invoice (master) - Line Items (detail)
- Product Category (master) - Products (detail)
- Blog Post (master) - Comments (detail)
- Playlist (master) - Songs (detail)
- Movie (master) - Actors (detail)
- University (master) - Departments (detail)
- Project (master) - Tasks (detail)
- Manufacturer (master) - Products (detail)
- Warehouse (master) - Inventory Items (detail)
- Email (master) - Attachments (detail)
- Country (master) - States/Provinces (detail)
- Hospital (master) - Patients (detail)
- Album (master) - Photos (detail)
- Survey (master) - Questions (detail)