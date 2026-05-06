'use strict';
// =============================================================
// src/routes/request.route.js
// GET /api/request?ip=x.x.x.x
//
// Main routing endpoint. Validates the IP, checks rate limit,
// routes via the consistent hash ring, and records metrics.
//
// Preserves the original assignment functions:
//   - identifyNode(ip, selectedNode) — logs the routing decision
//   - generateRandomIP() — used only in simulateTraffic()
//   - simulateTraffic() — called via GET /api/request?simulate=true
// =============================================================

const { Router } = require('express');

// -----------------------------------------------
// Original assignment functions (preserved as-is)
// -----------------------------------------------

/** Generates a random IPv4 address string. */
function generateRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join('.');
}

/**
 * Logs the routing decision.
 * This function is kept exactly as specified in the assignment PDF.
 *
 * @param {string} ip
 * @param {string} selectedNode
 */
function identifyNode(ip, selectedNode) {
  console.log(`Incoming IP: ${ip} → Routed to: ${selectedNode}`);
}

// -----------------------------------------------

/**
 * A simple regex to validate IPv4 address format.
 * Accepts: "192.168.1.1", "10.0.0.1", "255.255.255.255"
 */
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Factory function — creates the request router with injected dependencies.
 *
 * @param {{ ring, rateLimiter, metrics, logger }} deps
 * @returns {Router}
 */
function createRequestRouter({ ring, rateLimiter, metrics, logger }) {
  const router = Router();

  // GET /api/request?ip=x.x.x.x
  // GET /api/request?simulate=true  (auto-generates a random IP)
  router.get('/', (req, res) => {
    let ip = req.query.ip;

    // If simulate=true is passed, generate a random IP (demo mode)
    if (req.query.simulate === 'true') {
      ip = generateRandomIP();
    }

    // --- Validation ---
    if (!ip) {
      return res.status(400).json({
        error: 'Missing required query parameter: ip',
        hint: 'Use GET /api/request?ip=192.168.1.1 or ?simulate=true',
      });
    }

    if (!IP_REGEX.test(ip)) {
      return res.status(400).json({
        error: `Invalid IP address format: "${ip}"`,
        hint: 'Expected format: x.x.x.x (e.g. 192.168.1.1)',
      });
    }

    // --- Rate Limiting ---
    if (!rateLimiter.isAllowed(ip)) {
      const retryAfter = rateLimiter.getRetryAfter(ip);
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        error: 'Rate limit exceeded. Too many requests.',
        retryAfterSeconds: retryAfter,
        hint: `Wait ${retryAfter}s before retrying.`,
      });
    }

    // --- Routing ---
    let selectedNode;
    try {
      selectedNode = ring.getNode(ip);
    } catch (err) {
      logger.error(`Routing failed: ${err.message}`);
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'No healthy nodes are available to handle this request.',
      });
    }

    // --- Record metrics ---
    metrics.recordRequest(selectedNode);

    // --- Log (using the original assignment identifyNode function) ---
    identifyNode(ip, selectedNode);
    logger.info(`Incoming IP: ${ip} → Routed to: ${selectedNode}`);

    // --- Respond ---
    return res.status(200).json({
      ip,
      node: selectedNode,
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

module.exports = { createRequestRouter };
