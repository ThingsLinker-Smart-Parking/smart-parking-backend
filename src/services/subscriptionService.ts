import { AppDataSource } from "../data-source";
import {
  Subscription,
  SubscriptionStatus,
  PaymentStatus,
} from "../models/Subscription";
import { SubscriptionPlan, BillingCycle } from "../models/SubscriptionPlan";
import { Payment, PaymentMethod, PaymentType } from "../models/Payment";
import { User } from "../models/User";
import {
  In,
  MoreThanOrEqual,
  LessThanOrEqual,
  ILike,
  Repository,
  TypeORMError,
} from "typeorm";
import { cashfreePaymentService } from "./cashfreePaymentService";
import { logger } from "./loggerService";
import { env } from "../config/environment";
import { validateUuid } from "../utils/validation";

export interface CreateSubscriptionData {
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
  nodeCount?: number;
  autoRenew?: boolean;
  trialDays?: number;
}

export interface SubscriptionUsage {
  gateways: number;
  parkingLots: number;
  floors: number;
  parkingSlots: number;
  users: number;
}

export interface CreatePaymentSessionData {
  userId: string;
  planId: string;
  billingCycle: BillingCycle;
  nodeCount?: number;
  returnUrl?: string;
}

export class SubscriptionService {
  private subscriptionRepository = AppDataSource.getRepository(Subscription);
  private planRepository = AppDataSource.getRepository(SubscriptionPlan);
  private paymentRepository = AppDataSource.getRepository(Payment);
  private userRepository = AppDataSource.getRepository(User);

