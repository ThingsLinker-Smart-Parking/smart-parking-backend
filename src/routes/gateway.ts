import { Router } from 'express';
import {
    // Super Admin routes
    createGateway,
    getAllGateways,
    getGatewayById,
    updateGateway,
    deleteGateway,

    // Admin routes
    getAvailableGateways,
    linkGateway,
    unlinkGateway,
    getLinkedGateways,
    createNode,
    getGatewayNodes,
    getGatewayStatistics,

    // Webhook routes
    updateNodeStatus,
    updateGatewayStatus
} from '../controllers/gatewayController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Webhook routes (no authentication required)
/**
 * @swagger
 * /api/gateways/webhook/node-status:
 *   post:
 *     summary: Update node status via ChirpStack webhook
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *             properties:
 *               deviceId:
 *                 type: string
 *                 example: "sensor_001"
 *               metadata:
 *                 type: object
 *                 example: { "batteryLevel": 85, "rssi": -72 }
 *     responses:
 *       200:
 *         description: Node status updated successfully
 *       404:
 *         description: Node not found
 */
router.post('/webhook/node-status', updateNodeStatus);

/**
 * @swagger
 * /api/gateways/webhook/gateway-status:
 *   post:
 *     summary: Update gateway status via ChirpStack webhook
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gatewayId
 *             properties:
 *               gatewayId:
 *                 type: string
 *                 example: "gw_001"
 *               metadata:
 *                 type: object
 *                 example: { "temperature": 42, "uptime": 86400 }
 *     responses:
 *       200:
 *         description: Gateway status updated successfully
 *       404:
 *         description: Gateway not found
 */
router.post('/webhook/gateway-status', updateGatewayStatus);

// Specific routes (must come before parameterized routes)

// Admin routes
/**
 * @swagger
 * /api/gateways/available:
 *   get:
 *     summary: Get available gateways for linking (Admin only)
 *     tags: [Gateways - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Available gateways retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/available', authenticateToken, requireRole(['admin']), getAvailableGateways);

/**
 * @swagger
 * /api/gateways/my-gateways:
 *   get:
 *     summary: Get admin's linked gateways (Admin only)
 *     tags: [Gateways - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Linked gateways retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/my-gateways', authenticateToken, requireRole(['admin']), getLinkedGateways);

/**
 * @swagger
 * /api/gateways/link:
 *   post:
 *     summary: Link gateway to admin account (Admin only)
 *     tags: [Gateways - Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gatewayId
 *             properties:
 *               gatewayId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Gateway linked successfully
 *       400:
 *         description: Gateway already linked or invalid ID
 *       403:
 *         description: Access denied
 */
router.post('/link', authenticateToken, requireRole(['admin']), linkGateway);

