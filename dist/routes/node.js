"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nodeController_1 = require("../controllers/nodeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/nodes:
 *   get:
 *     summary: Get all nodes
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of nodes with status information
 *   post:
 *     summary: Create a new node
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
 *               - name
 *               - chirpstackDeviceId
 *               - gatewayId
 *               - parkingSlotId
 *             properties:
 *               name:
 *                 type: string
 *               chirpstackDeviceId:
 *                 type: string
 *               description:
 *                 type: string
 *               gatewayId:
 *                 type: string
 *               parkingSlotId:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       201:
 *         description: Node created successfully
 */
router.route('/')
    .get(auth_1.authenticateToken, nodeController_1.getNodes)
    .post(auth_1.authenticateToken, nodeController_1.createNode);
/**
 * @swagger
 * /api/nodes/{nodeId}:
 *   get:
 *     summary: Get a specific node
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Node details with current status
 *   delete:
 *     summary: Delete a node
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Node deleted successfully
 */
router.route('/:nodeId')
    .get(auth_1.authenticateToken, nodeController_1.getNode)
    .delete(auth_1.authenticateToken, nodeController_1.deleteNode);
/**
 * @swagger
 * /api/nodes/{nodeId}/status:
 *   put:
 *     summary: Update node status (Simple percentage-based logic)
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               distance:
 *                 type: number
 *                 description: Distance reading from sensor
 *               percentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Occupancy percentage (80-100% = available, <60% = reserved)
 *               batteryLevel:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Battery level percentage
 *     responses:
 *       200:
 *         description: Node status updated successfully
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
 *                     distance:
 *                       type: number
 *                     percentage:
 *                       type: number
 *                     batteryLevel:
 *                       type: number
 *                     slotStatus:
 *                       type: string
 *                       enum: [available, reserved, null]
 *                     lastSeen:
 *                       type: string
 *                       format: date-time
 */
router.put('/:nodeId/status', auth_1.authenticateToken, nodeController_1.updateNodeStatus);
exports.default = router;
