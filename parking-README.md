# Smart Parking Management System - Admin APIs

## Overview

This comprehensive parking management system allows admin users to create and manage their entire parking infrastructure including parking lots, floors, parking slots, gateways, and IoT sensor nodes. The system provides complete CRUD operations, statistics, monitoring, and real-time sensor data integration.

## Architecture

The system follows a hierarchical structure:

```
Admin Account
├── Parking Lots
│   ├── Floors
│   │   └── Parking Slots
│   │       └── Nodes (Sensors)
│   └── Gateways
│       └── Nodes (Sensors)
└── Gateways (Linked)
    └── Nodes (Sensors)
```

## Prerequisites

1. **Server Running**: Ensure your development server is running
   ```bash
   npm run dev
   ```

2. **Test Users Setup**: Create verified test users
   ```bash
   npx ts-node setup-test-users.ts
   ```

3. **Database**: Ensure PostgreSQL is running with the correct schema

## Admin User Capabilities

### 1. Parking Lot Management
- Create, read, update, delete parking lots
- View detailed parking lot information with floors and gateways
- Assign/unassign gateways to parking lots

### 2. Floor Management
- Create floors within parking lots
- Organize floors by level (basement, ground, upper floors)
- Get comprehensive floor statistics
- Manage floor hierarchy

### 3. Parking Slot Management
- Create individual parking slots
- Bulk create multiple parking slots
- Set reservable status
- Assign/unassign sensor nodes to slots
- Monitor slot status and history

### 4. Gateway Management
- Link available gateways to admin account
- Manage gateway assignments to parking lots
- Monitor gateway status and connectivity

### 5. Node (Sensor) Management
- Create IoT sensor nodes under gateways
- Assign nodes to specific parking slots
- Monitor node status (online/offline)
- Track sensor data (battery level, RSSI, etc.)
- View comprehensive node statistics

## API Endpoints

### Authentication
All endpoints require admin authentication:
```http
Authorization: Bearer <admin_jwt_token>
```

### Parking Lots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parking-lots` | Get all admin's parking lots |
| GET | `/api/parking-lots/{id}` | Get specific parking lot |
| POST | `/api/parking-lots` | Create new parking lot |
| PUT | `/api/parking-lots/{id}` | Update parking lot |
| DELETE | `/api/parking-lots/{id}` | Delete parking lot |
| POST | `/api/parking-lots/{id}/assign-gateway` | Assign gateway to parking lot |
| POST | `/api/parking-lots/{id}/unassign-gateway/{gatewayId}` | Unassign gateway |

### Floors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/floors/parking-lot/{parkingLotId}` | Get floors for parking lot |
| GET | `/api/floors/{id}` | Get specific floor |
| POST | `/api/floors/parking-lot/{parkingLotId}` | Create floor |
| PUT | `/api/floors/{id}` | Update floor |
| DELETE | `/api/floors/{id}` | Delete floor |
| GET | `/api/floors/{id}/statistics` | Get floor statistics |

### Parking Slots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parking-slots/floor/{floorId}` | Get slots for floor |
| GET | `/api/parking-slots/{id}` | Get specific parking slot |
| POST | `/api/parking-slots/floor/{floorId}` | Create parking slot |
| POST | `/api/parking-slots/floor/{floorId}/bulk` | Bulk create slots |
| PUT | `/api/parking-slots/{id}` | Update parking slot |
| DELETE | `/api/parking-slots/{id}` | Delete parking slot |
| POST | `/api/parking-slots/{id}/assign-node` | Assign node to slot |
| POST | `/api/parking-slots/{id}/unassign-node` | Unassign node from slot |
| GET | `/api/parking-slots/{id}/status` | Get slot status and history |

