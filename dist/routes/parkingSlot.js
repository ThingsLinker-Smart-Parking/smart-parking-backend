"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const parkingSlotController_1 = require("../controllers/parkingSlotController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/parking-slots:
 *   get:
 *     summary: Get all parking slots for current admin
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All parking slots retrieved successfully
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
 *                   example: "All parking slots retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ParkingSlot'
 *                 count:
 *                   type: integer
 *                   example: 50
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/', auth_1.optionallyAuthenticateToken, parkingSlotController_1.getAllParkingSlots);
/**
 * @swagger
 * components:
 *   schemas:
 *     ParkingSlot:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         name:
 *           type: string
 *         isReservable:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /api/parking-slots/floor/{floorId}:
 *   get:
 *     summary: Get all parking slots for a floor
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Parking slots retrieved successfully
 *       404:
 *         description: Floor not found
 */
router.get('/floor/:floorId', auth_1.optionallyAuthenticateToken, parkingSlotController_1.getParkingSlotsByFloor);
/**
 * @swagger
 * /api/parking-slots/{id}:
 *   get:
 *     summary: Get parking slot by ID
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Parking slot ID
 *     responses:
 *       200:
 *         description: Parking slot retrieved successfully
 *       404:
 *         description: Parking slot not found
 */
router.get('/:id', auth_1.optionallyAuthenticateToken, parkingSlotController_1.getParkingSlotById);
/**
 * @swagger
 * /api/parking-slots/floor/{floorId}:
 *   post:
 *     summary: Create a new parking slot
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Floor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "A-001"
 *               isReservable:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Parking slot created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Floor not found
 */
router.post('/floor/:floorId', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), parkingSlotController_1.createParkingSlot);
/**
 * @swagger
 * /api/parking-slots/floor/{floorId}/bulk:
 *   post:
 *     summary: Create multiple parking slots
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: floorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Floor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slots
 *             properties:
 *               slots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "A-001"
 *                     isReservable:
 *                       type: boolean
 *                       example: false
 *     responses:
 *       201:
 *         description: Parking slots created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Floor not found
 */
router.post('/floor/:floorId/bulk', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), parkingSlotController_1.bulkCreateParkingSlots);
/**
 * @swagger
 * /api/parking-slots/{id}:
 *   put:
 *     summary: Update parking slot
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Parking slot ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isReservable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Parking slot updated successfully
 *       404:
 *         description: Parking slot not found
 */
router.put('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), parkingSlotController_1.updateParkingSlot);
/**
 * @swagger
 * /api/parking-slots/{id}:
 *   delete:
 *     summary: Delete parking slot
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Parking slot ID
 *     responses:
 *       200:
 *         description: Parking slot deleted successfully
 *       400:
 *         description: Cannot delete parking slot with assigned node
 *       404:
 *         description: Parking slot not found
 */
router.delete('/:id', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), parkingSlotController_1.deleteParkingSlot);
/**
 * @swagger
 * /api/parking-slots/{id}/assign-node:
 *   post:
 *     summary: Assign node to parking slot
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Parking slot ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nodeId
 *             properties:
 *               nodeId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: Node assigned successfully
 *       404:
 *         description: Parking slot or node not found
 */
router.post('/:id/assign-node', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), parkingSlotController_1.assignNodeToParkingSlot);
/**
 * @swagger
 * /api/parking-slots/{id}/unassign-node:
 *   post:
 *     summary: Unassign node from parking slot
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Parking slot ID
 *     responses:
 *       200:
 *         description: Node unassigned successfully
 *       404:
 *         description: Parking slot not found
 */
router.post('/:id/unassign-node', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), parkingSlotController_1.unassignNodeFromParkingSlot);
/**
 * @swagger
 * /api/parking-slots/{id}/status:
 *   get:
 *     summary: Get parking slot status and history
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Parking slot ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent status logs to return
 *     responses:
 *       200:
 *         description: Parking slot status retrieved successfully
 *       404:
 *         description: Parking slot not found
 */
router.get('/:id/status', auth_1.optionallyAuthenticateToken, parkingSlotController_1.getParkingSlotStatus);
/**
 * @swagger
 * /api/parking-slots/quick-assign:
 *   post:
 *     summary: Quick assign node to parking slot using ChirpStack Device ID
 *     description: Assign a node to a parking slot using the ChirpStack Device ID from QR code scanning. Critical for mobile app workflow.
 *     tags: [Parking Slots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slotId
 *               - chirpstackDeviceId
 *             properties:
 *               slotId:
 *                 type: string
 *                 format: uuid
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 description: UUID of parking slot (from QR code)
 *               chirpstackDeviceId:
 *                 type: string
 *                 example: "0123456789ABCDEF"
 *                 description: ChirpStack Device ID (16-character hex string)
 *     responses:
 *       200:
 *         description: Node assigned successfully
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
 *                   example: "Node assigned to slot A-001"
 *                 data:
 *                   type: object
 *                   properties:
 *                     slot:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         node:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             name:
 *                               type: string
 *                             chirpstackDeviceId:
 *                               type: string
 *       400:
 *         description: Validation error or node/slot already assigned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   examples:
 *                     nodeAlreadyAssigned:
 *                       value: "Node already assigned to slot X"
 *                     slotAlreadyHasNode:
 *                       value: "Slot already has node Y"
 *       404:
 *         description: Slot or node not found
 *       401:
 *         description: Unauthorized
 */
router.post('/quick-assign', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']), parkingSlotController_1.quickAssignNode);
exports.default = router;
