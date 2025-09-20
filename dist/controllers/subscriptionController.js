"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionStatusController = exports.getPaymentDetails = exports.handlePaymentWebhook = exports.processRefund = exports.finalizeCashfreePayment = exports.processPayment = exports.getExpiringSubscriptions = exports.getAllActiveSubscriptions = exports.checkSubscriptionLimits = exports.getSubscriptionAnalytics = exports.renewSubscription = exports.cancelSubscription = exports.listUserSubscriptions = exports.getUserPaymentHistory = exports.getUserSubscriptionHistory = exports.getUserSubscription = exports.createSubscription = exports.createPaymentSession = exports.getSubscriptionPlan = exports.getSubscriptionPlans = void 0;
const loggerService_1 = require("../services/loggerService");
const data_source_1 = require("../data-source");
const SubscriptionPlan_1 = require("../models/SubscriptionPlan");
const subscriptionService_1 = require("../services/subscriptionService");
const validation_1 = require("../utils/validation");
const environment_1 = require("../config/environment");
// Get all subscription plans
const getSubscriptionPlans = async (req, res) => {
    try {
        const planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_1.SubscriptionPlan);
        const plans = await planRepository.find({
            where: { isActive: true },
            order: { sortOrder: "ASC", basePricePerMonth: "ASC" },
        });
        return res.json({
            success: true,
            data: plans,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get subscription plans error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getSubscriptionPlans = getSubscriptionPlans;
// Get subscription plan by ID
const getSubscriptionPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_1.SubscriptionPlan);
        const plan = await planRepository.findOne({
            where: { id: id, isActive: true },
        });
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Subscription plan not found",
            });
        }
        return res.json({
            success: true,
            data: plan,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get subscription plan error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getSubscriptionPlan = getSubscriptionPlan;
const createPaymentSession = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        if (req.user.role !== "admin" && req.user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can create payment sessions",
            });
        }
        const { planId, billingCycle = "monthly", nodeCount = 0, returnUrl: clientReturnUrl, } = req.body;
        if (!planId || typeof planId !== "string" || planId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "planId is required",
            });
        }
        const normalizedPlanId = planId.trim();
        if (!(0, validation_1.validateBillingCycle)(billingCycle)) {
            return res.status(400).json({
                success: false,
                message: "Invalid billing cycle. Must be monthly, yearly, or quarterly",
            });
        }
        if (nodeCount !== undefined && !(0, validation_1.validateNonNegativeInteger)(nodeCount)) {
            return res.status(400).json({
                success: false,
                message: "Node count must be a non-negative integer",
            });
        }
        const normalizedClientReturnUrl = typeof clientReturnUrl === "string" ? clientReturnUrl.trim() : undefined;
        const forwardedProto = req.get("x-forwarded-proto");
        const forwardedHost = req.get("x-forwarded-host");
        const requestHost = forwardedHost ?? req.get("host");
        const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol;
        const baseReturnUrl = normalizedClientReturnUrl && normalizedClientReturnUrl.length > 0
            ? normalizedClientReturnUrl
            : requestHost
                ? `${protocol}://${requestHost}`.replace(/\/$/, "") +
                    "/payments/cashfree/return"
                : environment_1.env.CASHFREE_RETURN_URL;
        let returnUrlTemplate = baseReturnUrl;
        if (!returnUrlTemplate.includes("{order_id}")) {
            returnUrlTemplate += returnUrlTemplate.includes("?") ? "&" : "?";
            returnUrlTemplate += "order_id={order_id}";
        }
        const result = await subscriptionService_1.subscriptionService.createPaymentSession({
            userId: req.user.id,
            planId: normalizedPlanId,
            billingCycle: billingCycle,
            nodeCount: Number(nodeCount) || 0,
            returnUrl: returnUrlTemplate,
        });
        return res.status(201).json({
            success: true,
            message: "Payment session created successfully",
            data: {
                paymentSessionId: result.paymentSessionId,
                orderId: result.orderId,
                cfOrderId: result.cfOrderId,
                orderAmount: result.orderAmount,
                orderCurrency: result.orderCurrency,
                paymentId: result.paymentId,
                subscriptionId: result.subscriptionId,
                plan: result.plan,
                returnUrl: result.returnUrl,
            },
        });
    }
    catch (error) {
        loggerService_1.logger.error("Create payment session error:", error);
        if (error instanceof Error &&
            error.message === "Subscription plan not found or inactive") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to create payment session",
        });
    }
};
exports.createPaymentSession = createPaymentSession;
// Create new subscription
const createSubscription = async (req, res) => {
    try {
        const { planId, billingCycle, paymentMethod, nodeCount, autoRenew, trialDays, } = req.body;
        const normalizedPlanId = typeof planId === "string" ? planId.trim() : planId;
        const userId = req.user.id;
        // Comprehensive input validation
        const validation = (0, validation_1.validateCreateSubscriptionInput)({
            ...req.body,
            planId: normalizedPlanId,
        });
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.errors,
            });
        }
        // Check if user already has an active subscription
        const existingSubscription = await subscriptionService_1.subscriptionService.getUserActiveSubscription(userId);
        if (existingSubscription) {
            return res.status(400).json({
                success: false,
                message: "You already have an active subscription. Please cancel it first or upgrade.",
                existingSubscription: {
                    id: existingSubscription.id,
                    plan: existingSubscription.plan.name,
                    status: existingSubscription.status,
                    endDate: existingSubscription.endDate,
                },
            });
        }
        const subscriptionData = {
            userId,
            planId: normalizedPlanId,
            billingCycle: billingCycle,
            paymentMethod: paymentMethod,
            nodeCount: nodeCount ? parseInt(nodeCount) : 0,
            autoRenew: autoRenew ?? true,
            trialDays: trialDays ? parseInt(trialDays) : undefined,
        };
        const { subscription, payment } = await subscriptionService_1.subscriptionService.createSubscription(subscriptionData);
        return res.status(201).json({
            success: true,
            message: "Subscription created successfully",
            data: {
                subscription: {
                    id: subscription.id,
                    status: subscription.status,
                    startDate: subscription.startDate,
                    endDate: subscription.endDate,
                    amount: subscription.amount,
                    billingCycle: subscription.billingCycle,
                    plan: subscription.plan,
                },
                payment: {
                    id: payment.id,
                    transactionId: payment.transactionId,
                    amount: payment.amount,
                    status: payment.status,
                    paymentMethod: payment.paymentMethod,
                },
            },
        });
    }
    catch (error) {
        loggerService_1.logger.error("Create subscription error:", error);
        if (error instanceof Error &&
            error.message === "Subscription plan not found or inactive") {
            return res.status(404).json({
                success: false,
                message: error.message,
            });
        }
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        });
    }
};
exports.createSubscription = createSubscription;
// Get user's active subscription
const getUserSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = await subscriptionService_1.subscriptionService.getUserActiveSubscription(userId);
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "No active subscription found",
            });
        }
        return res.json({
            success: true,
            data: subscription,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get user subscription error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getUserSubscription = getUserSubscription;
// Get user's subscription history
const getUserSubscriptionHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const subscriptions = await subscriptionService_1.subscriptionService.getUserSubscriptionHistory(userId);
        return res.json({
            success: true,
            data: subscriptions,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get user subscription history error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getUserSubscriptionHistory = getUserSubscriptionHistory;
// Get user's payment history
const getUserPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const payments = await subscriptionService_1.subscriptionService.getUserPaymentHistory(userId);
        return res.json({
            success: true,
            data: payments,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get user payment history error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getUserPaymentHistory = getUserPaymentHistory;
// List user subscriptions
const listUserSubscriptions = async (req, res) => {
    try {
        if (!req.user ||
            (req.user.role !== "admin" && req.user.role !== "super_admin")) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required.",
            });
        }
        const page = parseInt(req.query.page ?? "1", 10) || 1;
        const limit = parseInt(req.query.limit ?? "20", 10) || 20;
        const result = await subscriptionService_1.subscriptionService.getAdminSubscriptions(req.user.id, page, limit);
        return res.json({
            success: true,
            data: result.items,
            meta: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            },
        });
    }
    catch (error) {
        loggerService_1.logger.error("List user subscriptions error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.listUserSubscriptions = listUserSubscriptions;
// Cancel subscription
const cancelSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;
        // Input validation
        const idValidation = (0, validation_1.validateUuidParam)(id, "id");
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error,
            });
        }
        // Verify subscription belongs to user
        const subscription = await subscriptionService_1.subscriptionService.getUserActiveSubscription(userId);
        if (!subscription || subscription.id !== id) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found or does not belong to you",
            });
        }
        // Check if subscription can be cancelled
        if (subscription.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Subscription is already cancelled",
            });
        }
        const cancelledSubscription = await subscriptionService_1.subscriptionService.cancelSubscription(id, reason);
        return res.json({
            success: true,
            message: "Subscription cancelled successfully",
            data: {
                id: cancelledSubscription.id,
                status: cancelledSubscription.status,
                cancelledAt: cancelledSubscription.cancelledAt,
                cancellationReason: cancelledSubscription.cancellationReason,
            },
        });
    }
    catch (error) {
        loggerService_1.logger.error("Cancel subscription error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        });
    }
};
exports.cancelSubscription = cancelSubscription;
// Renew subscription
const renewSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { paymentMethod } = req.body;
        // Input validation
        const idValidation = (0, validation_1.validateUuidParam)(id, "id");
        if (!idValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: idValidation.error,
            });
        }
        if (paymentMethod && !(0, validation_1.validatePaymentMethod)(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method",
            });
        }
        // Verify subscription belongs to user
        const subscription = await subscriptionService_1.subscriptionService.getUserActiveSubscription(userId);
        if (!subscription || subscription.id !== id) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found or does not belong to you",
            });
        }
        const { subscription: renewedSubscription, payment } = await subscriptionService_1.subscriptionService.renewSubscription(id, paymentMethod);
        return res.json({
            success: true,
            message: "Subscription renewed successfully",
            data: {
                subscription: {
                    id: renewedSubscription.id,
                    status: renewedSubscription.status,
                    startDate: renewedSubscription.startDate,
                    endDate: renewedSubscription.endDate,
                    nextBillingDate: renewedSubscription.nextBillingDate,
                },
                payment: payment
                    ? {
                        id: payment.id,
                        transactionId: payment.transactionId,
                        amount: payment.amount,
                        status: payment.status,
                    }
                    : null,
            },
        });
    }
    catch (error) {
        loggerService_1.logger.error("Renew subscription error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        });
    }
};
exports.renewSubscription = renewSubscription;
// Get subscription analytics
const getSubscriptionAnalytics = async (req, res) => {
    try {
        const userId = req.user.id;
        const analytics = await subscriptionService_1.subscriptionService.getSubscriptionAnalytics(userId);
        return res.json({
            success: true,
            data: analytics,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get subscription analytics error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getSubscriptionAnalytics = getSubscriptionAnalytics;
// Check subscription limits
const checkSubscriptionLimits = async (req, res) => {
    try {
        const { resource, currentUsage } = req.query;
        const userId = req.user.id;
        if (!resource || currentUsage === undefined) {
            return res.status(400).json({
                success: false,
                message: "Resource and current usage are required",
            });
        }
        if (!(0, validation_1.validateResource)(resource)) {
            return res.status(400).json({
                success: false,
                message: "Invalid resource. Must be one of: gateways, parkingLots, floors, parkingSlots, users",
            });
        }
        if (!(0, validation_1.validateNonNegativeInteger)(currentUsage)) {
            return res.status(400).json({
                success: false,
                message: "Current usage must be a non-negative integer",
            });
        }
        const limits = await subscriptionService_1.subscriptionService.checkSubscriptionLimits(userId, resource, parseInt(currentUsage));
        return res.json({
            success: true,
            data: limits,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Check subscription limits error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.checkSubscriptionLimits = checkSubscriptionLimits;
// Admin: Get all active subscriptions
const getAllActiveSubscriptions = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== "admin" && req.user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required.",
            });
        }
        const subscriptions = await subscriptionService_1.subscriptionService.getAllActiveSubscriptions();
        return res.json({
            success: true,
            data: subscriptions,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get all active subscriptions error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getAllActiveSubscriptions = getAllActiveSubscriptions;
// Admin: Get expiring subscriptions
const getExpiringSubscriptions = async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== "admin" && req.user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Admin privileges required.",
            });
        }
        const { days = 7 } = req.query;
        const subscriptions = await subscriptionService_1.subscriptionService.getExpiringSubscriptions(parseInt(days));
        return res.json({
            success: true,
            data: subscriptions,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get expiring subscriptions error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getExpiringSubscriptions = getExpiringSubscriptions;
// Process payment
const processPayment = async (req, res) => {
    try {
        const { paymentId, gatewayTransactionId, success, failureReason } = req.body;
        // Input validation
        if (!paymentId || !gatewayTransactionId || success === undefined) {
            return res.status(400).json({
                success: false,
                message: "Payment ID, gateway transaction ID, and success status are required",
            });
        }
        const paymentValidation = (0, validation_1.validateUuidParam)(paymentId, "paymentId");
        if (!paymentValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: paymentValidation.error,
            });
        }
        if (typeof success !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Success must be a boolean value",
            });
        }
        const payment = await subscriptionService_1.subscriptionService.processPayment(paymentId, gatewayTransactionId, success, failureReason);
        return res.json({
            success: true,
            message: "Payment processed successfully",
            data: {
                id: payment.id,
                transactionId: payment.transactionId,
                status: payment.status,
                amount: payment.amount,
                processedAt: payment.processedAt,
            },
        });
    }
    catch (error) {
        loggerService_1.logger.error("Process payment error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        });
    }
};
exports.processPayment = processPayment;
const finalizeCashfreePayment = async (req, res) => {
    try {
        loggerService_1.logger.info("🔍 Cashfree payment finalization request received", {
            body: req.body,
            userId: req.user?.id,
            timestamp: new Date().toISOString(),
        });
        if (!req.user) {
            loggerService_1.logger.warn("❌ Unauthorized payment finalization attempt");
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { orderId, paymentSessionId, referenceId, statusHint, verifyWithGateway, } = req.body ?? {};
        loggerService_1.logger.info("📝 Payment finalization parameters", {
            orderId,
            paymentSessionId,
            referenceId,
            statusHint,
            verifyWithGateway,
        });
        const normalizedOrderId = typeof orderId === "string" ? orderId.trim() : undefined;
        const normalizedSessionId = typeof paymentSessionId === "string"
            ? paymentSessionId.trim()
            : undefined;
        if (!normalizedOrderId && !normalizedSessionId) {
            return res.status(400).json({
                success: false,
                message: "orderId or paymentSessionId is required",
            });
        }
        const result = await subscriptionService_1.subscriptionService.finalizeCashfreeReturn({
            orderId: normalizedOrderId || "",
            paymentSessionId: normalizedSessionId,
            referenceId: typeof referenceId === "string" ? referenceId.trim() : undefined,
            statusHint: typeof statusHint === "string" ? statusHint.trim() : undefined,
            verifyWithGateway: verifyWithGateway !== false,
            rawQuery: req.body,
        });
        const success = result.status === "SUCCESS";
        const message = result.message ||
            (success
                ? "Payment verified successfully"
                : result.status === "FAILED"
                    ? "Payment verification failed"
                    : "Payment verification is pending");
        return res.status(success ? 200 : 202).json({
            success,
            status: result.status,
            message,
            data: {
                payment: result.payment ?? null,
                subscription: result.subscription ?? null,
                cashfreeStatus: result.cashfreeStatus,
            },
        });
    }
    catch (error) {
        loggerService_1.logger.error("Finalize Cashfree payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.finalizeCashfreePayment = finalizeCashfreePayment;
// Process refund
const processRefund = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { refundAmount, reason } = req.body;
        // Input validation
        const paymentValidation = (0, validation_1.validateUuidParam)(paymentId, "paymentId");
        if (!paymentValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: paymentValidation.error,
            });
        }
        if (refundAmount !== undefined &&
            (!(0, validation_1.validateAmount)(refundAmount) || parseFloat(refundAmount) <= 0)) {
            return res.status(400).json({
                success: false,
                message: "Refund amount must be a positive number",
            });
        }
        // Check if user is admin or owns the payment
        const payment = await subscriptionService_1.subscriptionService.getPaymentById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }
        const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
        const isOwner = payment.user.id === req.user.id;
        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only refund your own payments or need admin privileges.",
            });
        }
        const refundedPayment = await subscriptionService_1.subscriptionService.processRefund(paymentId, refundAmount ? parseFloat(refundAmount) : undefined, reason);
        return res.json({
            success: true,
            message: "Refund processed successfully",
            data: {
                id: refundedPayment.id,
                transactionId: refundedPayment.transactionId,
                status: refundedPayment.status,
                refundAmount: refundedPayment.refundAmount,
                refundedAt: refundedPayment.refundedAt,
                refundReason: refundedPayment.refundReason,
            },
        });
    }
    catch (error) {
        loggerService_1.logger.error("Process refund error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Internal server error",
        });
    }
};
exports.processRefund = processRefund;
// Handle payment webhook
const handlePaymentWebhook = async (req, res) => {
    try {
        const { gatewayTransactionId, status, metadata } = req.body;
        if (!gatewayTransactionId || !status) {
            return res.status(400).json({
                success: false,
                message: "Gateway transaction ID and status are required",
            });
        }
        await subscriptionService_1.subscriptionService.handleWebhook(gatewayTransactionId, status, metadata || {});
        return res.json({
            success: true,
            message: "Webhook processed successfully",
        });
    }
    catch (error) {
        loggerService_1.logger.error("Webhook processing error:", error);
        return res.status(500).json({
            success: false,
            message: "Webhook processing failed",
        });
    }
};
exports.handlePaymentWebhook = handlePaymentWebhook;
// Get payment details
const getPaymentDetails = async (req, res) => {
    try {
        const { transactionId } = req.params;
        if (!transactionId) {
            return res.status(400).json({
                success: false,
                message: "Transaction ID is required",
            });
        }
        const payment = await subscriptionService_1.subscriptionService.getPaymentByTransactionId(transactionId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: "Payment not found",
            });
        }
        // Check access rights
        const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
        const isOwner = payment.user.id === req.user.id;
        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                success: false,
                message: "Access denied",
            });
        }
        return res.json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get payment details error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getPaymentDetails = getPaymentDetails;
// Get current user's subscription status
const getSubscriptionStatusController = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        // Import the function from middleware
        const { getSubscriptionStatus } = await Promise.resolve().then(() => __importStar(require("../middleware/subscriptionAuth")));
        const status = await getSubscriptionStatus(req.user.id);
        return res.json({
            success: true,
            message: "Subscription status retrieved successfully",
            data: status
        });
    }
    catch (error) {
        loggerService_1.logger.error("Get subscription status error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getSubscriptionStatusController = getSubscriptionStatusController;