### Nodes (Sensors)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/nodes` | Get all admin's nodes |
| GET | `/api/nodes/unassigned` | Get unassigned nodes |
| GET | `/api/nodes/statistics` | Get node statistics |
| GET | `/api/nodes/gateway/{gatewayId}` | Get nodes by gateway |
| GET | `/api/nodes/{id}` | Get specific node |
| POST | `/api/nodes` | Create new node |
| PUT | `/api/nodes/{id}` | Update node |
| DELETE | `/api/nodes/{id}` | Delete node |
| POST | `/api/nodes/{id}/assign-parking-slot` | Assign node to slot |
| POST | `/api/nodes/{id}/unassign-parking-slot` | Unassign node from slot |
| PUT | `/api/nodes/{id}/status` | Update node status |

### Gateways
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gateways/available` | Get available gateways |
| GET | `/api/gateways/my-gateways` | Get linked gateways |
| POST | `/api/gateways/link` | Link gateway to admin |
| POST | `/api/gateways/{id}/unlink` | Unlink gateway |
| POST | `/api/gateways/nodes` | Create node under gateway |
| GET | `/api/gateways/{id}/nodes` | Get gateway nodes |
| GET | `/api/gateways/statistics` | Get gateway statistics |

## Complete Testing Guide

### Step 1: Environment Setup
```bash
# 1. Start the server
npm run dev

# 2. Setup test users (creates admin@gateway-test.com)
npx ts-node setup-test-users.ts

# 3. Verify server is running
curl http://localhost:3000/api/health
```

### Step 2: Run Comprehensive Tests
```bash
# Run complete parking management test suite
node test-parking-apis.js

# For detailed output
VERBOSE=true node test-parking-apis.js

# Run gateway-specific tests (if needed)
node test-gateway-apis.js
```

### Step 3: Manual Testing Flow

#### Phase 1: Create Parking Infrastructure
```bash
# 1. Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gateway-test.com","password":"Admin123!"}'

# 2. Create parking lot
curl -X POST http://localhost:3000/api/parking-lots \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Main Campus Parking","address":"123 University Ave"}'

# 3. Create floor
curl -X POST http://localhost:3000/api/floors/parking-lot/1 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ground Floor","level":0}'

# 4. Create parking slots
curl -X POST http://localhost:3000/api/parking-slots/floor/1/bulk \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "slots": [
      {"name":"A-001","isReservable":true},
      {"name":"A-002","isReservable":false},
      {"name":"A-003","isReservable":true}
    ]
  }'
```

#### Phase 2: Gateway and Node Management
```bash
# 1. Link available gateway
curl -X POST http://localhost:3000/api/gateways/link \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"gatewayId":1}'

# 2. Create sensor node
curl -X POST http://localhost:3000/api/nodes \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "gatewayId":1,
    "chirpstackDeviceId":"sensor_001",
    "name":"Parking Sensor A1",
    "description":"Ultrasonic sensor for slot A-001"
  }'

# 3. Assign node to parking slot
curl -X POST http://localhost:3000/api/parking-slots/1/assign-node \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"nodeId":1}'
```

#### Phase 3: Monitoring and Statistics
```bash
# 1. Get comprehensive parking lot view
curl -X GET http://localhost:3000/api/parking-lots/1 \
  -H "Authorization: Bearer <admin_token>"

# 2. Get floor statistics
curl -X GET http://localhost:3000/api/floors/1/statistics \
  -H "Authorization: Bearer <admin_token>"

# 3. Get node statistics
curl -X GET http://localhost:3000/api/nodes/statistics \
  -H "Authorization: Bearer <admin_token>"

# 4. Get parking slot status
curl -X GET http://localhost:3000/api/parking-slots/1/status \
  -H "Authorization: Bearer <admin_token>"
