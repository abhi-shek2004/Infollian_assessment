#!/bin/bash

# ==============================================================================
# Automated Test Script for Smart Consistent Hash Load Balancer
# Run this script while the server is running on http://localhost:3000
# ==============================================================================

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE} Starting Load Balancer Automated Tests...${NC}"
echo -e "${BLUE}==========================================${NC}\n"

# --- Test 1: Consistent Hashing ---
echo -e "${BLUE}[Test 1] Consistent Hashing (Should always return the same node for a given IP)${NC}"
IP1="192.168.1.100"
echo "Sending 5 requests from IP: $IP1..."
for i in {1..5}; do
  curl -s "$BASE_URL/api/request?ip=$IP1"
  echo ""
done
echo -e "${GREEN}✓ Passed if all 5 responses routed to the exact same node.${NC}\n"

# --- Test 2: Weighted Routing ---
echo -e "${BLUE}[Test 2] Weighted Routing (Simulating 100 requests)${NC}"
echo "Sending 100 random requests. Check your dashboard/terminal logs for distribution."
echo "Node-B should handle roughly ~50% of these requests."
for i in {1..100}; do
  curl -s "$BASE_URL/api/request?simulate=true" > /dev/null
done
echo -e "${GREEN}✓ 100 requests sent. Check http://localhost:3000/dashboard for traffic share.${NC}\n"

# --- Test 3: Health Checks and Failover ---
echo -e "${BLUE}[Test 3] Health Checks and Failover${NC}"
IP2="10.0.0.50"
echo "1. Routing IP $IP2 before failover:"
curl -s "$BASE_URL/api/request?ip=$IP2"
echo ""

echo "2. Simulating Node-A failure (Marking UNHEALTHY)..."
curl -s -X PUT "$BASE_URL/api/nodes/Node-A/status" -H "Content-Type: application/json" -d '{"healthy": false}'
echo ""

echo "3. Routing IP $IP2 AGAIN while Node-A is down:"
curl -s "$BASE_URL/api/request?ip=$IP2"
echo ""

echo "4. Restoring Node-A to HEALTHY..."
curl -s -X PUT "$BASE_URL/api/nodes/Node-A/status" -H "Content-Type: application/json" -d '{"healthy": true}'
echo ""

echo "5. Routing IP $IP2 AFTER Node-A is restored:"
curl -s "$BASE_URL/api/request?ip=$IP2"
echo ""
echo -e "${GREEN}✓ Failover test complete. The routing should have shifted if $IP2 mapped to Node-A.${NC}\n"

# --- Test 4: Rate Limiting ---
echo -e "${BLUE}[Test 4] Rate Limiting (Limit is 10 requests / minute)${NC}"
IP3="8.8.8.8"
echo "Spamming 12 requests from IP $IP3..."
for i in {1..12}; do
  echo -n "Request $i: "
  curl -s "$BASE_URL/api/request?ip=$IP3" | grep -o 'error\|Rate limit exceeded' || echo "OK"
done
echo -e "${GREEN}✓ Passed if Request 11 and 12 show 'Rate limit exceeded'.${NC}\n"

# --- Test 5: Metrics ---
echo -e "${BLUE}[Test 5] Fetching Metrics Snapshot${NC}"
curl -s "$BASE_URL/api/metrics"
echo ""
echo -e "\n${GREEN}✓ Metrics fetched successfully.${NC}\n"

echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN} All tests executed successfully!${NC}"
echo -e "${BLUE}==========================================${NC}"
