import { logger } from "../services/loggerService";
import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { SubscriptionPlan, BillingCycle } from "../models/SubscriptionPlan";
import {
  subscriptionService,
  CreateSubscriptionData,
} from "../services/subscriptionService";
import { AuthRequest } from "../middleware/auth";
import {
  validateCreateSubscriptionInput,
  validateResource,
  validateAmount,
  validatePaymentMethod,
  validateUuidParam,
  validateBillingCycle,
  validateNonNegativeInteger,
} from "../utils/validation";
import { env } from "../config/environment";

// Get all subscription plans
export const getSubscriptionPlans = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const plans = await planRepository.find({
      where: { isActive: true },
      order: { sortOrder: "ASC", basePricePerMonth: "ASC" },
    });

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error("Get subscription plans error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get subscription plan by ID
export const getSubscriptionPlan = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
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
  } catch (error) {
    logger.error("Get subscription plan error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createPaymentSession = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
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

    const {
      planId,
      billingCycle = "monthly",
      nodeCount = 0,
      returnUrl: clientReturnUrl,
    } = req.body;

    if (!planId || typeof planId !== "string" || planId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "planId is required",
      });
    }

    const normalizedPlanId = planId.trim();

    if (!validateBillingCycle(billingCycle)) {
      return res.status(400).json({
        success: false,
        message: "Invalid billing cycle. Must be monthly, yearly, or quarterly",
      });
    }

    if (nodeCount !== undefined && !validateNonNegativeInteger(nodeCount)) {
      return res.status(400).json({
        success: false,
        message: "Node count must be a non-negative integer",
      });
    }

    const normalizedClientReturnUrl =
      typeof clientReturnUrl === "string" ? clientReturnUrl.trim() : undefined;

    const forwardedProto = req.get("x-forwarded-proto");
    const forwardedHost = req.get("x-forwarded-host");
    const requestHost = forwardedHost ?? req.get("host");
    const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol;

    const baseReturnUrl =
      normalizedClientReturnUrl && normalizedClientReturnUrl.length > 0
        ? normalizedClientReturnUrl
        : requestHost
          ? `${protocol}://${requestHost}`.replace(/\/$/, "") +
            "/payments/cashfree/return"
          : env.CASHFREE_RETURN_URL;

    let returnUrlTemplate = baseReturnUrl;
    if (!returnUrlTemplate.includes("{order_id}")) {
      returnUrlTemplate += returnUrlTemplate.includes("?") ? "&" : "?";
      returnUrlTemplate += "order_id={order_id}";
    }

    const result = await subscriptionService.createPaymentSession({
      userId: req.user.id,
      planId: normalizedPlanId,
      billingCycle: billingCycle as BillingCycle,
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
  } catch (error) {
    logger.error("Create payment session error:", error);
    if (
      error instanceof Error &&
      error.message === "Subscription plan not found or inactive"
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create payment session",
    });
  }
};

