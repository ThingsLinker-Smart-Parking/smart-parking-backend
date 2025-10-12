import { Options } from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

// Remove the package.json import and use environment variable or hardcode version
const localPort = process.env.PORT || '3001';

const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Parking System API',
      version: process.env.APP_VERSION || '1.0.0', // Use env variable or default
      description: `
# Smart Parking System API

🎉 **Production-Ready Smart Parking Management System with IoT Integration**

## System Overview
Complete parking management solution with real-time IoT monitoring, subscription-based access control, and comprehensive payment integration.

### Key Features:
- 🏗️ **Hierarchical Data Management**: User → ParkingLot → Floor → ParkingSlot ← Node (IoT Sensor)
- 🔐 **Role-based Access Control**: Super Admin, Admin, and User roles with subscription-based limits
- 📊 **Flexible Subscription Plans**: Node-based pricing with Basic, Professional, and Enterprise tiers
- 🌐 **LoRa IoT Integration**: Real-time parking status via ChirpStack MQTT
- 💳 **Payment Gateway**: Cashfree integration with support for web and mobile apps
- 📈 **Analytics & Monitoring**: Historical data, real-time status, and health checks

### Test Data Available:
Test data is pre-seeded for immediate testing. Use \`npm run seed:test-data\` to reset.

**Test Credentials:**
- Super Admin: \`superadmin@test.com\` / \`Test@1234\`
- Admin (Professional Plan): \`admin@test.com\` / \`Test@1234\`
- User (Basic Plan): \`user@test.com\` / \`Test@1234\`
- Unverified User: \`unverified@test.com\` / \`Test@1234\`

### Subscription Plans:
- **Basic**: $19.99/mo + $2/node (₹1,659 + ₹166/node)
  - 2 lots, 50 slots, 2 gateways, Email support
- **Professional** ⭐: $49.99/mo + $2/node (₹4,149 + ₹166/node)
  - 5 lots, 200 slots, 5 gateways, Analytics, API access, Priority support
- **Enterprise**: $149.99/mo + $1.50/node (₹12,449 + ₹124.50/node)
  - Unlimited resources, 24/7 premium support, Custom features

### Architecture:
**Data Flow**: ChirpStack → MQTT (HiveMQ) → Node → ParkingSlot → Real-time Status
**Hierarchy**: Nodes connect directly to parking slots; gateway info from MQTT metadata
**MQTT Integration**: Dynamic topic subscription based on Application IDs stored in ParkingLot table
**Real-time Updates**: Status changes propagate immediately (<1s) from sensor to database

### Endpoint Categories:
- **Authentication**: Login, registration, OTP verification, password reset
- **Parking Management**: Lots, floors, slots with full CRUD operations
- **IoT Devices**: Gateway and node management with LoRa integration
- **Subscriptions**: Plan management, subscription status, payment processing
- **Analytics**: Status logs, historical data, real-time monitoring
- **System**: Health checks, API documentation

**Complete API documentation with examples and test data. All endpoints require JWT authentication unless specified.**
      `,
      contact: {
        name: 'API Support',
        email: 'support@smartparking.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://smart-parking-backend-production-5449.up.railway.app',
        description: 'Production server'
      },
      {
        url: `http://localhost:${localPort}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            email: { type: 'string', example: 'admin@test.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['super_admin', 'admin', 'user'], example: 'admin' },
            isVerified: { type: 'boolean', example: true },
            isActive: { type: 'boolean', example: true },
            phone: { type: 'string', example: '+911234567890', nullable: true },
            companyName: { type: 'string', example: 'Smart Parking Co', nullable: true },
            gstNumber: { type: 'string', example: '29ABCDE1234F1Z5', nullable: true },
            address: { type: 'string', example: '123 Main Street', nullable: true },
            city: { type: 'string', example: 'Mumbai', nullable: true },
            state: { type: 'string', example: 'Maharashtra', nullable: true },
            zipCode: { type: 'string', example: '400001', nullable: true },
            country: { type: 'string', example: 'India', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ParkingLot: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            name: { type: 'string', example: 'Main Parking Garage' },
            address: { type: 'string', example: '123 Main St, City' },
            latitude: { type: 'number', format: 'decimal', example: 40.7128 },
            longitude: { type: 'number', format: 'decimal', example: -74.0060 },
            isActive: { type: 'boolean', example: true },
            chirpstackApplicationId: { type: 'string', format: 'uuid', example: '031709f4-457f-4e1c-a446-b9780838d050', description: 'ChirpStack Application ID for MQTT topic subscription', nullable: true },
            chirpstackApplicationName: { type: 'string', example: 'Test_App', description: 'ChirpStack Application Name', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Floor: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            name: { type: 'string', example: 'Ground Floor' },
            level: { type: 'integer', example: 0 },
            parkingLot: { $ref: '#/components/schemas/ParkingLot' },
            parkingSlots: {
              type: 'array',
              items: { $ref: '#/components/schemas/ParkingSlot' }
            },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ParkingSlot: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            name: { type: 'string', example: 'A-001' },
            isReservable: { type: 'boolean', example: false },
            floor: { $ref: '#/components/schemas/Floor' },
            node: { $ref: '#/components/schemas/Node' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Node: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            name: { type: 'string', example: 'Parking Sensor A-001' },
            chirpstackDeviceId: { type: 'string', example: '0123456789ABCDEF', description: '16-character hexadecimal ChirpStack device ID' },
            description: { type: 'string', example: 'Ultrasonic sensor for parking slot A-001' },
            latitude: { type: 'number', format: 'decimal', example: 40.7128 },
            longitude: { type: 'number', format: 'decimal', example: -74.0060 },
            lastSeen: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean', example: true },
            status: { type: 'string', enum: ['online', 'offline', 'inactive'], example: 'online' },
            isOnline: { type: 'boolean', example: true },
            batteryLevel: { type: 'number', example: 85.5, description: 'Battery level percentage (0-100)' },
            distance: { type: 'number', example: 15.5, description: 'Distance reading from sensor in cm' },
            percentage: { type: 'number', example: 82, description: 'Occupancy percentage (80-100% = available, <60% = occupied)' },
            slotStatus: { type: 'string', enum: ['available', 'occupied', 'unknown'], example: 'available' },
            parkingSlot: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'A-001' },
                floor: { type: 'string', example: 'Ground Floor' },
                parkingLot: { type: 'string', example: 'Main Parking Garage' }
              }
            },
            gateway: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Gateway ID from ChirpStack metadata' },
                name: { type: 'string', example: 'ChirpStack Gateway' }
              },
              description: 'Gateway information from ChirpStack data, not direct relationship'
            },
            metadata: {
              type: 'object',
              description: 'Sensor data and ChirpStack information',
              properties: {
                signalQuality: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
                rssi: { type: 'number', example: -75 },
                snr: { type: 'number', example: 8.5 },
                gatewayId: { type: 'string', description: 'ChirpStack gateway ID' },
                lastChirpStackUpdate: { type: 'string', format: 'date-time' },
                state: { type: 'string', enum: ['FREE', 'OCCUPIED'], description: 'ChirpStack sensor state' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        NodeCreateRequest: {
          type: 'object',
          required: ['name', 'chirpstackDeviceId', 'parkingSlotId'],
          properties: {
            name: { type: 'string', example: 'Parking Sensor A-001', description: 'Name of the node' },
            chirpstackDeviceId: {
              type: 'string',
              example: '0123456789ABCDEF',
              pattern: '^[0-9a-fA-F]{16}$',
              description: '16-character hexadecimal ChirpStack device ID (unique identifier)'
            },
            description: { type: 'string', example: 'Ultrasonic sensor for parking slot A-001', description: 'Optional description of the node' },
            parkingSlotId: {
              type: 'string',
              format: 'uuid',
              example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
              description: 'UUID of the parking slot this node will monitor'
            },
            latitude: { type: 'number', format: 'decimal', example: 40.7128, description: 'GPS latitude coordinate' },
            longitude: { type: 'number', format: 'decimal', example: -74.0060, description: 'GPS longitude coordinate' }
          }
        },
        NodeUpdateStatusRequest: {
          type: 'object',
          properties: {
            distance: { type: 'number', minimum: 0, example: 15.5, description: 'Distance reading from sensor in cm' },
            percentage: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              example: 82,
              description: 'Occupancy percentage (80-100% = available, <60% = occupied)'
            },
            batteryLevel: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              example: 92,
              description: 'Battery level percentage'
            }
          },
          minProperties: 1,
          description: 'At least one status field must be provided'
        },
        SubscriptionPlan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Professional' },
            description: { type: 'string', example: 'For growing parking businesses' },
            basePricePerMonth: { type: 'number', format: 'decimal', example: 49.99 },
            basePricePerYear: { type: 'number', format: 'decimal', example: 499.99 },
            basePricePerQuarter: { type: 'number', format: 'decimal', example: 139.99, nullable: true },
            pricePerNodePerMonth: { type: 'number', format: 'decimal', example: 2.00 },
            pricePerNodePerYear: { type: 'number', format: 'decimal', example: 20.00 },
            pricePerNodePerQuarter: { type: 'number', format: 'decimal', example: 5.50, nullable: true },
            usdToInrRate: { type: 'number', format: 'decimal', example: 83.00 },
            defaultBillingCycle: { type: 'string', enum: ['monthly', 'yearly', 'quarterly'], example: 'monthly' },
            maxGateways: { type: 'integer', example: 5 },
            maxParkingLots: { type: 'integer', example: 5 },
            maxFloors: { type: 'integer', example: 10 },
            maxParkingSlots: { type: 'integer', example: 200 },
            maxUsers: { type: 'integer', example: 5 },
            features: {
              type: 'array',
              items: { type: 'string' },
              example: ['Advanced analytics', 'Priority support', 'API access']
            },
            includesAnalytics: { type: 'boolean', example: true },
            includesSupport: { type: 'boolean', example: true },
            includesAPI: { type: 'boolean', example: true },
            includesCustomization: { type: 'boolean', example: false },
            sortOrder: { type: 'integer', example: 2 },
            isActive: { type: 'boolean', example: true },
            isPopular: { type: 'boolean', example: true },
            isCustom: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Subscription: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            admin: { $ref: '#/components/schemas/User' },
            plan: { $ref: '#/components/schemas/SubscriptionPlan' },
            billingCycle: { type: 'string', enum: ['monthly', 'yearly', 'quarterly'], example: 'monthly' },
            amount: { type: 'number', format: 'decimal', example: 55.99 },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            trialEndDate: { type: 'string', format: 'date', nullable: true },
            nextBillingDate: { type: 'string', format: 'date', nullable: true },
            status: { type: 'string', enum: ['pending', 'active', 'expired', 'cancelled', 'suspended', 'trial'], example: 'active' },
            paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'], example: 'paid' },
            gatewayLimit: { type: 'integer', example: 5 },
            parkingLotLimit: { type: 'integer', example: 5 },
            floorLimit: { type: 'integer', example: 10 },
            parkingSlotLimit: { type: 'integer', example: 200 },
            userLimit: { type: 'integer', example: 5 },
            autoRenew: { type: 'boolean', example: true },
            cancellationReason: { type: 'string', nullable: true },
            cancelledAt: { type: 'string', format: 'date', nullable: true },
            notes: { type: 'string', nullable: true },
            metadata: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            transactionId: { type: 'string', example: 'TEST_TXN_001' },
            user: { $ref: '#/components/schemas/User' },
            subscription: { $ref: '#/components/schemas/Subscription' },
            type: { type: 'string', enum: ['subscription', 'subscription_upgrade', 'one_time', 'refund', 'credit'], example: 'subscription' },
            amount: { type: 'number', format: 'decimal', example: 4149.17 },
            currency: { type: 'string', example: 'INR' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'], example: 'completed' },
            paymentMethod: { type: 'string', enum: ['stripe', 'paypal', 'razorpay', 'manual', 'bank_transfer', 'cashfree'], example: 'cashfree' },
            paymentMethodDetails: { type: 'string', nullable: true },
            description: { type: 'string', example: 'Professional Plan - Monthly (3 nodes)' },
            failureReason: { type: 'string', nullable: true },
            metadata: { type: 'object', nullable: true },
            processedAt: { type: 'string', format: 'date', nullable: true },
            refundedAt: { type: 'string', format: 'date', nullable: true },
            refundAmount: { type: 'number', format: 'decimal', nullable: true },
            refundReason: { type: 'string', nullable: true },
            receiptUrl: { type: 'string', nullable: true },
            invoiceUrl: { type: 'string', nullable: true },
            isTest: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Gateway: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            chirpstackGatewayId: { type: 'string', example: 'GW-001' },
            name: { type: 'string', example: 'Gateway 1 - Downtown' },
            description: { type: 'string', example: 'LoRa Gateway - Ground Floor', nullable: true },
            location: { type: 'string', example: 'Ground Floor Entrance', nullable: true },
            latitude: { type: 'number', format: 'decimal', example: 18.9258, nullable: true },
            longitude: { type: 'number', format: 'decimal', example: 72.8220, nullable: true },
            isActive: { type: 'boolean', example: true },
            isLinked: { type: 'boolean', example: true },
            lastSeen: { type: 'string', format: 'date-time', nullable: true },
            linkedAt: { type: 'string', format: 'date-time', nullable: true },
            parkingLot: { $ref: '#/components/schemas/ParkingLot' },
            linkedAdmin: { $ref: '#/components/schemas/User' },
            metadata: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        ParkingStatusLog: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            parkingSlot: { $ref: '#/components/schemas/ParkingSlot' },
            status: { type: 'string', enum: ['available', 'occupied', 'unknown', 'reserved'], example: 'available' },
            detectedAt: { type: 'string', format: 'date-time' },
            distance: { type: 'number', format: 'decimal', example: 150.25, nullable: true },
            percentage: { type: 'number', format: 'decimal', example: 85.5, nullable: true },
            batteryLevel: { type: 'integer', example: 92, nullable: true },
            signalQuality: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'], nullable: true },
            metadata: { type: 'object', nullable: true },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        SubscriptionStatus: {
          type: 'object',
          properties: {
            hasActiveSubscription: { type: 'boolean', example: true },
            status: { type: 'string', enum: ['ACTIVE', 'EXPIRED', 'NO_SUBSCRIPTION'], example: 'ACTIVE' },
            subscription: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                planName: { type: 'string', example: 'Professional' },
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' },
                daysRemaining: { type: 'integer', example: 25 },
                autoRenew: { type: 'boolean', example: true },
                limits: {
                  type: 'object',
                  properties: {
                    gateways: { type: 'integer', example: 10 },
                    parkingLots: { type: 'integer', example: 5 },
                    floors: { type: 'integer', example: 25 },
                    parkingSlots: { type: 'integer', example: 500 },
                    users: { type: 'integer', example: 10 }
                  }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Error description' },
            error: { type: 'string', example: 'Detailed error message' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                message: 'Unauthorized',
                error: 'Invalid or missing token'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                message: 'Validation failed',
                error: 'Email must be a valid email address'
              }
            }
          }
        },
        SubscriptionLimitExceeded: {
          description: 'Subscription feature limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: false },
                  message: { type: 'string', example: 'Parking Lot limit reached. Current: 1/1' },
                  code: { type: 'string', example: 'FEATURE_LIMIT_EXCEEDED' },
                  data: {
                    type: 'object',
                    properties: {
                      feature: { type: 'string', example: 'parkingLots' },
                      current: { type: 'integer', example: 1 },
                      limit: { type: 'integer', example: 1 },
                      planName: { type: 'string', example: 'Starter' }
                    }
                  }
                }
              }
            }
          }
        },
        SuccessResponse: {
          description: 'Successful operation',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Operation completed successfully' },
                  data: { type: 'object' },
                  count: { type: 'integer', example: 1 }
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts'] // Start with just routes for now
};

export default swaggerOptions;
