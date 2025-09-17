import { Response } from 'express';
import { AppDataSource } from '../data-source';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { 
  catchAsync, 
  NotFoundError, 
  ConflictError, 
  ValidationError,
  AuthorizationError 
} from '../middleware/errorHandler';
import { logger } from '../services/loggerService';
import { subscriptionPlanSchemas } from '../validation';
import { Like, Between, In } from 'typeorm';

// Get all subscription plans (public access for active plans, admin access for all)
export const getAllSubscriptionPlans = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  const user = req.user;
  
  // Parse and validate query parameters
  const {
    isActive = true,
    isPopular,
    isCustom,
    billingCycle,
    minPrice,
    maxPrice,
    sortBy = 'sortOrder',
    sortOrder = 'asc',
    limit = 20,
    offset = 0
  } = req.query;

  logger.business('Subscription plans list requested', 'SubscriptionPlan', undefined, {
    userId: user?.id,
    filters: req.query,
    userRole: user?.role
  });

  // Build query conditions
  const whereConditions: any = {};
  
  // Non-admin users can only see active, non-deleted plans
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    whereConditions.isActive = true;
    whereConditions.isDeleted = false;
  } else {
    // Admin users can filter by isActive
    if (typeof isActive === 'boolean' || isActive === 'true' || isActive === 'false') {
      whereConditions.isActive = isActive === 'true' || isActive === true;
    }
    // Don't show deleted plans unless explicitly requested
    whereConditions.isDeleted = false;
  }

  // Apply additional filters
  if (isPopular !== undefined) {
    whereConditions.isPopular = String(isPopular) === 'true';
  }
  
  if (isCustom !== undefined) {
    whereConditions.isCustom = String(isCustom) === 'true';
  }

  if (billingCycle && ['monthly', 'yearly', 'quarterly'].includes(billingCycle as string)) {
    whereConditions.defaultBillingCycle = billingCycle;
  }

  // Price range filtering
  if (minPrice || maxPrice) {
    const priceField = billingCycle === 'yearly' ? 'basePricePerYear' : 
                      billingCycle === 'quarterly' ? 'basePricePerQuarter' : 
                      'basePricePerMonth';
    
    if (minPrice && maxPrice) {
      whereConditions[priceField] = Between(Number(minPrice), Number(maxPrice));
    } else if (minPrice) {
      whereConditions[priceField] = Between(Number(minPrice), Number.MAX_SAFE_INTEGER);
    } else if (maxPrice) {
      whereConditions[priceField] = Between(0, Number(maxPrice));
    }
  }

  // Execute query
  const [plans, total] = await subscriptionPlanRepository.findAndCount({
    where: whereConditions,
    relations: user?.role === 'super_admin' ? ['createdBy'] : [],
    order: { [sortBy as string]: sortOrder === 'desc' ? 'DESC' : 'ASC' },
    take: Math.min(Number(limit), 100),
    skip: Number(offset)
  });

  // Transform plans for response (add calculated fields)
  const transformedPlans = plans.map(plan => {
    const planData: any = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      pricing: {
        monthly: {
          base: plan.basePricePerMonth,
          perNode: plan.pricePerNodePerMonth,
          formatted: plan.getFormattedPrices('monthly', 0)
        },
        yearly: {
          base: plan.basePricePerYear,
          perNode: plan.pricePerNodePerYear,
          formatted: plan.getFormattedPrices('yearly', 0),
          discount: plan.getYearlyDiscount()
        }
      },
      limits: {
        maxGateways: plan.maxGateways,
        maxParkingLots: plan.maxParkingLots,
        maxFloors: plan.maxFloors,
        maxParkingSlots: plan.maxParkingSlots,
        maxUsers: plan.maxUsers
      },
      features: plan.features || [],
      includes: {
        analytics: plan.includesAnalytics,
        support: plan.includesSupport,
        api: plan.includesAPI,
        customization: plan.includesCustomization
      },
      metadata: {
        isActive: plan.isActive,
        isPopular: plan.isPopular,
        isCustom: plan.isCustom,
        defaultBillingCycle: plan.defaultBillingCycle,
        sortOrder: plan.sortOrder
      },
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    };

    // Add quarterly pricing if available
    if (plan.basePricePerQuarter) {
      planData.pricing.quarterly = {
        base: plan.basePricePerQuarter,
        perNode: plan.quarterlyNodePrice,
        formatted: plan.getFormattedPrices('quarterly', 0)
      };
    }

    // Add admin-only fields
    if (user?.role === 'super_admin') {
      planData.adminInfo = {
        usdToInrRate: plan.usdToInrRate,
        createdBy: plan.createdBy ? {
          id: plan.createdBy.id,
          email: plan.createdBy.email,
          name: plan.createdBy.getFullName()
        } : null
      };
    }

    return planData;
  });

  logger.business('Subscription plans retrieved successfully', 'SubscriptionPlan', undefined, {
    userId: user?.id,
    count: plans.length,
    total
  });

  return res.json({
    success: true,
    message: 'Subscription plans retrieved successfully',
    data: transformedPlans,
    pagination: {
      total,
      count: plans.length,
      limit: Number(limit),
      offset: Number(offset),
      hasMore: Number(offset) + plans.length < total
    }
  });
});

