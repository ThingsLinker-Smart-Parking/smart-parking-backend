import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
    getParkingOverview,
    getSlotDetails,
    updateNodeData,
    getDashboardStats,
    handleChirpStackWebhook
} from '../controllers/parkingController';

const router = Router();

// All parking routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/parking/overview:
 *   get:
 *     summary: Get comprehensive parking overview
 *     description: Retrieve all parking lots, floors, slots, and nodes with real-time status for the authenticated admin
 *     tags: [Parking Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Parking overview retrieved successfully
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
 *                     parkingLots:
 *                       type: array
 *                       items:
 *                         type: object
 *                     statistics:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/overview', getParkingOverview);

/**
 * @swagger
 * /api/parking/slots/{slotId}/details:
 *   get:
 *     summary: Get detailed slot information
 *     description: Retrieve detailed information about a specific parking slot including historical data
 *     tags: [Parking Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Parking slot ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of historical records to retrieve
 *     responses:
 *       200:
 *         description: Slot details retrieved successfully
 *       400:
 *         description: Invalid slot ID
 *       404:
 *         description: Slot not found
 *       500:
 *         description: Internal server error
 */
router.get('/slots/:slotId/details', getSlotDetails);

/**
 * @swagger
 * /api/parking/nodes/{nodeId}/update:
 *   put:
 *     summary: Update node data manually
 *     description: Manually update sensor node data for testing or maintenance purposes
 *     tags: [Parking Management]
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
 *               distance:
 *                 type: number
 *                 description: Distance in centimeters
 *               percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Occupancy percentage
 *               batteryLevel:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Battery level percentage
 *               state:
 *                 type: string
 *                 enum: [FREE, OCCUPIED]
 *                 description: Sensor state
 *     responses:
 *       200:
 *         description: Node data updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Node not found
 *       500:
 *         description: Internal server error
 */
router.put('/nodes/:nodeId/update', updateNodeData);

/**
 * @swagger
 * /api/parking/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     description: Retrieve real-time statistics for the parking management dashboard
 *     tags: [Parking Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
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
 *                     statistics:
 *                       type: object
 *                     recentActivity:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/dashboard/stats', getDashboardStats);

/**
 * @swagger
 * /api/parking/chirpstack/webhook:
 *   post:
 *     summary: ChirpStack webhook endpoint
 *     description: Receive ChirpStack uplink data via webhook (backup to MQTT)
 *     tags: [Parking Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: ChirpStack uplink data
 *     responses:
 *       200:
 *         description: Webhook data processed successfully
 *       500:
 *         description: Internal server error
 */
router.post('/chirpstack/webhook', handleChirpStackWebhook);

export default router;