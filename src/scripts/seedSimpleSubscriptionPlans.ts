import { AppDataSource } from '../data-source';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { logger } from '../services/loggerService';

/**
 * Simplified Subscription Plan Seeding
 * Per-Device Pricing Model: $1.5 per device per month
 */

async function seedSimpleSubscriptionPlans() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected for seeding simple subscription plans');

    const planRepository = AppDataSource.getRepository(SubscriptionPlan);

    // Check if plan already exists
    let plan = await planRepository.findOne({
      where: { name: 'Pay Per Device' }
    });

    if (plan) {
      // Update existing plan
      Object.assign(plan, {
      name: 'Pay Per Device',
      description: 'Simple per-device pricing. Pay only for the devices you use.',

      // Per-device pricing
      pricePerDevicePerMonth: 1.50,
      pricePerDevicePerYear: 15.00,  // $1.25/device/month when paid yearly (16.67% savings)
      pricePerDevicePerQuarter: 4.00,  // $1.33/device/month when paid quarterly (11.11% savings)

      // Exchange rate
      usdToInrRate: 83.00,  // Current USD to INR rate

      defaultBillingCycle: 'monthly',

      // Generous limits (since pricing is per-device)
      maxGateways: 100,
      maxParkingLots: 500,
      maxFloors: 5000,
      maxParkingSlots: 100000,
      maxUsers: 1000,

      // Features
      features: [
        'Real-time parking slot monitoring',
        'IoT sensor management',
        'Gateway configuration',
        'Multi-level parking support',
        'User management',
        'Analytics dashboard',
        'Mobile app access',
        'Email notifications',
        'API access',
        '24/7 support'
      ],

      includesAnalytics: true,
      includesSupport: true,
      includesAPI: true,
      includesCustomization: true,

        isActive: true,
        isPopular: true,
        isCustom: false,
        sortOrder: 1
      });
      logger.info('Updating existing subscription plan');
    } else {
      // Create new plan
      plan = planRepository.create({
        name: 'Pay Per Device',
        description: 'Simple per-device pricing. Pay only for the devices you use.',

        // Per-device pricing
        pricePerDevicePerMonth: 1.50,
        pricePerDevicePerYear: 15.00,
        pricePerDevicePerQuarter: 4.00,

        // Exchange rate
        usdToInrRate: 83.00,

        defaultBillingCycle: 'monthly',

        // Generous limits (since pricing is per-device)
        maxGateways: 100,
        maxParkingLots: 500,
        maxFloors: 5000,
        maxParkingSlots: 100000,
        maxUsers: 1000,

        // Features
        features: [
          'Real-time parking slot monitoring',
          'IoT sensor management',
          'Gateway configuration',
          'Multi-level parking support',
          'User management',
          'Analytics dashboard',
          'Mobile app access',
          'Email notifications',
          'API access',
          '24/7 support'
        ],

        includesAnalytics: true,
        includesSupport: true,
        includesAPI: true,
        includesCustomization: true,

        isActive: true,
        isPopular: true,
        isCustom: false,
        sortOrder: 1
      });
      logger.info('Creating new subscription plan');
    }

    await planRepository.save(plan);
    logger.info('Simple subscription plan saved successfully');

    console.log('\n✅ Subscription Plan Created:');
    console.log('━'.repeat(50));
    console.log(`Name: ${plan.name}`);
    console.log(`Description: ${plan.description}`);
    console.log('\nPricing:');
    console.log(`  Monthly:   $${plan.pricePerDevicePerMonth} per device`);
    console.log(`  Quarterly: $${plan.pricePerDevicePerQuarter} per device ($${(plan.pricePerDevicePerQuarter / 3).toFixed(2)}/month)`);
    console.log(`  Yearly:    $${plan.pricePerDevicePerYear} per device ($${(plan.pricePerDevicePerYear / 12).toFixed(2)}/month)`);
    console.log('\nExamples:');
    console.log(`  10 devices:  $${(10 * plan.pricePerDevicePerMonth).toFixed(2)}/month`);
    console.log(`  50 devices:  $${(50 * plan.pricePerDevicePerMonth).toFixed(2)}/month`);
    console.log(`  100 devices: $${(100 * plan.pricePerDevicePerMonth).toFixed(2)}/month`);
    console.log('\nSavings:');
    console.log(`  Yearly:    ${plan.getYearlyDiscount()}% off`);
    console.log('━'.repeat(50));

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding simple subscription plans:', error);
    console.error(error);
    process.exit(1);
  }
}

seedSimpleSubscriptionPlans();
