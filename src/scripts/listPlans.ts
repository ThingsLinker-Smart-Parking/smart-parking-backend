import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { SubscriptionPlan } from '../models/SubscriptionPlan';

async function run() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const repo = AppDataSource.getRepository(SubscriptionPlan);
    const plans = await repo.find({ where: { isActive: true } });
    if (!plans.length) {
      console.log('No active plans found');
    } else {
      plans.forEach(plan => {
        console.log(`${plan.id} -> ${plan.name}`);
      });
    } 
  } catch (error) {
    console.error('Failed to list plans:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } 
}

run();
