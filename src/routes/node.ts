import { Router } from 'express';
import {
    getNodes,
    getNode,
    createNode,
    updateNodeStatus,
    deleteNode,
    getNodesBySlots
} from '../controllers/nodeController';
import { authenticateToken as auth } from '../middleware/auth';
import { validateBody, nodeSchemas } from '../validation';

const router = Router();

/**
 * @swagger
 * /api/nodes:
 *   get:
 *     summary: Get all nodes for the authenticated admin
 *     description: Returns all nodes owned by the current admin with their parking slot relationships and real-time status
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of nodes with status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Nodes retrieved successfully'
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Node'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *             $ref: '#/components/schemas/NodeCreateRequest'
 *     responses:
 *       201:
 *         description: Node created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Node created successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Node'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Parking slot not found
 *       409:
 *         description: ChirpStack Device ID already exists
 */
router.route('/')
    .get(auth, getNodes)
    .post(auth, validateBody(nodeSchemas.create), createNode);

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
    .get(auth, getNode)
    .delete(auth, deleteNode);

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
 *             $ref: '#/components/schemas/NodeUpdateStatusRequest'
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
router.put('/:nodeId/status', auth, validateBody(nodeSchemas.updateStatus), updateNodeStatus);

/**
 * @swagger
 * /api/nodes/by-slots:
 *   post:
 *     summary: Get nodes by parking slot IDs
 *     description: Retrieve nodes associated with specific parking slot IDs. Useful for getting sensor data for multiple slots at once.
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
 *               - slotIds
 *             properties:
 *               slotIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["a1b2c3d4-e5f6-7890-abcd-ef1234567890", "b2c3d4e5-f6g7-8901-bcde-f23456789012"]
 *                 description: Array of parking slot UUIDs to get nodes for
 *     responses:
 *       200:
 *         description: Nodes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 'Found 3 nodes for 5 parking slots'
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Node'
 *                 count:
 *                   type: integer
 *                   example: 3
 *       400:
 *         description: Invalid request - slotIds array required
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/by-slots', auth, getNodesBySlots);

export default router;