'use strict';
// =============================================================
// src/app.js
// Express application factory.
//
// Creates and wires all modules together but does NOT start the
// HTTP server (that is server.js's job). This separation allows
// the app to be imported and tested without binding to a port.
// =============================================================

const express = require('express');
const path    = require('path');

const config        = require('./config/config');
const logger        = require('./utils/logger');
const HashRing      = require('./core/hashRing');
const RateLimiter   = require('./core/rateLimiter');
const MetricsStore  = require('./core/metricsStore');
const HealthChecker = require('./core/healthChecker');

const { createRequestRouter } = require('./routes/request.route');
const { createNodesRouter }   = require('./routes/nodes.route');
const { createMetricsRouter } = require('./routes/metrics.route');

// -----------------------------------------------------------
// 1. Create core module instances
// -----------------------------------------------------------

const ring = new HashRing(config.virtualNodesPerWeight);

// Seed the ring with default nodes.
// Node-B has weight=2, meaning it gets ~2× the traffic of Node-A and Node-C.
ring.addNode('Node-A', 1);
ring.addNode('Node-B', 2);
ring.addNode('Node-C', 1);

const rateLimiter = new RateLimiter(config.rateLimit.max, config.rateLimit.windowMs);
const metrics     = new MetricsStore();

// Register nodes in metrics so they show up in the dashboard from the start
for (const node of ring.getNodes()) {
  metrics.registerNode(node.id);
}

const healthChecker = new HealthChecker(ring, config.healthCheck);
healthChecker.start();

// -----------------------------------------------------------
// 2. Create Express app
// -----------------------------------------------------------

const app = express();

// Parse JSON request bodies (needed for PUT /api/nodes/:id/status)
app.use(express.json());

// -----------------------------------------------------------
// 3. Mount API routes (Dependency Injection)
// -----------------------------------------------------------

app.use('/api/request', createRequestRouter({ ring, rateLimiter, metrics, logger }));
app.use('/api/nodes',   createNodesRouter({ ring, logger }));
app.use('/api/metrics', createMetricsRouter({ metrics, ring, rateLimiter }));

// -----------------------------------------------------------
// 4. Serve the metrics dashboard
// -----------------------------------------------------------

app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

// Redirect root to dashboard for convenience
app.get('/', (req, res) => res.redirect('/dashboard'));

// -----------------------------------------------------------
// 5. 404 handler — catches any unmatched route
// -----------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found.',
    availableRoutes: [
      'GET  /api/request?ip=x.x.x.x',
      'GET  /api/request?simulate=true',
      'GET  /api/nodes',
      'PUT  /api/nodes/:id/status',
      'GET  /api/metrics',
      'GET  /dashboard',
    ],
  });
});

// -----------------------------------------------------------
// 6. Global error handler — catches unhandled errors in routes
// -----------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal Server Error' });
});

// -----------------------------------------------------------
// 7. Export app and shared instances (for graceful shutdown)
// -----------------------------------------------------------

module.exports = { app, healthChecker, rateLimiter };
