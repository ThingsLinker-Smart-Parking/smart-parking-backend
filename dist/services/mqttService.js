"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mqttService = exports.MqttService = void 0;
const mqtt_1 = __importDefault(require("mqtt"));
const data_source_1 = require("../data-source");
const Node_1 = require("../models/Node");
const ParkingStatusLog_1 = require("../models/ParkingStatusLog");
const loggerService_1 = require("./loggerService");
const environment_1 = require("../config/environment");
class MqttService {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000; // 5 seconds
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
            this.client.on('connect', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                loggerService_1.logger.info('MQTT connected successfully', {
                    broker: environment_1.env.MQTT_BROKER_URL,
                    clientId: mqttOptions.clientId
                });
                // Subscribe to ChirpStack application topics
                // Topic pattern: application/{applicationId}/device/+/event/up
                const topic = 'application/+/device/+/event/up';
                this.client.subscribe(topic, { qos: 1 }, (err) => {
                    if (err) {
                        loggerService_1.logger.error('MQTT subscription failed', err);
                    }
                    else {
                        loggerService_1.logger.info('MQTT subscribed to ChirpStack uplink topic', { topic });
                    }
                });
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
            // Extract sensor data
            const distance = data.object.distance_cm;
            const sensorState = data.object.state;
            // Convert distance to percentage (assuming max distance of 200cm for parking slot)
            const maxDistance = 200;
            const percentage = Math.min(100, Math.max(0, (distance / maxDistance) * 100));
            // Extract gateway information
            const gatewayInfo = data.rxInfo[0]; // Use first gateway
            const batteryLevel = this.extractBatteryLevel(data);
            const signalQuality = this.calculateSignalQuality(gatewayInfo.rssi, gatewayInfo.snr);
            // Update node metadata with latest sensor data
            const existingMetadata = node.metadata ?? {};
            const updatedMetadata = {
                ...existingMetadata,
                distance_cm: distance,
                percentage: percentage,
                state: sensorState,
                batteryLevel: batteryLevel,
                rssi: gatewayInfo.rssi,
                snr: gatewayInfo.snr,
                signalQuality: signalQuality,
                gatewayId: gatewayInfo.gatewayId,
                frequency: data.txInfo.frequency,
                spreadingFactor: data.txInfo.modulation.lora.spreadingFactor,
                frameCounter: data.fCnt,
                lastChirpStackUpdate: data.time,
                lastUpdated: new Date().toISOString()
            };
            // Update node
            node.metadata = updatedMetadata;
            node.lastSeen = new Date(data.time);
            await nodeRepository.save(node);
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
            // Log parking status change
            if (node.parkingSlot) {
                await statusLogRepository.save({
                    parkingSlot: node.parkingSlot,
                    status: slotStatus,
                    distance: distance,
                    percentage: percentage,
                    batteryLevel: batteryLevel,
                    signalQuality: signalQuality,
                    metadata: {
                        chirpstackData: {
                            devEui: data.deviceInfo.devEui,
                            gatewayId: gatewayInfo.gatewayId,
                            rssi: gatewayInfo.rssi,
                            snr: gatewayInfo.snr,
                            frequency: data.txInfo.frequency,
                            frameCounter: data.fCnt
                        }
                    }
                });
                loggerService_1.logger.info('Parking slot status updated from ChirpStack', {
                    nodeId: node.id,
                    parkingSlotId: node.parkingSlot.id,
                    devEui: data.deviceInfo.devEui,
                    distance: distance,
                    percentage: percentage,
                    sensorState: sensorState,
                    slotStatus: slotStatus,
                    batteryLevel: batteryLevel,
                    rssi: gatewayInfo.rssi,
                    gatewayId: gatewayInfo.gatewayId
                });
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
            reconnectAttempts: this.reconnectAttempts
        };
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
