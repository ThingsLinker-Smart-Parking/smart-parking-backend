"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Remove the package.json import and use environment variable or hardcode version
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Smart Parking System API',
            version: process.env.APP_VERSION || '1.0.0', // Use env variable or default
            description: `
# Smart Parking System API

🎉 **LATEST UPDATES - Node Model Architecture Fixed**: Major improvements to IoT sensor management and API stability.

## Recent Fixes & Improvements:
- ✅ **Node Model Restructured**: Nodes now directly connect to parking slots (not gateways)
- ✅ **ChirpStack Integration**: Gateway information comes from MQTT data, not database relationships
- ✅ **Enhanced Validation**: Comprehensive node creation with ChirpStack Device ID validation
- ✅ **Real-time Status**: Improved parking slot occupancy detection with percentage-based logic
- ✅ **API Architecture**: Proper hierarchy enforcement for smart parking infrastructure
- ✅ **Database Schema**: Updated schema migration for production compatibility

## Hierarchy Structure
The system enforces a strict hierarchy: **User (Admin) → ParkingLot → Floor → ParkingSlot ← Node**
- **Nodes** (IoT sensors) are directly connected to **ParkingSlots** (not gateways)
- **Gateway information** comes from ChirpStack MQTT data, not direct relationships
- **Real-time data** flows: ChirpStack → MQTT → Node metadata → Parking status

### Key Features:
- 🏗️ **Hierarchical Data Management**: Organized parking infrastructure with proper relationships
- 🔐 **Role-based Access Control**: Admin/User permissions with subscription-based limits
- 📊 **Subscription Management**: Feature limits based on subscription plans (Starter/Professional/Enterprise)
- 🌐 **IoT Integration**: LoRa sensor support for real-time parking status monitoring
- 💳 **Payment Integration**: Cashfree payment gateway with Flutter app support

### Endpoint Categories:
- **Authentication**: Login, registration, verification, password reset
- **Parking Management**: Lots, floors, slots with full CRUD operations
- **IoT Devices**: Gateway and node management with LoRa integration
- **Subscriptions**: Plan management, status checking, payment processing
- **Monitoring**: Health checks, analytics, real-time status tracking

**Complete API documentation for Smart Parking System with LoRa IoT technology.**
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
                url: 'http://localhost:3001',
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
                        email: { type: 'string', example: 'chetan@thingslinker.com' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Doe' },
                        role: { type: 'string', enum: ['super_admin', 'admin', 'user'], example: 'user' },
                        isActive: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' }
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
exports.default = swaggerOptions;
