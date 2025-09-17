# Smart Parking Backend - ChirpStack Integration Summary

## Overview
Successfully merged parking slot and node functionality with ChirpStack MQTT integration for real-time IoT sensor data processing.

## Key ChirpStack Integration Details

### MQTT Configuration
- **Broker**: `test.mosquitto.org:1883` (configured in `.env`)
- **Topic Pattern**: `application/+/device/+/event/up`
- **Application ID**: `031709f4-457f-4e1c-a446-b9780838d050`
- **Device EUI**: `0102030405060788`
- **Gateway ID**: `dca632fffe52c445`

### ChirpStack JSON Payload Structure
```json
{
  "deduplicationId": "89664576-9b93-4720-b4ec-d10584b53120",
  "time": "2025-09-15T13:54:21.918705285+00:00",
  "deviceInfo": {
    "tenantId": "b50f6f67-5359-41d5-9ff3-4eae99b081aa",
    "tenantName": "ChirpStack",
    "applicationId": "031709f4-457f-4e1c-a446-b9780838d050",
    "applicationName": "Test_App",
    "deviceProfileId": "45504159-129f-42a0-90f0-2104af25e0e1",
    "deviceProfileName": "US_Parking_Testing",
    "deviceName": "UltraSonic_Parking_Testing",
    "devEui": "0102030405060788",
    "deviceClassEnabled": "CLASS_A",
    "tags": {}
  },
  "devAddr": "009aa844",
  "adr": true,
  "dr": 5,
  "fCnt": 6,
  "fPort": 2,
  "confirmed": true,
  "data": "AKwA",
  "object": {
    "distance_cm": 172.0,
    "state": "FREE"  // or "OCCUPIED"
  },
  "rxInfo": [{
    "gatewayId": "dca632fffe52c445",
    "uplinkId": 38637,
    "nsTime": "2025-09-15T13:54:21.683908579+00:00",
    "rssi": -95,
    "snr": 9.2,
    "channel": 7,
    "location": {},
    "context": "bJxjlA==",
    "crcStatus": "CRC_OK"
  }],
  "txInfo": {
    "frequency": 867900000,
    "modulation": {
      "lora": {
        "bandwidth": 125000,
        "spreadingFactor": 7,
        "codeRate": "CR_4_5"
      }
    }
  },
  "regionConfigId": "eu868"
}
```

## Architecture Changes

### 1. Enhanced Models

#### Node Model (`src/models/Node.ts`)
- Enhanced `slotStatus` getter to prioritize ChirpStack sensor state
- Added new getters: `signalQuality`, `rssi`, `snr`, `gatewayId`, `lastChirpStackUpdate`
- Uses both ChirpStack `state` (FREE/OCCUPIED) and percentage-based fallback logic

#### ParkingStatusLog Model (`src/models/ParkingStatusLog.ts`)
- Added fields for ChirpStack data: `distance`, `percentage`, `batteryLevel`, `signalQuality`
- Enhanced `status` enum: `'available' | 'occupied' | 'unknown' | 'reserved'`
- Added indexes for performance optimization

### 2. MQTT Service (`src/services/mqttService.ts`)
- Real-time ChirpStack uplink data processing
- Automatic node discovery by `devEui`
- Sensor data extraction and metadata enrichment
- Battery level estimation and signal quality calculation
- Automatic parking status logging

### 3. New Unified Controller (`src/controllers/parkingController.ts`)
- **Comprehensive Overview**: `/api/parking/overview` - All parking lots, floors, slots with real-time status
- **Detailed Slot Info**: `/api/parking/slots/{slotId}/details` - Slot details with historical data
- **Manual Node Updates**: `/api/parking/nodes/{nodeId}/update` - Manual sensor data updates
- **Dashboard Statistics**: `/api/parking/dashboard/stats` - Real-time stats and activity
- **ChirpStack Webhook**: `/api/parking/chirpstack/webhook` - Backup HTTP endpoint

### 4. API Routes (`src/routes/parking.ts`)
- Complete Swagger documentation
- Authentication middleware
- Input validation and error handling

## Data Flow

1. **ChirpStack MQTT** → `mqttService.handleMessage()`
2. **Data Processing** → Extract distance, state, battery, signal quality
3. **Node Update** → Update node metadata and lastSeen
4. **Status Determination** → ChirpStack state → percentage fallback
5. **Logging** → Create ParkingStatusLog entry
6. **Real-time APIs** → Serve updated data to frontend

## Key Features

### Real-time Processing
- MQTT subscription to ChirpStack uplinks
- Automatic node-to-slot mapping via `chirpstackDeviceId`
- Real-time status updates and logging

### Enhanced Status Logic
```javascript
// Priority: ChirpStack sensor state first
if (sensorState === 'FREE') return 'available';
if (sensorState === 'OCCUPIED') return 'occupied';

// Fallback: Percentage-based logic
if (percentage >= 80) return 'available';
if (percentage < 60) return 'occupied';
return 'unknown';
```

### Signal Quality Assessment
- **Excellent**: RSSI ≥ -70 dBm, SNR ≥ 10 dB
- **Good**: RSSI ≥ -85 dBm, SNR ≥ 5 dB
- **Fair**: RSSI ≥ -100 dBm, SNR ≥ 0 dB
- **Poor**: Below fair thresholds

### Battery Monitoring
- Direct battery data from ChirpStack payload
- RSSI-based estimation as fallback
- Low battery alerts (< 20%)

## Environment Configuration

Required `.env` variables for ChirpStack integration:
```bash
# MQTT Configuration (for IoT devices)
MQTT_BROKER_URL=mqtt://test.mosquitto.org:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=smart-parking-backend
```

## Testing

### MQTT Test Client
- URL: https://testclient-cloud.mqtt.cool/
- Broker: `tcp://test.mosquitto.org:1883`
- Topic: `application/031709f4-457f-4e1c-a446-b9780838d050/device/0102030405060788/event/up`

### API Endpoints
- `GET /api/parking/overview` - Complete parking system overview
- `GET /api/parking/slots/{id}/details` - Detailed slot information
- `PUT /api/parking/nodes/{id}/update` - Manual node data updates
- `GET /api/parking/dashboard/stats` - Dashboard statistics

## Production Considerations

1. **Database Migrations**: ParkingStatusLog schema updates
2. **MQTT Reliability**: Reconnection logic and error handling
3. **Performance**: Indexed queries for historical data
4. **Security**: JWT authentication for all endpoints
5. **Monitoring**: Health checks for MQTT connectivity

## Integration Benefits

- **Real-time Updates**: Instant parking status changes
- **Unified Interface**: Single API for all parking data
- **Historical Tracking**: Complete audit trail of status changes
- **Signal Monitoring**: Network quality and battery tracking
- **Scalable Architecture**: Supports multiple parking lots and sensors

This integration provides a complete IoT-enabled parking management solution with real-time sensor data processing and comprehensive APIs for frontend applications.