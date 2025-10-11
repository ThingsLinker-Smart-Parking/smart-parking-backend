"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mqttService = exports.MqttService = void 0;
const mqtt_1 = __importDefault(require("mqtt"));
const data_source_1 = require("../data-source");
const Node_1 = require("../models/Node");
const ParkingSlot_1 = require("../models/ParkingSlot");
const ParkingStatusLog_1 = require("../models/ParkingStatusLog");
const ParkingLot_1 = require("../models/ParkingLot");
const loggerService_1 = require("./loggerService");
const environment_1 = require("../config/environment");
class MqttService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000; // 5 seconds
        this.slotStatusCache = new Map();
        this.subscribedApplicationIds = new Set(); // Track subscribed application IDs
        this.setupMqtt();
    }
    setupMqtt() {
        if (!environment_1.env.MQTT_BROKER_URL) {
            loggerService_1.logger.warn('MQTT broker URL not configured, skipping MQTT setup');
            return;
        }
        try {
            const mqttOptions = {
                clientId: environment_1.env.MQTT_CLIENT_ID || `smart-parking-backend-${Date.now()}`,
                username: environment_1.env.MQTT_USERNAME,
                password: environment_1.env.MQTT_PASSWORD,
                clean: true,
                connectTimeout: 30000,
                reconnectPeriod: this.reconnectInterval,
                keepalive: 60,
            };
            this.client = mqtt_1.default.connect(environment_1.env.MQTT_BROKER_URL, mqttOptions);
            this.client.on('connect', async () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                loggerService_1.logger.info('MQTT connected successfully', {
                    broker: environment_1.env.MQTT_BROKER_URL,
                    clientId: mqttOptions.clientId
                });
                // Subscribe to all ChirpStack application topics from database
                await this.subscribeToApplicationTopics();
            });
            this.client.on('message', (topic, message) => {
                this.handleMessage(topic, message);
            });
            this.client.on('error', (error) => {
                loggerService_1.logger.error('MQTT connection error', error);
                this.isConnected = false;
            });
            this.client.on('close', () => {
                this.isConnected = false;
                loggerService_1.logger.warn('MQTT connection closed');
            });
            this.client.on('disconnect', () => {
                this.isConnected = false;
                loggerService_1.logger.warn('MQTT disconnected');
            });
            this.client.on('reconnect', () => {
                this.reconnectAttempts++;
                loggerService_1.logger.info('MQTT attempting to reconnect', {
                    attempt: this.reconnectAttempts,
                    maxAttempts: this.maxReconnectAttempts
                });
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    loggerService_1.logger.error('Max MQTT reconnect attempts reached, stopping client');
                    this.client?.end();
                }
            });
        }
        catch (error) {
            loggerService_1.logger.error('Failed to setup MQTT client', error);
        }
    }
    /**
     * Subscribe to MQTT topics for all parking lots with ChirpStack Application IDs
     */
    async subscribeToApplicationTopics() {
        try {
            if (!data_source_1.AppDataSource.isInitialized) {
                loggerService_1.logger.warn('Database not initialized, skipping application topic subscription');
                return;
            }
            const parkingLotRepository = data_source_1.AppDataSource.getRepository(ParkingLot_1.ParkingLot);
            // Get all active parking lots with Application IDs
            const parkingLots = await parkingLotRepository.find({
                where: { isActive: true },
                select: ['id', 'name', 'chirpstackApplicationId', 'chirpstackApplicationName']
            });
            const lotsWithAppId = parkingLots.filter(lot => lot.chirpstackApplicationId);
            if (lotsWithAppId.length === 0) {
                loggerService_1.logger.warn('No parking lots with ChirpStack Application IDs found. Subscribing to wildcard topic.');
                // Fallback to wildcard subscription
                const wildcardTopic = 'application/+/device/+/event/up';
                this.client.subscribe(wildcardTopic, { qos: 1 }, (err) => {
                    if (err) {
                        loggerService_1.logger.error('MQTT wildcard subscription failed', err);
                    }
                    else {
                        loggerService_1.logger.info('MQTT subscribed to wildcard ChirpStack topic', { topic: wildcardTopic });
                    }
                });
                return;
            }
            // Subscribe to each application's topic
            for (const lot of lotsWithAppId) {
                const topic = `application/${lot.chirpstackApplicationId}/device/+/event/up`;
                if (!this.subscribedApplicationIds.has(lot.chirpstackApplicationId)) {
                    this.client.subscribe(topic, { qos: 1 }, (err) => {
                        if (err) {
                            loggerService_1.logger.error('MQTT subscription failed for parking lot', {
                                parkingLotId: lot.id,
                                parkingLotName: lot.name,
                                applicationId: lot.chirpstackApplicationId,
                                topic,
                                error: err.message
                            });
                        }
                        else {
                            this.subscribedApplicationIds.add(lot.chirpstackApplicationId);
                            loggerService_1.logger.info('MQTT subscribed to parking lot application topic', {
                                parkingLotId: lot.id,
                                parkingLotName: lot.name,
                                applicationId: lot.chirpstackApplicationId,
                                applicationName: lot.chirpstackApplicationName,
                                topic
                            });
                        }
                    });
                }
            }
            loggerService_1.logger.info('MQTT topic subscription complete', {
                totalLots: parkingLots.length,
                lotsWithAppId: lotsWithAppId.length,
                subscribedTopics: this.subscribedApplicationIds.size
            });
        }
        catch (error) {
            loggerService_1.logger.error('Error subscribing to application topics', error);
        }
    }
    /**
     * Subscribe to a specific parking lot's MQTT topic
     */
    async subscribeToApplicationTopic(applicationId, parkingLotName) {
        try {
            if (!this.client || !this.isConnected) {
                loggerService_1.logger.warn('MQTT client not connected, cannot subscribe', { applicationId });
                return false;
            }
            if (this.subscribedApplicationIds.has(applicationId)) {
                loggerService_1.logger.debug('Already subscribed to application topic', { applicationId });
                return true;
            }
            const topic = `application/${applicationId}/device/+/event/up`;
            return new Promise((resolve) => {
                this.client.subscribe(topic, { qos: 1 }, (err) => {
                    if (err) {
                        loggerService_1.logger.error('Failed to subscribe to application topic', {
                            applicationId,
                            parkingLotName,
                            topic,
                            error: err.message
                        });
                        resolve(false);
                    }
                    else {
                        this.subscribedApplicationIds.add(applicationId);
                        loggerService_1.logger.info('Successfully subscribed to new application topic', {
                            applicationId,
                            parkingLotName,
                            topic
                        });
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            loggerService_1.logger.error('Error subscribing to application topic', error, { applicationId });
            return false;
        }
    }
    /**
     * Unsubscribe from a specific parking lot's MQTT topic
     */
    async unsubscribeFromApplicationTopic(applicationId) {
        try {
            if (!this.client || !this.isConnected) {
                loggerService_1.logger.warn('MQTT client not connected, cannot unsubscribe', { applicationId });
                return false;
            }
            if (!this.subscribedApplicationIds.has(applicationId)) {
                loggerService_1.logger.debug('Not subscribed to application topic', { applicationId });
                return true;
            }
            const topic = `application/${applicationId}/device/+/event/up`;
            return new Promise((resolve) => {
                this.client.unsubscribe(topic, (err) => {
                    if (err) {
                        loggerService_1.logger.error('Failed to unsubscribe from application topic', {
                            applicationId,
                            topic,
                            error: err.message
                        });
                        resolve(false);
                    }
                    else {
                        this.subscribedApplicationIds.delete(applicationId);
                        loggerService_1.logger.info('Successfully unsubscribed from application topic', {
                            applicationId,
                            topic
                        });
                        resolve(true);
                    }
                });
            });
        }
        catch (error) {
            loggerService_1.logger.error('Error unsubscribing from application topic', error, { applicationId });
            return false;
        }
    }
    /**
     * Refresh subscriptions (useful when parking lots are added/updated/deleted)
     */
    async refreshSubscriptions() {
        loggerService_1.logger.info('Refreshing MQTT subscriptions...');
        // Clear current subscriptions
        for (const appId of this.subscribedApplicationIds) {
            await this.unsubscribeFromApplicationTopic(appId);
        }
        // Resubscribe to all active parking lots
        await this.subscribeToApplicationTopics();
    }
    async handleMessage(topic, message) {
        try {
            const messageString = message.toString();
            loggerService_1.logger.debug('MQTT message received', {
                topic,
                messageLength: messageString.length
            });
            // Parse ChirpStack uplink data
            const uplinkData = JSON.parse(messageString);
            // Validate required fields
            if (!uplinkData.deviceInfo?.devEui || !uplinkData.object) {
                loggerService_1.logger.warn('Invalid ChirpStack uplink data - missing required fields', {
                    topic,
                    hasDevEui: !!uplinkData.deviceInfo?.devEui,
                    hasObject: !!uplinkData.object
                });
                return;
            }
            await this.processChirpStackData(uplinkData);
        }
        catch (error) {
            loggerService_1.logger.error('Error processing MQTT message', error, {
                topic,
                messagePreview: message.toString().substring(0, 200)
            });
        }
    }
    async processChirpStackData(data) {
        try {
            const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
            const parkingSlotRepository = data_source_1.AppDataSource.getRepository(ParkingSlot_1.ParkingSlot);
            const statusLogRepository = data_source_1.AppDataSource.getRepository(ParkingStatusLog_1.ParkingStatusLog);
            // Find node by ChirpStack device EUI
            const node = await nodeRepository.findOne({
                where: {
                    chirpstackDeviceId: data.deviceInfo.devEui
                },
                relations: ['parkingSlot']
            });
            if (!node) {
                loggerService_1.logger.warn('Node not found for ChirpStack device', {
                    devEui: data.deviceInfo.devEui,
                    applicationId: data.deviceInfo.applicationId
                });
                return;
            }
            loggerService_1.logger.debug('Processing ChirpStack payload for node', {
                nodeId: node.id,
                parkingSlotId: node.parkingSlot?.id,
                devEui: data.deviceInfo.devEui,
                applicationId: data.deviceInfo.applicationId,
                sensorState: data.object.state,
                distance: data.object.distance_cm,
            });
            // Extract sensor data
            const distance = data.object.distance_cm;
            const sensorState = data.object.state;
            const messageTime = new Date(data.time);
            // Convert distance to percentage (assuming max distance of 200cm for parking slot)
            const maxDistance = 200;
            const percentage = Math.min(100, Math.max(0, (distance / maxDistance) * 100));
            // Extract gateway information (use first gateway record when available)
            const gatewayInfo = data.rxInfo?.[0];
            const batteryLevel = this.extractBatteryLevel(data);
            const signalQuality = gatewayInfo
                ? this.calculateSignalQuality(gatewayInfo.rssi, gatewayInfo.snr)
                : null;
            // Update node metadata with latest sensor data
            const existingMetadata = node.metadata ?? {};
            const updatedMetadata = {
                ...existingMetadata,
                distance_cm: distance,
                percentage: percentage,
                state: sensorState,
                batteryLevel: batteryLevel,
                rssi: gatewayInfo?.rssi ?? null,
                snr: gatewayInfo?.snr ?? null,
                signalQuality: signalQuality,
                gatewayId: gatewayInfo?.gatewayId ?? null,
                frequency: data.txInfo.frequency,
                spreadingFactor: data.txInfo.modulation.lora.spreadingFactor,
                frameCounter: data.fCnt,
                lastChirpStackUpdate: data.time,
                lastUpdated: new Date().toISOString()
            };
            // Update node
            node.metadata = updatedMetadata;
            node.lastSeen = messageTime;
            await nodeRepository.save(node);
            loggerService_1.logger.debug('Node metadata updated from MQTT payload', {
                nodeId: node.id,
                parkingSlotId: node.parkingSlot?.id,
                distance,
                sensorState,
                percentage,
                batteryLevel,
                signalQuality,
                gatewayId: gatewayInfo?.gatewayId ?? null,
            });
            // Determine parking slot status based on sensor state and percentage
            let slotStatus = 'unknown';
            if (sensorState === 'FREE') {
                slotStatus = 'available';
            }
            else if (sensorState === 'OCCUPIED') {
                slotStatus = 'occupied';
            }
            else {
                // Fallback to percentage-based logic
                if (percentage >= 80) {
                    slotStatus = 'available';
                }
                else if (percentage < 60) {
                    slotStatus = 'occupied';
                }
            }
            // Persist slot-level status and realtime snapshot
            if (node.parkingSlot) {
                const slot = await parkingSlotRepository.findOne({
                    where: { id: node.parkingSlot.id }
                });
                if (!slot) {
                    loggerService_1.logger.warn('Parking slot not found while processing ChirpStack payload', {
                        assumedSlotId: node.parkingSlot.id,
                        devEui: data.deviceInfo.devEui
                    });
                    return;
                }
                const previousStatus = slot.status;
                slot.status = slotStatus;
                slot.lastMessageReceivedAt = messageTime;
                slot.lastSensorState = sensorState || null;
                slot.lastDistanceCm = Number.isFinite(distance) ? Number(distance.toFixed(2)) : null;
                slot.lastGatewayId = gatewayInfo?.gatewayId ?? null;
                if (previousStatus !== slotStatus || !slot.statusUpdatedAt) {
                    slot.statusUpdatedAt = messageTime;
                }
                await parkingSlotRepository.save(slot);
                this.slotStatusCache.set(slot.id, {
                    slotId: slot.id,
                    devEui: data.deviceInfo.devEui,
                    status: slot.status,
                    sensorState: slot.lastSensorState,
                    distanceCm: slot.lastDistanceCm,
                    percentage,
                    batteryLevel,
                    gatewayId: slot.lastGatewayId,
                    signalQuality,
                    receivedAt: data.time,
                    processedAt: new Date().toISOString()
                });
                if (previousStatus !== slotStatus) {
                    const statusLog = await statusLogRepository.save({
                        parkingSlot: slot,
                        status: slotStatus,
                        distance: slot.lastDistanceCm,
                        percentage,
                        batteryLevel,
                        signalQuality: signalQuality ?? null,
                        detectedAt: messageTime,
                        metadata: {
                            devEui: data.deviceInfo.devEui,
                            receivedAt: data.time,
                            gatewayId: slot.lastGatewayId
                        }
                    });
                    loggerService_1.logger.info('Parking slot status updated from ChirpStack', {
                        nodeId: node.id,
                        parkingSlotId: slot.id,
                        devEui: data.deviceInfo.devEui,
                        distance: slot.lastDistanceCm,
                        percentage,
                        sensorState,
                        slotStatus,
                        batteryLevel,
                        gatewayId: slot.lastGatewayId,
                        statusLogId: statusLog.id,
                    });
                }
                else {
                    loggerService_1.logger.debug('Parking slot telemetry processed without status change', {
                        nodeId: node.id,
                        parkingSlotId: slot.id,
                        devEui: data.deviceInfo.devEui,
                        distance: slot.lastDistanceCm,
                        percentage,
                        sensorState,
                        slotStatus,
                        gatewayId: slot.lastGatewayId
                    });
                }
            }
        }
        catch (error) {
            loggerService_1.logger.error('Error processing ChirpStack data', error, {
                devEui: data.deviceInfo?.devEui,
                applicationId: data.deviceInfo?.applicationId
            });
        }
    }
    extractBatteryLevel(data) {
        // Check if battery level is in the object data
        if ('battery' in data.object) {
            return data.object.battery;
        }
        // Check if battery level is in device metadata
        if (data.deviceInfo.tags?.battery) {
            return parseFloat(data.deviceInfo.tags.battery);
        }
        // Estimate battery level based on signal quality (fallback)
        const gatewayInfo = data.rxInfo[0];
        if (gatewayInfo) {
            // Very rough estimation based on RSSI
            // This is a fallback - real battery data should come from the device
            const normalizedRssi = Math.max(-120, Math.min(-50, gatewayInfo.rssi));
            const batteryEstimate = ((normalizedRssi + 120) / 70) * 100;
            return Math.round(batteryEstimate);
        }
        return null;
    }
    calculateSignalQuality(rssi, snr) {
        // Calculate signal quality based on RSSI and SNR
        if (rssi >= -70 && snr >= 10)
            return 'excellent';
        if (rssi >= -85 && snr >= 5)
            return 'good';
        if (rssi >= -100 && snr >= 0)
            return 'fair';
        return 'poor';
    }
    // Public method to publish data (if needed for testing or manual updates)
    publish(topic, message) {
        return new Promise((resolve, reject) => {
            if (!this.client || !this.isConnected) {
                reject(new Error('MQTT client not connected'));
                return;
            }
            this.client.publish(topic, message, { qos: 1 }, (error) => {
                if (error) {
                    loggerService_1.logger.error('MQTT publish error', error);
                    reject(error);
                }
                else {
                    loggerService_1.logger.debug('MQTT message published', { topic });
                    resolve();
                }
            });
        });
    }
    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            subscribedApplications: Array.from(this.subscribedApplicationIds),
            subscribedCount: this.subscribedApplicationIds.size
        };
    }
    getSlotRealtimeStatus(slotId) {
        return this.slotStatusCache.get(slotId) ?? null;
    }
    getSlotRealtimeStatuses(slotIds) {
        if (!slotIds) {
            return Array.from(this.slotStatusCache.values());
        }
        const snapshots = [];
        slotIds.forEach(id => {
            const snapshot = this.slotStatusCache.get(id);
            if (snapshot) {
                snapshots.push(snapshot);
            }
        });
        return snapshots;
    }
    // Gracefully disconnect
    async disconnect() {
        if (this.client) {
            return new Promise((resolve) => {
                this.client.end(false, () => {
                    loggerService_1.logger.info('MQTT client disconnected gracefully');
                    resolve();
                });
            });
        }
    }
    // Health check for MQTT service
    async healthCheck() {
        try {
            if (!environment_1.env.MQTT_BROKER_URL) {
                return {
                    status: 'degraded',
                    details: {
                        message: 'MQTT not configured',
                        configured: false
                    }
                };
            }
            if (this.isConnected) {
                return {
                    status: 'healthy',
                    details: {
                        connected: true,
                        broker: environment_1.env.MQTT_BROKER_URL,
                        reconnectAttempts: this.reconnectAttempts
                    }
                };
            }
            else {
                return {
                    status: 'unhealthy',
                    details: {
                        connected: false,
                        broker: environment_1.env.MQTT_BROKER_URL,
                        reconnectAttempts: this.reconnectAttempts,
                        maxAttempts: this.maxReconnectAttempts
                    }
                };
            }
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            };
        }
    }
}
exports.MqttService = MqttService;
// Create singleton instance
exports.mqttService = new MqttService();
