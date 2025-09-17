"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSensorHealth = exports.resetSensor = exports.testSensor = exports.calibrateSensor = exports.updateSensorConfig = exports.getSensorConfig = void 0;
const ultrasonicSensorService_1 = require("../services/ultrasonicSensorService");
const data_source_1 = require("../data-source");
const Node_1 = require("../models/Node");
const loggerService_1 = require("../services/loggerService");
/**
 * Get sensor configuration for a specific node
 */
const getSensorConfig = async (req, res) => {
    const { nodeId } = req.params;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            },
            relations: ['parkingSlot', 'parkingSlot.floor', 'parkingSlot.floor.parkingLot']
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found or access denied'
            });
        }
        const stats = ultrasonicSensorService_1.ultrasonicSensorService.getSensorStats(node.chirpstackDeviceId);
        return res.json({
            success: true,
            message: 'Sensor configuration retrieved successfully',
            data: {
                nodeId: node.id,
                chirpstackDeviceId: node.chirpstackDeviceId,
                name: node.name,
                config: stats.config,
                stats: {
                    readingCount: stats.readingCount,
                    lastReading: stats.lastReading,
                    currentStatus: stats.currentStatus
                },
                parkingSlot: {
                    id: node.parkingSlot.id,
                    name: node.parkingSlot.name,
                    floor: node.parkingSlot.floor.name,
                    parkingLot: node.parkingSlot.floor.parkingLot.name
                }
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get sensor config error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve sensor configuration'
        });
    }
};
exports.getSensorConfig = getSensorConfig;
/**
 * Update sensor configuration for a specific node
 */
const updateSensorConfig = async (req, res) => {
    const { nodeId } = req.params;
    const { maxRange, minRange, occupiedThreshold, vacantThreshold, hysteresis, smoothingWindow, validationThreshold, calibrationOffset, errorThreshold, sensorType } = req.body;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            }
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found or access denied'
            });
        }
        // Validate configuration parameters
        if (occupiedThreshold && vacantThreshold && occupiedThreshold >= vacantThreshold) {
            return res.status(400).json({
                success: false,
                message: 'Occupied threshold must be less than vacant threshold'
            });
        }
        if (minRange && maxRange && minRange >= maxRange) {
            return res.status(400).json({
                success: false,
                message: 'Minimum range must be less than maximum range'
            });
        }
        const configUpdate = {
            ...(maxRange !== undefined && { maxRange }),
            ...(minRange !== undefined && { minRange }),
            ...(occupiedThreshold !== undefined && { occupiedThreshold }),
            ...(vacantThreshold !== undefined && { vacantThreshold }),
            ...(hysteresis !== undefined && { hysteresis }),
            ...(smoothingWindow !== undefined && { smoothingWindow }),
            ...(validationThreshold !== undefined && { validationThreshold }),
            ...(calibrationOffset !== undefined && { calibrationOffset }),
            ...(errorThreshold !== undefined && { errorThreshold }),
            ...(sensorType !== undefined && { sensorType })
        };
        await ultrasonicSensorService_1.ultrasonicSensorService.updateSensorConfig(node.chirpstackDeviceId, configUpdate);
        const updatedStats = ultrasonicSensorService_1.ultrasonicSensorService.getSensorStats(node.chirpstackDeviceId);
        loggerService_1.logger.info('Sensor configuration updated', {
            nodeId,
            chirpstackDeviceId: node.chirpstackDeviceId,
            adminId: req.user.id,
            configUpdate
        });
        return res.json({
            success: true,
            message: 'Sensor configuration updated successfully',
            data: {
                nodeId: node.id,
                chirpstackDeviceId: node.chirpstackDeviceId,
                updatedConfig: updatedStats.config
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Update sensor config error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to update sensor configuration'
        });
    }
};
exports.updateSensorConfig = updateSensorConfig;
/**
 * Calibrate sensor using empty parking slot readings
 */
const calibrateSensor = async (req, res) => {
    const { nodeId } = req.params;
    const { emptySlotReadings } = req.body;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            }
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found or access denied'
            });
        }
        if (!emptySlotReadings || !Array.isArray(emptySlotReadings) || emptySlotReadings.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least 5 empty slot distance readings for calibration'
            });
        }
        // Validate readings are numbers within reasonable range
        const validReadings = emptySlotReadings.filter(reading => typeof reading === 'number' && reading > 0 && reading < 1000);
        if (validReadings.length < 5) {
            return res.status(400).json({
                success: false,
                message: 'Invalid readings provided. All readings must be numbers between 0 and 1000 cm'
            });
        }
        const calibrationOffset = await ultrasonicSensorService_1.ultrasonicSensorService.calibrateSensor(node.chirpstackDeviceId, validReadings);
        loggerService_1.logger.info('Sensor calibrated', {
            nodeId,
            chirpstackDeviceId: node.chirpstackDeviceId,
            adminId: req.user.id,
            calibrationOffset,
            readingCount: validReadings.length
        });
        return res.json({
            success: true,
            message: 'Sensor calibrated successfully',
            data: {
                nodeId: node.id,
                chirpstackDeviceId: node.chirpstackDeviceId,
                calibrationOffset,
                readingsUsed: validReadings.length,
                medianEmptyDistance: validReadings.sort((a, b) => a - b)[Math.floor(validReadings.length / 2)]
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Sensor calibration error:', error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Failed to calibrate sensor'
        });
    }
};
exports.calibrateSensor = calibrateSensor;
/**
 * Test sensor with simulated data
 */
