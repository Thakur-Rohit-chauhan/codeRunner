#!/bin/bash
# ======================================================
# Universal Contest Platform - Submission Service Tests
# ======================================================
# Usage: bash test_submission_endpoints.sh
# Prerequisites: docker-compose up -d  (wait ~20s)
# ======================================================

echo "=== SUBMISSION SERVICE TEST SUITE ==="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

GATEWAY="http://localhost"
DIRECT="http://localhost:8002"
SUBMISSIONS_ENDPOINT="${GATEWAY}/api/submissions"

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

# Test 1: Health Check (Direct)
test_endpoint "Health Check (Direct)" \
    "curl -s -o /dev/null -w '%{http_code}' ${DIRECT}/health" \
    "200"

# Test 2: Health Check (Gateway)
test_endpoint "Health Check (Gateway)" \
    "curl -s -o /dev/null -w '%{http_code}' ${GATEWAY}/api/submissions" \
    "200"

# Test 3: Create Python Submission
test_endpoint "Create Submission (Python)" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST ${SUBMISSIONS_ENDPOINT} \
    -H 'Content-Type: application/json' \
    -d '{\"problem_id\":1,\"code\":\"def solve(nums, target):\\n    for i in range(len(nums)-1):\\n        if nums[i] + nums[i+1] == target:\\n            return [i, i+1]\\n    return []\",\"language\":\"python\"}'" \
    "202"

# Test 4: Create C++ Submission
test_endpoint "Create Submission (C++)" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST ${SUBMISSIONS_ENDPOINT} \
    -H 'Content-Type: application/json' \
    -d '{\"problem_id\":1,\"code\":\"#include <vector>\\nint main() { std::vector<int> v; return 0; }\",\"language\":\"cpp\"}'" \
    "202"

# Test 5: List All Submissions
test_endpoint "List All Submissions" \
    "curl -s -o /dev/null -w '%{http_code}' ${SUBMISSIONS_ENDPOINT}" \
    "200"

# Test 6: Get Submission by ID
test_endpoint "Get Submission #1" \
    "curl -s -o /dev/null -w '%{http_code}' ${SUBMISSIONS_ENDPOINT}/1" \
    "200"

# Test 7: Filter by Status
test_endpoint "Filter by Status (PENDING)" \
    "curl -s -o /dev/null -w '%{http_code}' '${SUBMISSIONS_ENDPOINT}?status=PENDING'" \
    "200"

# Test 8: Non-existent Submission
test_endpoint "Get Non-existent (404)" \
    "curl -s -o /dev/null -w '%{http_code}' ${SUBMISSIONS_ENDPOINT}/99999" \
    "404"

# Test 9: Invalid Language
test_endpoint "Invalid Language (400)" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST ${SUBMISSIONS_ENDPOINT} \
    -H 'Content-Type: application/json' \
    -d '{\"problem_id\":1,\"code\":\"test code here long enough\",\"language\":\"cobol\"}'" \
    "400"

# Test 10: Missing Code Field
test_endpoint "Missing Code (400)" \
    "curl -s -o /dev/null -w '%{http_code}' -X POST ${SUBMISSIONS_ENDPOINT} \
    -H 'Content-Type: application/json' \
    -d '{\"problem_id\":1,\"language\":\"python\"}'" \
    "400"

# Test 11: Phase 1 still works
test_endpoint "Phase 1: Problem Service Still Works" \
    "curl -s -o /dev/null -w '%{http_code}' ${GATEWAY}/api/problems" \
    "200"

echo ""
echo "=== TEST RESULTS ==="
echo "Passed: $pass_count/$test_count"

if [ $pass_count -eq $test_count ]; then
    echo -e "${GREEN}All tests passed!${NC}"

    echo ""
    echo "=== RABBITMQ VERIFICATION ==="
    docker-compose exec -T rabbitmq rabbitmqctl list_queues name messages 2>/dev/null | grep standard_judge_queue || echo "Queue not yet created (will be created on first submission)"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
