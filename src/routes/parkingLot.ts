import { Router } from 'express';
import {
    getMyParkingLots,
    getParkingLotById,
    createParkingLot,
    updateParkingLot,
    deleteParkingLot,
    assignGatewayToParkingLot,
    unassignGatewayFromParkingLot,
    getGatewaysByParkingLotId
} from '../controllers/parkingLotController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { requireActiveSubscription, checkFeatureLimit } from '../middleware/subscriptionAuth';

const router = Router();

// All routes require authentication and admin role
router.use(authenticateToken);

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
router.get('/', requireActiveSubscription, getMyParkingLots);

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
router.get('/:id', requireActiveSubscription, getParkingLotById);

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
router.post('/', requireRole(['admin']), requireActiveSubscription, checkFeatureLimit('parkingLots'), createParkingLot);

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
router.put('/:id', requireRole(['admin']), requireActiveSubscription, updateParkingLot);

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
router.delete('/:id', requireRole(['admin']), requireActiveSubscription, deleteParkingLot);

/**
 * @swagger
 * /api/parking-lots/{id}/assign-gateway:
 *   post:
 *     summary: Assign a gateway to a parking lot
 *     description: Associates a LoRa gateway with a specific parking lot. The gateway must be owned by the requesting admin and not already assigned to another parking lot.
 *     tags: [Parking Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the parking lot to assign the gateway to
 *         example: "802fb473-b5cd-4f3d-afce-8fd6eb3976fb"
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
 *                 description: UUID of the gateway to assign to the parking lot
 *                 example: "83bf23cc-1944-402c-8563-a6df50d1d936"
 *     responses:
 *       200:
 *         description: Gateway assigned to parking lot successfully
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
 *                   example: "Gateway assigned to parking lot successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     parkingLot:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         address:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                     gateway:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         description:
 *                           type: string
 *                         isOnline:
 *                           type: boolean
 *                         lastSeen:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error or gateway already assigned
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
 *                     validation_error:
 *                       value: "Gateway ID is required"
 *                     already_assigned:
 *                       value: "Gateway is already assigned to another parking lot"
 *                     invalid_uuid:
 *                       value: "Invalid UUID format for id parameter"
 *       404:
 *         description: Parking lot or gateway not found or access denied
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
 *                     parking_lot_not_found:
 *                       value: "Parking lot not found or access denied"
 *                     gateway_not_found:
 *                       value: "Gateway not found or not linked to your account"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
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
 *                   example: "Failed to assign gateway to parking lot"
 */
router.post('/:id/assign-gateway', requireRole(['admin']), requireActiveSubscription, assignGatewayToParkingLot);

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
router.post('/:id/unassign-gateway/:gatewayId', requireRole(['admin']), requireActiveSubscription, unassignGatewayFromParkingLot);

/**
 * @swagger
 * /api/parking-lots/{id}/gateways:
 *   get:
 *     summary: Get all gateways assigned to a parking lot
 *     description: Retrieves all gateways that are currently assigned to the specified parking lot. Only returns gateways owned by the authenticated admin.
 *     tags: [Parking Lots]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the parking lot to get gateways for
 *         example: "ccb073eb-1fc2-486e-b03b-3d2b54b92454"
 *     responses:
 *       200:
 *         description: Gateways retrieved successfully
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
 *                   example: "Found 2 gateways for parking lot"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "83bf23cc-1944-402c-8563-a6df50d1d936"
 *                       name:
 *                         type: string
 *                         example: "Main Gateway A1"
 *                       chirpstackGatewayId:
 *                         type: string
 *                         example: "gw_001"
 *                       description:
 *                         type: string
 *                         example: "Primary gateway for building A"
 *                       location:
 *                         type: string
 *                         example: "Building A, Floor 1"
 *                       latitude:
 *                         type: number
 *                         example: 40.7128
 *                       longitude:
 *                         type: number
 *                         example: -74.0060
 *                       isOnline:
 *                         type: boolean
 *                         example: true
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       lastSeen:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-09-23T07:30:00.000Z"
 *                       metadata:
 *                         type: object
 *                         example: {"model": "RAK7249", "firmware": "1.2.3"}
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 parkingLot:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                       example: "Main Building Parking"
 *                     address:
 *                       type: string
 *                       example: "123 Main Street, City"
 *       400:
 *         description: Invalid UUID format
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
 *                   example: "Invalid UUID format for id parameter"
 *       404:
 *         description: Parking lot not found or access denied
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
 *                   example: "Parking lot not found or access denied"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Internal server error
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
 *                   example: "Failed to retrieve gateways for parking lot"
 */
router.get('/:id/gateways', requireRole(['admin']), requireActiveSubscription, getGatewaysByParkingLotId);

export default router;