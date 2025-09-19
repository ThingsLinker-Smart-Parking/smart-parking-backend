"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriptionStatus = exports.checkFeatureLimit = exports.requireActiveSubscription = void 0;
const data_source_1 = require("../data-source");
const Subscription_1 = require("../models/Subscription");
const SubscriptionPlan_1 = require("../models/SubscriptionPlan");
const loggerService_1 = require("../services/loggerService");
/**
 * Middleware to check if user has an active subscription
 * Blocks access if subscription is expired or inactive
 */
const requireActiveSubscription = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }
        // Super admins bypass subscription checks
        if (req.user.role === 'super_admin') {
            return next();
        }
        // Regular users don't need subscription for basic read operations
        if (req.user.role === 'user') {
            return next();
        }
        const subscriptionRepository = data_source_1.AppDataSource.getRepository(Subscription_1.Subscription);
        const planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_1.SubscriptionPlan);
        // Find active subscription for admin/user
        const activeSubscription = await subscriptionRepository
            .createQueryBuilder('subscription')
            .leftJoinAndSelect('subscription.plan', 'plan')
            .where('subscription.userId = :userId', { userId: req.user.id })
            .andWhere('subscription.status = :status', { status: 'active' })
            .andWhere('subscription.endDate > :now', { now: new Date() })
            .orderBy('subscription.endDate', 'DESC')
            .getOne();
        if (!activeSubscription) {
            return res.status(403).json({
                success: false,
                message: 'Active subscription required to access this feature',
                code: 'SUBSCRIPTION_REQUIRED',
                action: 'SUBSCRIBE'
            });
        }
        // Check if subscription is actually active and not expired
        if (activeSubscription.status !== 'active' ||
            new Date() > activeSubscription.endDate) {
            return res.status(403).json({
                success: false,
                message: 'Your subscription has expired. Please renew to continue.',
                code: 'SUBSCRIPTION_EXPIRED',
                action: 'RENEW'
            });
        }
        // Attach subscription info to request
        req.subscription = activeSubscription;
        req.subscriptionPlan = activeSubscription.plan;
        req.subscriptionLimits = {
            gateways: activeSubscription.plan.maxGateways,
            parkingLots: activeSubscription.plan.maxParkingLots,
            floors: activeSubscription.plan.maxFloors,
            parkingSlots: activeSubscription.plan.maxParkingSlots,
            users: activeSubscription.plan.maxUsers
        };
        next();
    }
    catch (error) {
        loggerService_1.logger.error('Subscription middleware error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
};
exports.requireActiveSubscription = requireActiveSubscription;
/**
 * Middleware to check specific feature limits
 */
const checkFeatureLimit = (feature) => {
    return async (req, res, next) => {
        try {
            // Super admins bypass all limits
            if (req.user?.role === 'super_admin') {
                return next();
            }
            if (!req.subscription || !req.subscriptionLimits) {
                return res.status(403).json({
                    success: false,
                    message: 'Subscription information not available',
                    code: 'SUBSCRIPTION_INFO_MISSING'
                });
            }
            const limit = req.subscriptionLimits[feature];
            if (limit === -1) {
                // Unlimited
                return next();
            }
            // Count current usage based on feature
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }
            const currentCount = await getCurrentUsageCount(req.user.id, feature);
            if (currentCount >= limit) {
                return res.status(403).json({
                    success: false,
                    message: `${FEATURE_LIMITS[feature]} limit reached. Current: ${currentCount}/${limit}`,
                    code: 'FEATURE_LIMIT_EXCEEDED',
                    data: {
                        feature,
                        current: currentCount,
                        limit,
                        planName: req.subscriptionPlan?.name
                    }
                });
            }
            next();
        }
        catch (error) {
            loggerService_1.logger.error(`Feature limit check error for ${feature}`, error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};
exports.checkFeatureLimit = checkFeatureLimit;
const FEATURE_LIMITS = {
    gateways: 'Gateway',
    parkingLots: 'Parking Lot',
    floors: 'Floor',
    parkingSlots: 'Parking Slot',
    users: 'User'
};
async function getCurrentUsageCount(userId, feature) {
    const dataSource = data_source_1.AppDataSource;
    switch (feature) {
        case 'gateways':
            return dataSource.query('SELECT COUNT(*) as count FROM gateway WHERE "adminId" = $1 AND "isDeleted" = false', [userId]).then(result => parseInt(result[0]?.count || '0'));
        case 'parkingLots':
            return dataSource.query('SELECT COUNT(*) as count FROM parking_lot WHERE "adminId" = $1 AND "isDeleted" = false', [userId]).then(result => parseInt(result[0]?.count || '0'));
        case 'floors':
            return dataSource.query(`SELECT COUNT(f.*) as count
         FROM floor f
         INNER JOIN parking_lot pl ON f."parkingLotId" = pl.id
         WHERE pl."adminId" = $1 AND f."isDeleted" = false AND pl."isDeleted" = false`, [userId]).then(result => parseInt(result[0]?.count || '0'));
        case 'parkingSlots':
            return dataSource.query(`SELECT COUNT(ps.*) as count
         FROM parking_slot ps
         INNER JOIN floor f ON ps."floorId" = f.id
         INNER JOIN parking_lot pl ON f."parkingLotId" = pl.id
         WHERE pl."adminId" = $1 AND ps."isDeleted" = false AND f."isDeleted" = false AND pl."isDeleted" = false`, [userId]).then(result => parseInt(result[0]?.count || '0'));
        case 'users':
            // For now, count admin users only (or implement team feature later)
            return 1; // Current user
        default:
            return 0;
    }
}
/**
 * Get subscription status for a user
 */
const getSubscriptionStatus = async (userId) => {
    const subscriptionRepository = data_source_1.AppDataSource.getRepository(Subscription_1.Subscription);
    const activeSubscription = await subscriptionRepository
        .createQueryBuilder('subscription')
        .leftJoinAndSelect('subscription.plan', 'plan')
        .where('subscription.userId = :userId', { userId })
        .andWhere('subscription.status = :status', { status: 'active' })
        .orderBy('subscription.endDate', 'DESC')
        .getOne();
    if (!activeSubscription) {
        return {
            hasActiveSubscription: false,
            status: 'NO_SUBSCRIPTION',
            message: 'No active subscription found'
        };
    }
    const now = new Date();
    const isExpired = now > activeSubscription.endDate;
    const daysRemaining = Math.ceil((activeSubscription.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
        hasActiveSubscription: !isExpired,
        status: isExpired ? 'EXPIRED' : 'ACTIVE',
        subscription: {
            id: activeSubscription.id,
            planName: activeSubscription.plan.name,
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
            daysRemaining: isExpired ? 0 : daysRemaining,
            autoRenew: activeSubscription.autoRenew,
            limits: {
                gateways: activeSubscription.plan.maxGateways,
                parkingLots: activeSubscription.plan.maxParkingLots,
                floors: activeSubscription.plan.maxFloors,
                parkingSlots: activeSubscription.plan.maxParkingSlots,
                users: activeSubscription.plan.maxUsers
            }
        }
    };
};
exports.getSubscriptionStatus = getSubscriptionStatus;