// Get subscription plan by ID
export const getSubscriptionPlanById = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const { id } = req.params;
  const user = req.user;
  
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  
  logger.business('Subscription plan detail requested', 'SubscriptionPlan', id, user?.id);
  
  const whereConditions: any = { id };
  
  // Non-admin users can only see active, non-deleted plans
  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    whereConditions.isActive = true;
    whereConditions.isDeleted = false;
  }

  const plan = await subscriptionPlanRepository.findOne({
    where: whereConditions,
    relations: user?.role === 'super_admin' ? ['createdBy'] : []
  });
  
  if (!plan) {
    throw new NotFoundError('Subscription plan');
  }
  
  // Transform plan for response with full details
  const planData: any = {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    pricing: {
      monthly: {
        base: plan.basePricePerMonth,
        perNode: plan.pricePerNodePerMonth,
        formatted: plan.getFormattedPrices('monthly', 0)
      },
      yearly: {
        base: plan.basePricePerYear,
        perNode: plan.pricePerNodePerYear,
        formatted: plan.getFormattedPrices('yearly', 0),
        discount: plan.getYearlyDiscount()
      }
    },
    limits: {
      maxGateways: plan.maxGateways,
      maxParkingLots: plan.maxParkingLots,
      maxFloors: plan.maxFloors,
      maxParkingSlots: plan.maxParkingSlots,
      maxUsers: plan.maxUsers
    },
    features: plan.features || [],
    includes: {
      analytics: plan.includesAnalytics,
      support: plan.includesSupport,
      api: plan.includesAPI,
      customization: plan.includesCustomization
    },
    metadata: {
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      isCustom: plan.isCustom,
      defaultBillingCycle: plan.defaultBillingCycle,
      sortOrder: plan.sortOrder
    },
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt
  };

  // Add quarterly pricing if available
  if (plan.basePricePerQuarter) {
    planData.pricing.quarterly = {
      base: plan.basePricePerQuarter,
      perNode: plan.quarterlyNodePrice,
      formatted: plan.getFormattedPrices('quarterly', 0)
    };
  }

  // Add admin-only fields
  if (user?.role === 'super_admin') {
    planData.adminInfo = {
      usdToInrRate: plan.usdToInrRate,
      isDeleted: plan.isDeleted,
      deletedAt: plan.deletedAt,
      createdBy: plan.createdBy ? {
        id: plan.createdBy.id,
        email: plan.createdBy.email,
        name: plan.createdBy.getFullName()
      } : null
    };
  }

  logger.business('Subscription plan retrieved successfully', 'SubscriptionPlan', id, user?.id);
  
  return res.json({
    success: true,
    message: 'Subscription plan retrieved successfully',
    data: planData
  });
});

