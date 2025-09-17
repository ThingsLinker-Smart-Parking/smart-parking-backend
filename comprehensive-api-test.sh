#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Base URL
BASE_URL="http://localhost:3000/api"

# Function to print test results
print_test() {
    local test_name="$1"
    local status="$2"
    local response="$3"
    
    TOTAL=$((TOTAL + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        echo -e "${YELLOW}Response: $response${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# Function to test API endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local token="$4"
    local expected_status="$5"
    local test_name="$6"
    
    local curl_cmd="curl -s -w \"HTTPSTATUS:%{http_code}\" -X $method"
    
    if [ ! -z "$token" ]; then
        curl_cmd="$curl_cmd -H \"Authorization: Bearer $token\""
    fi
    
    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H \"Content-Type: application/json\" -d '$data'"
    fi
    
    curl_cmd="$curl_cmd \"$BASE_URL$endpoint\""
    
    local response=$(eval $curl_cmd)
    local body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    local status=$(echo "$response" | grep -o '[0-9]*$')
    
    if [ "$status" = "$expected_status" ]; then
        print_test "$test_name" "PASS" "$body"
    else
        print_test "$test_name (Expected: $expected_status, Got: $status)" "FAIL" "$body"
    fi
}

echo -e "${BLUE}🚀 Starting Comprehensive API Testing for Smart Parking Backend${NC}"
echo -e "${BLUE}================================================================${NC}"

# Get JWT tokens for different roles
echo -e "\n${YELLOW}📋 Step 1: Getting Authentication Tokens${NC}"

SUPER_ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "superadmin@test.com", "password": "password123"}')

ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com", "password": "password123"}')

USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "password123"}')

SUPER_ADMIN_TOKEN=$(echo $SUPER_ADMIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_TOKEN=$(echo $USER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

SUPER_ADMIN_ID=$(echo $SUPER_ADMIN_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
ADMIN_ID=$(echo $ADMIN_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(echo $USER_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

echo -e "Super Admin ID: $SUPER_ADMIN_ID"
echo -e "Admin ID: $ADMIN_ID" 
echo -e "User ID: $USER_ID"

# Test 1: Health and Basic Endpoints
echo -e "\n${YELLOW}📋 Step 2: Testing Health and Basic Endpoints${NC}"
test_endpoint "GET" "/health" "" "" "200" "Health Check"
test_endpoint "GET" "/test" "" "" "200" "Test Endpoint"

# Test 2: Authentication APIs
echo -e "\n${YELLOW}📋 Step 3: Testing Authentication APIs${NC}"
test_endpoint "POST" "/auth/login" '{"email": "superadmin@test.com", "password": "password123"}' "" "200" "Super Admin Login"
test_endpoint "POST" "/auth/login" '{"email": "admin@test.com", "password": "password123"}' "" "200" "Admin Login"
test_endpoint "POST" "/auth/login" '{"email": "user@test.com", "password": "password123"}' "" "200" "User Login"
test_endpoint "POST" "/auth/login" '{"email": "wrong@email.com", "password": "wrong"}' "" "401" "Invalid Login"

# Test 3: Protected Route Access Control
echo -e "\n${YELLOW}📋 Step 4: Testing Route Access Control${NC}"
test_endpoint "GET" "/gateways" "" "" "401" "Gateway Access Without Auth"
test_endpoint "GET" "/parking-lots" "" "" "401" "Parking Lots Without Auth"

# Test 4: Gateway Management APIs
echo -e "\n${YELLOW}📋 Step 5: Testing Gateway Management APIs${NC}"
test_endpoint "GET" "/gateways" "" "$SUPER_ADMIN_TOKEN" "200" "Get All Gateways (Super Admin)"
test_endpoint "GET" "/gateways" "" "$ADMIN_TOKEN" "200" "Get Gateways (Admin)"
test_endpoint "GET" "/gateways" "" "$USER_TOKEN" "403" "Get Gateways (User - Should Fail)"

# Create a gateway (Super Admin only)
GATEWAY_DATA='{"chirpstackGatewayId": "test-gateway-001", "name": "Test Gateway 1", "description": "Test gateway for API testing", "location": "Test Location", "latitude": 40.7128, "longitude": -74.0060}'
test_endpoint "POST" "/gateways" "$GATEWAY_DATA" "$SUPER_ADMIN_TOKEN" "201" "Create Gateway (Super Admin)"
test_endpoint "POST" "/gateways" "$GATEWAY_DATA" "$ADMIN_TOKEN" "403" "Create Gateway (Admin - Should Fail)"

# Test 5: Parking Lot Management APIs
echo -e "\n${YELLOW}📋 Step 6: Testing Parking Lot Management APIs${NC}"
test_endpoint "GET" "/parking-lots" "" "$ADMIN_TOKEN" "200" "Get Parking Lots (Admin)"
test_endpoint "GET" "/parking-lots" "" "$USER_TOKEN" "200" "Get Parking Lots (User)"

# Create a parking lot
PARKING_LOT_DATA='{"name": "Test Parking Lot", "description": "Test parking lot for API testing", "location": "123 Test Street", "latitude": 40.7128, "longitude": -74.0060, "totalSlots": 100, "hourlyRate": 5.00}'
test_endpoint "POST" "/parking-lots" "$PARKING_LOT_DATA" "$ADMIN_TOKEN" "201" "Create Parking Lot (Admin)"

# Test 6: Node Management APIs  
echo -e "\n${YELLOW}📋 Step 7: Testing Node Management APIs${NC}"
test_endpoint "GET" "/nodes" "" "$ADMIN_TOKEN" "200" "Get All Nodes (Admin)"
test_endpoint "GET" "/nodes" "" "$USER_TOKEN" "403" "Get Nodes (User - Should Fail)"

# Test 7: Subscription APIs
echo -e "\n${YELLOW}📋 Step 8: Testing Subscription APIs${NC}"
test_endpoint "GET" "/subscriptions" "" "$USER_TOKEN" "200" "Get User Subscriptions"
test_endpoint "GET" "/subscriptions" "" "$ADMIN_TOKEN" "200" "Get Admin Subscriptions"

# Test 8: UUID Validation
echo -e "\n${YELLOW}📋 Step 9: Testing UUID Validation${NC}"
test_endpoint "GET" "/parking-lots/invalid-uuid" "" "$ADMIN_TOKEN" "400" "Invalid UUID Parameter"
test_endpoint "GET" "/gateways/not-a-uuid" "" "$SUPER_ADMIN_TOKEN" "400" "Invalid Gateway UUID"

# Test 9: Role-based Access Control
echo -e "\n${YELLOW}📋 Step 10: Testing Role-Based Access Control${NC}"

# Admin trying to access super admin endpoints
test_endpoint "GET" "/auth/otp-config" "" "$ADMIN_TOKEN" "200" "OTP Config (Admin)"
test_endpoint "GET" "/auth/otp-config" "" "$USER_TOKEN" "403" "OTP Config (User - Should Fail)"

echo -e "\n${BLUE}================================================================${NC}"
echo -e "${BLUE}🎯 Test Summary${NC}"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"  
echo -e "${BLUE}📊 Total: $TOTAL${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! The API is working perfectly.${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  Some tests failed. Please check the issues above.${NC}"
    exit 1
fi