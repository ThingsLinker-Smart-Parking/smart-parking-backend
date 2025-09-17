"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscriptionController_1 = require("../controllers/subscriptionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     summary: Get all available subscription plans
 *     tags: [Subscriptions]
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 */
router.get('/plans', subscriptionController_1.getSubscriptionPlans);
/**
 * @swagger
 * /api/subscriptions/plans/{id}:
 *   get:
 *     summary: Get subscription plan by ID
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan retrieved successfully
 *       404:
 *         description: Subscription plan not found
 */
router.get('/plans/:id', subscriptionController_1.getSubscriptionPlan);
/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - billingCycle
 *               - paymentMethod
 *             properties:
 *               planId:
 *                 type: integer
 *                 example: 1
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly, quarterly]
 *                 example: "monthly"
 *               paymentMethod:
 *                 type: string
 *                 enum: [stripe, paypal, razorpay, manual, bank_transfer]
 *                 example: "stripe"
 *               autoRenew:
 *                 type: boolean
 *                 default: true
 *               trialDays:
 *                 type: integer
 *                 example: 7
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         description: Invalid input or user already has subscription
 *       401:
 *         description: Unauthorized
 */
router.post('/', auth_1.authenticateToken, subscriptionController_1.createSubscription);
/**
 * @swagger
 * /api/subscriptions/current:
 *   get:
 *     summary: Get user's current active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription retrieved successfully
 *       404:
 *         description: No active subscription found
 *       401:
 *         description: Unauthorized
 */
router.get('/current', auth_1.authenticateToken, subscriptionController_1.getUserSubscription);
/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get subscriptions for current admin
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default 20, max 100)
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.authenticateToken, subscriptionController_1.listUserSubscriptions);
/**
 * @swagger
 * /api/subscriptions/history:
 *   get:
 *     summary: Get user's subscription history
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/history', auth_1.authenticateToken, subscriptionController_1.getUserSubscriptionHistory);
/**
 * @swagger
 * /api/subscriptions/payments:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/payments', auth_1.authenticateToken, subscriptionController_1.getUserPaymentHistory);
/**
 * @swagger
 * /api/subscriptions/{id}/cancel:
 *   post:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Switching to different plan"
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       404:
 *         description: Subscription not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/cancel', auth_1.authenticateToken, subscriptionController_1.cancelSubscription);
/**
 * @swagger
 * /api/subscriptions/{id}/renew:
 *   post:
 *     summary: Renew a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription renewed successfully
 *       404:
 *         description: Subscription not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:id/renew', auth_1.authenticateToken, subscriptionController_1.renewSubscription);
/**
 * @swagger
 * /api/subscriptions/analytics:
 *   get:
 *     summary: Get subscription analytics for user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', auth_1.authenticateToken, subscriptionController_1.getSubscriptionAnalytics);
/**
 * @swagger
 * /api/subscriptions/limits:
 *   get:
 *     summary: Check subscription limits for a resource
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *           enum: [gateways, parkingLots, floors, parkingSlots, users]
 *         description: Resource type to check
 *       - in: query
 *         name: currentUsage
 *         required: true
 *         schema:
 *           type: integer
 *         description: Current usage count
 *     responses:
 *       200:
 *         description: Limits checked successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/limits', auth_1.authenticateToken, subscriptionController_1.checkSubscriptionLimits);
// Admin routes
/**
 * @swagger
 * /api/subscriptions/admin/active:
 *   get:
 *     summary: Get all active subscriptions (Admin only)
 *     tags: [Subscriptions - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active subscriptions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/admin/active', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'super_admin']), subscriptionController_1.getAllActiveSubscriptions);
/**
 * @swagger
 * /api/subscriptions/admin/expiring:
 *   get:
 *     summary: Get expiring subscriptions (Admin only)
 *     tags: [Subscriptions - Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Days threshold for expiring subscriptions
 *     responses:
 *       200:
 *         description: Expiring subscriptions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/admin/expiring', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'super_admin']), subscriptionController_1.getExpiringSubscriptions);
// Payment routes
/**
 * @swagger
 * /api/subscriptions/payments/session:
 *   post:
 *     summary: Create a Cashfree payment session for a subscription plan
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - billingCycle
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *                 example: "555079c7-e50d-4424-8437-17b1f956ae23"
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly, quarterly]
 *                 example: "monthly"
 *               nodeCount:
 *                 type: integer
 *                 example: 0
 *     responses:
 *       201:
 *         description: Payment session created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/payments/session', auth_1.authenticateToken, subscriptionController_1.createPaymentSession);
/**
 * @swagger
 * /api/subscriptions/payments/process:
 *   post:
 *     summary: Process payment (Internal use)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - gatewayTransactionId
 *               - success
 *             properties:
 *               paymentId:
 *                 type: integer
 *                 example: 1
 *               gatewayTransactionId:
 *                 type: string
 *                 example: "stripe_pi_1234567890"
 *               success:
 *                 type: boolean
 *                 example: true
 *               failureReason:
 *                 type: string
 *                 example: "Card declined"
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Invalid input
 */
router.post('/payments/process', subscriptionController_1.processPayment);
/**
 * @swagger
 * /api/subscriptions/payments/{paymentId}/refund:
 *   post:
 *     summary: Process payment refund
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refundAmount:
 *                 type: number
 *                 example: 29.99
 *               reason:
 *                 type: string
 *                 example: "Customer request"
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Payment not found
 */
router.post('/payments/:paymentId/refund', auth_1.authenticateToken, subscriptionController_1.processRefund);
/**
 * @swagger
 * /api/subscriptions/webhooks/payment:
 *   post:
 *     summary: Handle payment gateway webhooks
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gatewayTransactionId
 *               - status
 *             properties:
 *               gatewayTransactionId:
 *                 type: string
 *                 example: "stripe_pi_1234567890"
 *               status:
 *                 type: string
 *                 example: "completed"
 *               metadata:
 *                 type: object
 *                 example: {}
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data
 */
router.post('/webhooks/payment', subscriptionController_1.handlePaymentWebhook);
/**
 * @swagger
 * /api/subscriptions/payments/{transactionId}:
 *   get:
 *     summary: Get payment details by transaction ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       403:
 *         description: Access denied
 *       404:
 *         description: Payment not found
 */
router.get('/payments/:transactionId', auth_1.authenticateToken, subscriptionController_1.getPaymentDetails);
exports.default = router;
