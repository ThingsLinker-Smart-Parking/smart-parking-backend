# MQTT Configuration Setup Instructions

## 🎯 Current Status

Your backend is deployed on **Railway** at:
- URL: `https://smart-parking-backend-production-5449.up.railway.app`
- Current MQTT: `mqtt://test.mosquitto.org:8885` ❌ (Wrong port)
- Correct MQTT: `mqtt://test.mosquitto.org:1883` ✅

## 🔧 Steps to Fix MQTT Connection

### Option 1: Update Railway Environment Variables (Production)

1. **Go to Railway Dashboard:**
   - Open https://railway.app
   - Navigate to your `smart-parking-backend` project

2. **Update Environment Variables:**
   - Click on **Variables** tab
   - Find or add these variables:
   ```
   MQTT_BROKER_URL=mqtt://test.mosquitto.org:1883
   MQTT_USERNAME=
   MQTT_PASSWORD=
   MQTT_CLIENT_ID=smart-parking-backend
   ```

3. **Redeploy:**
   - Railway will automatically redeploy after saving
   - Wait for deployment to complete (~2-3 minutes)

4. **Verify:**
   ```bash
   curl https://smart-parking-backend-production-5449.up.railway.app/api/health
   ```
   - Check `mqtt.brokerUrl` should show `:1883`
   - Check `mqtt.status` should be `"healthy"`

### Option 2: Run Backend Locally (Development)

If you want to test locally first:

1. **Navigate to backend directory:**
   ```bash
   cd /Users/chetanmahajan/Documents/nodejs_backend/smart-parking-backend
   ```

2. **Verify .env file is updated:**
   ```bash
   cat .env | grep MQTT
   ```
   Should show:
   ```
   MQTT_BROKER_URL=mqtt://test.mosquitto.org:1883
   MQTT_USERNAME=
   MQTT_PASSWORD=
   MQTT_CLIENT_ID=smart-parking-backend
   ```

3. **Install dependencies (if needed):**
   ```bash
   npm install
   ```

4. **Start backend:**
   ```bash
   npm run dev
   # OR
   npm start
   ```

5. **Check logs for MQTT connection:**
   Look for:
   ```
   ✅ MQTT connected successfully
   ✅ MQTT subscribed to ChirpStack uplink topic
   ```

## 🧪 Testing the Complete Flow

Once MQTT is configured correctly:

### 1. Start Frontend (already done)
```bash
cd /Users/chetanmahajan/Documents/nodejs_backend/smart-parking-web
npm run dev
```

### 2. Test MQTT Flow

**A. Using Frontend MQTT Tester:**
1. Navigate to Admin → Parking Lots → Select Lot → Select Floor → Slots
2. Click **"MQTT Test"** button
3. Click **"Connect to MQTT"**
4. You should see: "Connected to MQTT broker"

**B. Publish Test Message:**
1. Open new tab: https://testclient-cloud.mqtt.cool/
2. Connect to: `tcp://test.mosquitto.org:1883`
3. Click "Connect"
4. **Publish to topic:**
   ```
   application/031709f4-457f-4e1c-a446-b9780838d050/device/0102030405060788/event/up
   ```
5. **Payload:**
   ```json
   {"deduplicationId":"test-123","time":"2025-10-11T12:00:00.000Z","deviceInfo":{"tenantId":"b50f6f67-5359-41d5-9ff3-4eae99b081aa","tenantName":"ChirpStack","applicationId":"031709f4-457f-4e1c-a446-b9780838d050","applicationName":"Test_App","deviceProfileId":"45504159-129f-42a0-90f0-2104af25e0e1","deviceProfileName":"US_Parking_Testing","deviceName":"UltraSonic_Parking_Testing","devEui":"0102030405060788","deviceClassEnabled":"CLASS_A","tags":{}},"devAddr":"009aa844","adr":true,"dr":5,"fCnt":6,"fPort":2,"confirmed":true,"data":"AKwA","object":{"distance_cm":170.0,"state":"FREE"},"rxInfo":[{"gatewayId":"dca632fffe52c445","uplinkId":38637,"nsTime":"2025-09-15T13:54:21.683908579+00:00","rssi":-95,"snr":9.2,"channel":7,"location":{},"context":"bJxjlA==","crcStatus":"CRC_OK"}],"txInfo":{"frequency":867900000,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5"}}},"regionConfigId":"eu868"}
   ```

**C. What Should Happen:**

