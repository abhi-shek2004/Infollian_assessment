'use strict';
// =============================================================
// src/core/metricsStore.js
// In-memory store for request metrics.
//
// Tracks:
//   - Total requests routed
//   - Requests per node
//   - Total blocked (rate-limited) requests
//   - Server uptime
//
// This module is intentionally simple — no persistence, no Redis.
// All data lives in process memory and resets on server restart.
// =============================================================

class MetricsStore {
  constructor() {
    /** Unix timestamp when the server started. Used for uptime calculation. */
    this.startTime = Date.now();

    /** Total successfully routed requests. */
    this.totalRequests = 0;

    /**
     * Per-node request counters.
     * @type {Map<string, number>}
     */
    this.requestsPerNode = new Map();
  }

  // -----------------------------------------------------------
  // Public API
  // -----------------------------------------------------------

  /**
   * Records a successfully routed request to a node.
   *
   * @param {string} nodeId - The node that handled the request.
   */
  recordRequest(nodeId) {
    this.totalRequests++;
    const current = this.requestsPerNode.get(nodeId) || 0;
    this.requestsPerNode.set(nodeId, current + 1);
  }

  /**
   * Registers a new node in the metrics store.
   * Ensures the node appears in the requestsPerNode map even before
   * it handles any requests (so the dashboard shows all nodes).
   *
   * @param {string} nodeId
   */
  registerNode(nodeId) {
    if (!this.requestsPerNode.has(nodeId)) {
      this.requestsPerNode.set(nodeId, 0);
    }
  }

  /**
   * Returns a complete snapshot of current metrics.
   *
   * @param {import('./hashRing')} ring - The HashRing instance (to get health info).
   * @param {import('./rateLimiter')} rateLimiter - The RateLimiter instance.
   * @returns {object} Metrics snapshot.
   */
  getSnapshot(ring, rateLimiter) {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(uptimeSeconds / 60);
    const seconds = uptimeSeconds % 60;

    // Build a plain object from the Map for JSON serialisation
    const requestsPerNode = {};
    for (const [nodeId, count] of this.requestsPerNode) {
      requestsPerNode[nodeId] = count;
    }

    // Collect health information from the ring
    const nodes = ring.getNodes();
    const healthyNodes = nodes.filter((n) => n.healthy).map((n) => n.id);
    const unhealthyNodes = nodes.filter((n) => !n.healthy).map((n) => n.id);

    const rateLimitStats = rateLimiter.getStats();

    return {
      uptime: `${minutes}m ${seconds}s`,
      totalRequests: this.totalRequests,
      blockedRequests: rateLimitStats.blockedTotal,
      requestsPerNode,
      healthyNodeCount: healthyNodes.length,
      unhealthyNodes,
      totalNodes: nodes.length,
    };
  }
}

module.exports = MetricsStore;
