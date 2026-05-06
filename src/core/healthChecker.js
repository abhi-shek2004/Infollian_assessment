'use strict';
// =============================================================
// src/core/healthChecker.js
// Simulated health checker using setInterval.
//
// Since there are no real backend servers, health is simulated:
//   - On each interval tick, each node has a configurable probability
//     of being marked UNHEALTHY.
//   - Nodes that are currently unhealthy have a chance to RECOVER.
//
// Safety rule:
//   The checker will NEVER mark a node as unhealthy if it is the
//   last healthy node in the ring. This prevents a total 503 state
//   from being triggered automatically by the health checker itself.
//   (Users can still force all-down via the PUT /api/nodes/:id/status
//    endpoint — that's intentional for demo purposes.)
// =============================================================

const logger = require('../utils/logger');

class HealthChecker {
  /**
   * @param {import('./hashRing')} ring         - The HashRing instance to update.
   * @param {{ intervalMs: number, failProbability: number }} config
   */
  constructor(ring, config) {
    this.ring = ring;
    this.intervalMs = config.intervalMs;
    this.failProbability = config.failProbability;
    this._timer = null;
  }

  // -----------------------------------------------------------
  // Public API
  // -----------------------------------------------------------

  /**
   * Starts the health check polling loop.
   */
  start() {
    logger.info(`HealthChecker started (interval: ${this.intervalMs}ms, failProbability: ${this.failProbability})`);
    this._timer = setInterval(() => this._runCheck(), this.intervalMs);

    // Allow the process to exit even if this timer is running
    if (this._timer.unref) {
      this._timer.unref();
    }
  }

  /**
   * Stops the health check polling loop.
   * Call this during graceful shutdown.
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      logger.info('HealthChecker stopped.');
    }
  }

  // -----------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------

  /**
   * Runs one health check cycle across all registered nodes.
   */
  _runCheck() {
    const nodes = this.ring.getNodes();
    const healthyCount = nodes.filter((n) => n.healthy).length;

    for (const node of nodes) {
      const roll = Math.random();

      if (node.healthy) {
        // Safety: never auto-fail the last healthy node.
        if (healthyCount <= 1) {
          logger.warn(`HealthChecker: Skipping failure simulation for "${node.id}" — it is the last healthy node.`);
          continue;
        }

        if (roll < this.failProbability) {
          this.ring.setNodeHealth(node.id, false);
          logger.warn(`HealthChecker: Node "${node.id}" marked UNHEALTHY (simulated failure).`);
        }
      } else {
        // Unhealthy nodes recover if their roll is above the fail threshold.
        if (roll >= this.failProbability) {
          this.ring.setNodeHealth(node.id, true);
          logger.info(`HealthChecker: Node "${node.id}" has RECOVERED.`);
        }
      }
    }
  }
}

module.exports = HealthChecker;