/**
 * @swagger
 * /api/gateways/nodes:
 *   post:
 *     summary: Create node under gateway (Admin only)
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gatewayId
 *               - chirpstackDeviceId
 *               - name
 *             properties:
 *               gatewayId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               chirpstackDeviceId:
 *                 type: string
 *                 example: "sensor_001"
 *               name:
 *                 type: string
 *                 example: "Parking Slot A1 Sensor"
 *               description:
 *                 type: string
 *                 example: "Ultrasonic sensor for slot A1"
 *               latitude:
 *                 type: number
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 example: -74.0060
 *               metadata:
 *                 type: object
 *                 example: { "sensorType": "ultrasonic", "range": "4m" }
 *     responses:
 *       201:
 *         description: Node created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post('/nodes', authenticateToken, requireRole(['admin']), createNode);

/**
 * @swagger
 * /api/gateways/statistics:
 *   get:
 *     summary: Get gateway and node statistics
 *     tags: [Gateways]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gatewayId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Specific gateway ID to get statistics for
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/statistics', authenticateToken, requireRole(['admin', 'super_admin']), getGatewayStatistics);

// Super Admin routes
/**
 * @swagger
 * /api/gateways:
 *   post:
 *     summary: Create a new gateway (Super Admin only)
 *     tags: [Gateways - Super Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chirpstackGatewayId
 *               - name
 *             properties:
 *               chirpstackGatewayId:
 *                 type: string
 *                 example: "gw_001"
 *               name:
 *                 type: string
 *                 example: "Main Building Gateway"
 *               description:
 *                 type: string
 *                 example: "Primary gateway for main building parking"
 *               location:
 *                 type: string
 *                 example: "Building A, Floor 1"
 *               latitude:
 *                 type: number
 *                 example: 40.7128
 *               longitude:
 *                 type: number
 *                 example: -74.0060
 *               metadata:
 *                 type: object
 *                 example: { "model": "RAK7249", "version": "1.0.3" }
 *     responses:
 *       201:
 *         description: Gateway created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post('/', authenticateToken, requireRole(['super_admin']), createGateway);

/**
 * @swagger
 * /api/gateways:
 *   get:
 *     summary: Get all gateways (Super Admin only)
 *     tags: [Gateways - Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *           default: 'false'
 *         description: Include inactive gateways
 *     responses:
 *       200:
 *         description: Gateways retrieved successfully
 *       403:
 *         description: Access denied
 */
router.get('/', authenticateToken, requireRole(['super_admin', 'admin']), getAllGateways);

/**
 * @swagger
 * /api/gateways/{id}:
 *   get:
 *     summary: Get gateway by ID with nodes (Super Admin only)
 *     tags: [Gateways - Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Gateway ID
 *     responses:
 *       200:
 *         description: Gateway retrieved successfully
 *       404:
 *         description: Gateway not found
 *       403:
 *         description: Access denied
 */
router.get('/:id', authenticateToken, requireRole(['super_admin']), getGatewayById);

/**
 * @swagger
 * /api/gateways/{id}:
 *   put:
 *     summary: Update gateway (Super Admin only)
 *     tags: [Gateways - Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Gateway ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Gateway Name"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *               location:
 *                 type: string
 *                 example: "Building B, Floor 2"
 *               latitude:
 *                 type: number
 *                 example: 40.7589
 *               longitude:
 *                 type: number
 *                 example: -73.9851
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               metadata:
 *                 type: object
 *                 example: { "firmware": "2.1.0" }
 *     responses:
 *       200:
 *         description: Gateway updated successfully
 *       404:
 *         description: Gateway not found
 *       403:
 *         description: Access denied
 */
router.put('/:id', authenticateToken, requireRole(['super_admin']), updateGateway);

/**
 * @swagger
 * /api/gateways/{id}:
 *   delete:
 *     summary: Delete gateway (Super Admin only)
 *     tags: [Gateways - Super Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Gateway ID
 *     responses:
 *       200:
 *         description: Gateway deleted successfully
 *       404:
 *         description: Gateway not found
 *       403:
 *         description: Access denied
 */
router.delete('/:id', authenticateToken, requireRole(['super_admin']), deleteGateway);

// Parameterized routes

/**
 * @swagger
 * /api/gateways/{id}/unlink:
 *   post:
 *     summary: Unlink gateway from admin account (Admin only)
 *     tags: [Gateways - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Gateway ID
 *     responses:
 *       200:
 *         description: Gateway unlinked successfully
 *       404:
 *         description: Gateway not found or not linked to this admin
 *       403:
 *         description: Access denied
 */
router.post('/:id/unlink', authenticateToken, requireRole(['admin']), unlinkGateway);


/**
 * @swagger
 * /api/gateways/{id}/nodes:
 *   get:
 *     summary: Get nodes for a gateway
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Gateway ID
 *     responses:
 *       200:
 *         description: Gateway nodes retrieved successfully
 *       404:
 *         description: Gateway not found
 *       403:
 *         description: Access denied
 */
router.get('/:id/nodes', authenticateToken, requireRole(['admin', 'super_admin']), getGatewayNodes);

export default router;