1. **Frontend MQTT Tester:**
   - Shows message received ✅
   - Displays distance and state ✅
   - Toast notification appears ✅

2. **Backend:**
   - Receives MQTT message ✅
   - Finds node by devEui `0102030405060788` ✅
   - Updates node metadata ✅
   - Creates ParkingStatusLog entry ✅
   - Updates slot status (FREE → available) ✅

3. **Frontend Slots Page:**
   - Auto-refreshes slot status ✅
   - Shows updated status (green for available) ✅

## 📊 Monitoring

### Check Backend Logs (Railway)

1. Go to Railway dashboard
2. Click on **Deployments** tab
3. Click on latest deployment
4. View logs for:
   ```
   MQTT connected successfully
   MQTT subscribed to ChirpStack uplink topic
   Parking slot status updated from ChirpStack
   ```

### Check Backend Logs (Local)

Watch terminal output for:
```
✅ MQTT connected successfully
✅ Subscribed to topics: application/+/device/+/event/up
📨 Received message on topic: application/.../device/.../event/up
✅ Parking slot status updated from ChirpStack
```

## 🔍 Troubleshooting

### MQTT Not Connecting

**Problem:** Backend shows "MQTT connection error"

**Solutions:**
1. Check firewall/network allows outbound MQTT (port 1883)
2. Try alternative broker URL:
   ```
   MQTT_BROKER_URL=wss://test.mosquitto.org:8081
   ```
3. Check Railway logs for detailed error messages

### Messages Not Received

**Problem:** Frontend tester works, but backend doesn't receive messages

**Solutions:**
1. Verify backend is subscribed to correct topic pattern:
   - Should be: `application/+/device/+/event/up`
2. Check backend logs for subscription confirmation
3. Ensure backend is connected before publishing messages

### Slot Status Not Updating

**Problem:** Backend receives message but slot status doesn't change

**Solutions:**
1. Check if node exists with matching `chirpstackDeviceId`:
   ```sql
   SELECT * FROM node WHERE chirpstack_device_id = '0102030405060788';
   ```
2. Check if node is assigned to a parking slot:
   ```sql
   SELECT * FROM node WHERE chirpstack_device_id = '0102030405060788'
   AND parking_slot_id IS NOT NULL;
   ```
3. Check ParkingStatusLog table for new entries:
   ```sql
   SELECT * FROM parking_status_log ORDER BY detected_at DESC LIMIT 10;
   ```

## 📝 Important Notes

1. **Test broker (mosquitto.org):**
   - Public and shared
   - No authentication required
   - Good for testing only
   - **NOT for production use**

2. **Production setup:**
   - Use private ChirpStack MQTT broker
   - Enable authentication (username/password)
   - Use TLS encryption (mqtts:// or wss://)

3. **Node setup:**
   - Each node must have `chirpstackDeviceId` matching the device's `devEui`
   - Node must be assigned to a parking slot
   - Example setup:
     ```
     Node: name="Sensor-01", chirpstackDeviceId="0102030405060788"
     Assigned to: Parking Slot "A-001"
     ```

## ✅ Success Checklist

- [ ] Railway environment variables updated
- [ ] Backend redeployed on Railway
- [ ] Health check shows correct MQTT broker URL
- [ ] Backend logs show "MQTT connected successfully"
- [ ] Frontend MQTT tester connects successfully
- [ ] Test message published from testclient-cloud.mqtt.cool
- [ ] Frontend receives and displays message
- [ ] Backend logs show message received
- [ ] Slot status updates in database
- [ ] Frontend auto-refreshes and shows new status

## 🚀 Next Steps

Once testing is complete:

1. **Update to production ChirpStack:**
   ```
   MQTT_BROKER_URL=mqtts://your-chirpstack-server:8883
   MQTT_USERNAME=your_username
   MQTT_PASSWORD=your_password
   ```

2. **Create real nodes:**
   - Add nodes with actual device EUIs
   - Assign nodes to parking slots
   - Configure ChirpStack application

3. **Deploy real sensors:**
   - Configure LoRaWAN sensors
   - Test physical parking detection
   - Monitor real-time data flow

## 📞 Support

If you encounter issues:
1. Check Railway deployment logs
2. Check browser console (F12) for frontend errors
3. Verify MQTT topic and payload format
4. Test with simple MQTT client first (mosquitto_pub)

---

**Created:** 2025-10-11
**Last Updated:** 2025-10-11
**Version:** 1.0.0
