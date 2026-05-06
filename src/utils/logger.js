'use strict';
// =============================================================
// src/utils/logger.js
// Timestamped logger with INFO / WARN / ERROR levels.
// Optionally writes to a log file (configurable via .env).
// =============================================================

const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * Formats a log message with an ISO timestamp and level label.
 * Example: [2026-05-07T02:30:00.000Z] [INFO]  Incoming IP: 1.2.3.4 → Routed to: Node-A
 *
 * @param {string} level - Log level (INFO, WARN, ERROR).
 * @param {string} message - The log message.
 * @returns {string} Formatted log string.
 */
function format(level, message) {
  const timestamp = new Date().toISOString();
  const paddedLevel = level.padEnd(5); // Align columns
  return `[${timestamp}] [${paddedLevel}] ${message}`;
}

/**
 * Writes a formatted message to stdout and optionally to the log file.
 *
 * @param {string} level - Log level.
 * @param {string} message - The log message.
 */
function write(level, message) {
  const line = format(level, message);

  // Always print to console
  if (level === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }

  // Optionally append to log file (non-blocking)
  if (config.logging.toFile) {
    const filePath = path.resolve(config.logging.filePath);
    fs.appendFile(filePath, line + '\n', (err) => {
      if (err) {
        // Avoid infinite recursion — use console.error directly
        console.error(`[logger] Failed to write to log file: ${err.message}`);
      }
    });
  }
}

const logger = {
  info:  (message) => write('INFO', message),
  warn:  (message) => write('WARN', message),
  error: (message) => write('ERROR', message),
};

module.exports = logger;
