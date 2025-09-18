"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionService = exports.SubscriptionService = void 0;
const data_source_1 = require("../data-source");
const Subscription_1 = require("../models/Subscription");
const SubscriptionPlan_1 = require("../models/SubscriptionPlan");
const Payment_1 = require("../models/Payment");
const User_1 = require("../models/User");
const typeorm_1 = require("typeorm");
const cashfreePaymentService_1 = require("./cashfreePaymentService");
const loggerService_1 = require("./loggerService");
const environment_1 = require("../config/environment");
const validation_1 = require("../utils/validation");
class SubscriptionService {
    constructor() {
        this.subscriptionRepository = data_source_1.AppDataSource.getRepository(Subscription_1.Subscription);
        this.planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_1.SubscriptionPlan);
        this.paymentRepository = data_source_1.AppDataSource.getRepository(Payment_1.Payment);
        this.userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    async findPlanByIdentifier(planRepository, identifier) {
        if (!identifier) {
            return null;
        }
        const trimmed = identifier.trim();
        if (!trimmed) {
            return null;
        }
        if ((0, validation_1.validateUuid)(trimmed)) {
            const planById = await planRepository.findOne({
                where: { id: trimmed, isActive: true, isDeleted: false },
            });
            if (planById) {
                return planById;
            }
        }
        const normalized = trimmed.toLowerCase();
        const variants = [normalized];
        if (normalized.includes("-") || normalized.includes("_")) {
            variants.push(normalized.replace(/[-_]+/g, " "));
        }
        for (const variant of variants) {
            const planByName = await planRepository.findOne({
                where: {
                    name: (0, typeorm_1.ILike)(variant),
                    isActive: true,
                    isDeleted: false,
                },
            });
            if (planByName) {
                return planByName;
            }
        }
        return null;
    }
    /**
     * Create a new subscription
     */
    async createSubscription(data) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const userRepository = manager.getRepository(User_1.User);
            const planRepository = manager.getRepository(SubscriptionPlan_1.SubscriptionPlan);
            const subscriptionRepository = manager.getRepository(Subscription_1.Subscription);
            const paymentRepository = manager.getRepository(Payment_1.Payment);
            const user = await userRepository.findOne({ where: { id: data.userId } });
            if (!user) {
                throw new Error("User not found");
            }
            const plan = await this.findPlanByIdentifier(planRepository, data.planId);
            if (!plan) {
                throw new Error("Subscription plan not found or inactive");
            }
            // Check for existing active subscription
            const existingSubscription = await subscriptionRepository.findOne({
                where: {
                    admin: { id: data.userId },
                    status: (0, typeorm_1.In)(["active", "trial", "pending"]),
                },
            });
            if (existingSubscription) {
                throw new Error("User already has an active subscription");
            }
            // Calculate dates
            const startDate = new Date();
            const endDate = this.calculateEndDate(startDate, data.billingCycle);
            const trialEndDate = data.trialDays
                ? new Date(startDate.getTime() + data.trialDays * 24 * 60 * 60 * 1000)
                : null;
            // Create subscription
            const subscription = subscriptionRepository.create({
                admin: user,
                plan: plan,
                billingCycle: data.billingCycle,
                amount: plan.getTotalPriceForCycle(data.billingCycle, data.nodeCount || 0),
                startDate,
                endDate,
                trialEndDate: trialEndDate || undefined,
                nextBillingDate: endDate,
                status: trialEndDate ? "trial" : "pending",
                paymentStatus: trialEndDate ? "pending" : "pending",
                gatewayLimit: plan.maxGateways,
                parkingLotLimit: plan.maxParkingLots,
                floorLimit: plan.maxFloors,
                parkingSlotLimit: plan.maxParkingSlots,
                userLimit: plan.maxUsers,
                autoRenew: data.autoRenew ?? true,
                metadata: {
                    nodeCount: data.nodeCount || 0,
                    createdFrom: "api",
                },
            });
            const savedSubscription = await subscriptionRepository.save(subscription);
            // Create payment record
            const payment = paymentRepository.create({
                transactionId: this.generateTransactionId(),
                user: user,
                subscription: savedSubscription,
                type: "subscription",
                amount: savedSubscription.amount,
                currency: "USD",
                status: "pending",
                paymentMethod: data.paymentMethod,
                description: `Subscription to ${plan.name} plan (${data.billingCycle})`,
                metadata: {
                    planId: plan.id,
                    planName: plan.name,
                    billingCycle: data.billingCycle,
                    trialDays: data.trialDays,
                    nodeCount: data.nodeCount || 0,
                },
            });
            const savedPayment = await paymentRepository.save(payment);
            return { subscription: savedSubscription, payment: savedPayment };
        });
    }
    async createPaymentSession(data) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const userRepository = manager.getRepository(User_1.User);
            const planRepository = manager.getRepository(SubscriptionPlan_1.SubscriptionPlan);
            const subscriptionRepository = manager.getRepository(Subscription_1.Subscription);
            const paymentRepository = manager.getRepository(Payment_1.Payment);
            const user = await userRepository.findOne({ where: { id: data.userId } });
            if (!user) {
                throw new Error("User not found");
            }
            const plan = await this.findPlanByIdentifier(planRepository, data.planId);
            if (!plan) {
                throw new Error("Subscription plan not found or inactive");
            }
            const existingSubscription = await subscriptionRepository.findOne({
                where: {
                    admin: { id: data.userId },
                    status: (0, typeorm_1.In)(["active", "trial", "pending"]),
                },
            });
            if (existingSubscription) {
                throw new Error("User already has an active subscription");
            }
            const nodeCount = data.nodeCount ?? 0;
            const amountUsd = plan.getTotalPriceForCycle(data.billingCycle, nodeCount);
            const amountInInr = plan.getPriceInInr(data.billingCycle, nodeCount);
            const startDate = new Date();
            const endDate = this.calculateEndDate(startDate, data.billingCycle);
            const subscription = subscriptionRepository.create({
                admin: user,
                plan,
                billingCycle: data.billingCycle,
                amount: amountUsd,
                startDate,
                endDate,
                nextBillingDate: endDate,
                status: "pending",
                paymentStatus: "pending",
                gatewayLimit: plan.maxGateways,
                parkingLotLimit: plan.maxParkingLots,
                floorLimit: plan.maxFloors,
                parkingSlotLimit: plan.maxParkingSlots,
                userLimit: plan.maxUsers,
                autoRenew: true,
                metadata: {
                    nodeCount,
                    createdFrom: "cashfree_session",
                },
            });
            const savedSubscription = await subscriptionRepository.save(subscription);
            const transactionId = this.generateTransactionId();
            const payment = paymentRepository.create({
                transactionId,
                user,
                subscription: savedSubscription,
                type: "subscription",
                amount: amountInInr,
                currency: "INR",
                status: "pending",
                paymentMethod: "cashfree",
                description: `Subscription to ${plan.name} plan (${data.billingCycle})`,
                metadata: {
                    planId: plan.id,
                    planName: plan.name,
                    billingCycle: data.billingCycle,
                    nodeCount,
                    amountUsd,
                    amountInInr,
                    environment: environment_1.env.CASHFREE_ENVIRONMENT,
                },
            });
            const order = await cashfreePaymentService_1.cashfreePaymentService.createOrder({
                orderId: transactionId,
                amount: amountInInr,
                currency: "INR",
                customerId: user.id,
                customerEmail: user.email,
                customerName: user.getFullName(),
                returnUrl: data.returnUrl ?? environment_1.env.CASHFREE_RETURN_URL,
                orderNote: `Subscription ${savedSubscription.id}`,
                orderTags: {
                    subscription_id: savedSubscription.id,
                    payment_id: payment.id,
                },
            });
            payment.metadata = {
                ...payment.metadata,
                cashfree: {
                    orderId: order.order_id,
                    paymentSessionId: order.payment_session_id,
                    cfOrderId: order.cf_order_id,
                    orderStatus: order.order_status,
                },
            };
            const savedPayment = await paymentRepository.save(payment);
            const finalReturnUrl = (data.returnUrl ?? environment_1.env.CASHFREE_RETURN_URL)
                .replace("{order_id}", order.order_id)
                .replace("{payment_session_id}", order.payment_session_id);
            return {
                paymentSessionId: order.payment_session_id,
                orderId: order.order_id,
                cfOrderId: order.cf_order_id,
                orderAmount: order.order_amount ?? Number(amountInInr.toFixed(2)),
                orderCurrency: order.order_currency ?? "INR",
                paymentId: savedPayment.id,
                subscriptionId: savedSubscription.id,
                plan: {
                    id: plan.id,
                    name: plan.name,
                    billingCycle: data.billingCycle,
                    amountUsd,
                    amountInInr,
                },
                returnUrl: finalReturnUrl,
            };
        });
    }
    /**
     * Process payment for subscription
     */
    async processPayment(paymentId, gatewayTransactionId, success, failureReason) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const paymentRepository = manager.getRepository(Payment_1.Payment);
            const subscriptionRepository = manager.getRepository(Subscription_1.Subscription);
            const payment = await paymentRepository.findOne({
                where: { id: paymentId },
                relations: ["subscription", "user"],
            });
            if (!payment) {
                throw new Error("Payment not found");
            }
            if (payment.status === "completed") {
                // Payment was already successfully processed - return the existing payment
                loggerService_1.logger.info("Payment already completed, returning existing record", {
                    paymentId: payment.id,
                    orderId: payment.transactionId,
                    status: payment.status,
                });
                return payment;
            }
            if (success) {
                payment.status = "completed";
                payment.processedAt = new Date();
                payment.metadata = {
                    ...payment.metadata,
                    gatewayTransactionId,
                    processedAt: new Date().toISOString(),
                };
                // Update subscription status
                if (payment.subscription) {
                    payment.subscription.status = "active";
                    payment.subscription.paymentStatus = "paid";
                    await subscriptionRepository.save(payment.subscription);
                }
            }
            else {
                payment.status = "failed";
                payment.failureReason = failureReason || "Payment processing failed";
                // Update subscription status
                if (payment.subscription) {
                    payment.subscription.paymentStatus = "failed";
                    await subscriptionRepository.save(payment.subscription);
                }
            }
            return await paymentRepository.save(payment);
        });
    }
    /**
     * Get user's active subscription
     */
    async getUserActiveSubscription(userId) {
        return await this.subscriptionRepository
            .createQueryBuilder("subscription")
            .leftJoinAndSelect("subscription.plan", "plan")
            .where("subscription.admin.id = :userId", { userId })
            .andWhere("subscription.status IN (:...statuses)", {
            statuses: ["active", "trial"],
        })
            .andWhere("subscription.isDeleted = false")
            .orderBy("subscription.createdAt", "DESC")
            .getOne();
    }
    /**
     * Get user's subscription history
     */
    async getUserSubscriptionHistory(userId) {
        return await this.subscriptionRepository
            .createQueryBuilder("subscription")
            .leftJoinAndSelect("subscription.plan", "plan")
            .where("subscription.admin.id = :userId", { userId })
            .andWhere("subscription.isDeleted = false")
            .orderBy("subscription.createdAt", "DESC")
            .getMany();
    }
    /**
     * Get user's payment history
     */
    async getUserPaymentHistory(userId) {
        return await this.paymentRepository
            .createQueryBuilder("payment")
            .leftJoinAndSelect("payment.subscription", "subscription")
            .leftJoinAndSelect("subscription.plan", "plan")
            .where("payment.user.id = :userId", { userId })
            .orderBy("payment.createdAt", "DESC")
            .getMany();
    }
    async getAdminSubscriptions(userId, page = 1, limit = 20) {
        const take = Math.max(1, Math.min(limit, 100));
        const skip = Math.max(0, (Math.max(page, 1) - 1) * take);
        const query = this.subscriptionRepository
            .createQueryBuilder("subscription")
            .leftJoinAndSelect("subscription.plan", "plan")
            .where("subscription.admin.id = :userId", { userId })
            .andWhere("subscription.isDeleted = false")
            .orderBy("subscription.createdAt", "DESC");
        const [items, total] = await Promise.all([
            query.skip(skip).take(take).getMany(),
            query.getCount(),
        ]);
        const totalPages = total === 0 ? 0 : Math.ceil(total / take);
        return {
            items,
            total,
            page: Math.max(page, 1),
            limit: take,
            totalPages,
        };
    }
    async finalizeCashfreeReturn(params) {
        const { orderId, statusHint, referenceId, paymentSessionId, verifyWithGateway = true, rawQuery, } = params;
        let resolvedOrderId = (orderId ?? "").trim();
        if (!resolvedOrderId && paymentSessionId) {
            const seedPayment = await this.paymentRepository
                .createQueryBuilder("payment")
                .leftJoinAndSelect("payment.subscription", "subscription")
                .where("payment.metadata->'cashfree'->>'paymentSessionId' = :paymentSessionId", { paymentSessionId })
                .orderBy("payment.createdAt", "DESC")
                .getOne();
            if (seedPayment) {
                resolvedOrderId =
                    seedPayment.metadata?.cashfree?.orderId?.trim() || seedPayment.transactionId;
            }
        }
        if (!resolvedOrderId) {
            return { status: "ERROR", message: "Missing order reference" };
        }
        const hintedStatus = (statusHint || "").toUpperCase();
        const executeFinalize = async () => {
            const interim = await data_source_1.AppDataSource.transaction(async (manager) => {
                const paymentRepository = manager.getRepository(Payment_1.Payment);
                const subscriptionRepository = manager.getRepository(Subscription_1.Subscription);
                let payment = await paymentRepository
                    .createQueryBuilder("payment")
                    .leftJoinAndSelect("payment.subscription", "subscription")
                    .where("payment.metadata->'cashfree'->>'orderId' = :orderId", {
                    orderId: resolvedOrderId,
                })
                    .orderBy("payment.createdAt", "DESC")
                    .getOne();
                if (!payment) {
                    payment = await paymentRepository.findOne({
                        where: { transactionId: resolvedOrderId },
                        relations: ["subscription"],
                    });
                }
                if (!payment) {
                    return {
                        outcome: "NOT_FOUND",
                        status: hintedStatus || "UNKNOWN",
                        message: "Payment not found",
                    };
                }
                const existingCashfree = payment.metadata?.cashfree ?? {};
                const cashfreeMeta = {
                    ...existingCashfree,
                    orderId: resolvedOrderId,
                    paymentSessionId: paymentSessionId || existingCashfree.paymentSessionId,
                    referenceId: referenceId || existingCashfree.referenceId,
                    status: hintedStatus || existingCashfree.status || "PENDING",
                    rawReturn: rawQuery ?? existingCashfree.rawReturn,
                    verifiedAt: new Date().toISOString(),
                };
                payment.metadata = {
                    ...(payment.metadata ?? {}),
                    cashfree: cashfreeMeta,
                };
                if (cashfreeMeta.status === "PENDING" && payment.status === "pending") {
                    payment.status = "processing";
                }
                payment = await paymentRepository.save(payment);
                let effectiveStatus = cashfreeMeta.status;
                if (verifyWithGateway &&
                    (!effectiveStatus || effectiveStatus === "PENDING")) {
                    try {
                        const gatewayOrder = await cashfreePaymentService_1.cashfreePaymentService.getOrder(resolvedOrderId);
                        const gatewayStatus = String(gatewayOrder?.order_status || "").toUpperCase();
                        if (gatewayStatus) {
                            effectiveStatus = gatewayStatus;
                            cashfreeMeta.status = gatewayStatus;
                            cashfreeMeta.gatewayOrder = gatewayOrder;
                            payment.metadata = {
                                ...(payment.metadata ?? {}),
                                cashfree: cashfreeMeta,
                            };
                            payment = await paymentRepository.save(payment);
                        }
                    }
                    catch (error) {
                        loggerService_1.logger.warn("Cashfree order verification failed", {
                            orderId: resolvedOrderId,
                            error: error instanceof Error ? error.message : error,
                        });
                    }
                }
                const successStatuses = new Set(["SUCCESS", "PAID", "COMPLETED"]);
                const failureStatuses = new Set([
                    "FAILED",
                    "CANCELLED",
                    "CHARGED_BACK",
                    "EXPIRED",
                    "VOID",
                ]);
                if (successStatuses.has(effectiveStatus)) {
                    return {
                        outcome: "SUCCESS",
                        paymentId: payment.id,
                        gatewayTransactionId: referenceId || resolvedOrderId,
                        status: effectiveStatus,
                    };
                }
                if (failureStatuses.has(effectiveStatus)) {
                    return {
                        outcome: "FAILED",
                        paymentId: payment.id,
                        gatewayTransactionId: referenceId || resolvedOrderId,
                        status: effectiveStatus,
                    };
                }
                if (payment.status !== "processing") {
                    payment.status = "processing";
                    payment = await paymentRepository.save(payment);
                }
                if (payment.subscription &&
                    payment.subscription.paymentStatus !== "pending") {
                    payment.subscription.paymentStatus = "pending";
                    await subscriptionRepository.save(payment.subscription);
                }
                return {
                    outcome: "PENDING",
                    payment,
                    subscription: payment.subscription ?? null,
                    status: effectiveStatus || "PENDING",
                };
            });
            if (interim.outcome === "NOT_FOUND") {
                return {
                    status: "NOT_FOUND",
                    message: interim.message,
                    cashfreeStatus: interim.status,
                };
            }
            if (interim.outcome === "SUCCESS") {
                const updatedPayment = await this.processPayment(interim.paymentId, interim.gatewayTransactionId, true);
                return {
                    status: "SUCCESS",
                    payment: updatedPayment,
                    subscription: updatedPayment.subscription,
                    cashfreeStatus: interim.status,
                };
            }
            if (interim.outcome === "FAILED") {
                const updatedPayment = await this.processPayment(interim.paymentId, interim.gatewayTransactionId, false, `Cashfree status: ${interim.status}`);
                return {
                    status: "FAILED",
                    payment: updatedPayment,
                    subscription: updatedPayment.subscription,
                    cashfreeStatus: interim.status,
                };
            }
            return {
                status: "PENDING",
                payment: interim.payment ?? null,
                subscription: interim.subscription ?? null,
                cashfreeStatus: interim.status,
            };
        };
        try {
            return await executeFinalize();
        }
        catch (error) {
            if (error instanceof typeorm_1.TypeORMError &&
                typeof error.message === "string" &&
                error.message.includes("Driver not Connected")) {
                try {
                    if (data_source_1.AppDataSource.isInitialized) {
                        await data_source_1.AppDataSource.destroy();
                    }
                }
                catch (destroyError) {
                    loggerService_1.logger.warn("Failed to destroy data source after driver disconnect", {
                        error: destroyError instanceof Error
                            ? destroyError.message
                            : destroyError,
                    });
                }
                await data_source_1.AppDataSource.initialize();
                return await executeFinalize();
            }
            loggerService_1.logger.error("Failed to finalize Cashfree return", error, {
                orderId: resolvedOrderId,
            });
            return {
                status: "ERROR",
                message: error instanceof Error ? error.message : "Failed to finalize payment",
                cashfreeStatus: hintedStatus || "UNKNOWN",
            };
        }
    }
    /**
     * Cancel subscription
     */
    async cancelSubscription(subscriptionId, reason) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new Error("Subscription not found");
        }
        subscription.status = "cancelled";
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = reason || "User cancelled";
        subscription.autoRenew = false;
        return await this.subscriptionRepository.save(subscription);
    }
    /**
     * Renew subscription
     */
    async renewSubscription(subscriptionId, paymentMethod) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const subscriptionRepository = manager.getRepository(Subscription_1.Subscription);
            const paymentRepository = manager.getRepository(Payment_1.Payment);
            const subscription = await subscriptionRepository.findOne({
                where: { id: subscriptionId },
                relations: ["plan", "admin"],
            });
            if (!subscription) {
                throw new Error("Subscription not found");
            }
            if (!subscription.canRenew()) {
                throw new Error("Subscription cannot be renewed");
            }
            // Calculate new dates
            const newStartDate = new Date();
            const newEndDate = this.calculateEndDate(newStartDate, subscription.billingCycle);
            subscription.startDate = newStartDate;
            subscription.endDate = newEndDate;
            subscription.nextBillingDate = newEndDate;
            subscription.status = "active";
            subscription.paymentStatus = "pending";
            const savedSubscription = await subscriptionRepository.save(subscription);
            // Create payment record if subscription requires payment
            let payment = null;
            if (subscription.amount > 0) {
                payment = paymentRepository.create({
                    transactionId: this.generateTransactionId(),
                    user: subscription.admin,
                    subscription: savedSubscription,
                    type: "subscription",
                    amount: subscription.amount,
                    currency: "USD",
                    status: "pending",
                    paymentMethod: paymentMethod || "stripe",
                    description: `Subscription renewal for ${subscription.plan.name} plan`,
                    metadata: {
                        renewalDate: newStartDate.toISOString(),
                        billingCycle: subscription.billingCycle,
                    },
                });
                payment = await paymentRepository.save(payment);
            }
            return { subscription: savedSubscription, payment };
        });
    }
    /**
     * Check subscription limits
     */
    async checkSubscriptionLimits(userId, resource, currentUsage) {
        const subscription = await this.getUserActiveSubscription(userId);
        if (!subscription) {
            return { allowed: false, limit: 0, usage: currentUsage, remaining: 0 };
        }
        const limits = {
            gateways: subscription.gatewayLimit,
            parkingLots: subscription.parkingLotLimit,
            floors: subscription.floorLimit,
            parkingSlots: subscription.parkingSlotLimit,
            users: subscription.userLimit,
        };
        const limit = limits[resource];
        const remaining = Math.max(0, limit - currentUsage);
        const allowed = currentUsage < limit;
        return { allowed, limit, usage: currentUsage, remaining };
    }
    /**
     * Get subscription analytics
     */
    async getSubscriptionAnalytics(userId) {
        const activeSubscription = await this.getUserActiveSubscription(userId);
        const payments = await this.getUserPaymentHistory(userId);
        const totalSpent = payments
            .filter((p) => p.status === "completed")
            .reduce((sum, p) => sum + Number(p.amount), 0);
        const paymentCount = payments.filter((p) => p.status === "completed").length;
        return {
            activeSubscription,
            totalSpent,
            paymentCount,
            nextBillingDate: activeSubscription?.nextBillingDate || null,
            daysUntilExpiry: activeSubscription?.daysUntilExpiry || null,
        };
    }
    /**
     * Get all active subscriptions (admin only)
     */
    async getAllActiveSubscriptions() {
        return await this.subscriptionRepository
            .createQueryBuilder("subscription")
            .leftJoinAndSelect("subscription.admin", "admin")
            .leftJoinAndSelect("subscription.plan", "plan")
            .where("subscription.status IN (:...statuses)", {
            statuses: ["active", "trial"],
        })
            .andWhere("subscription.isDeleted = false")
            .orderBy("subscription.createdAt", "DESC")
            .getMany();
    }
    /**
     * Get expiring subscriptions
     */
    async getExpiringSubscriptions(daysThreshold = 7) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thresholdDate = new Date(today);
        thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
        return await this.subscriptionRepository
            .createQueryBuilder("subscription")
            .leftJoinAndSelect("subscription.admin", "admin")
            .leftJoinAndSelect("subscription.plan", "plan")
            .where("subscription.status = :status", { status: "active" })
            .andWhere("subscription.endDate <= :thresholdDate", { thresholdDate })
            .andWhere("subscription.isDeleted = false")
            .orderBy("subscription.endDate", "ASC")
            .getMany();
    }
    /**
     * Calculate end date based on billing cycle
     */
    calculateEndDate(startDate, billingCycle) {
        const endDate = new Date(startDate);
        switch (billingCycle) {
            case "monthly":
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case "quarterly":
                endDate.setMonth(endDate.getMonth() + 3);
                break;
            case "yearly":
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
        }
        return endDate;
    }
    /**
     * Process refund for payment
     */
    async processRefund(paymentId, refundAmount, reason) {
        return await data_source_1.AppDataSource.transaction(async (manager) => {
            const paymentRepository = manager.getRepository(Payment_1.Payment);
            const subscriptionRepository = manager.getRepository(Subscription_1.Subscription);
            const payment = await paymentRepository.findOne({
                where: { id: paymentId },
                relations: ["subscription"],
            });
            if (!payment) {
                throw new Error("Payment not found");
            }
            if (!payment.canRefund()) {
                throw new Error("Payment cannot be refunded");
            }
            const refundAmountFinal = refundAmount || Number(payment.amount);
            if (refundAmountFinal > Number(payment.amount)) {
                throw new Error("Refund amount cannot exceed payment amount");
            }
            payment.status = "refunded";
            payment.refundAmount = refundAmountFinal;
            payment.refundedAt = new Date();
            payment.refundReason = reason || "Refund processed";
            // Update subscription if fully refunded
            if (payment.subscription &&
                refundAmountFinal === Number(payment.amount)) {
                payment.subscription.status = "cancelled";
                payment.subscription.paymentStatus = "refunded";
                payment.subscription.cancelledAt = new Date();
                payment.subscription.cancellationReason = reason || "Refunded";
                await subscriptionRepository.save(payment.subscription);
            }
            return await paymentRepository.save(payment);
        });
    }
    /**
     * Handle webhook from payment gateway
     */
    async handleWebhook(gatewayTransactionId, status, metadata = {}) {
        // First try to find by direct gatewayTransactionId field
        let payment = await this.paymentRepository
            .createQueryBuilder("payment")
            .leftJoinAndSelect("payment.subscription", "subscription")
            .leftJoinAndSelect("payment.user", "user")
            .where("payment.metadata->>'gatewayTransactionId' = :gatewayTransactionId", { gatewayTransactionId })
            .getOne();
        // If not found, try to find by transactionId (fallback)
        if (!payment) {
            payment = await this.paymentRepository.findOne({
                where: { transactionId: gatewayTransactionId },
                relations: ["subscription", "user"],
            });
        }
        if (!payment) {
            console.warn(`Webhook received for unknown transaction: ${gatewayTransactionId}`);
            return;
        }
        console.log(`Processing webhook for payment ${payment.id} with status: ${status}`);
        const success = ["completed", "succeeded", "paid"].includes(status.toLowerCase());
        const failed = ["failed", "cancelled", "declined"].includes(status.toLowerCase());
        if (success) {
            await this.processPayment(payment.id, gatewayTransactionId, true);
        }
        else if (failed) {
            await this.processPayment(payment.id, gatewayTransactionId, false, `Webhook status: ${status}`);
        }
        else {
            console.log(`Webhook status '${status}' not handled for transaction: ${gatewayTransactionId}`);
        }
    }
    /**
     * Get payment by transaction ID
     */
    async getPaymentByTransactionId(transactionId) {
        return await this.paymentRepository.findOne({
            where: { transactionId },
            relations: ["subscription", "user"],
        });
    }
    async getPaymentById(id) {
        return await this.paymentRepository.findOne({
            where: { id },
            relations: ["subscription", "user"],
        });
    }
    /**
     * Update subscription usage tracking
     */
    async updateUsageTracking(subscriptionId, usage) {
        const subscription = await this.subscriptionRepository.findOne({
            where: { id: subscriptionId },
        });
        if (!subscription) {
            throw new Error("Subscription not found");
        }
        subscription.metadata = {
            ...subscription.metadata,
            usage,
            lastUsageUpdate: new Date().toISOString(),
        };
        await this.subscriptionRepository.save(subscription);
    }
    /**
     * Auto-expire subscriptions
     */
    async processExpiredSubscriptions() {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const expiredSubscriptions = await this.subscriptionRepository.find({
            where: {
                status: (0, typeorm_1.In)(["active", "trial"]),
                endDate: (0, typeorm_1.LessThanOrEqual)(today),
            },
        });
        for (const subscription of expiredSubscriptions) {
            subscription.status = "expired";
            await this.subscriptionRepository.save(subscription);
        }
        console.log(`Processed ${expiredSubscriptions.length} expired subscriptions`);
    }
    /**
     * Generate unique transaction ID
     */
    generateTransactionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2);
        return `txn_${timestamp}_${random}`.toUpperCase();
    }
}
exports.SubscriptionService = SubscriptionService;
exports.subscriptionService = new SubscriptionService();