// Create new subscription plan (Super Admin only)
export const createSubscriptionPlan = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const planData = req.body;
  const user = req.user!;
  
  logger.business('Subscription plan creation requested', 'SubscriptionPlan', undefined, {
    userId: user.id,
    planData
  });
  
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  
  // Check if plan name already exists
  const existingPlan = await subscriptionPlanRepository.findOne({
    where: { name: planData.name, isDeleted: false }
  });
  
  if (existingPlan) {
    throw new ConflictError('A subscription plan with this name already exists');
  }
  
  // Create new plan
  const newPlan = subscriptionPlanRepository.create({
    ...planData,
    createdBy: user
  });

  const savedPlan = await subscriptionPlanRepository.save(newPlan) as unknown as SubscriptionPlan;
  
  logger.business('Subscription plan created successfully', 'SubscriptionPlan', savedPlan.id, {
    userId: user.id,
    planName: savedPlan.name,
    monthlyPrice: savedPlan.basePricePerMonth
  });
  
  return res.status(201).json({
    success: true,
    message: 'Subscription plan created successfully',
    data: {
      id: savedPlan.id,
      name: savedPlan.name,
      description: savedPlan.description,
      pricing: {
        monthly: savedPlan.basePricePerMonth,
        yearly: savedPlan.basePricePerYear,
        quarterly: savedPlan.basePricePerQuarter
      },
      isActive: savedPlan.isActive,
      createdAt: savedPlan.createdAt
    }
  });
});

// Update subscription plan (Super Admin only)
export const updateSubscriptionPlan = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const { id } = req.params;
  const updateData = req.body;
  const user = req.user!;
  
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  
  const plan = await subscriptionPlanRepository.findOne({
    where: { id, isDeleted: false }
  });
  
  if (!plan) {
    throw new NotFoundError('Subscription plan');
  }
  
  // Check for name conflicts if name is being updated
  if (updateData.name && updateData.name !== plan.name) {
    const existingPlan = await subscriptionPlanRepository.findOne({
      where: { name: updateData.name, isDeleted: false }
    });
    
    if (existingPlan && existingPlan.id !== plan.id) {
      throw new ConflictError('A subscription plan with this name already exists');
    }
  }
  
  // Update plan
  Object.assign(plan, updateData);
  await subscriptionPlanRepository.save(plan);
  
  logger.business('Subscription plan updated successfully', 'SubscriptionPlan', id, {
    userId: user.id,
    updateData
  });
  
  return res.json({
    success: true,
    message: 'Subscription plan updated successfully',
    data: {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      isActive: plan.isActive,
      updatedAt: plan.updatedAt
    }
  });
});

// Soft delete subscription plan (Super Admin only)
export const deleteSubscriptionPlan = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = req.user!;
  
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  
  const plan = await subscriptionPlanRepository.findOne({
    where: { id, isDeleted: false },
    relations: []
  });
  
  if (!plan) {
    throw new NotFoundError('Subscription plan');
  }
  
  // Note: Subscription relation check would be implemented when Subscription model is created
  const hasActiveSubscriptions = false;
  
  if (hasActiveSubscriptions) {
    throw new ConflictError('Cannot delete subscription plan with active subscriptions');
  }
  
  // Soft delete the plan
  plan.isDeleted = true;
  plan.isActive = false;
  plan.deletedAt = new Date();
  
  await subscriptionPlanRepository.save(plan);
  
  logger.business('Subscription plan deleted successfully', 'SubscriptionPlan', id, {
    userId: user.id,
    reason
  });
  
  return res.json({
    success: true,
    message: 'Subscription plan deleted successfully'
  });
});

// Bulk update subscription plans (Super Admin only)
export const bulkUpdateSubscriptionPlans = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const { planIds, updates } = req.body;
  const user = req.user!;
  
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  
  logger.business('Bulk subscription plan update requested', 'SubscriptionPlan', undefined, {
    userId: user.id,
    planIds,
    updates,
    count: planIds.length
  });
  
  // Verify all plans exist and are not deleted
  const plans = await subscriptionPlanRepository.find({
    where: { id: In(planIds), isDeleted: false }
  });
  
  if (plans.length !== planIds.length) {
    throw new ValidationError('Some subscription plans were not found or have been deleted');
  }
  
  // Update all plans
  await subscriptionPlanRepository.update(
    { id: In(planIds) },
    updates
  );
  
  logger.business('Bulk subscription plan update completed', 'SubscriptionPlan', undefined, {
    userId: user.id,
    updatedCount: plans.length
  });
  
  return res.json({
    success: true,
    message: `Successfully updated ${plans.length} subscription plans`,
    data: {
      updatedPlans: plans.length,
      updates
    }
  });
});

