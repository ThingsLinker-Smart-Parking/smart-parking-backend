import { Router } from 'express';
import { 
  getAllSubscriptionPlans,
  getSubscriptionPlanById,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  bulkUpdateSubscriptionPlans,
  updateExchangeRate,
  getSubscriptionPlanStats,
  restoreSubscriptionPlan
} from '../controllers/subscriptionPlanController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { 
  validateBody, 
  validateParams, 
  validateQuery,
  sanitize, 
  subscriptionPlanSchemas,
  paramSchemas 
} from '../validation';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the subscription plan
 *         name:
 *           type: string
 *           description: Name of the subscription plan
 *           example: "Professional Plan"
 *         description:
 *           type: string
 *           description: Detailed description of the plan
 *           example: "Perfect for medium-sized parking operations"
 *         pricing:
 *           type: object
 *           properties:
 *             monthly:
 *               type: object
 *               properties:
 *                 base:
 *                   type: number
 *                   description: Base monthly price in USD
 *                 perNode:
 *                   type: number
 *                   description: Price per node per month in USD
 *                 formatted:
 *                   type: object
 *                   properties:
 *                     usd:
 *                       type: string
 *                       example: "$49.99"
 *                     inr:
 *                       type: string
 *                       example: "₹3,749.25"
 *             yearly:
 *               type: object
 *               properties:
 *                 base:
 *                   type: number
 *                   description: Base yearly price in USD
 *                 perNode:
 *                   type: number
 *                   description: Price per node per year in USD
 *                 discount:
 *                   type: number
 *                   description: Discount percentage for yearly billing
 *                 formatted:
 *                   type: object
 *         limits:
 *           type: object
 *           properties:
 *             maxGateways:
 *               type: integer
 *               description: Maximum number of gateways allowed
 *             maxParkingLots:
 *               type: integer
 *               description: Maximum number of parking lots allowed
 *             maxFloors:
 *               type: integer
 *               description: Maximum number of floors allowed
 *             maxParkingSlots:
 *               type: integer
 *               description: Maximum number of parking slots allowed
 *             maxUsers:
 *               type: integer
 *               description: Maximum number of users allowed
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           description: List of features included in the plan
 *         includes:
 *           type: object
 *           properties:
 *             analytics:
 *               type: boolean
 *             support:
 *               type: boolean
 *             api:
 *               type: boolean
 *             customization:
 *               type: boolean
 *         metadata:
 *           type: object
 *           properties:
 *             isActive:
 *               type: boolean
 *             isPopular:
 *               type: boolean
 *             isCustom:
 *               type: boolean
 *             defaultBillingCycle:
 *               type: string
 *               enum: [monthly, yearly, quarterly]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateSubscriptionPlan:
 *       type: object
 *       required:
 *         - name
 *         - basePricePerMonth
 *         - basePricePerYear
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *           example: "Professional Plan"
 *         description:
 *           type: string
 *           maxLength: 1000
 *           example: "Perfect for medium-sized parking operations"
 *         basePricePerMonth:
 *           type: number
 *           minimum: 0
 *           example: 49.99
 *         basePricePerYear:
 *           type: number
 *           minimum: 0
 *           example: 499.90
 *         basePricePerQuarter:
 *           type: number
 *           minimum: 0
 *           example: 134.97
 *         pricePerNodePerMonth:
 *           type: number
 *           minimum: 0
 *           default: 2.00
 *         pricePerNodePerYear:
 *           type: number
 *           minimum: 0
 *           default: 20.00
 *         maxGateways:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         maxParkingLots:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         maxFloors:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         maxParkingSlots:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         maxUsers:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           example: ["Real-time monitoring", "Mobile app access", "Email support"]
 *         includesAnalytics:
 *           type: boolean
 *           default: false
 *         includesSupport:
 *           type: boolean
 *           default: false
 *         includesAPI:
 *           type: boolean
 *           default: false
 *         includesCustomization:
 *           type: boolean
 *           default: false
 *         defaultBillingCycle:
 *           type: string
 *           enum: [monthly, yearly, quarterly]
 *           default: monthly
 *         isActive:
 *           type: boolean
 *           default: true
 *         isPopular:
 *           type: boolean
 *           default: false
 *         sortOrder:
 *           type: integer
 *           minimum: 0
 *           default: 0
 */

/**
 * @swagger
 * /api/subscription-plans:
 *   get:
 *     summary: Get all subscription plans
 *     description: Retrieve all subscription plans. Non-authenticated users see only active plans, admins see all based on filters.
 *     tags: [Subscription Plans]
 *     parameters:
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status (admin only)
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: boolean
 *         description: Filter by popular plans
 *       - in: query
 *         name: isCustom
 *         schema:
 *           type: boolean
 *         description: Filter by custom plans
 *       - in: query
 *         name: billingCycle
 *         schema:
 *           type: string
 *           enum: [monthly, yearly, quarterly]
 *         description: Filter by billing cycle
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, basePricePerMonth, basePricePerYear, sortOrder, createdAt, updatedAt]
 *           default: sortOrder
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of plans to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of plans to skip
 *     responses:
 *       200:
 *         description: Subscription plans retrieved successfully
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
 *                   example: "Subscription plans retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     count:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       400:
 *         description: Invalid query parameters
 */
