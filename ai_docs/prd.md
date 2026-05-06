# Product Requirements Document (PRD)
## Project: Smart Consistent Load Balancer (Infollion Software Developer Intern Assignment - Task 3)

### 1. Introduction and Objectives
The objective of this project is to build a modern, robust, and functional load balancer to route incoming IP traffic to a set of healthy server nodes. The existing implementation uses a naive random routing strategy, which must be replaced with a deterministic, consistent approach. This project will serve as a submission for the first round of the Infollion Software Developer Intern hiring process.

**Primary Goal:** 
Implement an algorithm where a specific IP address consistently routes to the same node, even if nodes are dynamically added or removed, ensuring minimal disruption.

**Secondary Goals:**
Enhance the core logic with production-ready features like health checks, rate limiting, weighted routing, and an observable metrics dashboard.

### 2. Functional Requirements

#### Core Features (P0)
- **Consistent Hashing Algorithm:** Replace the `Math.random()` approach. A given IP address must reliably and repeatedly map to the exact same node. When a node is added or removed, only a minimal fraction of IPs should be re-mapped to new nodes (thereby avoiding a complete re-hashing of all IPs).
- **Request Logging:** Every routed request must be visibly logged (e.g., `[TIMESTAMP] Incoming IP: x.x.x.x -> Routed to: Node-A`).

#### Bonus Features / Enhancements (P1)
- **Basic Node Health Checks:** A mechanism to periodically ping or simulate checks on registered nodes. If a node fails, it should be temporarily removed from the routing pool.
- **Weighted Routing:** The ability to assign "weights" to nodes (e.g., Node A gets weight 2, Node B gets weight 1), meaning Node A handles roughly twice the traffic of Node B.
- **Rate Limiting Logic:** Prevent abuse by limiting the number of requests a single IP can make within a specified time window (e.g., max 10 requests per minute).
- **Simple Metrics Dashboard:** An API endpoint that returns statistics on how many requests each node has served, the number of currently healthy nodes, and rate-limited attempts.

### 3. Non-Functional Constraints
- **In-Memory Structures Only:** No external databases (e.g., Redis, PostgreSQL) are allowed. We will use native Maps, Sets, and Arrays.
- **No Concurrency Handling Required:** The focus is purely on the logical algorithms, not handling race conditions or multi-threading.
- **Simplicity & Readability:** The code must remain clean, well-commented, and easily understandable for an evaluator. Beginner-friendly but professional.

### 4. Technical Stack
- **Language:** JavaScript (Node.js) - *Selected because the provided initial code is in JS, and it easily satisfies the "In-memory structures only" constraint through Node.js process memory.*
- **Framework:** Express.js (For creating the API endpoints and Metrics Dashboard).
- **Testing:** Postman (For the requested optional API demonstration).
- **Version Control:** Git & GitHub.

### 5. Architectural Design & Algorithms

#### 5.1. The Consistent Hashing Ring
To satisfy the core requirement of mapping IPs to nodes reliably:
1. We will use a **Hash Ring**.
2. Each node will be hashed (e.g., using a built-in hash like Node's `crypto` module or a custom fast string hash) and placed on a "Ring" (an array sorted by hash values).
3. To handle **Weighted Routing**, we will use the concept of *Virtual Nodes*. If Node A has a weight of 2, we will add 2 (or a multiple of 2) virtual node hashes to the ring. If Node B has a weight of 1, we add 1.
4. When a request comes in from an IP, we hash the IP, find its position on the ring, and search for the closest node hash greater than the IP's hash (using Binary Search for efficiency).

#### 5.2. Rate Limiting (Fixed Window)
A simple "Fixed Window" counter using a JavaScript `Map`. 
- `Map<IP_Address, { count: number, resetTime: number }>`
- When an IP requests, we check the map. If `count > MAX_LIMIT` within the window, we reject the request. Otherwise, we increment the count.

#### 5.3. Health Checker Module
- A simulated polling loop running on `setInterval`. 
- It updates a node's status to `healthy` or `unhealthy`.
- If a node becomes `unhealthy`, its virtual nodes are temporarily removed from the Hash Ring so no new IPs are routed there.

### 6. API Specifications

| Endpoint | Method | Description |
|---|---|---|
| `/api/request` | `GET` | Simulates an incoming request. Accepts an `ip` query parameter. Returns the node it was routed to. |
| `/api/nodes` | `GET` | Returns the list of nodes, their weights, and their current health status. |
| `/api/nodes/:id/status` | `PUT` | Manually update a node's health status (for simulation/demo purposes). |
| `/api/metrics` | `GET` | Returns the metrics dashboard (total requests, requests per node, blocked requests). |

### 7. Deliverables & Milestones
- [ ] **Milestone 1:** Node/Express setup and porting the provided starter code.
- [ ] **Milestone 2:** Implement the Consistent Hashing Ring (Core Requirement).
- [ ] **Milestone 3:** Add Virtual Nodes for Weighted Routing (Bonus).
- [ ] **Milestone 4:** Implement In-memory Rate Limiting (Bonus).
- [ ] **Milestone 5:** Implement Health Check polling and dynamically updating the Ring (Bonus).
- [ ] **Milestone 6:** Implement Metrics tracking API (Bonus).
- [ ] **Milestone 7:** Clean Code Review, Documentation (`README.md`), and Postman Collection setup for final delivery.
