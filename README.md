# Smart Consistent Hash Load Balancer

> **Infollion Software Developer Intern Assignment — Task 3**

A production-grade Node.js/Express load balancer that routes incoming IP addresses to backend nodes using **Consistent Hashing** — ensuring the same IP always hits the same node, even when nodes are added or removed.

---

## 🎯 Task Requirements & Deliverables Achieved

This repository completely fulfills the assignment requirements, including **all core features** and **all bonus challenges**.

### ✅ Core Features (Completed)
1. **Replace random selection with Proper Algorithm:** The `Math.random()` approach has been replaced with a **Consistent Hash Ring** utilizing the `FNV-1a` 32-bit hash algorithm.
2. **Consistent IP Routing:** An IP address is mathematically mapped to a position on the ring. It will **always** reach the exact same node, even across multiple requests. If a node fails, only a minimal subset of IPs is re-mapped.
3. **Add logging for each routed request:** The original `identifyNode` logger function was preserved exactly as requested and is invoked for every routed request.
4. **Beginner-friendly & Simplicity:** The logic relies purely on in-memory JS structures (`Array`, `Map`). It avoids concurrency issues and external databases.

### 🚀 Bonus Challenges (Completed)
- **Basic Node Health Checks:** A background health checker polls nodes on a `setInterval`. If a node fails, it is automatically temporarily removed from the ring to prevent dropped traffic. 
- **Weighted Routing:** Implemented using *Virtual Nodes*. For example, `Node-B` has a weight of 2, so it receives roughly 2× the traffic of `Node-A`.
- **Simple Metrics Dashboard:** A clean, live HTML dashboard is available at `/dashboard`. It auto-refreshes every 5 seconds to show active traffic share, total requests, and node health.
- **Rate Limiting Logic:** A fixed-window rate limiter prevents abuse (default: 10 requests per minute per IP), returning a `429 Too Many Requests` error when the limit is breached.

### 📦 Optional Deliverable: Postman Collection
A full Postman collection is included in the `postman/` directory, which demonstrates the API endpoints, consistent routing, failover, and rate limiting.

---

## ⚙️ Prerequisites

- **Node.js** v20 or later
- **npm** v9 or later

---

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/abhi-shek2004/Infollian_assessment.git
   cd Infollian_assessment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   *(You can edit `.env` to change the port, rate limit, or virtual node count if desired).*

4. **Start the Server**
   ```bash
   npm start
   ```

You will see an ASCII startup banner. Once running, open **http://localhost:3000/dashboard** in your browser.

---

## 📚 API Reference & Testing

You can use the provided **Postman Collection** (`postman/load-balancer.postman_collection.json`) or use `curl` commands below to test the API.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/request?ip=x.x.x.x` | Route an IP to a node (Core Requirement) |
| `GET` | `/api/request?simulate=true` | Route a randomly generated IP |
| `GET` | `/api/nodes` | List all nodes with their weight and health status |
| `PUT` | `/api/nodes/:id/status` | Manually set a node's health (to simulate a crash) |
| `GET` | `/api/metrics` | Full JSON metrics snapshot |
| `GET` | `/dashboard` | Live browser metrics dashboard |

### Quick `curl` Tests

**1. Test Consistent Routing (Run 5+ times, it always returns the same node)**
```bash
curl "http://localhost:3000/api/request?ip=192.168.1.100"
```

**2. Test Rate Limiting (Spam 15 requests)**
```bash
for i in {1..15}; do curl -s "http://localhost:3000/api/request?ip=8.8.8.8"; echo ""; done
```

**3. Simulate Node Failure (Watch traffic re-route)**
```bash
curl -X PUT "http://localhost:3000/api/nodes/Node-B/status" -H "Content-Type: application/json" -d '{"healthy": false}'
```

---

## 🏗️ Architecture Overview

To achieve an even distribution of traffic and support weighted nodes, this project uses **Virtual Nodes**.

```text
         Hash Ring (0 ─────────────────────── 4,294,967,295)
         │                                                 │
   Node-A#vnode-0    Node-B#vnode-0    Node-C#vnode-0    │
         │                │                  │            │
   [IP Hash] ──► finds nearest vnode clockwise ──► routed to that node's owner
```

- Each real node creates `150 * weight` virtual nodes on the ring.
- Node-A (weight 1) = 150 virtual nodes.
- Node-B (weight 2) = 300 virtual nodes (receives ~50% of total traffic).
- An IP is hashed with `FNV-1a` (fast, deterministic, zero-dependency) to find its position on the ring. 
- A binary search efficiently maps the IP to the nearest virtual node.

---

## 📁 Project Structure

```
├── src/
│   ├── config/config.js        # Environment configuration
│   ├── core/
│   │   ├── hashRing.js         # Consistent Hash Ring logic
│   │   ├── rateLimiter.js      # Fixed-window map logic
│   │   ├── healthChecker.js    # Simulated health polling
│   │   └── metricsStore.js     # In-memory traffic counters
│   ├── utils/
│   │   ├── hash.js             # Pure JS FNV-1a hash algorithm
│   │   └── logger.js           # Console timestamp formatter
│   ├── routes/                 # Express API endpoints
│   ├── dashboard/index.html    # Live metrics dashboard HTML
│   └── app.js                  # Express app & dependency injection
├── starter/original.js         # Unmodified assignment starter code
├── postman/                    # Postman collection
├── tests/                      # Automated bash testing scripts
├── server.js                   # Entry point
└── .env.example                # Config template
```

---

## License
ISC
