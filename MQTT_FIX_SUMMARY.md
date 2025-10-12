# MQTT Fix Summary

## Problem
MQTT was not receiving messages from ChirpStack because the service was not subscribed to the application topics.

## Root Cause
**Initialization Order Issue**: The MQTT service was connecting to the broker and attempting to subscribe to topics BEFORE the database connection was established. Since the topic subscriptions are based on parking lot records from the database, the subscription attempt failed silently.

### Timeline:
1. **14:12:59** - MQTT connected successfully
2. **14:12:59** - ⚠️ "Database not initialized, skipping application topic subscription"
3. **14:13:06** (7 seconds later) - Database connection established

## Solution
Modified [src/app.ts](src/app.ts#L509-L521) to explicitly call `mqttService.refreshSubscriptions()` after the database is initialized:

```typescript
import("./services/mqttService")
  .then(async (mqttModule) => {
    logger.info("MQTT service initialized", {
      broker: mqttBroker,
    });

    // Refresh subscriptions now that database is initialized
    try {
      await mqttModule.mqttService.refreshSubscriptions();
      logger.info("MQTT subscriptions refreshed after database initialization");
    } catch (refreshError) {
      logger.error("Failed to refresh MQTT subscriptions", refreshError);
    }

    // Initialize MQTT cron jobs...
  })
```

## Test Results
After the fix, MQTT successfully:
1. ✅ Subscribed to parking lot application topics
2. ✅ Received MQTT messages from ChirpStack
3. ✅ Processed sensor data (distance, battery, signal quality)
4. ✅ Updated node metadata
5. ✅ Updated parking slot status
6. ✅ Created parking status log entries

### Test Message
- **Topic**: `application/031709f4-457f-4e1c-a446-b9780838d050/device/0102030405060788/event/up`
- **Device EUI**: `0102030405060788`
- **Distance**: 30 cm
- **Sensor State**: OCCUPIED
- **Result**: Parking slot status updated to "occupied"

## Verification
Check server logs on startup for:
```
[info]: MQTT subscribed to parking lot application topic
  topic: "application/{applicationId}/device/+/event/up"
```

When messages arrive:
```
[debug]: MQTT message received
[debug]: Processing ChirpStack payload for node
[info]: Parking slot status updated from ChirpStack
```

## Notes
- The fix ensures subscriptions are established even if MQTT connects before database
- Existing cron job still refreshes subscriptions every 30 minutes as a backup
- No changes needed to MQTT service logic, only initialization order