router.get('/', 
  validateQuery(subscriptionPlanSchemas.listFilters), 
  getAllSubscriptionPlans
);

/**
 * @swagger
 * /api/subscription-plans/{id}:
 *   get:
 *     summary: Get subscription plan by ID
 *     description: Retrieve detailed information about a specific subscription plan
 *     tags: [Subscription Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan retrieved successfully
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
 *                   $ref: '#/components/schemas/SubscriptionPlan'
 *       404:
 *         description: Subscription plan not found
 */
router.get('/:id', 
  validateParams(paramSchemas.uuid), 
  getSubscriptionPlanById
);

/**
 * @swagger
 * /api/subscription-plans:
 *   post:
 *     summary: Create new subscription plan
 *     description: Create a new subscription plan (Super Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSubscriptionPlan'
 *     responses:
 *       201:
 *         description: Subscription plan created successfully
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: UUID of the created subscription plan
 *                     name:
 *                       type: string
 *                     pricing:
 *                       type: object
 *                     isActive:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Plan name already exists
 */
router.post('/', 
  authenticateToken,
  requireRole(['super_admin']),
  sanitize(),
  validateBody(subscriptionPlanSchemas.create),
  createSubscriptionPlan
);

/**
 * @swagger
 * /api/subscription-plans/{id}:
 *   put:
 *     summary: Update subscription plan
 *     description: Update an existing subscription plan (Super Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subscription plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               basePricePerMonth:
 *                 type: number
 *                 minimum: 0
 *               basePricePerYear:
 *                 type: number
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *               isPopular:
 *                 type: boolean
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Subscription plan updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Subscription plan not found
 *       409:
 *         description: Plan name already exists
 */
router.put('/:id', 
  authenticateToken,
  requireRole(['super_admin']),
  validateParams(paramSchemas.uuid),
  sanitize(),
  validateBody(subscriptionPlanSchemas.update),
  updateSubscriptionPlan
);

/**
 * @swagger
 * /api/subscription-plans/{id}:
 *   delete:
 *     summary: Delete subscription plan
 *     description: Soft delete a subscription plan (Super Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subscription plan ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *                 description: Reason for deletion
 *     responses:
 *       200:
 *         description: Subscription plan deleted successfully
 *       400:
 *         description: Cannot delete plan with active subscriptions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Subscription plan not found
 */
router.delete('/:id', 
  authenticateToken,
  requireRole(['super_admin']),
  validateParams(paramSchemas.uuid),
  sanitize(),
  validateBody(subscriptionPlanSchemas.softDelete),
  deleteSubscriptionPlan
);

/**
 * @swagger
 * /api/subscription-plans/{id}/restore:
 *   post:
 *     summary: Restore deleted subscription plan
 *     description: Restore a soft-deleted subscription plan (Super Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan restored successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Deleted subscription plan not found
 */
router.post('/:id/restore', 
  authenticateToken,
  requireRole(['super_admin']),
  validateParams(paramSchemas.uuid),
  restoreSubscriptionPlan
);

/**
 * @swagger
 * /api/subscription-plans/bulk/update:
 *   post:
 *     summary: Bulk update subscription plans
 *     description: Update multiple subscription plans at once (Super Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planIds
 *               - updates
 *             properties:
 *               planIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *                 example: ["plan-id-1", "plan-id-2"]
 *               updates:
 *                 type: object
 *                 properties:
 *                   isActive:
 *                     type: boolean
 *                   sortOrder:
 *                     type: integer
 *                   usdToInrRate:
 *                     type: number
 *     responses:
 *       200:
 *         description: Subscription plans updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.post('/bulk/update', 
  authenticateToken,
  requireRole(['super_admin']),
  sanitize(),
  validateBody(subscriptionPlanSchemas.bulkUpdate),
  bulkUpdateSubscriptionPlans
);

/**
 * @swagger
 * /api/subscription-plans/exchange-rate:
 *   put:
 *     summary: Update USD to INR exchange rate
 *     description: Update the exchange rate for all subscription plans (Super Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usdToInrRate
 *             properties:
 *               usdToInrRate:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 200
 *                 example: 75.50
 *     responses:
 *       200:
 *         description: Exchange rate updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.put('/exchange-rate', 
  authenticateToken,
  requireRole(['super_admin']),
  sanitize(),
  validateBody(subscriptionPlanSchemas.updateExchangeRate),
  updateExchangeRate
);

/**
 * @swagger
 * /api/subscription-plans/statistics:
 *   get:
 *     summary: Get subscription plan statistics
 *     description: Get comprehensive statistics about subscription plans (Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                     overview:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         popular:
 *                           type: integer
 *                         custom:
 *                           type: integer
 *                         deleted:
 *                           type: integer
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         minMonthlyPrice:
 *                           type: number
 *                         maxMonthlyPrice:
 *                           type: number
 *                         avgMonthlyPrice:
 *                           type: number
 *                     healthScore:
 *                       type: integer
 *                       description: Percentage of active vs total plans
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/statistics', 
  authenticateToken,
  requireRole(['admin', 'super_admin']),
  getSubscriptionPlanStats
);

export default router;