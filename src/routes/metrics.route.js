'use strict';
// =============================================================
// src/routes/metrics.route.js
// GET /api/metrics — Full metrics snapshot
// =============================================================

const { Router } = require('express');

/**
 * @param {{ metrics, ring, rateLimiter }} deps
 * @returns {Router}
 */
function createMetricsRouter({ metrics, ring, rateLimiter }) {
  const router = Router();

  // GET /api/metrics
  router.get('/', (req, res) => {
    const snapshot = metrics.getSnapshot(ring, rateLimiter);
    return res.status(200).json(snapshot);
  });

  return router;
}

module.exports = { createMetricsRouter };