```

## Expected Test Results

When running the comprehensive test suite, you should see:

### ✅ Success Scenarios
- **Parking Lot Creation**: Admin can create parking lots with unique names
- **Floor Management**: Floors can be created with levels and organized properly
- **Bulk Operations**: Multiple parking slots can be created efficiently
- **Node Assignment**: Sensor nodes can be assigned to specific parking slots
- **Statistics**: Comprehensive statistics show coverage and utilization
- **Access Control**: Only admin users can access their own resources

### ⚠️ Expected Limitations
- **Super Admin Access**: Regular admin users cannot create gateways (super admin only)
- **Resource Ownership**: Admins can only access their own parking infrastructure
- **Cascade Protection**: Cannot delete entities that have dependent resources

## Data Flow

### Typical Admin Workflow
1. **Setup Phase**
   - Admin logs in and links gateways to their account
   - Creates parking lot(s) for their organization
   - Assigns gateways to parking lots

2. **Infrastructure Phase**
   - Creates floors within parking lots
   - Creates parking slots on each floor
   - Creates sensor nodes under gateways

3. **Integration Phase**
   - Assigns sensor nodes to specific parking slots
   - Configures node settings and metadata
   - Tests connectivity and sensor readings

4. **Operations Phase**
   - Monitors parking slot occupancy in real-time
   - Views statistics and utilization reports
   - Manages reservable vs non-reservable slots

## API Documentation

### Interactive API Documentation
Visit the Swagger UI at: `http://localhost:3000/api-docs`

The interactive documentation provides:
- Complete API reference
- Request/response schemas
- Try-it-out functionality
- Authentication examples
- Error response codes

### Response Format
All API responses follow this standard format:
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* response data */ },
  "count": 5  // for list responses
}
```

### Error Handling
Error responses include:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed validation errors"]  // when applicable
}
```

## Key Features

### 🏢 **Multi-Level Parking Management**
- Support for complex parking structures
- Floor-based organization with level tracking
- Hierarchical resource management

### 🔧 **IoT Sensor Integration**
- Real-time node status monitoring
- Battery level and connectivity tracking
- Webhook support for ChirpStack integration

### 📊 **Comprehensive Analytics**
- Parking utilization statistics
- Node coverage reports
- Floor-level occupancy tracking
- Gateway connectivity monitoring

### 🔒 **Secure Multi-Tenancy**
- Admin-level resource isolation
- Role-based access control
- JWT-based authentication

### ⚡ **Performance Optimized**
- Bulk operations for efficiency
- Optimized database queries with relations
- Proper indexing and caching

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   ```
   Solution: Run setup-test-users.ts to create verified users
   ```

2. **Gateway Not Available**
   ```
   Solution: Super admin must create gateways first, then admin can link them
   ```

3. **TypeScript Compilation Errors**
   ```
   Solution: Run 'npm run build' to check for type issues
   ```

4. **Database Connection Issues**
   ```
   Solution: Check .env file and ensure PostgreSQL is running
   ```

### Test Debugging

1. **Verbose Output**: Use `VERBOSE=true node test-parking-apis.js`
2. **Server Logs**: Check the console output from `npm run dev`
3. **Database State**: Query the database to verify data creation
4. **API Responses**: Use curl or Postman for manual testing

## Advanced Usage

### Custom Metadata
All entities support custom metadata for flexibility:

```json
{
  "metadata": {
    "sensorType": "ultrasonic",
    "range": "4m",
    "batteryLife": "2 years",
    "installationDate": "2024-01-15",
    "maintenanceSchedule": "quarterly"
  }
}
```

### Webhook Integration
The system supports real-time updates via webhooks:
- Node status updates from ChirpStack
- Gateway connectivity changes
- Sensor data updates

### Statistics and Monitoring
Get detailed insights:
- **Floor Statistics**: Slot count, node coverage, reservable slots
- **Node Statistics**: Total/active/assigned/online counts by gateway
- **Parking Lot Overview**: Complete hierarchy with all relationships

---

## Success Metrics

After running the complete test suite, you should achieve:

✅ **20+ API endpoints tested**  
✅ **Full CRUD operations on all entities**  
✅ **Proper access control and security**  
✅ **Real-time monitoring capabilities**  
✅ **Comprehensive statistics and reporting**  
✅ **Bulk operations and efficiency features**  
✅ **Complete parking management workflow**  

This system provides a production-ready foundation for smart parking management with IoT sensor integration, real-time monitoring, and comprehensive administrative controls.