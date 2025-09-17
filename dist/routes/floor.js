"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const floorController_1 = require("../controllers/floorController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require authentication and admin role
router.use(auth_1.authenticateToken, (0, auth_1.requireRole)(['admin']));
/**
 * @swagger
 * components:
 *   schemas:
 *     Floor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         name:
 *           type: string
 *         level:
 *           type: integer
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /api/floors/parking-lot/{parkingLotId}:
 *   get:
 *     summary: Get all floors for a parking lot
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Parking lot ID
 *     responses:
 *       200:
 *         description: Floors retrieved successfully
 *       404:
 *         description: Parking lot not found
 */
router.get('/parking-lot/:parkingLotId', floorController_1.getFloorsByParkingLot);
/**
 * @swagger
 * /api/floors/{id}:
 *   get:
 *     summary: Get floor by ID
 *     tags: [Floors]
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
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Floor retrieved successfully
 *       404:
 *         description: Floor not found
 */
router.get('/:id', floorController_1.getFloorById);
/**
 * @swagger
 * /api/floors/parking-lot/{parkingLotId}:
 *   post:
 *     summary: Create a new floor
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: parkingLotId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         description: Parking lot ID
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
 *                 example: "Ground Floor"
 *               level:
 *                 type: integer
 *                 example: 0
 *     responses:
 *       201:
 *         description: Floor created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Parking lot not found
 */
router.post('/parking-lot/:parkingLotId', floorController_1.createFloor);
/**
 * @swagger
 * /api/floors/{id}:
 *   put:
 *     summary: Update floor
 *     tags: [Floors]
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
 *         description: Floor ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               level:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Floor updated successfully
 *       404:
 *         description: Floor not found
 */
router.put('/:id', floorController_1.updateFloor);
/**
 * @swagger
 * /api/floors/{id}:
 *   delete:
 *     summary: Delete floor
 *     tags: [Floors]
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
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Floor deleted successfully
 *       400:
 *         description: Cannot delete floor with existing parking slots
 *       404:
 *         description: Floor not found
 */
router.delete('/:id', floorController_1.deleteFloor);
/**
 * @swagger
 * /api/floors/{id}/statistics:
 *   get:
 *     summary: Get floor statistics
 *     tags: [Floors]
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
 *         description: Floor ID
 *     responses:
 *       200:
 *         description: Floor statistics retrieved successfully
 *       404:
 *         description: Floor not found
 */
router.get('/:id/statistics', floorController_1.getFloorStatistics);
exports.default = router;
