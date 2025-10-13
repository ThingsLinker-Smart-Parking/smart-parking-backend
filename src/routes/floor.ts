import { Router } from 'express';
import {
    getFloorsByParkingLot,
    getFloorById,
    createFloor,
    updateFloor,
    deleteFloor,
    getFloorStatistics,
    getAllFloors
} from '../controllers/floorController';
import { authenticateToken, optionallyAuthenticateToken, requireRole } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/floors/all:
 *   get:
 *     summary: Get all floors across all parking lots (Super Admin only)
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All floors retrieved successfully
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
 *                   example: "All floors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Floor'
 *                 count:
 *                   type: integer
 *                   example: 15
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Super Admin only
 */
router.get('/all', authenticateToken, requireRole(['super_admin']), getAllFloors);

/**
 * @swagger
 * /api/floors:
 *   get:
 *     summary: Get all floors for current admin
 *     tags: [Floors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All floors retrieved successfully
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
 *                   example: "All floors retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Floor'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/', optionallyAuthenticateToken, getAllFloors);

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
router.get('/parking-lot/:parkingLotId', optionallyAuthenticateToken, getFloorsByParkingLot);

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
router.get('/:id', optionallyAuthenticateToken, getFloorById);

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
router.post('/parking-lot/:parkingLotId', authenticateToken, requireRole(['admin']), createFloor);

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
router.put('/:id', authenticateToken, requireRole(['admin']), updateFloor);

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
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteFloor);

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
router.get('/:id/statistics', optionallyAuthenticateToken, getFloorStatistics);

export default router;
