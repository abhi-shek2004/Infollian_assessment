'use strict';
// =============================================================
// src/config/config.js
// Central configuration loaded from environment variables.
// All tunable values live here — never hardcode them elsewhere.
// =============================================================

require('dotenv').config();

const config = {
  // HTTP server
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || 'localhost',

  // Consistent Hashing
  // Minimum of 10 enforced — lower values cause severely uneven distribution.
  virtualNodesPerWeight: Math.max(
    parseInt(process.env.VIRTUAL_NODES_PER_WEIGHT, 10) || 150,
    10
  ),

  // Rate Limiting (Fixed Window)
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 10,
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  },

  // Health Check Simulation
  healthCheck: {
    intervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS, 10) || 10000,
    // Probability (0-1) that a node "fails" during each health check cycle.
    failProbability: parseFloat(process.env.HEALTH_CHECK_FAIL_PROBABILITY) || 0.1,
  },

  // Logging
  logging: {
    toFile: process.env.LOG_TO_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/requests.log',
  },
};

module.exports = config;