  private async findPlanByIdentifier(
    planRepository: Repository<SubscriptionPlan>,
    identifier: string,
  ): Promise<SubscriptionPlan | null> {
    if (!identifier) {
      return null;
    }

    const trimmed = identifier.trim();
    if (!trimmed) {
      return null;
    }

    if (validateUuid(trimmed)) {
      const planById = await planRepository.findOne({
        where: { id: trimmed, isActive: true, isDeleted: false },
      });
      if (planById) {
        return planById;
      }
    }

    const normalized = trimmed.toLowerCase();
    const variants: string[] = [normalized];

    if (normalized.includes("-") || normalized.includes("_")) {
      variants.push(normalized.replace(/[-_]+/g, " "));
    }

    for (const variant of variants) {
      const planByName = await planRepository.findOne({
        where: {
          name: ILike(variant),
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
  async createSubscription(
    data: CreateSubscriptionData,
  ): Promise<{ subscription: Subscription; payment: Payment }> {
    return await AppDataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const planRepository = manager.getRepository(SubscriptionPlan);
      const subscriptionRepository = manager.getRepository(Subscription);
      const paymentRepository = manager.getRepository(Payment);

      const user = await userRepository.findOne({ where: { id: data.userId } });
      if (!user) {
        throw new Error("User not found");
      }

      const plan = await this.findPlanByIdentifier(planRepository, data.planId);
      if (!plan) {
        throw new Error("Subscription plan not found or inactive");
      }

      // Cancel any old pending subscriptions to allow retry
      await subscriptionRepository.update(
        {
          admin: { id: data.userId },
          status: "pending",
        },
        {
          status: "cancelled",
        }
      );

      // Check for existing active subscription (exclude pending - allow retry on failed/cancelled payments)
      const existingSubscription = await subscriptionRepository.findOne({
        where: {
          admin: { id: data.userId },
          status: In(["active", "trial"]),
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
        amount: plan.getTotalPriceForCycle(
          data.billingCycle,
          data.nodeCount || 0,
        ),
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

  async createPaymentSession(data: CreatePaymentSessionData): Promise<{
    paymentSessionId: string;
    orderId: string;
    cfOrderId: number;
    orderAmount: number;
    orderCurrency: string;
    paymentId: string;
    subscriptionId: string;
    plan: {
      id: string;
      name: string;
      billingCycle: BillingCycle;
      amountUsd: number;
      amountInInr: number;
    };
    returnUrl: string;
  }> {
    return await AppDataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const planRepository = manager.getRepository(SubscriptionPlan);
      const subscriptionRepository = manager.getRepository(Subscription);
      const paymentRepository = manager.getRepository(Payment);

      const user = await userRepository.findOne({ where: { id: data.userId } });
      if (!user) {
        throw new Error("User not found");
      }

      const plan = await this.findPlanByIdentifier(planRepository, data.planId);
      if (!plan) {
        throw new Error("Subscription plan not found or inactive");
      }

      // Cancel any old pending subscriptions to allow retry
      await subscriptionRepository.update(
        {
          admin: { id: data.userId },
          status: "pending",
        },
        {
          status: "cancelled",
        }
      );

      // Check for existing active subscription (exclude pending - allow retry on failed/cancelled payments)
      const existingSubscription = await subscriptionRepository.findOne({
        where: {
          admin: { id: data.userId },
          status: In(["active", "trial"]),
        },
      });

      if (existingSubscription) {
        throw new Error("User already has an active subscription");
      }

      const nodeCount = data.nodeCount ?? 0;
      const amountUsd = plan.getTotalPriceForCycle(
        data.billingCycle,
        nodeCount,
      );
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
          environment: env.CASHFREE_ENVIRONMENT,
        },
      });

      const order = await cashfreePaymentService.createOrder({
        orderId: transactionId,
        amount: amountInInr,
        currency: "INR",
        customerId: user.id,
        customerEmail: user.email,
        customerName: user.getFullName(),
        returnUrl: data.returnUrl ?? env.CASHFREE_RETURN_URL,
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

      const finalReturnUrl = (data.returnUrl ?? env.CASHFREE_RETURN_URL)
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
  async processPayment(
    paymentId: string,
    gatewayTransactionId: string,
    success: boolean,
    failureReason?: string,
  ): Promise<Payment> {
    return await AppDataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(Payment);
      const subscriptionRepository = manager.getRepository(Subscription);

      const payment = await paymentRepository.findOne({
        where: { id: paymentId },
        relations: ["subscription", "user"],
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.status === "completed") {
        // Payment was already successfully processed - return the existing payment
        logger.info("Payment already completed, returning existing record", {
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

          // If this is an upgrade, cancel the old subscription
          if (payment.type === 'subscription_upgrade' && payment.metadata?.oldSubscriptionId) {
            const oldSubscription = await subscriptionRepository.findOne({
              where: { id: payment.metadata.oldSubscriptionId },
            });

            if (oldSubscription && oldSubscription.status === 'active') {
              oldSubscription.status = 'cancelled';
              oldSubscription.cancelledAt = new Date();
              await subscriptionRepository.save(oldSubscription);

              logger.info('Old subscription cancelled after upgrade', {
                oldSubscriptionId: oldSubscription.id,
                newSubscriptionId: payment.subscription.id,
                paymentId: payment.id,
              });
            }
          }
        }
      } else {
        payment.status = "failed";
        payment.failureReason = failureReason || "Payment processing failed";

        // Update subscription status
        if (payment.subscription) {
          payment.subscription.paymentStatus = "failed";
          payment.subscription.status = "cancelled";
          await subscriptionRepository.save(payment.subscription);

          logger.info('Pending subscription cancelled after payment failure', {
            subscriptionId: payment.subscription.id,
            paymentId: payment.id,
            isUpgrade: payment.type === 'subscription_upgrade',
          });
        }
      }

      return await paymentRepository.save(payment);
    });
  }

  /**
   * Get user's active subscription
   */
  async getUserActiveSubscription(
    userId: string,
  ): Promise<Subscription | null> {
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
  async getUserSubscriptionHistory(userId: string): Promise<Subscription[]> {
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
  async getUserPaymentHistory(userId: string): Promise<Payment[]> {
    return await this.paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.subscription", "subscription")
      .leftJoinAndSelect("subscription.plan", "plan")
      .where("payment.user.id = :userId", { userId })
      .orderBy("payment.createdAt", "DESC")
      .getMany();
  }

  async getAdminSubscriptions(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: Subscription[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
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

  async finalizeCashfreeReturn(params: {
    orderId: string;
    statusHint?: string;
    referenceId?: string;
    paymentSessionId?: string;
    verifyWithGateway?: boolean;
    rawQuery?: Record<string, any>;
  }): Promise<{
    status: "SUCCESS" | "FAILED" | "PENDING" | "NOT_FOUND" | "ERROR";
    payment?: Payment | null;
    subscription?: Subscription | null;
    cashfreeStatus?: string;
    message?: string;
  }> {
    const {
      orderId,
      statusHint,
      referenceId,
      paymentSessionId,
      verifyWithGateway = true,
      rawQuery,
    } = params;

    let resolvedOrderId = (orderId ?? "").trim();
    if (!resolvedOrderId && paymentSessionId) {
      const seedPayment = await this.paymentRepository
        .createQueryBuilder("payment")
        .leftJoinAndSelect("payment.subscription", "subscription")
        .where(
          "payment.metadata->'cashfree'->>'paymentSessionId' = :paymentSessionId",
          { paymentSessionId },
        )
        .orderBy("payment.createdAt", "DESC")
        .getOne();

      if (seedPayment) {
        resolvedOrderId =
          (
            seedPayment.metadata?.cashfree?.orderId as string | undefined
          )?.trim() || seedPayment.transactionId;
      }
    }

    if (!resolvedOrderId) {
      return { status: "ERROR", message: "Missing order reference" };
    }

    const hintedStatus = (statusHint || "").toUpperCase();

    const executeFinalize = async (): Promise<{
      status: "SUCCESS" | "FAILED" | "PENDING" | "NOT_FOUND" | "ERROR";
      payment?: Payment | null;
      subscription?: Subscription | null;
      cashfreeStatus?: string;
      message?: string;
    }> => {
      type InterimResult =
        | { outcome: "NOT_FOUND"; status: string; message: string }
        | {
            outcome: "SUCCESS";
            paymentId: string;
            gatewayTransactionId: string;
            status: string;
          }
        | {
            outcome: "FAILED";
            paymentId: string;
            gatewayTransactionId: string;
            status: string;
          }
        | {
            outcome: "PENDING";
            payment: Payment;
            subscription: Subscription | null;
            status: string;
          };

      const interim = await AppDataSource.transaction(async (manager) => {
        const paymentRepository = manager.getRepository(Payment);
        const subscriptionRepository = manager.getRepository(Subscription);

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
          } as InterimResult;
        }

        const existingCashfree = payment.metadata?.cashfree ?? {};
        const cashfreeMeta = {
          ...existingCashfree,
          orderId: resolvedOrderId,
          paymentSessionId:
            paymentSessionId || existingCashfree.paymentSessionId,
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

        if (
          verifyWithGateway &&
          (!effectiveStatus || effectiveStatus === "PENDING")
        ) {
          try {
            const gatewayOrder =
              await cashfreePaymentService.getOrder(resolvedOrderId);
            const gatewayStatus = String(
              gatewayOrder?.order_status || "",
            ).toUpperCase();
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
          } catch (error) {
            logger.warn("Cashfree order verification failed", {
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
          } as InterimResult;
        }

        if (failureStatuses.has(effectiveStatus)) {
          return {
            outcome: "FAILED",
            paymentId: payment.id,
            gatewayTransactionId: referenceId || resolvedOrderId,
            status: effectiveStatus,
          } as InterimResult;
        }

        if (payment.status !== "processing") {
          payment.status = "processing";
          payment = await paymentRepository.save(payment);
        }

        if (
          payment.subscription &&
          payment.subscription.paymentStatus !== "pending"
        ) {
          payment.subscription.paymentStatus = "pending";
          await subscriptionRepository.save(payment.subscription);
        }

        return {
          outcome: "PENDING",
          payment,
          subscription: payment.subscription ?? null,
          status: effectiveStatus || "PENDING",
        } as InterimResult;
      });

      if (interim.outcome === "NOT_FOUND") {
        return {
          status: "NOT_FOUND",
          message: interim.message,
          cashfreeStatus: interim.status,
        };
      }

      if (interim.outcome === "SUCCESS") {
        const updatedPayment = await this.processPayment(
          interim.paymentId,
          interim.gatewayTransactionId,
          true,
        );
        return {
          status: "SUCCESS",
          payment: updatedPayment,
          subscription: updatedPayment.subscription,
          cashfreeStatus: interim.status,
        };
      }

      if (interim.outcome === "FAILED") {
        const updatedPayment = await this.processPayment(
          interim.paymentId,
          interim.gatewayTransactionId,
          false,
          `Cashfree status: ${interim.status}`,
        );
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
    } catch (error) {
      if (
        error instanceof TypeORMError &&
        typeof error.message === "string" &&
        error.message.includes("Driver not Connected")
      ) {
        try {
          if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
          }
        } catch (destroyError) {
          logger.warn("Failed to destroy data source after driver disconnect", {
            error:
              destroyError instanceof Error
                ? destroyError.message
                : destroyError,
          });
        }

        await AppDataSource.initialize();
        return await executeFinalize();
      }

      logger.error("Failed to finalize Cashfree return", error, {
        orderId: resolvedOrderId,
      });
      return {
        status: "ERROR",
        message:
          error instanceof Error ? error.message : "Failed to finalize payment",
        cashfreeStatus: hintedStatus || "UNKNOWN",
      };
    }
  }
  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    reason?: string,
  ): Promise<Subscription> {
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
  async renewSubscription(
    subscriptionId: string,
    paymentMethod?: PaymentMethod,
  ): Promise<{ subscription: Subscription; payment: Payment | null }> {
    return await AppDataSource.transaction(async (manager) => {
      const subscriptionRepository = manager.getRepository(Subscription);
      const paymentRepository = manager.getRepository(Payment);

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
      const newEndDate = this.calculateEndDate(
        newStartDate,
        subscription.billingCycle,
      );

      subscription.startDate = newStartDate;
      subscription.endDate = newEndDate;
      subscription.nextBillingDate = newEndDate;
      subscription.status = "active";
      subscription.paymentStatus = "pending";

      const savedSubscription = await subscriptionRepository.save(subscription);

      // Create payment record if subscription requires payment
      let payment: Payment | null = null;
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
  async checkSubscriptionLimits(
    userId: string,
    resource: keyof SubscriptionUsage,
    currentUsage: number,
  ): Promise<{
    allowed: boolean;
    limit: number;
    usage: number;
    remaining: number;
  }> {
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
  async getSubscriptionAnalytics(userId: string): Promise<{
    activeSubscription: Subscription | null;
    totalSpent: number;
    paymentCount: number;
    nextBillingDate: Date | null;
    daysUntilExpiry: number | null;
  }> {
    const activeSubscription = await this.getUserActiveSubscription(userId);
    const payments = await this.getUserPaymentHistory(userId);

    const totalSpent = payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const paymentCount = payments.filter(
      (p) => p.status === "completed",
    ).length;

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
  async getAllActiveSubscriptions(): Promise<Subscription[]> {
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
   * Get all subscriptions with pagination (Super Admin only)
   */
  async getAllSubscriptions(options: {
    page?: number;
    limit?: number;
    status?: SubscriptionStatus;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<{ data: Subscription[]; pagination: any }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "DESC";

    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder("subscription")
      .leftJoinAndSelect("subscription.admin", "admin")
      .leftJoinAndSelect("subscription.plan", "plan")
      .where("subscription.isDeleted = false");

    // Add status filter if provided
    if (options.status) {
      queryBuilder.andWhere("subscription.status = :status", {
        status: options.status,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply sorting and pagination
    const subscriptions = await queryBuilder
      .orderBy(`subscription.${sortBy}`, sortOrder)
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      data: subscriptions,
      pagination: {
        total,
        count: subscriptions.length,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Get expiring subscriptions
   */
  async getExpiringSubscriptions(
    daysThreshold: number = 7,
  ): Promise<Subscription[]> {
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
  private calculateEndDate(startDate: Date, billingCycle: BillingCycle): Date {
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
  async processRefund(
    paymentId: string,
    refundAmount?: number,
    reason?: string,
  ): Promise<Payment> {
    return await AppDataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(Payment);
      const subscriptionRepository = manager.getRepository(Subscription);

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
      if (
        payment.subscription &&
        refundAmountFinal === Number(payment.amount)
      ) {
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
  async handleWebhook(
    gatewayTransactionId: string,
    status: string,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    // First try to find by direct gatewayTransactionId field
    let payment = await this.paymentRepository
      .createQueryBuilder("payment")
      .leftJoinAndSelect("payment.subscription", "subscription")
      .leftJoinAndSelect("payment.user", "user")
      .where(
        "payment.metadata->>'gatewayTransactionId' = :gatewayTransactionId",
        { gatewayTransactionId },
      )
      .getOne();

    // If not found, try to find by transactionId (fallback)
    if (!payment) {
      payment = await this.paymentRepository.findOne({
        where: { transactionId: gatewayTransactionId },
        relations: ["subscription", "user"],
      });
    }

    if (!payment) {
      console.warn(
        `Webhook received for unknown transaction: ${gatewayTransactionId}`,
      );
      return;
    }

    console.log(
      `Processing webhook for payment ${payment.id} with status: ${status}`,
    );

    const success = ["completed", "succeeded", "paid"].includes(
      status.toLowerCase(),
    );
    const failed = ["failed", "cancelled", "declined"].includes(
      status.toLowerCase(),
    );

    if (success) {
      await this.processPayment(payment.id, gatewayTransactionId, true);
    } else if (failed) {
      await this.processPayment(
        payment.id,
        gatewayTransactionId,
        false,
        `Webhook status: ${status}`,
      );
    } else {
      console.log(
        `Webhook status '${status}' not handled for transaction: ${gatewayTransactionId}`,
      );
    }
  }

  /**
   * Get payment by transaction ID
   */
  async getPaymentByTransactionId(
    transactionId: string,
  ): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { transactionId },
      relations: ["subscription", "user"],
    });
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return await this.paymentRepository.findOne({
      where: { id },
      relations: ["subscription", "user"],
    });
  }

  /**
   * Update subscription usage tracking
   */
  async updateUsageTracking(
    subscriptionId: string,
    usage: Partial<SubscriptionUsage>,
  ): Promise<void> {
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
  async processExpiredSubscriptions(): Promise<void> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: In(["active", "trial"]),
        endDate: LessThanOrEqual(today),
      },
    });

    for (const subscription of expiredSubscriptions) {
      subscription.status = "expired";
      await this.subscriptionRepository.save(subscription);
    }

    console.log(
      `Processed ${expiredSubscriptions.length} expired subscriptions`,
    );
  }

  /**
   * Calculate prorated credit from current subscription
   */
  private calculateProratedCredit(
    currentSubscription: Subscription,
    currentPlan: SubscriptionPlan
  ): { creditAmount: number; remainingDays: number } {
    const now = new Date();
    const endDate = new Date(currentSubscription.endDate);
    const startDate = new Date(currentSubscription.startDate);

    // Calculate remaining days
    const remainingMs = endDate.getTime() - now.getTime();
    const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));

    if (remainingDays <= 0) {
      return { creditAmount: 0, remainingDays: 0 };
    }

    // Calculate total days in billing period
    const totalMs = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));

    // Get current plan price
    const currentPlanPrice = currentPlan.getPriceInInr(
      currentSubscription.billingCycle as BillingCycle,
      0 // No node count for base calculation
    );

    // Calculate prorated credit
    const creditAmount = (currentPlanPrice * remainingDays) / totalDays;

    return {
      creditAmount: Math.round(creditAmount * 100) / 100, // Round to 2 decimal places
      remainingDays,
    };
  }

  /**
   * Upgrade subscription with prorated credit
   */
  async upgradeSubscription(data: {
    userId: string;
    newPlanId: string;
    newBillingCycle: BillingCycle;
    nodeCount?: number;
  }): Promise<{
    newSubscription: Subscription;
    proratedCredit: number;
    remainingDays: number;
    originalPrice: number;
    finalPrice: number;
    paymentSessionId?: string;
    orderId?: string;
  }> {
    const userRepository = AppDataSource.getRepository(User);
    const planRepository = AppDataSource.getRepository(SubscriptionPlan);
    const subscriptionRepository = this.subscriptionRepository;

    // Get user
    const user = await userRepository.findOne({
      where: { id: data.userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get current active subscription
    const currentSubscription = await subscriptionRepository.findOne({
      where: {
        admin: { id: data.userId },
        status: In(["active", "trial"]),
      },
      relations: ["plan"],
    });

    if (!currentSubscription) {
      throw new Error("No active subscription found to upgrade");
    }

    // Get new plan
    const newPlan = await this.findPlanByIdentifier(
      planRepository,
      data.newPlanId
    );

    if (!newPlan) {
      throw new Error("New subscription plan not found or inactive");
    }

    // Check if it's actually an upgrade (not same plan)
    if (currentSubscription.plan.id === newPlan.id &&
        currentSubscription.billingCycle === data.newBillingCycle) {
      throw new Error("You are already subscribed to this plan and billing cycle");
    }

    // Calculate prorated credit
    const { creditAmount, remainingDays } = this.calculateProratedCredit(
      currentSubscription,
      currentSubscription.plan
    );

    // Calculate new plan price
    const nodeCount = data.nodeCount ?? 0;
    const originalPrice = newPlan.getPriceInInr(data.newBillingCycle, nodeCount);

    // Calculate final price after credit
    const finalPrice = Math.max(0, originalPrice - creditAmount);

    // If final price is 0 or very small, activate immediately without payment
    if (finalPrice < 1) {
      // Cancel current subscription only when activating new one
      currentSubscription.status = 'cancelled';
      currentSubscription.cancelledAt = new Date();
      await subscriptionRepository.save(currentSubscription);

      const startDate = new Date();
      const endDate = this.calculateEndDate(startDate, data.newBillingCycle);

      const newSubscription = subscriptionRepository.create({
        admin: user,
        plan: newPlan,
        startDate,
        endDate,
        status: 'active',
        billingCycle: data.newBillingCycle,
        amount: originalPrice,
        paymentStatus: 'paid',
        gatewayLimit: newPlan.maxGateways,
        parkingLotLimit: newPlan.maxParkingLots,
        floorLimit: newPlan.maxFloors,
        parkingSlotLimit: newPlan.maxParkingSlots,
        userLimit: newPlan.maxUsers,
        autoRenew: true,
      });

      await subscriptionRepository.save(newSubscription);

      return {
        newSubscription,
        proratedCredit: creditAmount,
        remainingDays,
        originalPrice,
        finalPrice: 0,
      };
    }

    // Create payment session for the difference
    const amountInr = finalPrice;

    const startDate = new Date();
    const endDate = this.calculateEndDate(startDate, data.newBillingCycle);

    // Create pending subscription
    const newSubscription = subscriptionRepository.create({
      admin: user,
      plan: newPlan,
      startDate,
      endDate,
      status: 'pending',
      billingCycle: data.newBillingCycle,
      amount: originalPrice,
      paymentStatus: 'pending',
      gatewayLimit: newPlan.maxGateways,
      parkingLotLimit: newPlan.maxParkingLots,
      floorLimit: newPlan.maxFloors,
      parkingSlotLimit: newPlan.maxParkingSlots,
      userLimit: newPlan.maxUsers,
      autoRenew: true,
    });

    await subscriptionRepository.save(newSubscription);

    // Generate unique transaction ID
    const transactionId = this.generateTransactionId();

    // Create Cashfree payment order
    const cashfreeResponse = await cashfreePaymentService.createOrder({
      orderId: transactionId,
      amount: amountInr,
      currency: "INR",
      customerId: user.id,
      customerEmail: user.email,
      customerPhone: "9999999999", // Default phone as User model doesn't have phone field
      orderNote: `Subscription upgrade to ${newPlan.name}`,
    });

    // Create payment record
    const paymentRepository = AppDataSource.getRepository(Payment);
    const payment = paymentRepository.create({
      subscription: newSubscription,
      user: user,
      transactionId: cashfreeResponse.order_id,
      type: 'subscription_upgrade',
      amount: amountInr,
      currency: "INR",
      paymentMethod: 'cashfree',
      status: 'pending',
      metadata: {
        proratedCredit: creditAmount,
        remainingDays,
        originalPrice,
        finalPrice,
        oldSubscriptionId: currentSubscription.id,
        cfOrderId: cashfreeResponse.cf_order_id,
        paymentSessionId: cashfreeResponse.payment_session_id,
      },
    });

    await paymentRepository.save(payment);

    return {
      newSubscription,
      proratedCredit: creditAmount,
      remainingDays,
      originalPrice,
      finalPrice,
      paymentSessionId: cashfreeResponse.payment_session_id,
      orderId: cashfreeResponse.order_id,
    };
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2);
    return `txn_${timestamp}_${random}`.toUpperCase();
  }
}

export const subscriptionService = new SubscriptionService();
