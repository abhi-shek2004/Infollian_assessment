# Implementation Plan
## Smart Consistent Hash Load Balancer — Infollion SDE Intern Assignment (Task 3)

> **Status:** Draft v1.0 | **Last Updated:** 2026-05-07

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [What the Assignment Actually Requires](#2-what-the-assignment-actually-requires)
3. [Tech Stack & Tooling Decisions](#3-tech-stack--tooling-decisions)
4. [Final Folder Structure](#4-final-folder-structure)
5. [Environment & Config (.env)](#5-environment--config-env)
6. [Module-by-Module Implementation](#6-module-by-module-implementation)
7. [Milestone Checklist](#7-milestone-checklist)
8. [Known Issues & Pitfalls](#8-known-issues--pitfalls)
9. [Postman Collection Plan](#9-postman-collection-plan)
10. [README Structure](#10-readme-structure)
11. [How to Stand Out](#11-how-to-stand-out)

---

## 1. Project Overview

The evaluator provides a broken starter snippet using `Math.random()` for routing:

```js
function LoadBalancer(ip) {
  const randomIndex = Math.floor(Math.random() * nodes.length);
  const selectedNode = nodes[randomIndex];
  identifyNode(ip, selectedNode);
  return selectedNode;
}
```

**Our job:** Replace this with a **Consistent Hashing Ring** that:
- Always routes the same IP to the same node
- Minimizes re-mapping when nodes are added/removed
- Layers in health checks, weighted routing, rate limiting, and a metrics API

---

## 2. What the Assignment Actually Requires

### Must Have (P0 — Will fail without these)
| # | Requirement | Source |
|---|---|---|
| 1 | Replace `Math.random()` with consistent hashing | PDF page 2 |
| 2 | Same IP must always reach same node, even if node count changes | PDF page 2 |
| 3 | Log every routed request: `Incoming IP: x.x.x.x → Routed to: Node-A` | PDF page 1 |
| 4 | Keep `generateRandomIP()`, `identifyNode()`, `simulateTraffic()` functions | PDF page 1–2 |
| 5 | GitHub repo with clear setup/run instructions | PDF page 2 |

### Nice to Have (P1 — Bonus, separates top submissions)
| # | Requirement | Source |
|---|---|---|
| 6 | Basic node health checks | PDF page 2 |
| 7 | Weighted routing (prioritize some nodes) | PDF page 2 |
| 8 | Simple metrics dashboard | PDF page 2 |
| 9 | Rate limiting logic | PDF page 2 |
| 10 | Postman collection / short demo (max 2 min) | PDF page 2 |

---

## 3. Tech Stack & Tooling Decisions

| Concern | Choice | Reason |
|---|---|---|
| Runtime | Node.js LTS (v20+) | Starter code is in JS |
| Framework | Express.js | Minimal, standard, easy for evaluators to run |
| Hash Function | **FNV-1a (pure JS, 32-bit)** | Faster than `crypto`, zero deps, deterministic, readable |
| Virtual Nodes | **150 per weight unit** | Industry standard for even ring distribution |
| Rate Limit | Fixed Window via `Map` | Matches PRD; simple to read and explain |
| Config | `.env` via `dotenv` | All tunable values in one place — production standard |
| Logging | Custom `logger.js` (console + optional file) | No heavy deps; clean timestamped output |
| Package Manager | npm | Per user preference |
| Linter | ESLint (standard config) | Signals code quality to evaluator |

**Why FNV-1a over `crypto` SHA1/MD5:**
- No `require('crypto')` overhead on every request
- Pure 32-bit unsigned integer output — easy to place on a sorted ring
- Deterministic and fast; simple enough for evaluators to read inline

---

## 4. Final Folder Structure

```
smart-consistent-hash-load-balancer/
├── src/
│   ├── config/
│   │   └── config.js            # Loads & validates .env; exports typed config object
│   ├── core/
│   │   ├── hashRing.js          # Consistent Hash Ring class (the brain)
│   │   ├── rateLimiter.js       # Fixed-window rate limiter
│   │   ├── healthChecker.js     # setInterval-based health simulation
│   │   └── metricsStore.js      # In-memory request/block counters
│   ├── utils/
│   │   ├── hash.js              # FNV-1a hash function
│   │   └── logger.js            # Timestamped console + optional file logger
│   ├── routes/
│   │   ├── request.route.js     # GET /api/request
│   │   ├── nodes.route.js       # GET /api/nodes, PUT /api/nodes/:id/status
│   │   └── metrics.route.js     # GET /api/metrics
│   ├── dashboard/
│   │   └── index.html           # Simple auto-refresh HTML dashboard (no framework)
│   └── app.js                   # Express app setup (no listen here)
├── starter/
│   └── original.js              # Unmodified starter code from assignment PDF
├── postman/
│   └── load-balancer.postman_collection.json
├── logs/
│   └── .gitkeep
├── .env.example
├── .env                         # (gitignored)
├── .gitignore
├── .eslintrc.json
├── package.json
├── server.js                    # Entry point — calls app.listen()
└── README.md
```

> **Why `starter/original.js`?** Keeping the unmodified starter code shows the evaluator exactly where we began and demonstrates the improvement delta clearly.

> **Why separate `app.js` and `server.js`?** Industry best practice — allows the app to be tested without binding to a port.

---

## 5. Environment & Config (.env)

### `.env.example`
```env
# Server
PORT=3000
HOST=localhost

# Consistent Hashing
VIRTUAL_NODES_PER_WEIGHT=150

# Rate Limiting
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000

# Health Check
HEALTH_CHECK_INTERVAL_MS=10000
HEALTH_CHECK_FAIL_PROBABILITY=0.1

# Logging
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/requests.log
```

### `src/config/config.js`
```js
require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || 'localhost',
  virtualNodesPerWeight: Math.max(parseInt(process.env.VIRTUAL_NODES_PER_WEIGHT, 10) || 150, 10),
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 10,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  },
  healthCheck: {
    intervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS, 10) || 10000,
    failProbability: parseFloat(process.env.HEALTH_CHECK_FAIL_PROBABILITY) || 0.1,
  },
  logging: {
    toFile: process.env.LOG_TO_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/requests.log',
  },
};
```

> **Note:** `Math.max(..., 10)` enforces a minimum of 10 virtual nodes to prevent severely uneven ring distribution from a bad config value.

---

## 6. Module-by-Module Implementation

---

### 6.1 Hash Utility — `src/utils/hash.js`

**Algorithm: FNV-1a (32-bit)**

```js
/**
 * FNV-1a 32-bit hash.
 * Deterministic, fast, zero dependencies.
 * Always returns an unsigned 32-bit integer (0 to 4,294,967,295).
 * @param {string} str
 * @returns {number}
 */
function fnv1aHash(str) {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);       // XOR with current byte
    hash = (hash * 16777619) >>> 0;  // Multiply by FNV prime; >>> 0 keeps uint32
  }
  return hash;
}

module.exports = { fnv1aHash };
```

**Critical detail:** `>>> 0` forces unsigned 32-bit integer, preventing negative values on the ring.

---

### 6.2 Consistent Hash Ring — `src/core/hashRing.js`

This is the **most important module**. The evaluator will read this carefully.

**Data structures:**
- `this.nodes` — `Map<nodeId, { weight: number, healthy: boolean }>` — master registry
- `this.ring` — `Array<{ hash: number, nodeId: string }>` — sorted array of virtual node entries

**Public API:**
```
addNode(nodeId, weight = 1)       → Add node; insert weight×vnodeCount virtual nodes
removeNode(nodeId)                 → Remove all virtual nodes for nodeId permanently
setNodeHealth(nodeId, healthy)     → Mark healthy/unhealthy; rebuild ring accordingly
getNode(ip)                        → Hash IP; binary search ring; return nodeId
getNodes()                         → Return array of all node metadata objects
```

**`addNode(nodeId, weight)` algorithm:**
```
1. Store in this.nodes Map: { weight, healthy: true }
2. For i = 0 to (weight × this.virtualNodesPerWeight):
     key = `${nodeId}#vnode-${i}`
     push { hash: fnv1aHash(key), nodeId } onto this.ring
3. Sort this.ring by hash ascending
```

**`getNode(ip)` algorithm:**
```
1. If ring is empty → throw Error('No healthy nodes available')
2. ipHash = fnv1aHash(ip)
3. Binary search this.ring for first entry where entry.hash >= ipHash
4. If no such entry found (ipHash > all ring hashes) → wrap around to this.ring[0]
5. Return entry.nodeId
```

**`setNodeHealth(nodeId, healthy)` algorithm:**
```
1. Update this.nodes.get(nodeId).healthy = healthy
2. Call this._rebuildRing()
```

**`_rebuildRing()` internal method:**
```
1. this.ring = []
2. For each [nodeId, { weight, healthy }] in this.nodes:
     if healthy:
       For i = 0 to weight × virtualNodesPerWeight:
         push { hash: fnv1aHash(`${nodeId}#vnode-${i}`), nodeId }
3. Sort this.ring by hash ascending
```

**Edge cases handled in `getNode`:**
| Scenario | Behavior |
|---|---|
| Ring is empty | Throw `Error('No healthy nodes available')` |
| IP hash > all ring entries | Wrap to `ring[0]` (circular ring) |
| IP hash exactly equals a vnode hash | Use `>=` comparison (exact match routes correctly) |
| Only 1 healthy node | All IPs go to it — correct behavior |

---

### 6.3 Rate Limiter — `src/core/rateLimiter.js`

**Data structure:** `Map<ip, { count: number, resetTime: number }>`

**`isAllowed(ip)` logic:**
```
now = Date.now()
entry = this.map.get(ip)

if (!entry || entry.resetTime <= now):
  this.map.set(ip, { count: 1, resetTime: now + windowMs })
  return true  // ALLOWED

if (entry.count >= this.max):
  this.blockedCount++
  return false  // BLOCKED

entry.count++
return true  // ALLOWED
```

**Cleanup:** Run `setInterval` every 5 minutes to delete entries where `resetTime < Date.now()`. Prevents unbounded memory growth from unique IPs.

**Public API:**
```
isAllowed(ip)  → boolean
getStats()     → { totalTracked: number, blockedTotal: number }
```

---

### 6.4 Health Checker — `src/core/healthChecker.js`

Simulates real health checks with a configurable failure probability (no real servers).

**`_check()` logic (runs every `intervalMs`):**
```
for each node in hashRing.getNodes():
  roll = Math.random()

  // Safety: never mark the last healthy node as unhealthy
  healthyCount = count of healthy nodes in hashRing
  if (roll < failProbability && healthyCount > 1):
    hashRing.setNodeHealth(node.id, false)
    logger.warn(`Node ${node.id} marked UNHEALTHY`)
  else:
    if (node was unhealthy):
      hashRing.setNodeHealth(node.id, true)
      logger.info(`Node ${node.id} RECOVERED`)
```

**Public API:**
```
start()  → begins setInterval
stop()   → clears interval (for graceful shutdown)
```

> **Safety rule:** Never mark the last healthy node as unhealthy. This prevents the `503 No healthy nodes` error from being triggered by the health checker itself.

---

### 6.5 Metrics Store — `src/core/metricsStore.js`

Single in-memory source of truth for the dashboard.

**`getSnapshot()` return shape:**
```js
{
  totalRequests: number,
  blockedRequests: number,
  uptimeSeconds: number,
  requestsPerNode: { "Node-A": 42, "Node-B": 31, "Node-C": 27 },
  healthyNodeCount: number,
  unhealthyNodes: ["Node-B"]
}
```

**Public API:**
```
recordRequest(nodeId)   → increment node hit counter and total
recordBlocked(ip)       → increment blocked counter
getSnapshot(ring)       → return full snapshot (needs ring reference for health info)
```

---

### 6.6 Logger — `src/utils/logger.js`

```
Format: [2026-05-07T02:30:00.000Z] [INFO]  Incoming IP: 192.168.1.1 → Routed to: Node-A
Format: [2026-05-07T02:30:01.000Z] [WARN]  Node-B marked UNHEALTHY
Format: [2026-05-07T02:30:02.000Z] [ERROR] No healthy nodes available
```

- Always writes to `process.stdout`
- If `LOG_TO_FILE=true`, also appends to log file via `fs.appendFile` (async)
- Exports: `logger.info(msg)`, `logger.warn(msg)`, `logger.error(msg)`

---

### 6.7 API Routes

#### `GET /api/request?ip=x.x.x.x`
**File:** `src/routes/request.route.js`

```
1. Read ip from req.query.ip
2. If missing → 400 { error: "ip query parameter is required" }
3. Validate format with /^\d{1,3}(\.\d{1,3}){3}$/ → 400 if invalid
4. rateLimiter.isAllowed(ip) → false: 429 { error: "Rate limit exceeded. Try again in Xs." }
5. hashRing.getNode(ip) → catches Error → 503 { error: "No healthy nodes available" }
6. metricsStore.recordRequest(nodeId)
7. logger.info(`Incoming IP: ${ip} → Routed to: ${nodeId}`)  ← matches required format
8. identifyNode(ip, nodeId)  ← call original assignment function
9. 200 { ip, node: nodeId, timestamp: new Date().toISOString() }
```

#### `GET /api/nodes`
Returns: `200 { nodes: [{ id, weight, healthy, vnodeCount }] }`

#### `PUT /api/nodes/:id/status`
Body: `{ "healthy": true | false }`

```
1. Find node by id → 404 if not found
2. Validate body.healthy is boolean → 400 if missing/invalid
3. hashRing.setNodeHealth(id, healthy)
4. 200 { id, healthy, message: "Node status updated" }
```

#### `GET /api/metrics`
Returns: `200 { ...metricsStore.getSnapshot(hashRing) }`

#### `GET /dashboard`
Serve `src/dashboard/index.html` as a static file.

- Auto-refreshes every 5 seconds via `<meta http-equiv="refresh" content="5">`
- Fetches `/api/metrics` and `/api/nodes` via inline `fetch()` calls
- Displays: node table (name, weight, status, request count), summary metrics
- Pure HTML + inline CSS — no external dependencies

---

### 6.8 Dependency Wiring — `src/app.js`

All modules created once and passed via route factory functions (Dependency Injection pattern):

```js
const ring = new HashRing(config.virtualNodesPerWeight);

// Seed default nodes
ring.addNode('Node-A', 1);
ring.addNode('Node-B', 2);  // Weight 2 = ~2x the traffic
ring.addNode('Node-C', 1);

const limiter = new RateLimiter(config.rateLimit.max, config.rateLimit.windowMs);
const metrics = new MetricsStore();
const checker = new HealthChecker(ring, metrics, config.healthCheck);
checker.start();

app.use('/api/request', createRequestRouter({ ring, limiter, metrics, logger }));
app.use('/api/nodes',   createNodesRouter({ ring }));
app.use('/api/metrics', createMetricsRouter({ metrics, ring }));
app.use('/dashboard',   express.static(path.join(__dirname, 'dashboard')));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## 7. Milestone Checklist

### Milestone 1 — Project Scaffold
- [ ] `npm init -y`
- [ ] `npm install express dotenv`
- [ ] `npm install --save-dev eslint nodemon`
- [ ] Create full folder structure
- [ ] Save `starter/original.js` with unmodified PDF starter code
- [ ] Create `.env` from `.env.example`
- [ ] Add `package.json` scripts: `"start": "node server.js"`, `"dev": "nodemon server.js"`, `"lint": "eslint src/"`
- [ ] Create `.gitignore` with: `node_modules/`, `.env`, `logs/*.log`
- [ ] `git init` + initial commit: `"chore: initial project scaffold"`

### Milestone 2 — Hash Utility
- [ ] Implement `fnv1aHash()` in `src/utils/hash.js`
- [ ] Verify: same string → same number on every call
- [ ] Verify: `fnv1aHash("192.168.1.1")` is a valid uint32 (non-negative)

### Milestone 3 — Consistent Hash Ring
- [ ] Implement full `HashRing` class
- [ ] Manual test: route 100 IPs, remove a node, re-route — verify minimal re-mapping
- [ ] Commit: `"feat: implement consistent hash ring with virtual nodes"`

### Milestone 4 — Weighted Routing
- [ ] Verify vnode counts: `Node-B (w=2)` has 2× the vnodes of `Node-A (w=1)`
- [ ] Route 1000 IPs, log distribution, verify Node-B handles ~50%

### Milestone 5 — Rate Limiter
- [ ] Implement `RateLimiter` class with cleanup
- [ ] Test: IP blocked on 11th request within window
- [ ] Test: IP allowed again after window reset

### Milestone 6 — Health Checker
- [ ] Implement `HealthChecker` class
- [ ] Test: manually `PUT /api/nodes/Node-B/status` `{ healthy: false }` → Node-B gets 0 requests
- [ ] Test: re-enable Node-B → traffic resumes
- [ ] Verify: last healthy node is never auto-failed by checker

### Milestone 7 — Metrics Store
- [ ] Implement `MetricsStore`
- [ ] Verify `GET /api/metrics` returns accurate counts

### Milestone 8 — Express App & Routes
- [ ] Wire all modules into `src/app.js`
- [ ] Implement all 4 routes with validation
- [ ] Test all error cases (400, 404, 429, 503)
- [ ] Commit: `"feat: add all API routes"`

### Milestone 9 — Dashboard
- [ ] Create `src/dashboard/index.html`
- [ ] Auto-refresh working, tables rendering correctly

### Milestone 10 — Postman Collection
- [ ] Create `postman/load-balancer.postman_collection.json` (Postman Collection v2.1 format)
- [ ] All 9 requests documented with expected responses

### Milestone 11 — Final Polish
- [ ] Write `README.md`
- [ ] Run `npm run lint` → zero errors
- [ ] Manual end-to-end walkthrough
- [ ] Push to GitHub with clean commit history

---

## 8. Known Issues & Pitfalls

### 8.1 Hash Ring Edge Cases

| Issue | Scenario | Solution |
|---|---|---|
| Empty ring | All nodes unhealthy | Throw `Error('No healthy nodes available')`; route returns `503` |
| Ring wrap-around | IP hash > all vnode hashes | Fall back to `ring[0]` — the ring is circular |
| Exact hash collision | IP hash === vnode hash | Use `>=` in binary search, not strict `>` |
| Single node | Only one node exists | All IPs route to it — correct behavior |
| Node never recovers | Health checker never re-enables | Recovery path: if `node was unhealthy && roll >= failProbability` → mark healthy |

### 8.2 Rate Limiter Issues

| Issue | Scenario | Solution |
|---|---|---|
| Unbounded memory | Unique IPs accumulate in Map forever | Run cleanup `setInterval` every 5 minutes |
| Window boundary race | Request at exact reset boundary | Use `<=` for reset check: `if (entry.resetTime <= now)` |
| `NaN` window time | Bad `RATE_LIMIT_WINDOW_MS` env value | Parse with `parseInt` + fall back to `60000` default |

### 8.3 Health Checker Issues

| Issue | Scenario | Solution |
|---|---|---|
| All nodes fail | Low probability but possible | Never mark the last healthy node as unhealthy |
| Interval too short | Ring rebuilds too frequently | Default 10s; expose via `.env` |
| Node stuck unhealthy | No recovery path coded | Always run recovery check — if roll >= failProbability and node is unhealthy, heal it |

### 8.4 Express / API Issues

| Issue | Scenario | Solution |
|---|---|---|
| Missing `ip` param | `GET /api/request` with no query | `400 { error: "ip query parameter is required" }` |
| Invalid IP format | `ip=hello-world` | Regex validation, return `400` |
| Invalid node ID in PUT | `Node-Z` doesn't exist | Check `hashRing.getNodes()`, return `404` |
| Invalid body in PUT | `{ "healthy": "yes" }` | `typeof body.healthy !== 'boolean'` → `400` |
| Unhandled rejection | Any unhandled async error | `process.on('unhandledRejection', ...)` in `server.js` |

### 8.5 Configuration Issues

| Issue | Scenario | Solution |
|---|---|---|
| `.env` not loaded | dotenv called after config import | `require('dotenv').config()` at **top** of `config.js` |
| Non-numeric env values | `RATE_LIMIT_MAX=abc` | `parseInt` with fallback default |
| Too few virtual nodes | `VIRTUAL_NODES_PER_WEIGHT=1` | Enforce minimum of 10 in `config.js` |

### 8.6 Logical Pitfall — Why 150 Virtual Nodes?

With only 3 real nodes and `VIRTUAL_NODES_PER_WEIGHT=1`, the ring has 3 points. A single hash collision or unlucky hash distribution causes one node to handle 80%+ of traffic. With 150 vnodes per weight unit, Node-A has 150 points, Node-B has 300, Node-C has 150 — 600 total — giving a statistically even distribution.

---

## 9. Postman Collection Plan

**File:** `postman/load-balancer.postman_collection.json`
**Format:** Postman Collection v2.1 (importable directly)
**Variable:** `base_url = http://localhost:3000`

| # | Name | Method | URL | Notes |
|---|---|---|---|---|
| 1 | Route – Fixed IP (Consistent) | GET | `{{base_url}}/api/request?ip=192.168.1.100` | Run multiple times → always Node-A |
| 2 | Route – Another Fixed IP | GET | `{{base_url}}/api/request?ip=10.0.0.50` | Proves determinism |
| 3 | Route – No IP (Error) | GET | `{{base_url}}/api/request` | Expects `400` |
| 4 | Route – Invalid IP (Error) | GET | `{{base_url}}/api/request?ip=not-an-ip` | Expects `400` |
| 5 | Get All Nodes | GET | `{{base_url}}/api/nodes` | Shows weights and health |
| 6 | Mark Node-B Unhealthy | PUT | `{{base_url}}/api/nodes/Node-B/status` | Body: `{"healthy": false}` |
| 7 | Route After Node-B Down | GET | `{{base_url}}/api/request?ip=192.168.1.100` | May route differently now |
| 8 | Restore Node-B | PUT | `{{base_url}}/api/nodes/Node-B/status` | Body: `{"healthy": true}` |
| 9 | Trigger Rate Limit | GET | `{{base_url}}/api/request?ip=10.10.10.10` | Run 11× → 11th returns `429` |
| 10 | Get Metrics | GET | `{{base_url}}/api/metrics` | Full stats snapshot |

---

## 10. README Structure

```markdown
# Smart Consistent Hash Load Balancer

## Overview
## Algorithm Explained (with ASCII ring diagram)
## What Changed From the Starter Code
## Prerequisites (Node.js v20+, npm)
## Installation & Setup
## Running the Server
## API Reference (table)
## Configuration (.env options)
## Default Nodes & Weights
## Example Log Output
## Postman Collection
## Project Structure
```

**ASCII ring diagram example (for README):**
```
          0 ─────────────── 4,294,967,295
          │                      │
    Node-A#vnode-0          Node-C#vnode-149
          │                      │
    Node-B#vnode-0    →    [IP Hash lands here]
          │                      │
          └──────────────────────┘
  (IP hashes clockwise to nearest vnode)
```

---

## 11. How to Stand Out

The evaluator sees many submissions. These will set this one apart:

| What | Why It Matters |
|---|---|
| `starter/original.js` preserved | Shows understanding of the starting point |
| FNV-1a with inline comments | Evaluator can read and understand the hash function |
| ASCII ring diagram in README | Visual proof the algorithm is understood |
| Postman Collection v2.1 JSON | Most candidates won't submit this; it's explicitly requested |
| `.env` config for all values | Demonstrates production-grade thinking |
| `identifyNode()` and `simulateTraffic()` kept | Assignment specifically asks to keep them |
| Graceful `503` when all nodes down | App never crashes — production instinct |
| Safety: last node never auto-failed | Shows edge-case awareness |
| Clean commit history by milestone | Demonstrates professional development workflow |
| ESLint configured, zero warnings | Signals code discipline |
| Dependency injection in `app.js` | Industry-standard pattern; testable design |
