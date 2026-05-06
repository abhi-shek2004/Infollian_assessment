'use strict';
// =============================================================
// src/core/hashRing.js
// Consistent Hash Ring implementation using virtual nodes.
//
// How it works:
//   1. Each real node is represented by N virtual nodes on a ring
//      (N = weight × virtualNodesPerWeight).
//   2. The ring is a sorted array of { hash, nodeId } entries.
//   3. To route an IP: hash the IP, binary-search for the closest
//      vnode with hash >= ipHash (wrap to ring[0] if none found).
//   4. When a node goes unhealthy, its vnodes are removed from the
//      ring — traffic automatically flows to remaining healthy nodes.
// =============================================================

const { fnv1aHash } = require('../utils/hash');

class HashRing {
  /**
   * @param {number} virtualNodesPerWeight - Number of vnodes per unit of weight.
   *   Higher = more even distribution. Industry standard: 100–150.
   */
  constructor(virtualNodesPerWeight = 150) {
    this.virtualNodesPerWeight = virtualNodesPerWeight;

    /**
     * Master registry of all nodes (healthy or not).
     * Map<nodeId, { weight: number, healthy: boolean }>
     */
    this.nodes = new Map();

    /**
     * The sorted ring of virtual node entries.
     * Array<{ hash: number, nodeId: string }>
     * Kept sorted by hash ascending at all times.
     */
    this.ring = [];
  }

  // -----------------------------------------------------------
  // Public API
  // -----------------------------------------------------------

  /**
   * Adds a node to the ring with the specified weight.
   * Creates (weight × virtualNodesPerWeight) virtual node entries.
   *
   * @param {string} nodeId - Unique identifier for the node (e.g., "Node-A").
   * @param {number} [weight=1] - Relative weight. Node-B at weight=2 gets
   *   twice the virtual nodes (and thus ~2× the traffic) of a weight=1 node.
   */
  addNode(nodeId, weight = 1) {
    if (this.nodes.has(nodeId)) {
      throw new Error(`Node "${nodeId}" already exists. Remove it first.`);
    }

    this.nodes.set(nodeId, { weight, healthy: true });
    this._addVirtualNodes(nodeId, weight);
    this._sortRing();
  }

  /**
   * Permanently removes a node and all its virtual nodes from the ring.
   *
   * @param {string} nodeId - The node to remove.
   */
  removeNode(nodeId) {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node "${nodeId}" does not exist.`);
    }

    this.nodes.delete(nodeId);
    // Remove all virtual nodes belonging to this nodeId
    this.ring = this.ring.filter((entry) => entry.nodeId !== nodeId);
    // No need to re-sort — removal preserves sort order.
  }

  /**
   * Marks a node as healthy or unhealthy.
   * Unhealthy nodes have their virtual nodes removed from the ring;
   * healthy nodes are re-added.
   *
   * @param {string} nodeId - The node to update.
   * @param {boolean} healthy - New health status.
   */
  setNodeHealth(nodeId, healthy) {
    if (!this.nodes.has(nodeId)) {
      throw new Error(`Node "${nodeId}" does not exist.`);
    }

    const node = this.nodes.get(nodeId);
    node.healthy = healthy;

    // Rebuild the ring to reflect the health change.
    this._rebuildRing();
  }

  /**
   * Routes an IP address to a node using consistent hashing.
   * The same IP will always map to the same node as long as the ring
   * configuration does not change.
   *
   * @param {string} ip - The client IP address to route.
   * @returns {string} The nodeId of the selected node.
   * @throws {Error} If there are no healthy nodes available.
   */
  getNode(ip) {
    if (this.ring.length === 0) {
      throw new Error('No healthy nodes available. All nodes are down.');
    }

    const ipHash = fnv1aHash(ip);
    const index = this._binarySearch(ipHash);
    return this.ring[index].nodeId;
  }

  /**
   * Returns metadata about all registered nodes.
   *
   * @returns {Array<{ id: string, weight: number, healthy: boolean, vnodeCount: number }>}
   */
  getNodes() {
    const result = [];
    for (const [id, { weight, healthy }] of this.nodes) {
      // Count actual virtual nodes on the ring for this node
      const vnodeCount = healthy
        ? weight * this.virtualNodesPerWeight
        : 0;
      result.push({ id, weight, healthy, vnodeCount });
    }
    return result;
  }

  /**
   * Returns the number of healthy nodes currently on the ring.
   * @returns {number}
   */
  getHealthyCount() {
    let count = 0;
    for (const { healthy } of this.nodes.values()) {
      if (healthy) count++;
    }
    return count;
  }

  // -----------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------

  /**
   * Adds virtual nodes for a given nodeId to the ring (without sorting).
   * Must call _sortRing() afterwards if order matters.
   *
   * @param {string} nodeId
   * @param {number} weight
   */
  _addVirtualNodes(nodeId, weight) {
    const count = weight * this.virtualNodesPerWeight;
    for (let i = 0; i < count; i++) {
      // The key format ensures each vnode has a unique hash position.
      const vnodeKey = `${nodeId}#vnode-${i}`;
      this.ring.push({ hash: fnv1aHash(vnodeKey), nodeId });
    }
  }

  /**
   * Rebuilds the ring from scratch using only healthy nodes.
   * Called whenever node health changes.
   */
  _rebuildRing() {
    this.ring = [];
    for (const [nodeId, { weight, healthy }] of this.nodes) {
      if (healthy) {
        this._addVirtualNodes(nodeId, weight);
      }
    }
    this._sortRing();
  }

  /**
   * Sorts the ring array by hash value ascending.
   * This keeps the ring in the correct clockwise order.
   */
  _sortRing() {
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  /**
   * Binary search for the first ring entry whose hash >= targetHash.
   * If no such entry exists (targetHash is larger than all ring hashes),
   * wraps around to index 0 (the ring is circular).
   *
   * @param {number} targetHash - The IP's hash value.
   * @returns {number} Index into this.ring.
   */
  _binarySearch(targetHash) {
    let low = 0;
    let high = this.ring.length - 1;
    let result = -1; // -1 = no entry found with hash >= targetHash

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.ring[mid].hash >= targetHash) {
        result = mid;
        high = mid - 1; // Try to find an earlier match
      } else {
        low = mid + 1;
      }
    }

    // If result is still -1, all hashes are smaller than targetHash.
    // Wrap around to the first entry (ring is circular).
    return result === -1 ? 0 : result;
  }
}

module.exports = HashRing;
