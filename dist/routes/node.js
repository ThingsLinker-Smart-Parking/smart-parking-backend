"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const nodeController_1 = require("../controllers/nodeController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../validation");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/nodes/all:
 *   get:
 *     summary: Get all nodes across all parking lots (Super Admin only)
 *     description: Returns all nodes in the system with their relationships (Super Admin access required)
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All nodes retrieved successfully
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
 *                   example: "All nodes retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Node'
 *                 count:
 *                   type: integer
 *                   example: 150
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied - Super Admin only
 */
router.get('/all', auth_1.authenticateToken, (0, auth_1.requireRole)(['super_admin']), nodeController_1.getNodes);
/**
 * @swagger
 * /api/nodes:
 *   get:
 *     summary: Get all nodes for the authenticated admin with pagination and filtering
 *     description: Returns nodes owned by the current admin with their parking slot relationships, real-time status, pagination support, and optional filtering by slot ID
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *         example: 20
 *       - in: query
 *         name: slotId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter nodes by specific parking slot ID
 *         example: "2e9f8379-cecc-468d-b290-51208d7faf04"
 *     responses:
 *       200:
 *         description: List of nodes with status information and pagination metadata
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *                     totalItems:
 *                       type: integer
 *                       example: 50
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 20
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPrevPage:
 *                       type: boolean
 *                       example: false
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
    .get(auth_1.authenticateToken, nodeController_1.getNodes)
    .post(auth_1.authenticateToken, (0, validation_1.validateBody)(validation_1.nodeSchemas.create), nodeController_1.createNode);
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
 *           format: uuid
 *         description: UUID of the node to retrieve
 *     responses:
 *       200:
 *         description: Node details with current status
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
 *                   example: 'Node retrieved successfully'
 *                 data:
 *                   $ref: '#/components/schemas/Node'
 *       404:
 *         description: Node not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *   put:
 *     summary: Update a node
 *     description: Update node information including name, description, ChirpStack Device ID, location, and parking slot assignment
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: nodeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the node to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: 'Updated Parking Sensor A-001'
 *                 description: 'Name of the node'
 *               chirpstackDeviceId:
 *                 type: string
 *                 example: '0123456789ABCDEF'
 *                 pattern: '^[0-9a-fA-F]{16}$'
 *                 description: '16-character hexadecimal ChirpStack device ID'
 *               description:
 *                 type: string
 *                 example: 'Updated ultrasonic sensor for parking slot A-001'
 *                 description: 'Description of the node'
 *               parkingSlotId:
 *                 type: string
 *                 format: uuid
 *                 example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 *                 description: 'UUID of the parking slot to assign this node to'
 *               latitude:
 *                 type: number
 *                 format: decimal
 *                 example: 40.7128
 *                 description: 'GPS latitude coordinate'
 *               longitude:
 *                 type: number
 *                 format: decimal
 *                 example: -74.0060
 *                 description: 'GPS longitude coordinate'
 *             description: 'All fields are optional. Only provided fields will be updated.'
 *     responses:
 *       200:
 *         description: Node updated successfully
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
 *                   example: 'Node updated successfully'
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     chirpstackDeviceId:
 *                       type: string
 *                     description:
 *                       type: string
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     status:
 *                       type: string
 *                     parkingSlot:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error or ChirpStack Device ID already exists
 *       404:
 *         description: Node or parking slot not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
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
 *           format: uuid
 *         description: UUID of the node to delete
 *     responses:
 *       200:
 *         description: Node deleted successfully
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
 *                   example: 'Node deleted successfully'
 *       404:
 *         description: Node not found
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.route('/:nodeId')
    .get(auth_1.authenticateToken, nodeController_1.getNode)
    .put(auth_1.authenticateToken, (0, validation_1.validateBody)(validation_1.nodeSchemas.update), nodeController_1.updateNode)
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
router.put('/:nodeId/status', auth_1.authenticateToken, (0, validation_1.validateBody)(validation_1.nodeSchemas.updateStatus), nodeController_1.updateNodeStatus);
/**
 * @swagger
 * /api/nodes/unassigned:
 *   get:
 *     summary: Get unassigned nodes
 *     description: Get all nodes that are not assigned to any parking slot. Supports pagination and optional gateway filtering.
 *     tags: [Nodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of items per page
 *         example: 50
 *       - in: query
 *         name: gatewayId
 *         required: false
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific gateway ID
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Unassigned nodes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       chirpstackDeviceId:
 *                         type: string
 *                       status:
 *                         type: string
 *                         example: 'unassigned'
 *                       batteryLevel:
 *                         type: number
 *                         nullable: true
 *                       gatewayId:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   example: 45
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/unassigned', auth_1.authenticateToken, nodeController_1.getUnassignedNodes);
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
router.post('/by-slots', auth_1.authenticateToken, nodeController_1.getNodesBySlots);
exports.default = router;
