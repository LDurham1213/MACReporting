Visualizing REST API with ListOf and DetailView Patterns

This document uses Mermaid diagrams to illustrate how the ListOf and DetailView architectural patterns work within a REST API service.

## API Architecture Overview

```mermaid
graph TB
    Client[Client Application]
    API[REST API Service]
    DB[(Database)]

    Client -->|HTTP Requests| API
    API -->|Queries| DB
    DB -->|Data| API
    API -->|JSON Responses| Client

    subgraph "ListOf & DetailView Pattern"
        LM[ListOfMasters]
        DM[DetailOfMaster]
        LD[ListOfDetails]
        DD[DetailOfDetail]
    end

    Client -.->|GET /resources| LM
    Client -.->|GET /resources/:id| DM
    Client -.->|GET /resources/:id/sub-resources| LD
    Client -.->|GET /resources/:id/sub-resources/:subId| DD
```

## Master-Detail Entity Relationship

```mermaid
erDiagram
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER {
        int id PK
        date order_date
        string customer_name
        decimal total_amount
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        string product_name
        int quantity
        decimal price
    }
```

## Component Flow for ListOf and DetailView

```mermaid
flowchart TD
    subgraph "Client"
        UI[User Interface]
    end

    subgraph "REST API"
        Controller[API Controller]
        Service[Service Layer]
        Repository[Data Repository]

        subgraph "Data Transfer Objects"
            MLD[Master List DTO]
            MDV[Master Detail DTO]
            DLD[Detail List DTO]
            DDV[Detail Detail DTO]
        end
    end

    Database[(Database)]

    UI -->|1. Request| Controller
    Controller -->|2. Process| Service
    Service -->|3. Query| Repository
    Repository -->|4. Fetch| Database
    Repository -->|5. Map to DTO| MLD/MDV/DLD/DDV
    Service -->|6. Enrich| MLD/MDV/DLD/DDV
    Controller -->|7. Return JSON| UI
```

## Request-Response Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant DB as Database

    Note over Client,API: ListOfMasters Pattern
    Client->>API: GET /api/orders
    API->>DB: Query orders (paginated)
    DB-->>API: Return basic order data
    API-->>Client: JSON array of order summaries

    Note over Client,API: DetailOfMaster Pattern
    Client->>API: GET /api/orders/123
    API->>DB: Query order details for ID 123
    DB-->>API: Return complete order data
    API-->>Client: JSON object with order details

    Note over Client,API: ListOfDetails Pattern
    Client->>API: GET /api/orders/123/items
    API->>DB: Query items for order ID 123
    DB-->>API: Return items data
    API-->>Client: JSON array of order items

    Note over Client,API: DetailOfDetail Pattern
    Client->>API: GET /api/orders/123/items/456
    API->>DB: Query item 456 from order 123
    DB-->>API: Return specific item data
    API-->>Client: JSON object with item details
```

## Data Structure Hierarchy

```mermaid
classDiagram
    class OrderListDTO {
        +Long id
        +Date date
        +String customerName
        +BigDecimal total
    }

    class OrderDetailDTO {
        +Long id
        +Date date
        +String customerName
        +String customerAddress
        +BigDecimal subtotal
        +BigDecimal tax
        +BigDecimal total
        +List~OrderItemListDTO~ items
    }

    class OrderItemListDTO {
        +Long id
        +String productName
        +int quantity
        +BigDecimal price
    }

    class OrderItemDetailDTO {
        +Long id
        +String productName
        +String productDescription
        +int quantity
        +BigDecimal unitPrice
        +BigDecimal totalPrice
        +Map~String,String~ attributes
    }

    OrderDetailDTO *-- OrderItemListDTO
```

## URL Structure and Response Mapping

```mermaid
graph LR
    subgraph "URL Endpoints"
        GET_Orders["/api/orders"]
        GET_Order["/api/orders/:id"]
        GET_Items["/api/orders/:id/items"]
        GET_Item["/api/orders/:id/items/:itemId"]
    end

    subgraph "Response DTOs"
        OrderList["OrderListDTO[]"]
        OrderDetail["OrderDetailDTO"]
        ItemList["OrderItemListDTO[]"]
        ItemDetail["OrderItemDetailDTO"]
    end

    GET_Orders --> OrderList
    GET_Order --> OrderDetail
    GET_Items --> ItemList
    GET_Item --> ItemDetail

    style GET_Orders fill:#f9f,stroke:#333,stroke-width:2px
    style OrderList fill:#f9f,stroke:#333,stroke-width:2px

    style GET_Order fill:#bbf,stroke:#333,stroke-width:2px
    style OrderDetail fill:#bbf,stroke:#333,stroke-width:2px

    style GET_Items fill:#bfb,stroke:#333,stroke-width:2px
    style ItemList fill:#bfb,stroke:#333,stroke-width:2px

    style GET_Item fill:#fbf,stroke:#333,stroke-width:2px
    style ItemDetail fill:#fbf,stroke:#333,stroke-width:2px

    classDef listOfMasters fill:#f9f,stroke:#333,stroke-width:2px;
    classDef detailOfMaster fill:#bbf,stroke:#333,stroke-width:2px;
    classDef listOfDetails fill:#bfb,stroke:#333,stroke-width:2px;
    classDef detailOfDetail fill:#fbf,stroke:#333,stroke-width:2px;
```

## User Interface Navigation Flow

```mermaid
graph TD
    OrdersPage[Orders List Page] -->|Click Order| OrderDetailPage
    OrderDetailPage[Order Detail Page] -->|View Items Tab| ItemsListSection
    ItemsListSection[Order Items Section] -->|Click Item| ItemDetailDialog

    style OrdersPage fill:#f9f,stroke:#333,stroke-width:2px,color:#000
    style OrderDetailPage fill:#bbf,stroke:#333,stroke-width:2px,color:#000
    style ItemsListSection fill:#bfb,stroke:#333,stroke-width:2px,color:#000
    style ItemDetailDialog fill:#fbf,stroke:#333,stroke-width:2px,color:#000

    OrdersPage -.->|ListOfMasters| API
    OrderDetailPage -.->|DetailOfMaster| API
    ItemsListSection -.->|ListOfDetails| API
    ItemDetailDialog -.->|DetailOfDetail| API
```

## Key Benefits of the Pattern

```mermaid
mindmap
  root((ListOf & DetailView Pattern))
    Performance
      Pagination
      Selective loading
      Optimized queries
    User Experience
      Progressive disclosure
      Consistent navigation
      Reduced cognitive load
    Architecture
      Separation of concerns
      Maintainable code structure
      Scalable design
    Development
      Clear API contracts
      Reusable components
      Testable units
```

## Implementing in Different Technologies

```mermaid
graph LR
    subgraph "Backend Technologies"
        Java[Java/Spring Boot]
        Python[Python/Flask]
        Node[Node.js/Express]
    end

    subgraph "Frontend Technologies"
        React[React]
        Angular[Angular]
        Vue[Vue.js]
    end

    subgraph "Pattern Implementation"
        Controllers[API Controllers/Routes]
        Services[Service Layer]
        DTOs[Data Transfer Objects]
        Components[UI Components]
        State[State Management]
    end

    Java & Python & Node --> Controllers & Services & DTOs
    React & Angular & Vue --> Components & State
```

These diagrams provide a comprehensive visualization of how the ListOf and DetailView architectural patterns work within a REST API service, showing the data flow, component relationships, and implementation aspects across different layers of the application.
