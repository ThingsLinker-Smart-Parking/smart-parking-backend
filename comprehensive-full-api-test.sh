#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Base URL
BASE_URL="http://localhost:3000/api"

# Storage for created entities (UUIDs)
GATEWAY_ID=""
PARKING_LOT_ID=""
FLOOR_ID=""
PARKING_SLOT_ID=""
NODE_ID=""
SUBSCRIPTION_PLAN_ID=""
SUBSCRIPTION_ID=""

# JWT Tokens
SUPER_ADMIN_TOKEN=""
ADMIN_TOKEN=""
USER_TOKEN=""

# User IDs
SUPER_ADMIN_ID=""
ADMIN_ID=""
USER_ID=""

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
        
        # Extract UUIDs for later use
        case "$test_name" in
            *"Create Gateway"*) 
                GATEWAY_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
                echo -e "${CYAN}   Created Gateway ID: $GATEWAY_ID${NC}"
                ;;
            *"Create Parking Lot"*) 
                PARKING_LOT_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
                echo -e "${CYAN}   Created Parking Lot ID: $PARKING_LOT_ID${NC}"
                ;;
            *"Create Floor"*) 
                FLOOR_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
                echo -e "${CYAN}   Created Floor ID: $FLOOR_ID${NC}"
                ;;
            *"Create Parking Slot"*) 
                PARKING_SLOT_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
                echo -e "${CYAN}   Created Parking Slot ID: $PARKING_SLOT_ID${NC}"
                ;;
            *"Create Node"*) 
                NODE_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
                echo -e "${CYAN}   Created Node ID: $NODE_ID${NC}"
                ;;
        esac
    else
        print_test "$test_name (Expected: $expected_status, Got: $status)" "FAIL" "$body"
    fi
    
    # Small delay to avoid overwhelming the server
    sleep 0.1
}

echo -e "${BLUE}🚀 COMPREHENSIVE API TESTING - Smart Parking Backend${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "${PURPLE}Testing all APIs: Authentication, Gateway, Node, Parking Lot, Floor, Slot, Payment, Subscription${NC}"

# Step 1: Create Test Users
echo -e "\n${YELLOW}📋 Step 1: Creating Fresh Test Users${NC}"
test_endpoint "POST" "/auth/create-test-users" "" "" "200" "Create Test Users"

# Step 2: Get Authentication Tokens
echo -e "\n${YELLOW}📋 Step 2: Getting Authentication Tokens${NC}"

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

echo -e "${CYAN}Super Admin ID: $SUPER_ADMIN_ID${NC}"
echo -e "${CYAN}Admin ID: $ADMIN_ID${NC}" 
echo -e "${CYAN}User ID: $USER_ID${NC}"

# Step 3: Health and Basic Endpoints
echo -e "\n${YELLOW}📋 Step 3: Testing Health and Basic Endpoints${NC}"
test_endpoint "GET" "/health" "" "" "200" "Health Check"
test_endpoint "GET" "/test" "" "" "200" "Test Endpoint"

# Step 4: Authentication API Testing
echo -e "\n${YELLOW}📋 Step 4: Testing Authentication APIs${NC}"
test_endpoint "POST" "/auth/login" '{"email": "superadmin@test.com", "password": "password123"}' "" "200" "Super Admin Login"
test_endpoint "POST" "/auth/login" '{"email": "admin@test.com", "password": "password123"}' "" "200" "Admin Login"
test_endpoint "POST" "/auth/login" '{"email": "user@test.com", "password": "password123"}' "" "200" "User Login"
test_endpoint "POST" "/auth/login" '{"email": "wrong@email.com", "password": "wrong"}' "" "401" "Invalid Login"
test_endpoint "GET" "/auth/otp-config" "" "$ADMIN_TOKEN" "200" "Get OTP Config (Admin)"
test_endpoint "GET" "/auth/otp-config" "" "$USER_TOKEN" "403" "Get OTP Config (User - Should Fail)"