// Update exchange rate for all plans (Super Admin only)
export const updateExchangeRate = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const { usdToInrRate } = req.body;
  const user = req.user!;
  
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  
  logger.business('Exchange rate update requested', 'SubscriptionPlan', undefined, {
    userId: user.id,
    newRate: usdToInrRate
  });
  
  // Update exchange rate for all active plans
  const result = await subscriptionPlanRepository.update(
    { isDeleted: false },
    { usdToInrRate }
  );
  
  logger.business('Exchange rate updated successfully', 'SubscriptionPlan', undefined, {
    userId: user.id,
    updatedPlans: result.affected,
    newRate: usdToInrRate
  });
  
  return res.json({
    success: true,
    message: `Exchange rate updated to ₹${usdToInrRate} per USD for ${result.affected} subscription plans`,
    data: {
      usdToInrRate,
      updatedPlans: result.affected
    }
  });
});

// Get subscription plan statistics (Admin only)
export const getSubscriptionPlanStats = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const user = req.user!;
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  
  logger.business('Subscription plan statistics requested', 'SubscriptionPlan', undefined, user.id);
  
  const [
    totalPlans,
    activePlans,
    popularPlans,
    customPlans,
    deletedPlans
  ] = await Promise.all([
    subscriptionPlanRepository.count(),
    subscriptionPlanRepository.count({ where: { isActive: true, isDeleted: false } }),
    subscriptionPlanRepository.count({ where: { isPopular: true, isDeleted: false } }),
    subscriptionPlanRepository.count({ where: { isCustom: true, isDeleted: false } }),
    subscriptionPlanRepository.count({ where: { isDeleted: true } })
  ]);
  
  // Get price statistics
  const priceStats = await subscriptionPlanRepository
    .createQueryBuilder('plan')
    .select('MIN(plan.basePricePerMonth)', 'minPrice')
    .addSelect('MAX(plan.basePricePerMonth)', 'maxPrice')
    .addSelect('AVG(plan.basePricePerMonth)', 'avgPrice')
    .where('plan.isDeleted = false AND plan.isActive = true')
    .getRawOne();
  
  const stats = {
    overview: {
      total: totalPlans,
      active: activePlans,
      popular: popularPlans,
      custom: customPlans,
      deleted: deletedPlans
    },
    pricing: {
      minMonthlyPrice: parseFloat(priceStats?.minPrice || '0'),
      maxMonthlyPrice: parseFloat(priceStats?.maxPrice || '0'),
      avgMonthlyPrice: parseFloat(priceStats?.avgPrice || '0')
    },
    healthScore: Math.round((activePlans / Math.max(totalPlans, 1)) * 100)
  };
  
  logger.business('Subscription plan statistics retrieved', 'SubscriptionPlan', undefined, {
    userId: user.id,
    stats
  });
  
  return res.json({
    success: true,
    message: 'Subscription plan statistics retrieved successfully',
    data: stats
  });
});

// Restore deleted subscription plan (Super Admin only)
export const restoreSubscriptionPlan = catchAsync(async (req: AuthRequest, res: Response): Promise<Response> => {
  const { id } = req.params;
  const user = req.user!;
  
  const subscriptionPlanRepository = AppDataSource.getRepository(SubscriptionPlan);
  
  const plan = await subscriptionPlanRepository.findOne({
    where: { id, isDeleted: true }
  });
  
  if (!plan) {
    throw new NotFoundError('Deleted subscription plan');
  }
  
  // Restore the plan
  plan.isDeleted = false;
  plan.deletedAt = null as any;
  
  await subscriptionPlanRepository.save(plan);
  
  logger.business('Subscription plan restored successfully', 'SubscriptionPlan', id, user.id);
  
  return res.json({
    success: true,
    message: 'Subscription plan restored successfully',
    data: {
      id: plan.id,
      name: plan.name,
      isActive: plan.isActive
    }
  });
});