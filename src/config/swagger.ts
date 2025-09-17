import { Options } from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

// Remove the package.json import and use environment variable or hardcode version
const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Parking System API',
      version: process.env.APP_VERSION || '1.0.0', // Use env variable or default
      description: `
# Smart Parking System API

⚠️ **BREAKING CHANGES - Hierarchy Enforced**: Node creation has been restructured to enforce the parking hierarchy.

## Hierarchy Structure
The system now enforces a strict hierarchy: **User (Admin) → ParkingLot → Floor → ParkingSlot → Node**

### Key Changes:
- ✅ **Nodes MUST belong to a ParkingSlot** (cannot exist independently)
- ✅ **Node creation endpoint changed**: \`POST /api/nodes/parking-slot/{parkingSlotId}\` 
- ❌ **Deprecated endpoints removed**: \`/api/nodes/unassigned\`, \`/assign-parking-slot\`, \`/unassign-parking-slot\`

### Migration Guide:
- Old: \`POST /api/nodes\` → New: \`POST /api/nodes/parking-slot/{parkingSlotId}\`
- All nodes are now guaranteed to be assigned to parking slots
- Enhanced validation ensures proper hierarchy relationships

**API documentation for Smart Parking System using LoRa technology with enforced data hierarchy.**
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
        url: `http://localhost:${process.env.PORT || 3001}`, // Use dynamic port
        description: 'Development server'
      },
      {
        url: 'http://localhost:5000/api',
        description: 'Production server'
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
            createdAt: { type: 'string', format: 'date-time' }
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