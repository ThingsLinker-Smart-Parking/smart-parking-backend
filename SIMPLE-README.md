# 🅿️ Smart Parking Backend - Simplified Version

## 🎯 **Overview**

This is a **simplified parking system** focused on **Node management** with straightforward percentage-based slot status logic.

### **Key Features:**
- ✅ **Simple Node Management** - Create, read, update, delete nodes
- ✅ **Percentage-Based Logic** - Easy slot status determination  
- ✅ **Minimal APIs** - Only essential endpoints
- ✅ **Lightweight** - Removed complex dependencies

---

## 🏗️ **Architecture**

### **Core Components:**
1. **Nodes** - Parking sensors/devices
2. **Gateways** - Connection hubs  
3. **Authentication** - Admin access control

### **Simple Logic:**
```
Percentage ≥ 80%  → Slot is AVAILABLE
Percentage < 60%  → Slot is RESERVED  
Percentage 60-79% → Slot is INDETERMINATE
```

---

## 🚀 **Quick Start**

### **1. Installation**
```bash
npm install
```

### **2. Environment Setup**
Create `.env` file:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/parking_db
JWT_SECRET=your_jwt_secret_here
PORT=3000
```

### **3. Database Setup**
```bash
npm run build
npm run start
```

### **4. Test the API**
```bash
node test-simple-node-api.js
```

---

## 📡 **API Endpoints**

### **Authentication**
```bash
POST /api/auth/login
{
  "email": "admin@test.com",
  "password": "password123"
}
```

### **Node Management**
```bash
# Get all nodes
GET /api/nodes

# Get specific node  
GET /api/nodes/:nodeId

# Create new node
POST /api/nodes
{
  "name": "Sensor A1",
  "chirpstackDeviceId": "device_001",
  "gatewayId": "gateway-id",
  "parkingSlotId": "slot-id"
}

# Update node status (Main API)
PUT /api/nodes/:nodeId/status
{
  "distance": 150,
  "percentage": 85,
  "batteryLevel": 80
}

# Delete node
DELETE /api/nodes/:nodeId
```

---

## 🧪 **Testing**

### **Simple Test Script**
```bash
node test-simple-node-api.js
```

This tests:
- ✅ Authentication
- ✅ Node listing
- ✅ Status updates with different percentages
- ✅ Logic verification

### **Manual Testing**

#### **1. Available Slot (90%)**
```bash
curl -X PUT http://localhost:3000/api/nodes/NODE_ID/status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 90, "distance": 200, "batteryLevel": 85}'
```
**Expected:** `slotStatus: "available"`

#### **2. Reserved Slot (40%)**
```bash
curl -X PUT http://localhost:3000/api/nodes/NODE_ID/status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 40, "distance": 50, "batteryLevel": 80}'
```
**Expected:** `slotStatus: "reserved"`

#### **3. Indeterminate (70%)**
```bash
curl -X PUT http://localhost:3000/api/nodes/NODE_ID/status \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"percentage": 70, "distance": 100, "batteryLevel": 75}'
```
**Expected:** `slotStatus: null`

---

## 📊 **API Documentation**

Visit: `http://localhost:3000/api-docs`

---

## 🎛️ **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT token secret | Required |
| `PORT` | Server port | 3000 |

---

## 🏗️ **Database Schema**

### **Key Models:**
- `User` - Admin accounts
- `Gateway` - Connection hubs
- `Node` - Parking sensors
- `ParkingSlot` - Parking spaces
- `Floor` - Building floors
- `ParkingLot` - Parking facilities

### **Node Properties:**
```typescript
{
  id: string
  name: string
  chirpstackDeviceId: string
  status: 'online' | 'offline' | 'inactive'
  batteryLevel: number | null
  distance: number | null
  percentage: number | null
  slotStatus: 'available' | 'reserved' | null
}
```

---

## 🔧 **Development**

### **Scripts:**
```bash
npm run build    # Compile TypeScript
npm start        # Run production server
npm run dev      # Run development server (if available)
```

### **Project Structure:**
```
src/
├── controllers/
│   ├── authController.ts
│   ├── nodeController.ts
│   └── gatewayController.ts
├── models/
│   ├── User.ts
│   ├── Node.ts
│   ├── Gateway.ts
│   └── ParkingSlot.ts
├── routes/
│   ├── auth.ts
│   ├── node.ts
│   └── gateway.ts
└── middleware/
    └── auth.ts
```

---

## ✨ **Simplifications Made**

### **Removed:**
- ❌ Complex ultrasonic sensor logic
- ❌ MQTT service dependencies
- ❌ Parking lot management APIs
- ❌ Floor management APIs  
- ❌ Parking slot management APIs
- ❌ Subscription system
- ❌ Complex threshold configurations

### **Kept:**
- ✅ Essential Node CRUD operations
- ✅ Simple percentage-based logic
- ✅ Authentication system
- ✅ Gateway management (minimal)
- ✅ Clean API design

---

## 🎯 **Usage Examples**

### **Typical Workflow:**
1. **Login** → Get auth token
2. **List Nodes** → See all parking sensors
3. **Update Status** → Send sensor readings
4. **Check Result** → Verify slot status

### **Integration:**
```javascript
// Update node status from sensor
const updateNodeStatus = async (nodeId, sensorData) => {
  const response = await fetch(`/api/nodes/${nodeId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      distance: sensorData.distance,
      percentage: sensorData.percentage,
      batteryLevel: sensorData.battery
    })
  });
  
  const result = await response.json();
  console.log('Slot Status:', result.data.slotStatus);
};
```

---

## 🎉 **Benefits of Simplified System**

- 🚀 **Fast Setup** - Minimal configuration required
- 🔧 **Easy Maintenance** - Fewer dependencies to manage  
- 📈 **Scalable** - Simple logic scales easily
- 🧪 **Testable** - Straightforward testing scenarios
- 📚 **Understandable** - Clear business logic

---

This simplified system focuses on the core functionality while removing unnecessary complexity. Perfect for rapid prototyping, testing, or production systems that need straightforward parking slot management!