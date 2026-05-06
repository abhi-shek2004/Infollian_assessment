// ============================================================
// starter/original.js
// The UNMODIFIED starter code provided in the assignment PDF.
// This file is kept as a reference to show what was changed.
// ============================================================

// Random IP generator
function generateRandomIP() {
  return Array.from({ length: 4 }, () => Math.floor(Math.random() * 256)).join(".");
}

// List of nodes
const nodes = ["Node-A", "Node-B", "Node-C"];

// Identify which node received the request
function identifyNode(ip, selectedNode) {
  console.log(`Incoming IP: ${ip} → Routed to: ${selectedNode}`);
}

// Temporary Load Balancer function
function LoadBalancer(ip) {
  // Update this Code
  const randomIndex = Math.floor(Math.random() * nodes.length);
  const selectedNode = nodes[randomIndex];
  // Keep this code to identify which node received the request
  identifyNode(ip, selectedNode);
  return selectedNode;
}

// Simulate incoming traffic
function simulateTraffic(requestCount = 5) {
  for (let i = 0; i < requestCount; i++) {
    const ip = generateRandomIP();
    LoadBalancer(ip);
  }
}

// Run simulation for 10 requests
simulateTraffic(10);
