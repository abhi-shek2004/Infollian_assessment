# Smart Consistent Hash Load Balancer

> **Infollion Software Developer Intern Assignment — Task 3**

A production-grade Node.js/Express load balancer that routes incoming IP addresses to backend nodes using **Consistent Hashing** — ensuring the same IP always hits the same node, even when nodes are added or removed.

---

## What Changed From the Starter Code

| Before | After |
|---|---|
| `Math.random()` → any node | FNV-1a hash → deterministic, consistent node |
| No persistence across requests | Same IP always maps to same node |
| 3 nodes, equal weighting | Weighted nodes (Node-B gets 2× traffic) |
| No health awareness | Unhealthy nodes auto-removed from ring |
| No rate protection | Fixed-window rate limiter (10 req/min) |
| Console output only | REST API + live metrics dashboard |

---

## How It Works — The Hash Ring

```
         Hash Ring (0 ─────────────────────── 4,294,967,295)
         │                                                 │
   Node-A#vnode-0    Node-B#vnode-0    Node-C#vnode-0    │
         │                │                  │            │
   [IP Hash] ──► finds nearest vnode clockwise ──► routed to that node's owner
```

1. Each node is placed on the ring as **N virtual nodes** (`N = weight × 150`)
2. `Node-B` (weight=2) has 300 virtual nodes vs 150 for the others — it handles ~50% of traffic
3. An IP is hashed with **FNV-1a** and the closest clockwise vnode determines its node
4. If a node goes down, its vnodes vanish — IPs re-map only to the remaining nodes

---

## Prerequisites

- **Node.js** v20 or later
- **npm** v9 or later

---

## Installation & Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd smart-consistent-hash-load-balancer

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env if you want to change defaults (port, rate limits, etc.)

# 4. Start the server
npm run dev       # Development (auto-restarts on file changes)
# or
npm start         # Production
```

---

## Running the Server

```bash
npm run dev
```

You'll see:
```
┌─────────────────────────────────────────────────┐
│   Smart Consistent Hash Load Balancer           │
│   Infollion Software Developer Intern — Task 3  │
├─────────────────────────────────────────────────┤
│   Server  : http://localhost:3000               │
│   Dashboard: http://localhost:3000/dashboard    │
└─────────────────────────────────────────────────┘
```

Open **http://localhost:3000/dashboard** for the live metrics dashboard.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/request?ip=x.x.x.x` | Route an IP to a node |
| `GET` | `/api/request?simulate=true` | Route a randomly generated IP |
| `GET` | `/api/nodes` | List all nodes (weight, health, vnode count) |
| `PUT` | `/api/nodes/:id/status` | Manually set a node's health status |
| `GET` | `/api/metrics` | Full metrics snapshot |
| `GET` | `/dashboard` | Live browser metrics dashboard |

### Example Requests

```bash
# Route a fixed IP (run multiple times — always same node)
curl "http://localhost:3000/api/request?ip=192.168.1.100"

# Mark Node-B as unhealthy
curl -X PUT "http://localhost:3000/api/nodes/Node-B/status" \
  -H "Content-Type: application/json" \
  -d '{"healthy": false}'

# Get metrics
curl "http://localhost:3000/api/metrics"
```

---

## Configuration (`.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `HOST` | `localhost` | HTTP server host |
| `VIRTUAL_NODES_PER_WEIGHT` | `150` | Virtual nodes per weight unit (higher = more even distribution) |
| `RATE_LIMIT_MAX` | `10` | Max requests per IP per window |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in milliseconds (60s) |
| `HEALTH_CHECK_INTERVAL_MS` | `10000` | How often health checks run (10s) |
| `HEALTH_CHECK_FAIL_PROBABILITY` | `0.1` | Probability a node "fails" each check cycle |
| `LOG_TO_FILE` | `true` | Whether to write logs to a file |
| `LOG_FILE_PATH` | `./logs/requests.log` | Log file path |

---

## Default Nodes & Weights

| Node | Weight | Virtual Nodes | Expected Traffic Share |
|---|---|---|---|
| Node-A | 1 | 150 | ~25% |
| Node-B | 2 | 300 | ~50% |
| Node-C | 1 | 150 | ~25% |

---

## Example Log Output

```
[2026-05-07T02:30:00.000Z] [INFO ] Incoming IP: 192.168.1.100 → Routed to: Node-A
[2026-05-07T02:30:01.000Z] [INFO ] Incoming IP: 10.0.0.50 → Routed to: Node-B
[2026-05-07T02:30:10.000Z] [WARN ] HealthChecker: Node "Node-C" marked UNHEALTHY (simulated failure).
[2026-05-07T02:30:20.000Z] [INFO ] HealthChecker: Node "Node-C" has RECOVERED.
[2026-05-07T02:30:21.000Z] [WARN ] Rate limit exceeded for IP: 10.10.10.10
```

---

## Postman Collection

Import `postman/load-balancer.postman_collection.json` directly into Postman.

The collection includes 12 requests covering:
- Consistent routing demo (same IP → same node, always)
- Failover demo (mark a node unhealthy, watch IPs re-map)
- Rate limiting demo (11th request → 429)
- All error cases (400, 404, 503)

---

## Project Structure

```
├── src/
│   ├── config/config.js        # Environment config
│   ├── core/
│   │   ├── hashRing.js         # Consistent Hash Ring (the brain)
│   │   ├── rateLimiter.js      # Fixed-window rate limiter
│   │   ├── healthChecker.js    # Simulated health polling
│   │   └── metricsStore.js     # In-memory metrics
│   ├── utils/
│   │   ├── hash.js             # FNV-1a hash function
│   │   └── logger.js           # Timestamped logger
│   ├── routes/                 # Express route handlers
│   ├── dashboard/index.html    # Live metrics dashboard
│   └── app.js                  # Express app factory
├── starter/original.js         # Unmodified assignment starter code
├── postman/                    # Postman collection
├── server.js                   # Entry point
└── .env.example                # Config template
```

---

## License

ISC
