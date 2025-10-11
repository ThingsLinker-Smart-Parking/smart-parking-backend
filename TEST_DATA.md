# Test Data Seeding

This document describes the test data available in the system for development and testing purposes.

## Quick Start

To seed the database with comprehensive test data:

```bash
npm run seed:test-data
```

This will create a complete test environment with users, subscriptions, parking infrastructure, gateways, nodes, and historical data.

## Test Credentials

### Super Admin
- **Email:** superadmin@test.com
- **Password:** Test@1234
- **Role:** super_admin
- **Access:** Full system access, can manage all resources

### Admin (with Professional Subscription)
- **Email:** admin@test.com
- **Password:** Test@1234
- **Role:** admin
- **Subscription:** Professional Plan (3 nodes)
- **Resources:**
  - Parking Lot: Downtown Parking Complex (Mumbai)
  - Floors: Ground Floor, First Floor
  - Slots: 10 (A-001 to A-010)
  - Gateways: 2 (GW-ADMIN-001, GW-ADMIN-002)
  - Nodes: 5 (NODE-ADMIN-001 to NODE-ADMIN-005)

### User (with Basic Subscription)
- **Email:** user@test.com
- **Password:** Test@1234
- **Role:** user
- **Subscription:** Basic Plan (2 nodes)
- **Resources:**
  - Parking Lot: Residential Parking Area (Pune)
  - Floor: Ground Level
  - Slots: 5 (B-001 to B-005)
  - Gateway: 1 (GW-USER-001)
  - Nodes: 3 (NODE-USER-001 to NODE-USER-003)

### Unverified User
- **Email:** unverified@test.com
- **Password:** Test@1234
- **Status:** Not verified (cannot login)
- **Use Case:** Test email verification and subscription purchase flows

## Subscription Plans

### Basic Plan
- **Price:** $19.99/month + $2.00/node/month
- **INR Equivalent:** ₹1,659/month + ₹166/node/month (@ 1 USD = 83 INR)
- **Limits:**
  - 2 parking lots
  - 50 parking slots
  - 4 floors
  - 2 gateways
  - 2 users
- **Features:**
  - Basic parking management
  - Real-time monitoring
  - Email support
- **Includes:** Support ✓

### Professional Plan (Most Popular)
- **Price:** $49.99/month + $2.00/node/month
- **INR Equivalent:** ₹4,149/month + ₹166/node/month
- **Limits:**
  - 5 parking lots
  - 200 parking slots
  - 10 floors
  - 5 gateways
  - 5 users
- **Features:**
  - Advanced analytics
  - Priority support
  - Custom integrations
  - Real-time dashboard
- **Includes:** Analytics ✓ | Support ✓ | API Access ✓

### Enterprise Plan
- **Price:** $149.99/month + $1.50/node/month
- **INR Equivalent:** ₹12,449/month + ₹124.50/node/month
- **Limits:** Unlimited
- **Features:**
  - 24/7 premium support
  - Dedicated account manager
  - Custom features
  - White-label options
  - Advanced API access
  - Custom integrations
- **Includes:** Analytics ✓ | Support ✓ | API Access ✓ | Customization ✓

## Test Data Summary

- **Users:** 4 (1 super-admin, 1 admin, 1 user, 1 unverified)
- **Subscription Plans:** 3 (Basic, Professional, Enterprise)
- **Active Subscriptions:** 2 (admin: Professional, user: Basic)
- **Payments:** 2 completed test transactions
- **Parking Lots:** 2 (Downtown Complex, Residential Area)
- **Floors:** 3 (2 admin floors, 1 user floor)
- **Parking Slots:** 15 (10 admin, 5 user)
- **Gateways:** 3 (2 admin, 1 user)
- **IoT Nodes:** 8 (5 admin, 3 user)
- **Status Logs:** 21 historical records

## Testing Scenarios

### 1. Authentication & User Management
- Login with verified users (superadmin@test.com, admin@test.com, user@test.com)
- Test OTP verification with unverified@test.com
- Test password reset flows
- Test role-based access control

### 2. Subscription Management
- View active subscriptions (admin and user accounts)
- Test subscription limits enforcement
- Upgrade/downgrade subscription plans
- Purchase new subscription (use unverified@test.com)

### 3. Parking Infrastructure
- View parking lots, floors, and slots
- Monitor real-time parking status
- Test slot status updates
- View historical parking data

### 4. IoT Device Management
- Manage gateways and nodes
- View device status and metadata
- Test device assignment to parking slots
- Monitor battery levels and signal quality

### 5. Payment Processing
- View payment history
- Test Cashfree integration (sandbox mode)
- Generate invoices and receipts

## API Testing

Use the test credentials above with the following endpoints:

- **Base URL:** http://localhost:3001
- **API Docs:** http://localhost:3001/api-docs
- **Swagger JSON:** http://localhost:3001/swagger.json

### Example Login Request

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Test@1234"
  }'
```

### Example Get Parking Lots

```bash
curl -X GET http://localhost:3001/api/parking-lots \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Data Cleanup

To clear all test data and reseed:

```bash
# Clear all data (WARNING: This will delete ALL data)
node -e "require('./seed-test-data.js')" # Run with empty database

# Or manually clear specific tables in order:
# parking_status_log → node → gateway → parking_slot → floor → parking_lot → payment → subscription → subscription_plan → user
```

## Notes

- All test data uses the prefix "TEST_" in transaction IDs for easy identification
- Payments are marked as `isTest: true` in the database
- Exchange rate is set to 1 USD = 83 INR
- All timestamps use server timezone (IST)
- Battery levels, RSSI, and SNR values are simulated for testing

## Development Tips

1. **Start Fresh:** Run the seed script after resetting the database schema
2. **Consistent Data:** The script generates deterministic test data for reproducibility
3. **Historical Data:** Status logs span multiple hours for timeline testing
4. **Real Locations:** Uses actual coordinates for Mumbai and Pune for map testing
5. **Various States:** Includes both occupied and available slots for realistic testing

## Troubleshooting

### Duplicate Key Errors
If you see duplicate key violations, the data already exists. Clear the database first.

### Foreign Key Errors
Ensure the database schema is up to date:
```bash
npm run migration:run
```

### Missing Dependencies
Install required packages:
```bash
npm install
```

## Support

For issues or questions about test data:
- Check server logs for detailed error messages
- Review API documentation at http://localhost:3001/api-docs
- Check database connection settings in `.env`
