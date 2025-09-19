"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const parkingLotController_1 = require("../controllers/parkingLotController");
const auth_1 = require("../middleware/auth");
const subscriptionAuth_1 = require("../middleware/subscriptionAuth");
const router = (0, express_1.Router)();
// All routes require authentication and admin role
router.use(auth_1.authenticateToken);
/**
 * @swagger
 * components:
 *   schemas:
 *     ParkingLot:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * /api/parking-lots:
 *   get:
 *     summary: Get all parking lots for the authenticated admin
 *     tags: [Parking Lots]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Parking lots retrieved successfully
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ParkingLot'
 *                 count:
 *                   type: integer
 */
router.get('/', subscriptionAuth_1.requireActiveSubscription, parkingLotController_1.getMyParkingLots);
/**
 * @swagger
 * /api/parking-lots/{id}:
 *   get:
 *     summary: Get parking lot by ID
 *     tags: [Parking Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parking lot ID
 *     responses:
 *       200:
 *         description: Parking lot retrieved successfully
 *       404:
 *         description: Parking lot not found
 */
router.get('/:id', subscriptionAuth_1.requireActiveSubscription, parkingLotController_1.getParkingLotById);
/**
 * @swagger
 * /api/parking-lots:
 *   post:
 *     summary: Create a new parking lot
 *     tags: [Parking Lots]
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
 *               - address
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Main Building Parking"
 *               address:
 *                 type: string
 *                 example: "123 Main Street, City"
 *     responses:
 *       201:
 *         description: Parking lot created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', (0, auth_1.requireRole)(['admin']), subscriptionAuth_1.requireActiveSubscription, (0, subscriptionAuth_1.checkFeatureLimit)('parkingLots'), parkingLotController_1.createParkingLot);
/**
 * @swagger
 * /api/parking-lots/{id}:
 *   put:
 *     summary: Update parking lot
 *     tags: [Parking Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parking lot ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Parking lot updated successfully
 *       404:
 *         description: Parking lot not found
 */
router.put('/:id', (0, auth_1.requireRole)(['admin']), subscriptionAuth_1.requireActiveSubscription, parkingLotController_1.updateParkingLot);
/**
 * @swagger
 * /api/parking-lots/{id}:
 *   delete:
 *     summary: Delete parking lot
 *     tags: [Parking Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parking lot ID
 *     responses:
 *       200:
 *         description: Parking lot deleted successfully
 *       400:
 *         description: Cannot delete parking lot with existing floors/gateways
 *       404:
 *         description: Parking lot not found
 */
router.delete('/:id', (0, auth_1.requireRole)(['admin']), subscriptionAuth_1.requireActiveSubscription, parkingLotController_1.deleteParkingLot);
/**
 * @swagger
 * /api/parking-lots/{id}/assign-gateway:
 *   post:
 *     summary: Assign gateway to parking lot
 *     tags: [Parking Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parking lot ID
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
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Gateway assigned successfully
 *       404:
 *         description: Parking lot or gateway not found
 */
router.post('/:id/assign-gateway', (0, auth_1.requireRole)(['admin']), subscriptionAuth_1.requireActiveSubscription, parkingLotController_1.assignGatewayToParkingLot);
/**
 * @swagger
 * /api/parking-lots/{id}/unassign-gateway/{gatewayId}:
 *   post:
 *     summary: Unassign gateway from parking lot
 *     tags: [Parking Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parking lot ID
 *       - in: path
 *         name: gatewayId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Gateway ID
 *     responses:
 *       200:
 *         description: Gateway unassigned successfully
 *       404:
 *         description: Parking lot or gateway not found
 */
router.post('/:id/unassign-gateway/:gatewayId', (0, auth_1.requireRole)(['admin']), subscriptionAuth_1.requireActiveSubscription, parkingLotController_1.unassignGatewayFromParkingLot);
exports.default = router;