# Step 5: Gateway Management APIs (CRUD)
echo -e "\n${YELLOW}📋 Step 5: Testing Gateway Management APIs (CRUD)${NC}"
test_endpoint "GET" "/gateways" "" "$SUPER_ADMIN_TOKEN" "200" "Get All Gateways (Super Admin)"
test_endpoint "GET" "/gateways" "" "$ADMIN_TOKEN" "200" "Get Gateways (Admin)"
test_endpoint "GET" "/gateways" "" "$USER_TOKEN" "403" "Get Gateways (User - Should Fail)"

# Create Gateway
GATEWAY_DATA='{"chirpstackGatewayId": "test-gateway-001", "name": "Test Gateway 1", "description": "Test gateway for API testing", "location": "Test Location", "latitude": 40.7128, "longitude": -74.0060}'
test_endpoint "POST" "/gateways" "$GATEWAY_DATA" "$SUPER_ADMIN_TOKEN" "201" "Create Gateway (Super Admin)"
test_endpoint "POST" "/gateways" "$GATEWAY_DATA" "$ADMIN_TOKEN" "403" "Create Gateway (Admin - Should Fail)"

# Update Gateway
if [ ! -z "$GATEWAY_ID" ]; then
    GATEWAY_UPDATE='{"name": "Updated Test Gateway", "description": "Updated description"}'
    test_endpoint "PUT" "/gateways/$GATEWAY_ID" "$GATEWAY_UPDATE" "$SUPER_ADMIN_TOKEN" "200" "Update Gateway"
    test_endpoint "GET" "/gateways/$GATEWAY_ID" "" "$SUPER_ADMIN_TOKEN" "200" "Get Gateway by ID"
fi

# Gateway Statistics
test_endpoint "GET" "/gateways/statistics" "" "$SUPER_ADMIN_TOKEN" "200" "Get Gateway Statistics (Super Admin)"
test_endpoint "GET" "/gateways/statistics" "" "$ADMIN_TOKEN" "200" "Get Gateway Statistics (Admin)"

# Step 6: Parking Lot Management APIs (CRUD)
echo -e "\n${YELLOW}📋 Step 6: Testing Parking Lot Management APIs (CRUD)${NC}"
test_endpoint "GET" "/parking-lots" "" "$ADMIN_TOKEN" "200" "Get Parking Lots (Admin)"
test_endpoint "GET" "/parking-lots" "" "$USER_TOKEN" "200" "Get Parking Lots (User)"

# Create Parking Lot (Fixed data format)
PARKING_LOT_DATA='{"name": "Test Parking Lot", "address": "123 Test Street, Test City"}'
test_endpoint "POST" "/parking-lots" "$PARKING_LOT_DATA" "$ADMIN_TOKEN" "201" "Create Parking Lot (Admin)"
test_endpoint "POST" "/parking-lots" "$PARKING_LOT_DATA" "$USER_TOKEN" "403" "Create Parking Lot (User - Should Fail)"

# Update and Delete Parking Lot
if [ ! -z "$PARKING_LOT_ID" ]; then
    PARKING_LOT_UPDATE='{"name": "Updated Parking Lot", "address": "456 Updated Street"}'
    test_endpoint "PUT" "/parking-lots/$PARKING_LOT_ID" "$PARKING_LOT_UPDATE" "$ADMIN_TOKEN" "200" "Update Parking Lot"
    test_endpoint "GET" "/parking-lots/$PARKING_LOT_ID" "" "$ADMIN_TOKEN" "200" "Get Parking Lot by ID"
fi

# Step 7: Floor Management APIs (CRUD)
echo -e "\n${YELLOW}📋 Step 7: Testing Floor Management APIs (CRUD)${NC}"
if [ ! -z "$PARKING_LOT_ID" ]; then
    test_endpoint "GET" "/floors" "" "$ADMIN_TOKEN" "200" "Get All Floors (Admin)"
    
    # Create Floor
    FLOOR_DATA='{"parkingLotId": "'$PARKING_LOT_ID'", "name": "Ground Floor", "level": 0, "totalSlots": 50}'
    test_endpoint "POST" "/floors" "$FLOOR_DATA" "$ADMIN_TOKEN" "201" "Create Floor"
    
    # Update Floor
    if [ ! -z "$FLOOR_ID" ]; then
        FLOOR_UPDATE='{"name": "Updated Ground Floor", "totalSlots": 60}'
        test_endpoint "PUT" "/floors/$FLOOR_ID" "$FLOOR_UPDATE" "$ADMIN_TOKEN" "200" "Update Floor"
        test_endpoint "GET" "/floors/$FLOOR_ID" "" "$ADMIN_TOKEN" "200" "Get Floor by ID"
    fi
