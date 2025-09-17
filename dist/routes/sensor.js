"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sensorController_1 = require("../controllers/sensorController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication and admin role
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']));
/**
 * @swagger
 * components:
 *   schemas:
 *     SensorConfig:
 *       type: object
 *       properties:
 *         sensorType:
 *           type: string
 *           enum: [ultrasonic, magnetic, camera, infrared]
 *           example: "ultrasonic"
 *         maxRange:
 *           type: number
 *           description: "Maximum detection range in cm"
 *           example: 400
 *         minRange:
 *           type: number
 *           description: "Minimum detection range in cm"
 *           example: 5
 *         occupiedThreshold:
 *           type: number
 *           description: "Distance threshold for occupied status in cm"
 *           example: 80
 *         vacantThreshold:
 *           type: number
 *           description: "Distance threshold for vacant status in cm"
 *           example: 120
 *         hysteresis:
 *           type: number
 *           description: "Hysteresis margin to prevent oscillation in cm"
 *           example: 10
 *         smoothingWindow:
 *           type: number
 *           description: "Number of readings to smooth over"
 *           example: 5
 *         validationThreshold:
 *           type: number
 *           description: "Minimum consecutive readings to confirm status change"
 *           example: 2
 *         calibrationOffset:
 *           type: number
 *           description: "Calibration offset in cm"
 *           example: 0
 *         errorThreshold:
 *           type: number
 *           description: "Maximum error readings before marking sensor as faulty"
 *           example: 5
 *     SensorHealth:
 *       type: object
 *       properties:
 *         score:
 *           type: number
 *           description: "Health score from 0-100"
 *           example: 85
 *         status:
 *           type: string
 *           enum: [excellent, good, poor, critical]
 *           example: "good"
 *         issues:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Low battery level"]
 */
/**
 * @swagger
 * /api/sensors/nodes/{nodeId}/config:
 *   get:
 *     summary: Get sensor configuration and statistics
 *     description: Retrieve the current ultrasonic sensor configuration and operational statistics for a specific node
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Node ID
 *     responses:
 *       200:
 *         description: Sensor configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     nodeId:
 *                       type: string
 *                     chirpstackDeviceId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     config:
 *                       $ref: '#/components/schemas/SensorConfig'
 *                     stats:
 *                       type: object
 *                       properties:
 *                         readingCount:
 *                           type: number
 *                         lastReading:
 *                           type: object
 *                         currentStatus:
 *                           type: string
 *                           enum: [occupied, vacant]
 *       404:
 *         description: Node not found
 */
router.get('/nodes/:nodeId/config', sensorController_1.getSensorConfig);
/**
 * @swagger
 * /api/sensors/nodes/{nodeId}/config:
 *   put:
 *     summary: Update sensor configuration
 *     description: Update the ultrasonic sensor configuration with dynamic range management and threshold settings
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Node ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxRange:
 *                 type: number
 *                 description: "Maximum detection range in cm (e.g., 400 for 4m sensor)"
 *                 example: 400
 *               minRange:
 *                 type: number
 *                 description: "Minimum detection range in cm"
 *                 example: 5
 *               occupiedThreshold:
 *                 type: number
 *                 description: "Distance below which slot is considered occupied (cm)"
 *                 example: 80
 *               vacantThreshold:
 *                 type: number
 *                 description: "Distance above which slot is considered vacant (cm)"
 *                 example: 120
 *               hysteresis:
 *                 type: number
 *                 description: "Margin to prevent rapid status changes (cm)"
 *                 example: 10
 *               smoothingWindow:
 *                 type: number
 *                 description: "Number of readings to average for noise reduction"
 *                 example: 5
 *               validationThreshold:
 *                 type: number
 *                 description: "Consecutive readings required to confirm status change"
 *                 example: 2
 *               calibrationOffset:
 *                 type: number
 *                 description: "Calibration offset in cm"
 *                 example: 0
 *               errorThreshold:
 *                 type: number
 *                 description: "Max consecutive errors before sensor fault"
 *                 example: 5
 *               sensorType:
 *                 type: string
 *                 enum: [ultrasonic, magnetic, camera, infrared]
 *                 example: "ultrasonic"
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       400:
 *         description: Invalid configuration parameters
 *       404:
 *         description: Node not found
 */
