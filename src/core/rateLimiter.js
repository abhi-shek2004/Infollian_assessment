'use strict';
// =============================================================
// src/core/rateLimiter.js
// Fixed-Window rate limiter using an in-memory Map.
//
// Algorithm:
//   Each IP gets a record: { count, resetTime }.
//   - If the window has expired, reset count to 1 and set a new resetTime.
//   - If count < max, increment and allow.
//   - If count >= max, block and increment the blockedTotal counter.
//
// Memory safety:
//   A cleanup interval runs every 5 minutes to evict expired entries,
//   preventing the Map from growing unboundedly with unique IPs.
// =============================================================

class RateLimiter {
  /**
   * @param {number} max       - Max requests per IP per window.
   * @param {number} windowMs  - Window duration in milliseconds.
   */
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;

    /** @type {Map<string, { count: number, resetTime: number }>} */
    this.store = new Map();

    /** Total requests blocked across all IPs since startup. */
    this.blockedTotal = 0;

    // Run cleanup every 5 minutes to prevent unbounded memory growth.
    this._cleanupInterval = setInterval(() => this._cleanup(), 5 * 60 * 1000);

    // Allow the process to exit cleanly even if this interval is running.
    if (this._cleanupInterval.unref) {
      this._cleanupInterval.unref();
    }
  }

  // -----------------------------------------------------------
  // Public API
  // -----------------------------------------------------------

  /**
   * Checks whether the given IP is within its rate limit.
   *
   * @param {string} ip - The client IP address.
   * @returns {boolean} true if the request is allowed; false if blocked.
   */
  isAllowed(ip) {
    const now = Date.now();
    const entry = this.store.get(ip);

    // No existing record, or the window has expired — start a fresh window.
    if (!entry || entry.resetTime <= now) {
      this.store.set(ip, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    // Within the window and below the limit — allow and increment.
    if (entry.count < this.max) {
      entry.count++;
      return true;
    }

    // Within the window and at/over the limit — block.
    this.blockedTotal++;
    return false;
  }

  /**
   * Returns the remaining time (in seconds) until an IP's window resets.
   * Returns 0 if the IP is not currently tracked or the window has expired.
   *
   * @param {string} ip
   * @returns {number} Seconds until reset.
   */
  getRetryAfter(ip) {
    const now = Date.now();
    const entry = this.store.get(ip);
    if (!entry || entry.resetTime <= now) return 0;
    return Math.ceil((entry.resetTime - now) / 1000);
  }

  /**
   * Returns rate limiter statistics for the metrics endpoint.
   *
   * @returns {{ totalTracked: number, blockedTotal: number }}
   */
  getStats() {
    return {
      totalTracked: this.store.size,
      blockedTotal: this.blockedTotal,
    };
  }

  /**
   * Stops the cleanup interval. Call this during graceful shutdown.
   */
  stop() {
    clearInterval(this._cleanupInterval);
  }

  // -----------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------

  /**
   * Removes expired entries from the store to prevent memory leaks.
   * An entry is expired when its resetTime is in the past.
   */
  _cleanup() {
    const now = Date.now();
    for (const [ip, entry] of this.store) {
      if (entry.resetTime <= now) {
        this.store.delete(ip);
      }
    }
  }
}

module.exports = RateLimiter;
