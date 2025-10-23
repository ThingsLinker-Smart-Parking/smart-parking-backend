import { AppDataSource } from '../data-source';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { logger } from '../services/loggerService';

/**
 * Deactivate old subscription plans that don't use per-device pricing
 */

async function deactivateOldPlans() {
  try {
    await AppDataSource.initialize();
    logger.info('Database connected for deactivating old plans');

    const planRepository = AppDataSource.getRepository(SubscriptionPlan);

    // Find all plans except "Pay Per Device"
    const oldPlans = await planRepository.find({
      where: [
        { name: 'Basic' },
        { name: 'Professional' },
        { name: 'Enterprise' },
        { name: 'Starter' },
        { name: 'Premium' }
      ]
    });

    if (oldPlans.length === 0) {
      console.log('\n✅ No old plans found to deactivate.');
      await AppDataSource.destroy();
      process.exit(0);
    }

    console.log(`\nFound ${oldPlans.length} old plans to deactivate:`);
    oldPlans.forEach(plan => {
      console.log(`  - ${plan.name} (ID: ${plan.id})`);
    });

    // Deactivate all old plans
    for (const plan of oldPlans) {
      plan.isActive = false;
      plan.isPopular = false;
      await planRepository.save(plan);
      console.log(`  ✓ Deactivated: ${plan.name}`);
    }

    console.log('\n✅ Old plans deactivated successfully!');
    console.log('\nOnly "Pay Per Device" plan will be shown to users.');
    console.log('\nNote: Existing subscriptions using old plans will continue to work.');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('Error deactivating old plans:', error);
    console.error(error);
    process.exit(1);
  }
}

deactivateOldPlans();