const testSensor = async (req, res) => {
    const { nodeId } = req.params;
    const { distance, batteryLevel, temperature, rssi } = req.body;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            }
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found or access denied'
            });
        }
        if (typeof distance !== 'number' || distance < 0) {
            return res.status(400).json({
                success: false,
                message: 'Distance must be a positive number'
            });
        }
        // Process test sensor data
        const result = await ultrasonicSensorService_1.ultrasonicSensorService.processSensorData(node.chirpstackDeviceId, distance, {
            batteryLevel,
            temperature,
            rssi
        }, new Date());
        loggerService_1.logger.info('Sensor test performed', {
            nodeId,
            chirpstackDeviceId: node.chirpstackDeviceId,
            adminId: req.user.id,
            testData: { distance, batteryLevel, temperature, rssi },
            result: {
                status: result.status,
                smoothedDistance: result.smoothedDistance,
                confidence: result.confidence
            }
        });
        return res.json({
            success: true,
            message: 'Sensor test completed',
            data: {
                nodeId: node.id,
                chirpstackDeviceId: node.chirpstackDeviceId,
                testInput: {
                    distance,
                    batteryLevel,
                    temperature,
                    rssi
                },
                result: {
                    status: result.status,
                    distance: result.distance,
                    smoothedDistance: result.smoothedDistance,
                    confidence: result.confidence,
                    validation: result.validation
                },
                config: result.config
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Sensor test error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to test sensor'
        });
    }
};
exports.testSensor = testSensor;
/**
 * Reset sensor data and configuration
 */
const resetSensor = async (req, res) => {
    const { nodeId } = req.params;
    const { resetConfig = false } = req.body;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            }
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found or access denied'
            });
        }
        // Clear sensor data
        ultrasonicSensorService_1.ultrasonicSensorService.clearSensorData(node.chirpstackDeviceId);
        // Reset configuration if requested
        if (resetConfig) {
            await ultrasonicSensorService_1.ultrasonicSensorService.updateSensorConfig(node.chirpstackDeviceId, {
                maxRange: 400,
                minRange: 5,
                occupiedThreshold: 80,
                vacantThreshold: 120,
                hysteresis: 10,
                smoothingWindow: 5,
                validationThreshold: 2,
                calibrationOffset: 0,
                errorThreshold: 5,
                sensorType: 'ultrasonic'
            });
        }
        loggerService_1.logger.info('Sensor reset performed', {
            nodeId,
            chirpstackDeviceId: node.chirpstackDeviceId,
            adminId: req.user.id,
            resetConfig
        });
        return res.json({
            success: true,
            message: `Sensor data${resetConfig ? ' and configuration' : ''} reset successfully`,
            data: {
                nodeId: node.id,
                chirpstackDeviceId: node.chirpstackDeviceId,
                resetConfig
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Sensor reset error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to reset sensor'
        });
    }
};
exports.resetSensor = resetSensor;
/**
 * Get sensor statistics and health information
 */
const getSensorHealth = async (req, res) => {
    const { nodeId } = req.params;
    try {
        const nodeRepository = data_source_1.AppDataSource.getRepository(Node_1.Node);
        const node = await nodeRepository.findOne({
            where: {
                id: nodeId,
                admin: { id: req.user.id }
            },
            relations: ['parkingSlot']
        });
        if (!node) {
            return res.status(404).json({
                success: false,
                message: 'Node not found or access denied'
            });
        }
        const stats = ultrasonicSensorService_1.ultrasonicSensorService.getSensorStats(node.chirpstackDeviceId);
        // Calculate health score based on various factors
        let healthScore = 100;
        const healthIssues = [];
        // Check if sensor is online
        if (!node.isOnline) {
            healthScore -= 30;
            healthIssues.push('Sensor is offline');
        }
        // Check battery level
        if (node.batteryLevel && node.batteryLevel < 20) {
            healthScore -= 20;
            healthIssues.push('Low battery level');
        }
        // Check reading frequency
        if (stats.readingCount < 10) {
            healthScore -= 15;
            healthIssues.push('Insufficient readings for reliable analysis');
        }
        // Check for recent readings
        if (stats.lastReading) {
            const timeSinceLastReading = Date.now() - stats.lastReading.timestamp.getTime();
            const minutesSinceLastReading = timeSinceLastReading / (1000 * 60);
            if (minutesSinceLastReading > 30) {
                healthScore -= 25;
                healthIssues.push('No recent readings');
            }
        }
        const healthStatus = healthScore >= 80 ? 'excellent' :
            healthScore >= 60 ? 'good' :
                healthScore >= 40 ? 'poor' : 'critical';
        return res.json({
            success: true,
            message: 'Sensor health information retrieved successfully',
            data: {
                nodeId: node.id,
                chirpstackDeviceId: node.chirpstackDeviceId,
                name: node.name,
                health: {
                    score: Math.max(0, healthScore),
                    status: healthStatus,
                    issues: healthIssues
                },
                stats: {
                    isOnline: node.isOnline,
                    lastSeen: node.lastSeen,
                    batteryLevel: node.batteryLevel,
                    readingCount: stats.readingCount,
                    lastReading: stats.lastReading,
                    currentStatus: stats.currentStatus
                },
                metadata: node.metadata || {}
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get sensor health error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve sensor health information'
        });
    }
};
exports.getSensorHealth = getSensorHealth;
