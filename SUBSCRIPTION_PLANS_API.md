# Subscription Plans API Documentation

## Overview

The Subscription Plans API provides comprehensive CRUD operations for managing subscription plans in the Smart Parking Backend system. This API supports role-based access control, advanced filtering, pagination, and comprehensive validation.

## Base URL

```
http://localhost:3000/api/subscription-plans
```

## Authentication & Authorization

- **Public Access**: GET endpoints (viewing subscription plans)
- **Admin Access**: All operations for their organization's plans
- **Super Admin Access**: All operations across all plans + management functions

### Role-Based Access Control

| Role | View Plans | Create Plans | Update Plans | Delete Plans | Admin Functions |
|------|------------|--------------|--------------|--------------|-----------------|
| **Public** | ✅ Active only | ❌ | ❌ | ❌ | ❌ |
| **User** | ✅ Active only | ❌ | ❌ | ❌ | ❌ |
| **Admin** | ✅ All visible | ❌ | ❌ | ❌ | ❌ |
| **Super Admin** | ✅ All | ✅ | ✅ | ✅ | ✅ |

## Endpoints

### Create Payment Session (Cashfree)

**POST** `/api/subscriptions/payments/session`

Creates a Cashfree payment session for the selected subscription plan. Requires an authenticated admin token.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `planId` | string (UUID) | ✅ | Target subscription plan ID |
| `billingCycle` | string | ✅ | `monthly`, `yearly`, or `quarterly` |
| `nodeCount` | integer | ❌ | Optional additional node count |

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/subscriptions/payments/session" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
        "planId": "555079c7-e50d-4424-8437-17b1f956ae23",
        "billingCycle": "monthly",
        "nodeCount": 0
      }'
```

#### Example Response

```json
{
  "success": true,
  "message": "Payment session created successfully",
  "data": {
    "paymentSessionId": "session_123",
    "orderId": "SP_1758093229468_b3a5e754",
    "cfOrderId": 123456789,
    "orderAmount": 82917,
    "orderCurrency": "INR",
    "paymentId": "7a1baf2b-52db-4e40-94af-e2fc8ac2be5d",
    "subscriptionId": "0dfca731-41e3-4dc3-98fb-988dcb0848fa",
    "plan": {
      "id": "555079c7-e50d-4424-8437-17b1f956ae23",
      "name": "Professional",
      "billingCycle": "monthly",
      "amountUsd": 999.0,
      "amountInInr": 82917.0
    },
    "returnUrl": "https://your-app.com/payments/cashfree/return"
  }
}
```

### 1. Get All Subscription Plans

**GET** `/api/subscription-plans`

Retrieves a list of subscription plans with advanced filtering and pagination.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `isActive` | boolean | `true` | Filter by active status |
| `isPopular` | boolean | - | Filter by popular plans |
| `isCustom` | boolean | - | Filter by custom plans |
| `billingCycle` | string | - | Filter by billing cycle (`monthly`, `yearly`, `quarterly`) |
| `minPrice` | number | - | Minimum price filter |
| `maxPrice` | number | - | Maximum price filter |
| `sortBy` | string | `sortOrder` | Sort field (`sortOrder`, `basePricePerMonth`, `name`, `createdAt`) |
| `sortOrder` | string | `asc` | Sort direction (`asc`, `desc`) |
| `limit` | number | `20` | Number of results (max 100) |
| `offset` | number | `0` | Results offset for pagination |

#### Example Requests

```bash
# Get all active subscription plans
curl "http://localhost:3000/api/subscription-plans"

# Get only popular plans
curl "http://localhost:3000/api/subscription-plans?isPopular=true"

# Get plans sorted by price (descending) with pagination
curl "http://localhost:3000/api/subscription-plans?sortBy=basePricePerMonth&sortOrder=desc&limit=5&offset=0"

