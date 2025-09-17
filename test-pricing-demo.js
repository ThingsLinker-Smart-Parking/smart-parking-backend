const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Helper function to make API calls
const makeRequest = async (method, endpoint, data = null, headers = {}) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || error.message,
            status: error.response?.status || 500,
            data: error.response?.data || null
        };
    }
};

// Demo subscription pricing structure
const demoPricingStructure = async () => {
    console.log('💰 Smart Parking Subscription Pricing Demo\n');
    
    try {
        // Get subscription plans
        const result = await makeRequest('GET', '/subscriptions/plans');
        
        if (result.success && result.data.success) {
            const plans = result.data.data;
            
            console.log('📋 Available Subscription Plans:\n');
            
            plans.forEach(plan => {
                console.log(`🏷️  ${plan.name.toUpperCase()} PLAN`);
                console.log(`   ${plan.description}`);
                console.log('');
                
                // Base pricing
                console.log('   💵 Base Pricing (USD):');
                console.log(`      Monthly: $${plan.basePricePerMonth}`);
                console.log(`      Quarterly: $${plan.basePricePerQuarter || (plan.basePricePerMonth * 3).toFixed(2)}`);
                console.log(`      Yearly: $${plan.basePricePerYear}`);
                console.log('');
                
                // Per-node pricing
                console.log('   🔌 Per-Node Pricing (USD):');
                console.log(`      Monthly: $${plan.pricePerNodePerMonth}/node`);
                console.log(`      Quarterly: $${plan.pricePerNodePerQuarter || (plan.pricePerNodePerMonth * 3).toFixed(2)}/node`);
                console.log(`      Yearly: $${plan.pricePerNodePerYear}/node`);
                console.log('');
                
                // Example calculations
                console.log('   📊 Example Calculations (with 5 nodes):');
                const monthlyTotal = parseFloat(plan.basePricePerMonth) + (parseFloat(plan.pricePerNodePerMonth) * 5);
                const yearlyTotal = parseFloat(plan.basePricePerYear) + (parseFloat(plan.pricePerNodePerYear) * 5);
                const inrRate = parseFloat(plan.usdToInrRate);
                
                console.log(`      Monthly Total: $${monthlyTotal.toFixed(2)} (₹${(monthlyTotal * inrRate).toFixed(2)})`);
                console.log(`      Yearly Total: $${yearlyTotal.toFixed(2)} (₹${(yearlyTotal * inrRate).toFixed(2)})`);
                console.log('');
                
                // Resource limits
                console.log('   🚧 Resource Limits:');
                console.log(`      Gateways: ${plan.maxGateways}`);
                console.log(`      Parking Lots: ${plan.maxParkingLots}`);
                console.log(`      Floors: ${plan.maxFloors}`);
                console.log(`      Parking Slots: ${plan.maxParkingSlots}`);
                console.log(`      Users: ${plan.maxUsers}`);
                console.log('');
                
                // Features
                console.log('   ✨ Features:');
                plan.features?.forEach(feature => {
                    console.log(`      • ${feature}`);
                });
                console.log('');
                
                // Special indicators
                if (plan.isPopular) {
                    console.log('   🏆 POPULAR CHOICE!');
                }
                if (plan.isCustom) {
                    console.log('   🎯 CUSTOM PLAN - Contact sales for pricing');
                }
                console.log('');
                
                console.log('─'.repeat(80));
                console.log('');
            });
            
            // Summary
            console.log('📈 Pricing Summary:');
            console.log('   • All plans include per-node pricing');
            console.log('   • Node cost: $2/month (₹150/month) for Starter');
            console.log('   • Node cost: $1.75/month (₹131.25/month) for Professional');
            console.log('   • Node cost: $1.50/month (₹112.50/month) for Enterprise');
            console.log('   • Node cost: $1.00/month (₹75/month) for Custom');
            console.log('');
            console.log('💡 Business Model:');
            console.log('   • Base subscription + per-node usage');
            console.log('   • Scales with your IoT infrastructure');
            console.log('   • Both USD and INR pricing supported');
            console.log('   • Exchange rate: 1 USD = ₹75 (configurable)');
            
        } else {
            console.log('❌ Failed to get subscription plans:', result.message);
        }
        
    } catch (error) {
        console.error('💥 Error during demo:', error.message);
    }
};

// Run the demo
if (require.main === module) {
    demoPricingStructure();
}

module.exports = { demoPricingStructure };
