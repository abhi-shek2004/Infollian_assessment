'use strict';
// =============================================================
// src/routes/nodes.route.js
// GET  /api/nodes            — List all nodes with status
// PUT  /api/nodes/:id/status — Manually set a node's health
// =============================================================

const { Router } = require('express');

/**
 * @param {{ ring, logger }} deps
 * @returns {Router}
 */
function createNodesRouter({ ring, logger }) {
  const router = Router();

  // GET /api/nodes
  // Returns all registered nodes with their weight, health, and vnode count.
  router.get('/', (req, res) => {
    const nodes = ring.getNodes();
    return res.status(200).json({ nodes });
  });

  // PUT /api/nodes/:id/status
  // Manually override a node's health status (for simulation/demo purposes).
  router.put('/:id/status', (req, res) => {
    const { id } = req.params;
    const { healthy } = req.body;

    // Validate: node must exist
    const nodes = ring.getNodes();
    const exists = nodes.some((n) => n.id === id);
    if (!exists) {
      return res.status(404).json({
        error: `Node "${id}" not found.`,
        availableNodes: nodes.map((n) => n.id),
      });
    }

    // Validate: healthy must be a boolean
    if (typeof healthy !== 'boolean') {
      return res.status(400).json({
        error: 'Request body must include "healthy" as a boolean.',
        example: { healthy: false },
      });
    }

    // Apply the health change
    ring.setNodeHealth(id, healthy);
    logger.info(`Manual health update: Node "${id}" → ${healthy ? 'HEALTHY' : 'UNHEALTHY'}`);

    return res.status(200).json({
      id,
      healthy,
      message: `Node "${id}" status updated to ${healthy ? 'HEALTHY' : 'UNHEALTHY'}.`,
      healthyNodesRemaining: ring.getHealthyCount(),
    });
  });

  return router;
}

module.exports = { createNodesRouter };