// Create new subscription
export const createSubscription = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const {
      planId,
      billingCycle,
      paymentMethod,
      nodeCount,
      autoRenew,
      trialDays,
    } = req.body;
    const normalizedPlanId =
      typeof planId === "string" ? planId.trim() : planId;
    const userId = req.user!.id;

    // Comprehensive input validation
    const validation = validateCreateSubscriptionInput({
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
    const existingSubscription =
      await subscriptionService.getUserActiveSubscription(userId);
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active subscription. Please cancel it first or upgrade.",
        existingSubscription: {
          id: existingSubscription.id,
          plan: existingSubscription.plan.name,
          status: existingSubscription.status,
          endDate: existingSubscription.endDate,
        },
      });
    }

    const subscriptionData: CreateSubscriptionData = {
      userId,
      planId: normalizedPlanId,
      billingCycle: billingCycle as any,
      paymentMethod: paymentMethod as any,
      nodeCount: nodeCount ? parseInt(nodeCount) : 0,
      autoRenew: autoRenew ?? true,
      trialDays: trialDays ? parseInt(trialDays) : undefined,
    };

    const { subscription, payment } =
      await subscriptionService.createSubscription(subscriptionData);

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
  } catch (error) {
    logger.error("Create subscription error:", error);
    if (
      error instanceof Error &&
      error.message === "Subscription plan not found or inactive"
    ) {
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

// Get user's active subscription
export const getUserSubscription = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const subscription =
      await subscriptionService.getUserActiveSubscription(userId);

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
  } catch (error) {
    logger.error("Get user subscription error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user's subscription history
export const getUserSubscriptionHistory = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const subscriptions =
      await subscriptionService.getUserSubscriptionHistory(userId);

    return res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    logger.error("Get user subscription history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get user's payment history
export const getUserPaymentHistory = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const payments = await subscriptionService.getUserPaymentHistory(userId);

    return res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    logger.error("Get user payment history error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// List user subscriptions
export const listUserSubscriptions = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (
      !req.user ||
      (req.user.role !== "admin" && req.user.role !== "super_admin")
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const page = parseInt((req.query.page as string) ?? "1", 10) || 1;
    const limit = parseInt((req.query.limit as string) ?? "20", 10) || 20;

    const result = await subscriptionService.getAdminSubscriptions(
      req.user.id,
      page,
      limit,
    );

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
  } catch (error) {
    logger.error("List user subscriptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Cancel subscription
export const cancelSubscription = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user!.id;

    // Input validation
    const idValidation = validateUuidParam(id, "id");
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: idValidation.error,
      });
    }

    // Verify subscription belongs to user
    const subscription =
      await subscriptionService.getUserActiveSubscription(userId);
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

    const cancelledSubscription = await subscriptionService.cancelSubscription(
      id,
      reason,
    );

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
  } catch (error) {
    logger.error("Cancel subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// Renew subscription
export const renewSubscription = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { paymentMethod } = req.body;

    // Input validation
    const idValidation = validateUuidParam(id, "id");
    if (!idValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: idValidation.error,
      });
    }

    if (paymentMethod && !validatePaymentMethod(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    // Verify subscription belongs to user
    const subscription =
      await subscriptionService.getUserActiveSubscription(userId);
    if (!subscription || subscription.id !== id) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found or does not belong to you",
      });
    }

    const { subscription: renewedSubscription, payment } =
      await subscriptionService.renewSubscription(id, paymentMethod);

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
  } catch (error) {
    logger.error("Renew subscription error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// Get subscription analytics
export const getSubscriptionAnalytics = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const userId = req.user!.id;
    const analytics =
      await subscriptionService.getSubscriptionAnalytics(userId);

    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error("Get subscription analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Check subscription limits
export const checkSubscriptionLimits = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { resource, currentUsage } = req.query;
    const userId = req.user!.id;

    if (!resource || currentUsage === undefined) {
      return res.status(400).json({
        success: false,
        message: "Resource and current usage are required",
      });
    }

    if (!validateResource(resource as string)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid resource. Must be one of: gateways, parkingLots, floors, parkingSlots, users",
      });
    }

    if (!validateNonNegativeInteger(currentUsage as string)) {
      return res.status(400).json({
        success: false,
        message: "Current usage must be a non-negative integer",
      });
    }

    const limits = await subscriptionService.checkSubscriptionLimits(
      userId,
      resource as any,
      parseInt(currentUsage as string),
    );

    return res.json({
      success: true,
      data: limits,
    });
  } catch (error) {
    logger.error("Check subscription limits error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get all active subscriptions
export const getAllActiveSubscriptions = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin" && req.user!.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const subscriptions = await subscriptionService.getAllActiveSubscriptions();

    return res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    logger.error("Get all active subscriptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Admin: Get expiring subscriptions
export const getExpiringSubscriptions = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    // Check if user is admin
    if (req.user!.role !== "admin" && req.user!.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const { days = 7 } = req.query;
    const subscriptions = await subscriptionService.getExpiringSubscriptions(
      parseInt(days as string),
    );

    return res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    logger.error("Get expiring subscriptions error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Process payment
export const processPayment = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { paymentId, gatewayTransactionId, success, failureReason } =
      req.body;

    // Input validation
    if (!paymentId || !gatewayTransactionId || success === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "Payment ID, gateway transaction ID, and success status are required",
      });
    }

    const paymentValidation = validateUuidParam(paymentId, "paymentId");
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

    const payment = await subscriptionService.processPayment(
      paymentId,
      gatewayTransactionId,
      success,
      failureReason,
    );

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
  } catch (error) {
    logger.error("Process payment error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const finalizeCashfreePayment = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    logger.info("🔍 Cashfree payment finalization request received", {
      body: req.body,
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });

    if (!req.user) {
      logger.warn("❌ Unauthorized payment finalization attempt");
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      orderId,
      paymentSessionId,
      referenceId,
      statusHint,
      verifyWithGateway,
    } = req.body ?? {};

    logger.info("📝 Payment finalization parameters", {
      orderId,
      paymentSessionId,
      referenceId,
      statusHint,
      verifyWithGateway,
    });

    const normalizedOrderId =
      typeof orderId === "string" ? orderId.trim() : undefined;
    const normalizedSessionId =
      typeof paymentSessionId === "string"
        ? paymentSessionId.trim()
        : undefined;

    if (!normalizedOrderId && !normalizedSessionId) {
      return res.status(400).json({
        success: false,
        message: "orderId or paymentSessionId is required",
      });
    }

    const result = await subscriptionService.finalizeCashfreeReturn({
      orderId: normalizedOrderId || "",
      paymentSessionId: normalizedSessionId,
      referenceId:
        typeof referenceId === "string" ? referenceId.trim() : undefined,
      statusHint:
        typeof statusHint === "string" ? statusHint.trim() : undefined,
      verifyWithGateway: verifyWithGateway !== false,
      rawQuery: req.body,
    });

    const success = result.status === "SUCCESS";
    const message =
      result.message ||
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
  } catch (error) {
    logger.error("Finalize Cashfree payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Process refund
export const processRefund = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { paymentId } = req.params;
    const { refundAmount, reason } = req.body;

    // Input validation
    const paymentValidation = validateUuidParam(paymentId, "paymentId");
    if (!paymentValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: paymentValidation.error,
      });
    }

    if (
      refundAmount !== undefined &&
      (!validateAmount(refundAmount) || parseFloat(refundAmount) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Refund amount must be a positive number",
      });
    }

    // Check if user is admin or owns the payment
    const payment = await subscriptionService.getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const isAdmin =
      req.user!.role === "admin" || req.user!.role === "super_admin";
    const isOwner = payment.user.id === req.user!.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You can only refund your own payments or need admin privileges.",
      });
    }

    const refundedPayment = await subscriptionService.processRefund(
      paymentId,
      refundAmount ? parseFloat(refundAmount) : undefined,
      reason,
    );

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
  } catch (error) {
    logger.error("Process refund error:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

// Handle payment webhook
export const handlePaymentWebhook = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { gatewayTransactionId, status, metadata } = req.body;

    if (!gatewayTransactionId || !status) {
      return res.status(400).json({
        success: false,
        message: "Gateway transaction ID and status are required",
      });
    }

    await subscriptionService.handleWebhook(
      gatewayTransactionId,
      status,
      metadata || {},
    );

    return res.json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    logger.error("Webhook processing error:", error);
    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};

// Get payment details
export const getPaymentDetails = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const payment =
      await subscriptionService.getPaymentByTransactionId(transactionId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Check access rights
    const isAdmin =
      req.user!.role === "admin" || req.user!.role === "super_admin";
    const isOwner = payment.user.id === req.user!.id;

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
  } catch (error) {
    logger.error("Get payment details error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
