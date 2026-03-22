#!/bin/bash
# ===================================================
# Universal Contest Platform - Problem Service Tests
# ===================================================
# Runs automated endpoint tests against the NGINX gateway.
# Usage: bash test_endpoints.sh
#
# Prerequisites:
#   docker-compose up -d
#   Wait ~15s for services to be healthy
# ===================================================

echo "=== UNIVERSAL CONTEST PLATFORM - PROBLEM SERVICE TEST ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

GATEWAY="http://localhost"
DIRECT="http://localhost:8001"
PROBLEMS_ENDPOINT="${GATEWAY}/api/problems"

test_count=0
pass_count=0

function test_endpoint() {
    test_count=$((test_count + 1))
    echo -n "Test $test_count: $1... "

    response=$(eval "$2" 2>/dev/null)
    http_code=$(echo "$response" | tail -n 1)

    if [[ "$http_code" == "$3" ]]; then
        echo -e "${GREEN}PASS${NC}"
        pass_count=$((pass_count + 1))
    else
        echo -e "${RED}FAIL (Expected $3, got $http_code)${NC}"
    fi
}

echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 5

# -------------------------------------------------------
# Test 1: Health Check (Direct to problem-service)
# -------------------------------------------------------
test_endpoint "Health Check (Direct)" \
    "curl -s -o /dev/null -w '%{http_code}' ${DIRECT}/health" \
    "200"

# -------------------------------------------------------
# Test 2: Health Check (Via NGINX Gateway)
# -------------------------------------------------------
test_endpoint "Health Check (Gateway)" \
    "curl -s -o /dev/null -w '%{http_code}' ${GATEWAY}/health" \
    "200"

# -------------------------------------------------------
# Test 3: Create DSA Problem
# -------------------------------------------------------
test_endpoint "Create DSA Problem" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST ${PROBLEMS_ENDPOINT} \
    -H 'Content-Type: application/json' \
    -d '{\"title\":\"Test Two Sum\",\"description\":\"Given an array of integers nums and an integer target, return indices of the two numbers that sum to target.\",\"problem_type\":\"dsa\",\"time_limit\":1000,\"memory_limit\":256,\"difficulty\":\"easy\",\"topics\":[\"array\",\"hash-table\"]}'" \
    "201"

# -------------------------------------------------------
# Test 4: Create ML Problem
# -------------------------------------------------------
test_endpoint "Create ML Problem" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST ${PROBLEMS_ENDPOINT} \
    -H 'Content-Type: application/json' \
    -d '{\"title\":\"Image Classification with CNN\",\"description\":\"Build a CNN to classify MNIST digits with at least 95 percent accuracy using deep learning.\",\"problem_type\":\"ml\",\"time_limit\":30000,\"memory_limit\":512,\"difficulty\":\"hard\",\"topics\":[\"deep-learning\",\"cnn\"],\"metadata\":{\"framework\":\"tensorflow\"}}'" \
    "201"

# -------------------------------------------------------
# Test 5: List All Problems
# -------------------------------------------------------
test_endpoint "List All Problems" \
    "curl -s -o /dev/null -w '%{http_code}' ${PROBLEMS_ENDPOINT}" \
    "200"

# -------------------------------------------------------
# Test 6: Get Single Problem by ID
# -------------------------------------------------------
test_endpoint "Get Problem by ID (1)" \
    "curl -s -o /dev/null -w '%{http_code}' ${PROBLEMS_ENDPOINT}/1" \
    "200"

# -------------------------------------------------------
# Test 7: Get Non-existent Problem (404)
# -------------------------------------------------------
test_endpoint "Get Non-existent Problem (404)" \
    "curl -s -o /dev/null -w '%{http_code}' ${PROBLEMS_ENDPOINT}/9999" \
    "404"

# -------------------------------------------------------
# Test 8: Invalid Request - Missing Fields (400/422)
# -------------------------------------------------------
test_endpoint "Invalid Request - Missing Field (400)" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST ${PROBLEMS_ENDPOINT} \
    -H 'Content-Type: application/json' \
    -d '{\"title\":\"Incomplete\"}'" \
    "400"

# -------------------------------------------------------
# Test 9: Duplicate Title (409)
# -------------------------------------------------------
test_endpoint "Duplicate Title (409)" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST ${PROBLEMS_ENDPOINT} \
    -H 'Content-Type: application/json' \
    -d '{\"title\":\"Test Two Sum\",\"description\":\"Given an array of integers nums and an integer target, return indices of the two numbers that sum to target.\",\"problem_type\":\"dsa\",\"time_limit\":1000,\"memory_limit\":256}'" \
    "409"

# -------------------------------------------------------
# Test 10: Filter by Type
# -------------------------------------------------------
test_endpoint "Filter by problem_type=dsa" \
    "curl -s -o /dev/null -w '%{http_code}' '${PROBLEMS_ENDPOINT}?problem_type=dsa'" \
    "200"

echo ""
echo "=== TEST RESULTS ==="
echo "Passed: $pass_count/$test_count"

if [ $pass_count -eq $test_count ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