fi

# Step 8: Parking Slot Management APIs (CRUD)
echo -e "\n${YELLOW}📋 Step 8: Testing Parking Slot Management APIs (CRUD)${NC}"
if [ ! -z "$FLOOR_ID" ]; then
    test_endpoint "GET" "/parking-slots" "" "$ADMIN_TOKEN" "200" "Get All Parking Slots (Admin)"
    test_endpoint "GET" "/parking-slots" "" "$USER_TOKEN" "200" "Get Parking Slots (User)"
    
    # Create Parking Slot
    SLOT_DATA='{"floorId": "'$FLOOR_ID'", "slotNumber": "A001", "isOccupied": false}'
    test_endpoint "POST" "/parking-slots" "$SLOT_DATA" "$ADMIN_TOKEN" "201" "Create Parking Slot"
    
    # Update Parking Slot
    if [ ! -z "$PARKING_SLOT_ID" ]; then
        SLOT_UPDATE='{"slotNumber": "A001-Updated", "isOccupied": true}'
        test_endpoint "PUT" "/parking-slots/$PARKING_SLOT_ID" "$SLOT_UPDATE" "$ADMIN_TOKEN" "200" "Update Parking Slot"
        test_endpoint "GET" "/parking-slots/$PARKING_SLOT_ID" "" "$USER_TOKEN" "200" "Get Parking Slot by ID (User)"
        
        # Get slots by floor
        test_endpoint "GET" "/parking-slots/floor/$FLOOR_ID" "" "$USER_TOKEN" "200" "Get Slots by Floor (User)"
    fi
fi

# Step 9: Node Management APIs (CRUD)
echo -e "\n${YELLOW}📋 Step 9: Testing Node Management APIs (CRUD)${NC}"
if [ ! -z "$GATEWAY_ID" ]; then
    test_endpoint "GET" "/nodes" "" "$ADMIN_TOKEN" "200" "Get All Nodes (Admin)"
    test_endpoint "GET" "/nodes" "" "$USER_TOKEN" "403" "Get Nodes (User - Should Fail)"
    
    # Create Node
    NODE_DATA='{"gatewayId": "'$GATEWAY_ID'", "chirpstackDeviceId": "sensor-001", "name": "Test Sensor Node", "description": "Test sensor for parking detection"}'
    test_endpoint "POST" "/nodes" "$NODE_DATA" "$ADMIN_TOKEN" "201" "Create Node"
    
    # Update Node
    if [ ! -z "$NODE_ID" ]; then
        NODE_UPDATE='{"name": "Updated Sensor Node", "description": "Updated sensor description"}'
        test_endpoint "PUT" "/nodes/$NODE_ID" "$NODE_UPDATE" "$ADMIN_TOKEN" "200" "Update Node"
        test_endpoint "GET" "/nodes/$NODE_ID" "" "$ADMIN_TOKEN" "200" "Get Node by ID"
    fi
    
    # Get Gateway Nodes
    test_endpoint "GET" "/gateways/$GATEWAY_ID/nodes" "" "$ADMIN_TOKEN" "200" "Get Gateway Nodes"
fi

# Step 10: Subscription Plan APIs
echo -e "\n${YELLOW}📋 Step 10: Testing Subscription Plan APIs${NC}"
test_endpoint "GET" "/subscriptions/plans" "" "" "200" "Get Subscription Plans (Public)"
test_endpoint "GET" "/subscriptions/plans" "" "$USER_TOKEN" "200" "Get Subscription Plans (User)"

# Step 11: Subscription APIs
echo -e "\n${YELLOW}📋 Step 11: Testing Subscription APIs${NC}"
test_endpoint "GET" "/subscriptions/current" "" "$USER_TOKEN" "200" "Get Current User Subscription"
test_endpoint "GET" "/subscriptions/history" "" "$USER_TOKEN" "200" "Get User Subscription History"
test_endpoint "GET" "/subscriptions/payments" "" "$USER_TOKEN" "200" "Get User Payment History"
test_endpoint "GET" "/subscriptions/limits" "" "$USER_TOKEN" "200" "Check Subscription Limits"
test_endpoint "GET" "/subscriptions/analytics" "" "$ADMIN_TOKEN" "200" "Get Subscription Analytics (Admin)"

