'use strict';
// =============================================================
// src/utils/hash.js
// FNV-1a 32-bit hash function.
//
// Why FNV-1a?
//   - Zero dependencies (no 'crypto' import)
//   - Deterministic: same input → same output, always
//   - Fast: single pass through the string
//   - Output is always an unsigned 32-bit integer (0 – 4,294,967,295)
//     which is perfect for placing items on a numerical ring.
// =============================================================

/**
 * Computes the FNV-1a 32-bit hash of a string.
 *
 * @param {string} str - The input string to hash.
 * @returns {number} An unsigned 32-bit integer hash value.
 */
function fnv1aHash(str) {
  // FNV offset basis (a large prime chosen by the FNV authors)
  let hash = 2166136261;

  for (let i = 0; i < str.length; i++) {
    // XOR the current byte into the hash
    hash ^= str.charCodeAt(i);

    // Multiply by the FNV prime (32-bit).
    // '>>> 0' forces JavaScript to treat the result as an unsigned 32-bit
    // integer, preventing the value from going negative.
    hash = (hash * 16777619) >>> 0;
  }

  return hash;
}

module.exports = { fnv1aHash };
