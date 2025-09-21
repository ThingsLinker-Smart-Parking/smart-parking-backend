const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test admin users to create
const testAdmins = [
    {
        email: 'admin1@test.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'One',
        role: 'admin'
    },
    {
        email: 'admin2@test.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'Two',
        role: 'admin'
    },
    {
        email: 'testuser@test.com',
        password: 'User123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'user'
    }
];

async function createTestUsers() {
    console.log('🚀 Creating test admin and user accounts...\n');

    for (const user of testAdmins) {
        try {
            console.log(`📧 Creating ${user.role}: ${user.email}`);

            // Register user
            const signupResponse = await axios.post(`${API_BASE}/auth/signup`, {
                email: user.email,
                password: user.password,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            });

            if (signupResponse.data.success) {
                console.log(`✅ ${user.role} registered: ${user.email}`);
                console.log(`📧 Check email for OTP to verify account`);

                // Note: In a real scenario, you'd need to get the OTP from email
                // For testing, you might want to check the console logs or database
                console.log(`🔑 Login credentials: ${user.email} / ${user.password}`);

            } else {
                console.log(`❌ Failed to register ${user.email}: ${signupResponse.data.message}`);
            }

        } catch (error) {
            if (error.response?.data?.message?.includes('already exists')) {
                console.log(`⚠️  User ${user.email} already exists`);
            } else {
                console.log(`❌ Error creating ${user.email}:`, error.response?.data?.message || error.message);
            }
        }

        console.log(''); // Add spacing
    }

    console.log('📋 Test Users Summary:');
    console.log('┌─────────────────────────┬──────────────┬─────────┐');
    console.log('│ Email                   │ Password     │ Role    │');
    console.log('├─────────────────────────┼──────────────┼─────────┤');
    console.log('│ superadmin@smartparking.com │ superadmin123│ super_admin │');
    testAdmins.forEach(user => {
        console.log(`│ ${user.email.padEnd(23)} │ ${user.password.padEnd(12)} │ ${user.role.padEnd(7)} │`);
    });
    console.log('└─────────────────────────┴──────────────┴─────────┘');

    console.log('\n📋 Subscription Plans Available:');
    console.log('• Starter: $29.99/month - Basic IoT monitoring');
    console.log('• Professional: $79.99/month - Advanced analytics');
    console.log('• Enterprise: $199.99/month - Full enterprise features');
    console.log('• Custom: $0/month - Custom configuration');

    console.log('\n🎯 Next Steps:');
    console.log('1. Verify email addresses using OTP (check console logs for OTP)');
    console.log('2. Login with the credentials above');
    console.log('3. Test subscription plan assignment');
    console.log('4. Create parking lots, floors, and slots');
    console.log('5. Add IoT nodes for testing');
}

// Run the script
createTestUsers().catch(console.error);