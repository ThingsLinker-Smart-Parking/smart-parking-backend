# 🚀 Fix Railway MQTT Connection

## Problem
Your Railway backend is using port **8885** but it should be **1883**:
```
Current: mqtt://test.mosquitto.org:8885 ❌
Correct: mqtt://test.mosquitto.org:1883 ✅
```

## Solution: Update Railway Environment Variables

### Option 1: Via Railway Dashboard (Recommended)

1. **Go to Railway:**
   - Visit: https://railway.app/dashboard
   - Login with your account

2. **Find Your Project:**
   - Look for `smart-parking-backend` project

3. **Open Variables:**
   - Click on your service
   - Go to **"Variables"** tab

4. **Update MQTT_BROKER_URL:**
   - Find: `MQTT_BROKER_URL`
   - Change from: `mqtt://test.mosquitto.org:8885`
   - Change to: `mqtt://test.mosquitto.org:1883`

5. **Save:**
   - Click **"Update Variables"** or **"Save"**
   - Railway will automatically redeploy (takes 2-3 minutes)

6. **Verify:**
   ```bash
   curl https://smart-parking-backend-production-5449.up.railway.app/api/health | grep mqtt
   ```
   Should show: `"brokerUrl":"mqtt://test.mosquitto.org:1883"`

### Option 2: Via Railway CLI

```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Set variable
railway variables set MQTT_BROKER_URL=mqtt://test.mosquitto.org:1883

# Verify
railway variables
```

### Option 3: Via .env File + Git Push

1. Update `.env` in backend (already done ✅)
2. Commit changes:
   ```bash
   cd /Users/chetanmahajan/Documents/nodejs_backend/smart-parking-backend
   git add .env
   git commit -m "Fix MQTT broker port to 1883"
   git push
   ```
3. Railway will auto-deploy

## After Update

### 1. Wait for Deployment
- Railway shows deployment status
- Wait until it says "Deployed"
- Usually takes 2-3 minutes

### 2. Verify MQTT Connection
```bash
curl https://smart-parking-backend-production-5449.up.railway.app/api/health
```

Look for:
```json
{
  "mqtt": {
    "status": "healthy",
    "details": {
      "brokerUrl": "mqtt://test.mosquitto.org:1883",  ✅ Should be :1883
      "clientId": "smart-parking-backend"
    }
  }
}
```

### 3. Check Backend Logs
In Railway dashboard:
- Go to **Deployments** tab
- Click latest deployment
- View logs for:
```
✅ MQTT connected successfully
✅ MQTT subscribed to ChirpStack uplink topic
```

## Testing After Fix

### Step 1: Publish MQTT Message
Go to https://testclient-cloud.mqtt.cool/

**Connection:**
- Broker: `tcp://test.mosquitto.org:1883`
- Click "Connect"

**Publish:**
- Topic: `application/031709f4-457f-4e1c-a446-b9780838d050/device/0102030405060788/event/up`
- Message:
```json
{"deduplicationId":"test-123","time":"2025-10-11T13:00:00.000Z","deviceInfo":{"tenantId":"b50f6f67-5359-41d5-9ff3-4eae99b081aa","tenantName":"ChirpStack","applicationId":"031709f4-457f-4e1c-a446-b9780838d050","applicationName":"Test_App","deviceProfileId":"45504159-129f-42a0-90f0-2104af25e0e1","deviceProfileName":"US_Parking_Testing","deviceName":"UltraSonic_Parking_Testing","devEui":"0102030405060788","deviceClassEnabled":"CLASS_A","tags":{}},"devAddr":"009aa844","adr":true,"dr":5,"fCnt":6,"fPort":2,"confirmed":true,"data":"AKwA","object":{"distance_cm":100.0,"state":"FREE"},"rxInfo":[{"gatewayId":"dca632fffe52c445","uplinkId":38637,"nsTime":"2025-10-11T13:00:00.000Z","rssi":-95,"snr":9.2,"channel":7,"location":{},"context":"bJxjlA==","crcStatus":"CRC_OK"}],"txInfo":{"frequency":867900000,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5"}}},"regionConfigId":"eu868"}
```

### Step 2: Check Backend Received It
Railway logs should show:
```
📨 MQTT message received on topic: application/.../device/.../event/up
✅ Parking slot status updated from ChirpStack
```

### Step 3: Check Database
```bash
curl "https://smart-parking-backend-production-5449.up.railway.app/api/parking-slots/YOUR_SLOT_ID/status-history" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should show new entry with:
- `status: "available"`
- `distance: 100`
- `state: "FREE"`

### Step 4: Watch Frontend Update
- Open slots page in browser
- Wait 5 seconds
- Slot should turn GREEN (available)
- No page reload needed!

## Troubleshooting

### MQTT still shows :8885
**Fix:** Railway environment variables override .env file. Must update in Railway dashboard.

### "MQTT connection error" in logs
**Check:**
1. Port is 1883 (not 8885)
2. No username/password set (public broker)
3. Railway can access external MQTT brokers

### Message published but backend doesn't receive
**Check:**
1. Backend MQTT connected (check logs)
2. Topic matches exactly (case-sensitive)
3. Node exists with chirpstackDeviceId `0102030405060788`

### Slot not updating in frontend
**Check:**
1. Backend received message (check logs)
2. Database updated (check status-history API)
3. Wait 5 seconds for auto-refresh
4. Browser console for errors

## Quick Test (Without Railway Update)

If you can't update Railway right now, use the frontend simulator:

1. Open slots page
2. Click "MQTT Test"
3. Click "Simulate FREE (170cm)"
4. This calls backend API directly (bypasses MQTT)
5. Should work immediately!

## Summary

**Problem:** Railway uses port 8885
**Solution:** Update `MQTT_BROKER_URL` to use port 1883 in Railway
**Method:** Railway Dashboard → Variables → Update → Save
**Time:** 2-3 minutes for redeploy
**Test:** Publish MQTT message and watch slots update!

---

**Need Help?**
- Railway Dashboard: https://railway.app/dashboard
- Backend Health: https://smart-parking-backend-production-5449.up.railway.app/api/health
- MQTT Test Client: https://testclient-cloud.mqtt.cool/
