"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ultrasonicSensorService = exports.UltrasonicSensorService = void 0;
const data_source_1 = require("../data-source");
const Node_1 = require("../models/Node");
const loggerService_1 = require("./loggerService");
class UltrasonicSensorService {
    constructor() {
        this.sensorReadings = new Map(); // Device ID -> readings buffer
        this.sensorConfigs = new Map(); // Device ID -> config
        this.lastStatus = new Map(); // Device ID -> last confirmed status
        this.consecutiveReadings = new Map();
        this.initializeDefaultConfigs();
    }
    /**
     * Initialize default sensor configurations
     */
    initializeDefaultConfigs() {
        // These can be overridden per sensor via node metadata
        const defaultConfig = {
            sensorType: 'ultrasonic',
            maxRange: 400, // 4m max range
            minRange: 5, // 5cm min range
            occupiedThreshold: 80, // Car detected if distance < 80cm
            vacantThreshold: 120, // Slot vacant if distance > 120cm
            hysteresis: 10, // 10cm hysteresis margin
            smoothingWindow: 5, // Average over 5 readings
            validationThreshold: 2, // Require 2 consecutive readings
            calibrationOffset: 0, // No default offset
            errorThreshold: 5 // 5 consecutive errors = fault
        };
        // Store as default - will be overridden by actual sensor configs
        this.sensorConfigs.set('default', defaultConfig);
    }
    /**
     * Get or create sensor configuration for a specific node
     */
    getSensorConfig(deviceId, nodeMetadata) {
        // Try to get existing config
        let config = this.sensorConfigs.get(deviceId);
        if (!config) {
            // Create new config from defaults and metadata
            const defaultConfig = this.sensorConfigs.get('default');
            config = { ...defaultConfig };
            // Override with metadata values if present
            if (nodeMetadata) {
                if (nodeMetadata.maxRange)
                    config.maxRange = nodeMetadata.maxRange;
                if (nodeMetadata.minRange)
                    config.minRange = nodeMetadata.minRange;
                if (nodeMetadata.occupiedThreshold)
                    config.occupiedThreshold = nodeMetadata.occupiedThreshold;
                if (nodeMetadata.vacantThreshold)
                    config.vacantThreshold = nodeMetadata.vacantThreshold;
                if (nodeMetadata.hysteresis)
                    config.hysteresis = nodeMetadata.hysteresis;
                if (nodeMetadata.smoothingWindow)
                    config.smoothingWindow = nodeMetadata.smoothingWindow;
                if (nodeMetadata.validationThreshold)
                    config.validationThreshold = nodeMetadata.validationThreshold;
                if (nodeMetadata.calibrationOffset)
                    config.calibrationOffset = nodeMetadata.calibrationOffset;
                if (nodeMetadata.errorThreshold)
                    config.errorThreshold = nodeMetadata.errorThreshold;
                if (nodeMetadata.sensorType)
                    config.sensorType = nodeMetadata.sensorType;
            }
            this.sensorConfigs.set(deviceId, config);
        }
        return config;
    }
    /**
     * Validate raw sensor reading
     */
    validateSensorReading(distance, config) {
        // Check if distance is within sensor range
        if (distance < config.minRange) {
            return {
                isValid: false,
                errorType: 'OUT_OF_RANGE',
                message: `Distance ${distance}cm below minimum range ${config.minRange}cm`
            };
        }
        if (distance > config.maxRange) {
            return {
                isValid: false,
                errorType: 'OUT_OF_RANGE',
                message: `Distance ${distance}cm exceeds maximum range ${config.maxRange}cm`
            };
        }
        // Additional validation: check for impossible readings
        if (distance === 0) {
            return {
                isValid: false,
                errorType: 'SENSOR_FAULT',
                message: 'Zero distance reading indicates sensor fault'
            };
        }
        return { isValid: true };
    }
    /**
     * Apply calibration to raw distance reading
     */
    applyCalibrtion(rawDistance, config) {
        return rawDistance + config.calibrationOffset;
    }
    /**
     * Add reading to smoothing buffer and get smoothed value
     */
    addReadingAndSmooth(deviceId, reading, config) {
        // Get or create readings buffer
        let readings = this.sensorReadings.get(deviceId) || [];
        // Add new reading
        readings.push(reading);
        // Keep only the latest readings within the smoothing window
        if (readings.length > config.smoothingWindow) {
            readings = readings.slice(-config.smoothingWindow);
        }
        // Update buffer
        this.sensorReadings.set(deviceId, readings);
        // Calculate smoothed distance (median for better noise rejection)
        const distances = readings.map(r => r.distance).sort((a, b) => a - b);
        const medianIndex = Math.floor(distances.length / 2);
        return distances.length % 2 === 0
            ? (distances[medianIndex - 1] + distances[medianIndex]) / 2
            : distances[medianIndex];
    }
    /**
     * Determine parking status with hysteresis
     */
    determineStatus(smoothedDistance, deviceId, config) {
        const lastStatus = this.lastStatus.get(deviceId);
        // Apply hysteresis to prevent rapid status changes
        if (lastStatus === 'occupied') {
            // Currently occupied, need higher threshold to become vacant
            if (smoothedDistance > config.vacantThreshold + config.hysteresis) {
                return 'vacant';
            }
            else if (smoothedDistance <= config.occupiedThreshold) {
                return 'occupied'; // Confirm occupied
            }
        }
        else {
            // Currently vacant or unknown, need lower threshold to become occupied
            if (smoothedDistance < config.occupiedThreshold - config.hysteresis) {
                return 'occupied';
            }
            else if (smoothedDistance >= config.vacantThreshold) {
                return 'vacant'; // Confirm vacant
            }
        }
        // No clear status change, return null (keep current status)
        return null;
    }
    /**
     * Validate status with consecutive readings requirement
     */
    validateStatusChange(deviceId, newStatus, config) {
        const consecutiveData = this.consecutiveReadings.get(deviceId);
        if (!consecutiveData || consecutiveData.status !== newStatus) {
            // New status or different from tracking, start counting
            this.consecutiveReadings.set(deviceId, { status: newStatus, count: 1 });
            return false; // Not enough consecutive readings yet
        }
        // Same status, increment count
        consecutiveData.count++;
        if (consecutiveData.count >= config.validationThreshold) {
            // Enough consecutive readings, reset counter and confirm status
            this.consecutiveReadings.delete(deviceId);
            return true;
        }
        return false; // Still not enough consecutive readings
    }
    /**
     * Process ultrasonic sensor data and determine parking status
     */
    async processSensorData(deviceId, rawDistance, metadata = {}, timestamp = new Date()) {
        try {
            // Get node for metadata and configuration
            const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
            const node = await nodeRepository.findOne({
                where: { chirpstackDeviceId: deviceId },
                relations: ['parkingSlot']
            });
            // Get sensor configuration
            const config = this.getSensorConfig(deviceId, node?.metadata);
            // Validate raw reading
            const validation = this.validateSensorReading(rawDistance, config);
            if (!validation.isValid) {
                loggerService_1.logger.warn('Invalid sensor reading', {
                    deviceId,
                    rawDistance,
                    validation,
                    timestamp
                });
                return {
                    status: null,
                    distance: rawDistance,
                    smoothedDistance: rawDistance,
                    confidence: 0,
                    validation,
                    config
                };
            }
            // Apply calibration
            const calibratedDistance = this.applyCalibrtion(rawDistance, config);
            // Create sensor reading
            const reading = {
                distance: calibratedDistance,
                timestamp,
                rssi: metadata.rssi,
                batteryLevel: metadata.batteryLevel,
                temperature: metadata.temperature
            };
            // Add to smoothing buffer and get smoothed value
            const smoothedDistance = this.addReadingAndSmooth(deviceId, reading, config);
            // Determine status with hysteresis
            const determinedStatus = this.determineStatus(smoothedDistance, deviceId, config);
            let finalStatus = null;
            let confidence = 0;
            if (determinedStatus) {
                // Validate with consecutive readings requirement
                const isConfirmed = this.validateStatusChange(deviceId, determinedStatus, config);
                if (isConfirmed) {
                    finalStatus = determinedStatus;
                    this.lastStatus.set(deviceId, finalStatus);
                    // Calculate confidence based on how far from thresholds
                    if (finalStatus === 'occupied') {
                        const distance_from_threshold = config.occupiedThreshold - smoothedDistance;
                        confidence = Math.min(100, Math.max(0, (distance_from_threshold / config.occupiedThreshold) * 100));
                    }
                    else {
                        const distance_from_threshold = smoothedDistance - config.vacantThreshold;
                        confidence = Math.min(100, Math.max(0, (distance_from_threshold / config.vacantThreshold) * 100));
                    }
                }
            }
            loggerService_1.logger.debug('Sensor data processed', {
                deviceId,
                rawDistance,
                calibratedDistance,
                smoothedDistance,
                determinedStatus,
                finalStatus,
                confidence,
                config: {
                    occupiedThreshold: config.occupiedThreshold,
                    vacantThreshold: config.vacantThreshold,
                    hysteresis: config.hysteresis
                }
            });
            return {
                status: finalStatus,
                distance: calibratedDistance,
                smoothedDistance,
                confidence,
                validation,
                config
            };
        }
        catch (error) {
            loggerService_1.logger.error('Error processing sensor data', { deviceId, rawDistance, error });
            const defaultConfig = this.sensorConfigs.get('default');
            return {
                status: null,
                distance: rawDistance,
                smoothedDistance: rawDistance,
                confidence: 0,
                validation: {
                    isValid: false,
                    errorType: 'SENSOR_FAULT',
                    message: 'Processing error'
                },
                config: defaultConfig
            };
        }
    }
    /**
     * Update sensor configuration for a specific device
     */
    async updateSensorConfig(deviceId, newConfig) {
        try {
            // Get current config
            const currentConfig = this.getSensorConfig(deviceId);
            // Merge with new config
            const updatedConfig = { ...currentConfig, ...newConfig };
            // Validate new config
            if (updatedConfig.occupiedThreshold >= updatedConfig.vacantThreshold) {
                throw new Error('Occupied threshold must be less than vacant threshold');
            }
            if (updatedConfig.minRange >= updatedConfig.maxRange) {
                throw new Error('Minimum range must be less than maximum range');
            }
            // Update configuration
            this.sensorConfigs.set(deviceId, updatedConfig);
            // Update node metadata in database
            const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
            const node = await nodeRepository.findOne({
                where: { chirpstackDeviceId: deviceId }
            });
            if (node) {
                node.metadata = { ...node.metadata, ...newConfig };
                await nodeRepository.save(node);
            }
            loggerService_1.logger.info('Sensor configuration updated', { deviceId, updatedConfig });
        }
        catch (error) {
            loggerService_1.logger.error('Error updating sensor configuration', { deviceId, error });
            throw error;
        }
    }
    /**
     * Auto-calibrate sensor based on empty parking slot readings
     */
    async calibrateSensor(deviceId, emptySlotReadings) {
        if (emptySlotReadings.length < 5) {
            throw new Error('Need at least 5 readings for calibration');
        }
        // Calculate median of empty slot readings
        const sortedReadings = [...emptySlotReadings].sort((a, b) => a - b);
        const medianIndex = Math.floor(sortedReadings.length / 2);
        const medianDistance = sortedReadings.length % 2 === 0
            ? (sortedReadings[medianIndex - 1] + sortedReadings[medianIndex]) / 2
            : sortedReadings[medianIndex];
        // Calculate calibration offset to set vacant threshold appropriately
        const config = this.getSensorConfig(deviceId);
        const targetVacantDistance = config.vacantThreshold + config.hysteresis;
        const calibrationOffset = targetVacantDistance - medianDistance;
        // Update configuration
        await this.updateSensorConfig(deviceId, { calibrationOffset });
        loggerService_1.logger.info('Sensor calibrated', {
            deviceId,
            medianEmptyDistance: medianDistance,
            calibrationOffset,
            numReadings: emptySlotReadings.length
        });
        return calibrationOffset;
    }
    /**
     * Get sensor statistics and health
     */
    getSensorStats(deviceId) {
        const readings = this.sensorReadings.get(deviceId) || [];
        const config = this.getSensorConfig(deviceId);
        const lastReading = readings[readings.length - 1];
        const currentStatus = this.lastStatus.get(deviceId);
        return {
            readingCount: readings.length,
            lastReading,
            config,
            currentStatus
        };
    }
    /**
     * Clear sensor data (useful for testing or reset)
     */
    clearSensorData(deviceId) {
        if (deviceId) {
            this.sensorReadings.delete(deviceId);
            this.consecutiveReadings.delete(deviceId);
            this.lastStatus.delete(deviceId);
        }
        else {
            this.sensorReadings.clear();
            this.consecutiveReadings.clear();
            this.lastStatus.clear();
        }
    }
}
exports.UltrasonicSensorService = UltrasonicSensorService;
exports.ultrasonicSensorService = new UltrasonicSensorService();