router.put('/nodes/:nodeId/config', sensorController_1.updateSensorConfig);
/**
 * @swagger
 * /api/sensors/nodes/{nodeId}/calibrate:
 *   post:
 *     summary: Calibrate ultrasonic sensor
 *     description: |
 *       Auto-calibrate the ultrasonic sensor using empty parking slot readings.
 *       This sets the appropriate thresholds based on actual parking slot dimensions.
 *
 *       **Calibration Process:**
 *       1. Ensure parking slot is completely empty
 *       2. Collect at least 5-10 distance readings
 *       3. System calculates optimal thresholds based on median empty distance
 *       4. Calibration offset is automatically applied
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Node ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emptySlotReadings
 *             properties:
 *               emptySlotReadings:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: "Array of distance readings (in cm) taken when parking slot is empty"
 *                 example: [180, 175, 182, 178, 179, 181, 176, 183, 177, 180]
 *                 minItems: 5
 *     responses:
 *       200:
 *         description: Sensor calibrated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     nodeId:
 *                       type: string
 *                     calibrationOffset:
 *                       type: number
 *                     readingsUsed:
 *                       type: number
 *                     medianEmptyDistance:
 *                       type: number
 *       400:
 *         description: Invalid calibration data
 *       404:
 *         description: Node not found
 */
router.post('/nodes/:nodeId/calibrate', sensorController_1.calibrateSensor);
/**
 * @swagger
 * /api/sensors/nodes/{nodeId}/test:
 *   post:
 *     summary: Test sensor with simulated data
 *     description: Test the ultrasonic sensor processing logic with simulated distance readings to verify threshold and range settings
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Node ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - distance
 *             properties:
 *               distance:
 *                 type: number
 *                 description: "Simulated distance reading in cm"
 *                 example: 85
 *               batteryLevel:
 *                 type: number
 *                 description: "Simulated battery level (0-100%)"
 *                 example: 75
 *               temperature:
 *                 type: number
 *                 description: "Simulated temperature in Celsius"
 *                 example: 25
 *               rssi:
 *                 type: number
 *                 description: "Simulated signal strength"
 *                 example: -65
 *     responses:
 *       200:
 *         description: Sensor test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     result:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [occupied, vacant, null]
 *                         distance:
 *                           type: number
 *                         smoothedDistance:
 *                           type: number
 *                         confidence:
 *                           type: number
 *       404:
 *         description: Node not found
 */
router.post('/nodes/:nodeId/test', sensorController_1.testSensor);
/**
 * @swagger
 * /api/sensors/nodes/{nodeId}/reset:
 *   post:
 *     summary: Reset sensor data and configuration
 *     description: Clear sensor reading history and optionally reset configuration to defaults
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Node ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resetConfig:
 *                 type: boolean
 *                 description: "Also reset configuration to defaults"
 *                 default: false
 *     responses:
 *       200:
 *         description: Sensor reset successfully
 *       404:
 *         description: Node not found
 */
router.post('/nodes/:nodeId/reset', sensorController_1.resetSensor);
/**
 * @swagger
 * /api/sensors/nodes/{nodeId}/health:
 *   get:
 *     summary: Get sensor health information
 *     description: Retrieve comprehensive health information including sensor status, battery level, reading frequency, and health score
 *     tags: [Sensors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Node ID
 *     responses:
 *       200:
 *         description: Sensor health information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     nodeId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     health:
 *                       $ref: '#/components/schemas/SensorHealth'
 *                     stats:
 *                       type: object
 *                       properties:
 *                         isOnline:
 *                           type: boolean
 *                         lastSeen:
 *                           type: string
 *                           format: date-time
 *                         batteryLevel:
 *                           type: number
 *                         readingCount:
 *                           type: number
 *                         currentStatus:
 *                           type: string
 *       404:
 *         description: Node not found
 */
router.get('/nodes/:nodeId/health', sensorController_1.getSensorHealth);
exports.default = router;