# Step 12: Real-time Sensor Data Integration (Webhook Testing)
echo -e "\n${YELLOW}📋 Step 12: Testing Real-time Sensor Data Integration${NC}"
SENSOR_DATA='{"deviceId": "sensor-001", "metadata": {"batteryLevel": 85, "rssi": -72, "occupied": true}}'
test_endpoint "POST" "/gateways/webhook/node-status" "$SENSOR_DATA" "" "200" "Node Status Webhook (No Auth)"

GATEWAY_STATUS='{"gatewayId": "test-gateway-001", "metadata": {"online": true, "lastSeen": "2025-09-14T03:30:00Z"}}'
test_endpoint "POST" "/gateways/webhook/gateway-status" "$GATEWAY_STATUS" "" "200" "Gateway Status Webhook (No Auth)"

# Step 13: UUID Validation Testing
echo -e "\n${YELLOW}📋 Step 13: Testing UUID Validation${NC}"
test_endpoint "GET" "/parking-lots/invalid-uuid" "" "$ADMIN_TOKEN" "400" "Invalid UUID Parameter"
test_endpoint "GET" "/gateways/not-a-uuid" "" "$SUPER_ADMIN_TOKEN" "400" "Invalid Gateway UUID"
test_endpoint "GET" "/floors/12345" "" "$ADMIN_TOKEN" "400" "Invalid Floor UUID (Numeric)"

# Step 14: Role-based Access Control Validation
echo -e "\n${YELLOW}📋 Step 14: Testing Role-Based Access Control${NC}"
test_endpoint "GET" "/gateways" "" "" "401" "Unauthorized Access"
test_endpoint "POST" "/gateways" "$GATEWAY_DATA" "" "401" "Unauthorized Gateway Creation"
test_endpoint "DELETE" "/gateways/test" "" "$USER_TOKEN" "403" "User Cannot Delete Gateway"

# Step 15: Clean up - Delete created entities
echo -e "\n${YELLOW}📋 Step 15: Testing Delete Operations (Cleanup)${NC}"
if [ ! -z "$PARKING_SLOT_ID" ]; then
    test_endpoint "DELETE" "/parking-slots/$PARKING_SLOT_ID" "" "$ADMIN_TOKEN" "200" "Delete Parking Slot"
fi

if [ ! -z "$FLOOR_ID" ]; then
    test_endpoint "DELETE" "/floors/$FLOOR_ID" "" "$ADMIN_TOKEN" "200" "Delete Floor"
fi

if [ ! -z "$NODE_ID" ]; then
    test_endpoint "DELETE" "/nodes/$NODE_ID" "" "$ADMIN_TOKEN" "200" "Delete Node"
fi

if [ ! -z "$PARKING_LOT_ID" ]; then
    test_endpoint "DELETE" "/parking-lots/$PARKING_LOT_ID" "" "$ADMIN_TOKEN" "200" "Delete Parking Lot"
fi

if [ ! -z "$GATEWAY_ID" ]; then
    test_endpoint "DELETE" "/gateways/$GATEWAY_ID" "" "$SUPER_ADMIN_TOKEN" "200" "Delete Gateway"
fi

# Final Results
echo -e "\n${BLUE}============================================================${NC}"
echo -e "${BLUE}🎯 COMPREHENSIVE API TESTING SUMMARY${NC}"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"  
echo -e "${BLUE}📊 Total Tests: $TOTAL${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! The Smart Parking Backend API is fully functional.${NC}"
    exit 0
else
    PASS_RATE=$(( PASSED * 100 / TOTAL ))
    echo -e "\n${YELLOW}⚠️  $FAILED tests failed out of $TOTAL total tests (${PASS_RATE}% pass rate)${NC}"
    echo -e "${YELLOW}Please review the failed tests above for details.${NC}"
    exit 1
fi