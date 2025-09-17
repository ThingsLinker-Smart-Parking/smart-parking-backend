"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSubscriptionPlans = seedSubscriptionPlans;
const data_source_1 = require("../data-source");
const SubscriptionPlan_1 = require("../models/SubscriptionPlan");
const User_1 = require("../models/User");
const subscriptionPlans = [
    {
        name: 'Starter',
        description: 'Perfect for small parking facilities and startups',
        basePricePerMonth: 29.99,
        basePricePerYear: 299.99,
        basePricePerQuarter: 79.99,
        pricePerNodePerMonth: 2.00,
        pricePerNodePerYear: 20.00,
        pricePerNodePerQuarter: 5.50,
        usdToInrRate: 75.00,
        defaultBillingCycle: 'monthly',
        maxGateways: 2,
        maxParkingLots: 1,
        maxFloors: 2,
        maxParkingSlots: 50,
        maxUsers: 5,
        features: [
            'Basic IoT monitoring',
            'Real-time parking status',
            'Basic analytics',
            'Email support',
            'Mobile app access'
        ],
        includesAnalytics: true,
        includesSupport: true,
        includesAPI: false,
        includesCustomization: false,
        sortOrder: 1,
        isActive: true,
        isPopular: false,
        isCustom: false
    },
    {
        name: 'Professional',
        description: 'Ideal for growing businesses and medium-sized parking facilities',
        basePricePerMonth: 79.99,
        basePricePerYear: 799.99,
        basePricePerQuarter: 219.99,
        pricePerNodePerMonth: 1.75,
        pricePerNodePerYear: 17.50,
        pricePerNodePerQuarter: 4.75,
        usdToInrRate: 75.00,
        defaultBillingCycle: 'monthly',
        maxGateways: 5,
        maxParkingLots: 3,
        maxFloors: 5,
        maxParkingSlots: 200,
        maxUsers: 15,
        features: [
            'Advanced IoT monitoring',
            'Real-time parking status',
            'Advanced analytics & reporting',
            'Priority email support',
            'Mobile app access',
            'API access',
            'Custom branding',
            'Multi-location support'
        ],
        includesAnalytics: true,
        includesSupport: true,
        includesAPI: true,
        includesCustomization: true,
        sortOrder: 2,
        isActive: true,
        isPopular: true,
        isCustom: false
    },
    {
        name: 'Enterprise',
        description: 'For large-scale operations and enterprise customers',
        basePricePerMonth: 199.99,
        basePricePerYear: 1999.99,
        basePricePerQuarter: 549.99,
        pricePerNodePerMonth: 1.50,
        pricePerNodePerYear: 15.00,
        pricePerNodePerQuarter: 4.00,
        usdToInrRate: 75.00,
        defaultBillingCycle: 'yearly',
        maxGateways: 20,
        maxParkingLots: 10,
        maxFloors: 15,
        maxParkingSlots: 1000,
        maxUsers: 50,
        features: [
            'Enterprise IoT monitoring',
            'Real-time parking status',
            'Advanced analytics & reporting',
            '24/7 phone support',
            'Mobile app access',
            'Full API access',
            'Custom branding',
            'Multi-location support',
            'White-label solution',
            'Custom integrations',
            'Dedicated account manager'
        ],
        includesAnalytics: true,
        includesSupport: true,
        includesAPI: true,
        includesCustomization: true,
        sortOrder: 3,
        isActive: true,
        isPopular: false,
        isCustom: false
    },
    {
        name: 'Custom',
        description: 'Tailored solution for specific requirements',
        basePricePerMonth: 0,
        basePricePerYear: 0,
        basePricePerQuarter: 0,
        pricePerNodePerMonth: 1.00,
        pricePerNodePerYear: 10.00,
        pricePerNodePerQuarter: 2.75,
        usdToInrRate: 75.00,
        defaultBillingCycle: 'monthly',
        maxGateways: 999,
        maxParkingLots: 999,
        maxFloors: 999,
        maxParkingSlots: 999999,
        maxUsers: 999,
        features: [
            'Custom IoT monitoring',
            'Real-time parking status',
            'Custom analytics & reporting',
            '24/7 dedicated support',
            'Mobile app access',
            'Full API access',
            'Custom branding',
            'Multi-location support',
            'White-label solution',
            'Custom integrations',
            'Dedicated account manager',
            'Custom development',
            'On-premise deployment option'
        ],
        includesAnalytics: true,
        includesSupport: true,
        includesAPI: true,
        includesCustomization: true,
        sortOrder: 4,
        isActive: true,
        isPopular: false,
        isCustom: true
    }
];
async function seedSubscriptionPlans() {
    try {
        console.log('🌱 Seeding subscription plans...');
        // Initialize database connection
        await data_source_1.AppDataSource.initialize();
        console.log('✅ Database connection established');
        const planRepository = data_source_1.AppDataSource.getRepository(SubscriptionPlan_1.SubscriptionPlan);
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        // Find a super admin user to assign as creator
        const superAdmin = await userRepository.findOne({
            where: { role: 'super_admin' }
        });
        if (!superAdmin) {
            console.log('⚠️  No super admin user found. Plans will be created without creator assignment.');
        }
        // Check if plans already exist
        const existingPlans = await planRepository.find();
        if (existingPlans.length > 0) {
            console.log(`📋 Found ${existingPlans.length} existing plans. Updating them...`);
            // Update existing plans instead of clearing
            for (const existingPlan of existingPlans) {
                const newPlanData = subscriptionPlans.find(p => p.name === existingPlan.name);
                if (newPlanData) {
                    Object.assign(existingPlan, newPlanData);
                    if (superAdmin) {
                        existingPlan.createdBy = superAdmin;
                    }
                    await planRepository.save(existingPlan);
                    console.log(`✅ Updated plan: ${existingPlan.name}`);
                }
            }
        }
        else {
            console.log('📋 No existing plans found. Creating new ones...');
            // Create new plans
            for (const planData of subscriptionPlans) {
                const plan = planRepository.create(planData);
                if (superAdmin) {
                    plan.createdBy = superAdmin;
                }
                await planRepository.save(plan);
                console.log(`✅ Created plan: ${plan.name}`);
            }
        }
        console.log('\n🎉 Subscription plans seeded successfully!');
        // Display created/updated plans with pricing examples
        const finalPlans = await planRepository.find();
        console.log(`📊 Total plans: ${finalPlans.length}`);
        console.log('\n📋 Plan Details:');
        finalPlans.forEach(plan => {
            const monthlyPrice = plan.getFormattedPrices('monthly', 5); // Example with 5 nodes
            const yearlyPrice = plan.getFormattedPrices('yearly', 5);
            console.log(`   • ${plan.name}:`);
            console.log(`     Base: $${plan.basePricePerMonth}/month, $${plan.basePricePerYear}/year`);
            console.log(`     Per Node: $${plan.pricePerNodePerMonth}/month, $${plan.pricePerNodePerYear}/year`);
            console.log(`     With 5 nodes - Monthly: ${monthlyPrice.usd} (${monthlyPrice.inr})`);
            console.log(`     With 5 nodes - Yearly: ${yearlyPrice.usd} (${yearlyPrice.inr})`);
            console.log(`     Features: ${plan.features?.slice(0, 3).join(', ')}...`);
            console.log('');
        });
    }
    catch (error) {
        console.error('❌ Error seeding subscription plans:', error);
    }
    finally {
        // Close database connection
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
            console.log('🔌 Database connection closed');
        }
        process.exit(0);
    }
}
// Run the seed function if this file is executed directly
if (require.main === module) {
    seedSubscriptionPlans();
}