# Get monthly plans within price range
curl "http://localhost:3000/api/subscription-plans?billingCycle=monthly&minPrice=50&maxPrice=200"
```

#### Example Response

```json
{
  "success": true,
  "message": "Subscription plans retrieved successfully",
  "data": [
    {
      "id": "555079c7-e50d-4424-8437-17b1f956ae23",
      "name": "Professional",
      "description": "Ideal for growing businesses and medium-sized parking facilities",
      "pricing": {
        "monthly": {
          "base": "79.99",
          "perNode": "1.75",
          "formatted": {
            "usd": "$79.99",
            "inr": "₹5,999.25"
          }
        },
        "yearly": {
          "base": "799.99",
          "perNode": "17.50",
          "formatted": {
            "usd": "$799.99",
            "inr": "₹59,999.25"
          },
          "discount": 17
        },
        "quarterly": {
          "base": "219.99",
          "perNode": "4.75",
          "formatted": {
            "usd": "$219.99",
            "inr": "₹16,499.25"
          }
        }
      },
      "limits": {
        "maxGateways": 5,
        "maxParkingLots": 3,
        "maxFloors": 5,
        "maxParkingSlots": 200,
        "maxUsers": 15
      },
      "features": [
        "Advanced IoT monitoring",
        "Real-time parking status",
        "Advanced analytics & reporting",
        "Priority email support",
        "Mobile app access",
        "API access",
        "Custom branding"
      ],
      "includes": {
        "analytics": true,
        "support": true,
        "api": true,
        "customization": true
      },
      "metadata": {
        "isActive": true,
        "isPopular": true,
        "isCustom": false,
        "defaultBillingCycle": "monthly",
        "sortOrder": 2
      },
      "createdAt": "2025-09-14T03:51:15.706Z",
      "updatedAt": "2025-09-14T03:51:15.706Z"
    }
  ],
  "pagination": {
    "total": 4,
    "count": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### 2. Get Subscription Plan by ID

**GET** `/api/subscription-plans/{id}`

Retrieves a specific subscription plan by its UUID.

#### Example Request

```bash
curl "http://localhost:3000/api/subscription-plans/555079c7-e50d-4424-8437-17b1f956ae23"
```

#### Example Response

```json
{
  "success": true,
  "message": "Subscription plan retrieved successfully",
  "data": {
    "id": "555079c7-e50d-4424-8437-17b1f956ae23",
    "name": "Professional",
    "description": "Ideal for growing businesses and medium-sized parking facilities",
    "pricing": {
      "monthly": {
        "base": "79.99",
        "perNode": "1.75",
        "formatted": {
          "usd": "$79.99",
          "inr": "₹5,999.25"
        }
      },
      "yearly": {
        "base": "799.99",
        "perNode": "17.50",
        "formatted": {
          "usd": "$799.99",
          "inr": "₹59,999.25"
        },
        "discount": 17
      }
    },
    "limits": {
      "maxGateways": 5,
      "maxParkingLots": 3,
      "maxFloors": 5,
      "maxParkingSlots": 200,
      "maxUsers": 15
    },
    "features": [
      "Advanced IoT monitoring",
      "Real-time parking status",
      "Advanced analytics & reporting"
    ],
    "includes": {
      "analytics": true,
      "support": true,
      "api": true,
      "customization": true
    },
    "metadata": {
      "isActive": true,
      "isPopular": true,
      "isCustom": false,
      "defaultBillingCycle": "monthly",
      "sortOrder": 2
    },
    "createdAt": "2025-09-14T03:51:15.706Z",
    "updatedAt": "2025-09-14T03:51:15.706Z"
  }
}
```

### 3. Create Subscription Plan

**POST** `/api/subscription-plans`

**🔐 Requires**: Super Admin authentication

Creates a new subscription plan.

#### Request Body

```json
{
  "name": "Premium Plus",
  "description": "Enhanced plan with premium features",
  "basePricePerMonth": 149.99,
  "basePricePerYear": 1499.99,
  "basePricePerQuarter": 399.99,
  "pricePerNodePerMonth": 2.50,
  "pricePerNodePerYear": 25.00,
  "pricePerNodePerQuarter": 6.75,
  "usdToInrRate": 75.00,
  "defaultBillingCycle": "monthly",
  "maxGateways": 10,
  "maxParkingLots": 5,
  "maxFloors": 8,
  "maxParkingSlots": 500,
  "maxUsers": 25,
  "features": [
    "Premium IoT monitoring",
    "Real-time parking status",
    "Advanced analytics & reporting",
    "24/7 phone support",
    "Mobile app access",
    "Full API access",
    "Custom branding"
  ],
  "includesAnalytics": true,
  "includesSupport": true,
  "includesAPI": true,
  "includesCustomization": true,
  "isActive": true,
  "isPopular": false,
  "isCustom": false,
  "sortOrder": 3
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/subscription-plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "name": "Premium Plus",
    "description": "Enhanced plan with premium features",
    "basePricePerMonth": 149.99,
    "basePricePerYear": 1499.99,
    "pricePerNodePerMonth": 2.50,
    "pricePerNodePerYear": 25.00,
    "maxGateways": 10,
    "maxParkingLots": 5,
    "maxFloors": 8,
    "maxParkingSlots": 500,
    "maxUsers": 25,
    "features": ["Premium IoT monitoring", "Advanced analytics"],
    "includesAnalytics": true,
    "includesSupport": true,
    "includesAPI": true,
    "isActive": true
  }'
```

### 4. Update Subscription Plan

**PUT** `/api/subscription-plans/{id}`

**🔐 Requires**: Super Admin authentication

Updates an existing subscription plan.

#### Example Request

```bash
curl -X PUT "http://localhost:3000/api/subscription-plans/555079c7-e50d-4424-8437-17b1f956ae23" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "basePricePerMonth": 89.99,
    "basePricePerYear": 899.99,
    "isPopular": true
  }'
```

### 5. Delete Subscription Plan

**DELETE** `/api/subscription-plans/{id}`

**🔐 Requires**: Super Admin authentication

Soft deletes a subscription plan. Plans with active subscriptions cannot be deleted.

#### Request Body

```json
{
  "reason": "Plan discontinued due to low demand"
}
```

#### Example Request

```bash
curl -X DELETE "http://localhost:3000/api/subscription-plans/555079c7-e50d-4424-8437-17b1f956ae23" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "reason": "Plan discontinued"
  }'
```

### 6. Bulk Update Subscription Plans

**POST** `/api/subscription-plans/bulk/update`

**🔐 Requires**: Super Admin authentication

Updates multiple subscription plans at once.

#### Request Body

```json
{
  "planIds": [
    "555079c7-e50d-4424-8437-17b1f956ae23",
    "a7a02ece-198a-410c-8334-206b37f9ae13"
  ],
  "updates": {
    "usdToInrRate": 76.50,
    "isActive": true
  }
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/subscription-plans/bulk/update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "planIds": ["555079c7-e50d-4424-8437-17b1f956ae23", "a7a02ece-198a-410c-8334-206b37f9ae13"],
    "updates": {
      "usdToInrRate": 76.50,
      "isActive": true
    }
  }'
```

### 7. Update Exchange Rate

**POST** `/api/subscription-plans/exchange-rate`

**🔐 Requires**: Super Admin authentication

Updates USD to INR exchange rate for all subscription plans.

#### Request Body

```json
{
  "usdToInrRate": 76.50
}
```

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/subscription-plans/exchange-rate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "usdToInrRate": 76.50
  }'
```

### 8. Get Subscription Plan Statistics

**GET** `/api/subscription-plans/stats`

**🔐 Requires**: Admin or Super Admin authentication

Retrieves comprehensive statistics about subscription plans.

#### Example Request

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:3000/api/subscription-plans/stats"
```

#### Example Response

```json
{
  "success": true,
  "message": "Subscription plan statistics retrieved successfully",
  "data": {
    "overview": {
      "total": 4,
      "active": 4,
      "popular": 1,
      "custom": 1,
      "deleted": 0
    },
    "pricing": {
      "minMonthlyPrice": 0.00,
      "maxMonthlyPrice": 199.99,
      "avgMonthlyPrice": 77.49
    },
    "healthScore": 100
  }
}
```

### 9. Restore Deleted Subscription Plan

**POST** `/api/subscription-plans/{id}/restore`

**🔐 Requires**: Super Admin authentication

Restores a soft-deleted subscription plan.

#### Example Request

```bash
curl -X POST "http://localhost:3000/api/subscription-plans/555079c7-e50d-4424-8437-17b1f956ae23/restore" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

## Data Models

### Important Notes

- **UUID Format**: All `id` fields use UUID v4 format (e.g., `555079c7-e50d-4424-8437-17b1f956ae23`)
- **Path Parameters**: When using `{id}` in API endpoints, replace with actual UUID
- **Swagger UI**: The interactive API documentation at `/api-docs` shows proper UUID format validation

### Subscription Plan Schema

```typescript
{
  id: string;                    // UUID (e.g., "555079c7-e50d-4424-8437-17b1f956ae23")
  name: string;                  // Unique plan name
  description: string;           // Plan description
  
  // Base pricing in USD
  basePricePerMonth: number;     // Monthly base price
  basePricePerYear: number;      // Yearly base price
  basePricePerQuarter?: number;  // Quarterly base price (optional)
  
  // Per-node pricing in USD
  pricePerNodePerMonth: number;  // Monthly per-node price
  pricePerNodePerYear: number;   // Yearly per-node price
  pricePerNodePerQuarter?: number; // Quarterly per-node price (optional)
  
  // Currency conversion
  usdToInrRate: number;          // USD to INR conversion rate
  
  // Resource limits
  maxGateways: number;           // Maximum gateways allowed
  maxParkingLots: number;        // Maximum parking lots allowed
  maxFloors: number;             // Maximum floors allowed
  maxParkingSlots: number;       // Maximum parking slots allowed
  maxUsers: number;              // Maximum users allowed
  
  // Features and capabilities
  features: string[];            // Array of feature descriptions
  includesAnalytics: boolean;    // Analytics included
  includesSupport: boolean;      // Support included
  includesAPI: boolean;          // API access included
  includesCustomization: boolean; // Customization included
  
  // Plan metadata
  defaultBillingCycle: 'monthly' | 'yearly' | 'quarterly';
  sortOrder: number;             // Display order
  isActive: boolean;             // Plan availability
  isPopular: boolean;            // Popular plan badge
  isCustom: boolean;             // Custom plan flag
  isDeleted: boolean;            // Soft delete flag
  deletedAt?: Date;              // Deletion timestamp
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  createdBy?: User;              // Plan creator (Super Admin)
}
```

## Error Responses

The API returns standardized error responses:

### 400 Bad Request

```json
{
  "success": false,
  "message": "Validation failed",
  "error": "VALIDATION_ERROR",
  "details": {
    "field": "basePricePerMonth",
    "message": "Must be a positive number"
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Insufficient permissions. Super Admin access required.",
  "error": "FORBIDDEN"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Subscription plan not found",
  "error": "RESOURCE_NOT_FOUND"
}
```

### 409 Conflict

```json
{
  "success": false,
  "message": "A subscription plan with this name already exists",
  "error": "RESOURCE_CONFLICT"
}
```

### 429 Too Many Requests

```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again after 15 minutes",
  "error": "RATE_LIMIT_EXCEEDED"
}
```

## Rate Limiting

The API implements rate limiting:

- **General API**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 20 requests per 15 minutes per IP
- **Sensitive operations**: 10 requests per 5 minutes per IP

## Testing Setup

### 1. Start the Server

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 2. Seed Sample Data

```bash
# Create sample subscription plans
npm run seed:plans
```

### 3. Run Tests

```bash
# Test basic functionality
curl "http://localhost:3000/api/health"
curl "http://localhost:3000/api/subscription-plans"

# Test filtering
curl "http://localhost:3000/api/subscription-plans?isPopular=true"
curl "http://localhost:3000/api/subscription-plans?sortBy=basePricePerMonth&sortOrder=desc&limit=2"

# Test single plan retrieval
curl "http://localhost:3000/api/subscription-plans/PLAN_ID_HERE"
```

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:3000/api-docs
```

## Features Implemented

✅ **Complete CRUD Operations**: Create, Read, Update, Delete subscription plans  
✅ **Role-Based Access Control**: Public, Admin, and Super Admin permissions  
✅ **Advanced Filtering**: By status, popularity, custom, billing cycle, price range  
✅ **Comprehensive Pagination**: Limit, offset, total count, hasMore flag  
✅ **Flexible Sorting**: By multiple fields in ascending/descending order  
✅ **Multi-Currency Support**: USD base prices with dynamic INR conversion  
✅ **Data Validation**: Comprehensive Joi schema validation  
✅ **Error Handling**: Standardized error responses with proper HTTP status codes  
✅ **Rate Limiting**: Protection against abuse and DoS attacks  
✅ **Structured Logging**: Business events, security events, and API access logs  
✅ **Soft Delete**: Plans can be deleted and restored without data loss  
✅ **Bulk Operations**: Update multiple plans simultaneously  
✅ **Statistics**: Comprehensive metrics and health scoring  
✅ **Swagger Documentation**: Interactive API documentation  
✅ **TypeScript**: Full type safety and IntelliSense support  

## Security Features

- **Input Validation**: All inputs validated using Joi schemas
- **Rate Limiting**: Multiple rate limit tiers based on endpoint sensitivity
- **Role-Based Authorization**: Granular permissions based on user roles
- **Structured Logging**: Security events and failed attempts logged
- **Data Sanitization**: Protection against injection attacks
- **CORS Configuration**: Secure cross-origin resource sharing
- **Helmet Security**: Additional security headers and protections

## Performance Features

- **Database Indexes**: Optimized queries with proper indexing
- **Pagination**: Efficient data retrieval for large datasets
- **Query Optimization**: Complex filtering with minimal database load
- **Response Caching**: Appropriate caching strategies for static data
- **Connection Pooling**: Efficient database connection management
