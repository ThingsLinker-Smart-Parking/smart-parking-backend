"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const parkingSlotController_1 = require("../controllers/parkingSlotController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication and admin role
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']));
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
router.get('/floor/:floorId', parkingSlotController_1.getParkingSlotsByFloor);
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
router.get('/:id', parkingSlotController_1.getParkingSlotById);
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
router.post('/floor/:floorId', parkingSlotController_1.createParkingSlot);
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
router.post('/floor/:floorId/bulk', parkingSlotController_1.bulkCreateParkingSlots);
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
router.put('/:id', parkingSlotController_1.updateParkingSlot);
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
router.delete('/:id', parkingSlotController_1.deleteParkingSlot);
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
router.post('/:id/assign-node', parkingSlotController_1.assignNodeToParkingSlot);
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
router.post('/:id/unassign-node', parkingSlotController_1.unassignNodeFromParkingSlot);
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
router.get('/:id/status', parkingSlotController_1.getParkingSlotStatus);
exports.default = router;
