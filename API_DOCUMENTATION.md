# API Documentation

## Overview

The Smart Parking System API is fully documented using OpenAPI 3.0 (Swagger). All endpoints are available through an interactive API documentation interface.

## Accessing the Documentation

### Interactive Swagger UI
- **Local**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)
- **Production**: https://smart-parking-backend-production-5449.up.railway.app/api-docs

### Swagger JSON
- **Local**: [http://localhost:3001/swagger.json](http://localhost:3001/swagger.json)
- **Alternative**: [http://localhost:3001/api-docs.json](http://localhost:3001/api-docs.json)

## What's Included

### Complete API Schemas

All data models are fully documented with examples:

- **User**: User account with profile information and role-based access
- **SubscriptionPlan**: Subscription plans with node-based pricing
- **Subscription**: Active user subscriptions with limits and billing info
- **Payment**: Payment transactions with Cashfree integration
- **ParkingLot**: Parking facilities with location data
- **Floor**: Building floors within parking lots
- **ParkingSlot**: Individual parking spaces
- **Gateway**: LoRa gateways for IoT connectivity
- **Node**: IoT sensors for parking space monitoring
- **ParkingStatusLog**: Historical parking status data

### API Endpoint Categories

1. **Authentication** (`/api/auth/*`)
   - User registration and login
   - OTP verification (email-based)
   - Password reset flow
   - Profile management
   - Token refresh

2. **Parking Management** (`/api/parking-lots/*`, `/api/floors/*`, `/api/parking-slots/*`)
   - CRUD operations for parking infrastructure
   - Hierarchical data management
   - Real-time status updates
   - Ownership and access control

3. **IoT Devices** (`/api/gateways/*`, `/api/nodes/*`)
   - Gateway management and linking
   - Node registration and monitoring
   - Real-time sensor data
   - Battery and signal quality tracking
   - ChirpStack integration

4. **Subscriptions** (`/api/subscription-plans/*`, `/api/subscriptions/*`)
   - Plan management (admin only)
   - Subscription status checking
   - Payment processing
   - Feature limit enforcement
   - Pricing calculations (USD and INR)

5. **Analytics & Monitoring** (`/api/parking/*`)
   - Real-time parking status
   - Historical data queries
   - Occupancy analytics
   - Status log tracking

6. **System** (`/api/health`)
   - Health checks
   - System status
   - Database connectivity

## Authentication

All endpoints (except public ones like login/signup) require JWT authentication.

### Getting Started

1. **Register a new account**:
   ```bash
   POST /api/auth/signup
   {
     "email": "user@example.com",
     "password": "YourPassword123!",
     "firstName": "John",
     "lastName": "Doe"
   }
   ```

2. **Verify email with OTP**:
   ```bash
   POST /api/auth/verify-otp
   {
     "email": "user@example.com",
     "otp": "123456"
   }
   ```

3. **Login to get JWT token**:
   ```bash
   POST /api/auth/login
   {
     "email": "user@example.com",
     "password": "YourPassword123!"
   }
   ```

4. **Use the token in subsequent requests**:
   ```bash
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## Test Credentials

Use these pre-seeded accounts for testing:

### Super Admin
- **Email**: `superadmin@test.com`
- **Password**: `Test@1234`
- **Role**: `super_admin`
- **Access**: Full system access

### Admin (Professional Plan)
- **Email**: `admin@test.com`
- **Password**: `Test@1234`
- **Role**: `admin`
- **Subscription**: Professional Plan with 3 nodes
- **Data**: 2 parking lots, 10 slots, 2 gateways, 5 nodes

### User (Basic Plan)
- **Email**: `user@test.com`
- **Password**: `Test@1234`
- **Role**: `user`
- **Subscription**: Basic Plan with 2 nodes
- **Data**: 1 parking lot, 5 slots, 1 gateway, 3 nodes

### Unverified User
- **Email**: `unverified@test.com`
- **Password**: `Test@1234`
- **Status**: Not verified (for testing OTP flows)

## Example API Calls

### Login and Get Profile

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Test@1234"
  }'

# Response includes token
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

# Get profile with token
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Subscription Plans

```bash
curl -X GET http://localhost:3001/api/subscription-plans \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Parking Lots

```bash
curl -X GET http://localhost:3001/api/parking-lots \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Real-time Parking Status

```bash
# Get all parking status
curl -X GET http://localhost:3001/api/parking/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get status for specific lot
curl -X GET http://localhost:3001/api/parking/status?parkingLotId=<UUID> \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create a Node (IoT Sensor)

```bash
curl -X POST http://localhost:3001/api/nodes \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sensor A-011",
    "chirpstackDeviceId": "0123456789ABCDEF",
    "description": "Ultrasonic sensor for slot A-011",
    "parkingSlotId": "PARKING_SLOT_UUID",
    "latitude": 18.9258,
    "longitude": 72.8220
  }'
```

## Subscription Plans

### Basic Plan
- **Price**: $19.99/month + $2.00/node
- **INR**: ₹1,659/month + ₹166/node (@ 1 USD = 83 INR)
- **Limits**:
  - 2 parking lots
  - 50 parking slots
  - 4 floors
  - 2 gateways
  - 2 users
- **Features**: Email support, Real-time monitoring

### Professional Plan ⭐ (Most Popular)
- **Price**: $49.99/month + $2.00/node
- **INR**: ₹4,149/month + ₹166/node
- **Limits**:
  - 5 parking lots
  - 200 parking slots
  - 10 floors
  - 5 gateways
  - 5 users
- **Features**: Analytics, API access, Priority support

### Enterprise Plan
- **Price**: $149.99/month + $1.50/node
- **INR**: ₹12,449/month + ₹124.50/node
- **Limits**: Unlimited
- **Features**: 24/7 premium support, Custom features, White-label options

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "count": 1
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### Subscription Limit Error
```json
{
  "success": false,
  "message": "Parking Lot limit reached. Current: 2/2",
  "code": "FEATURE_LIMIT_EXCEEDED",
  "data": {
    "feature": "parkingLots",
    "current": 2,
    "limit": 2,
    "planName": "Basic"
  }
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions or subscription limit)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

## Rate Limiting

- **General**: 100 requests per 15 minutes
- **Authentication**: 20 requests per 15 minutes
- **Strict endpoints**: 10 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

## Pagination

List endpoints support pagination:

```bash
GET /api/parking-lots?page=1&limit=10
```

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

## Filtering and Sorting

Many endpoints support filtering and sorting:

```bash
# Filter by status
GET /api/parking-slots?status=available

# Sort by name
GET /api/parking-lots?sortBy=name&order=asc

# Combine filters
GET /api/nodes?isActive=true&sortBy=lastSeen&order=desc
```

## WebSocket (Future)

Real-time updates for parking status changes will be available via WebSocket in a future update.

## Support

- **Documentation**: [Swagger UI](http://localhost:3001/api-docs)
- **API Issues**: Check server logs or contact support
- **Test Data**: Run `npm run seed:test-data` to reset test environment

## Additional Resources

- [TEST_DATA.md](TEST_DATA.md) - Complete test data documentation
- [CLAUDE.md](CLAUDE.md) - Development commands and architecture
- [README.md](README.md) - Project setup and overview

## Version

Current API Version: **v1.0.0**

All endpoints are available at base path `/api/`.
