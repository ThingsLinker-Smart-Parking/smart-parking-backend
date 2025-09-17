"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const data_source_1 = require("../data-source");
const SubscriptionPlan_1 = require("../models/SubscriptionPlan");
async function run() {
    try {
        if (!data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.initialize();
        }
        const repo = data_source_1.AppDataSource.getRepository(SubscriptionPlan_1.SubscriptionPlan);
        const plans = await repo.find({ where: { isActive: true } });
        if (!plans.length) {
            console.log('No active plans found');
        }
        else {
            plans.forEach(plan => {
                console.log(`${plan.id} -> ${plan.name}`);
            });
        }
    }
    catch (error) {
        console.error('Failed to list plans:', error);
    }
    finally {
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
        }
    }
}
run();
