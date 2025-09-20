const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

const verifyUserAndTest = async () => {
    console.log('🔧 Verifying test user and testing parking lot creation...');

    try {
        // Since we're in development mode, let's try a common dev OTP or skip verification
        const email = 'test-admin@example.com';

        // Try to verify with a test OTP (often 123456 in dev)
        const testOtps = ['123456', '000000', '111111', '999999'];

        let loginToken = null;

        for (const otp of testOtps) {
            try {
                console.log(`Trying OTP: ${otp}`);
                const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-otp`, {
                    email: email,
                    otp: otp
                });

                if (verifyResponse.data.success) {
                    console.log('✅ User verified successfully');
                    break;
                }
            } catch (error) {
                console.log(`❌ OTP ${otp} failed:`, error.response?.data?.message || error.message);
            }
        }

        // Try to login
        try {
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                email: email,
                password: 'TestAdmin123!'
            });

            if (loginResponse.data.success) {
                loginToken = loginResponse.data.data.token;
                console.log('✅ Login successful');
                console.log('Token:', loginToken.substring(0, 20) + '...');
            }
        } catch (loginError) {
            console.log('❌ Login failed:', loginError.response?.data?.message || loginError.message);

            // If login fails due to verification, let's try to manually verify the user
            console.log('📧 User might not be verified. In development, check server logs for actual OTP.');
            return;
        }

        // Test parking lot creation
        if (loginToken) {
            console.log('🧪 Testing parking lot creation...');

            try {
                const parkingLotResponse = await axios.post(`${BASE_URL}/parking-lots`, {
                    name: 'Test Parking Lot ' + Date.now(),
                    address: '123 Test Street, Test City'
                }, {
                    headers: {
                        'Authorization': `Bearer ${loginToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('✅ Parking lot created successfully:');
                console.log(JSON.stringify(parkingLotResponse.data, null, 2));

            } catch (parkingError) {
                console.log('❌ Parking lot creation failed:');
                console.log('Status:', parkingError.response?.status);
                console.log('Message:', parkingError.response?.data?.message || parkingError.message);
                console.log('Code:', parkingError.response?.data?.code);
                console.log('Full error:', JSON.stringify(parkingError.response?.data, null, 2));
            }
        }

    } catch (error) {
        console.log('❌ Script error:', error.message);
    }
};

// Also create a super admin test
const createSuperAdmin = async () => {
    try {
        console.log('🔧 Creating super admin for testing...');

        const superAdminResponse = await axios.post(`${BASE_URL}/auth/signup`, {
            email: 'superadmin@test.com',
            password: 'SuperAdmin123!',
            firstName: 'Super',
            lastName: 'Admin',
            role: 'admin' // Will need to be manually promoted to super_admin
        });

        console.log('Super admin created:', superAdminResponse.data);

    } catch (error) {
        console.log('Super admin creation failed:', error.response?.data?.message || error.message);
    }
};

const main = async () => {
    await createSuperAdmin();
    await verifyUserAndTest();
};

if (require.main === module) {
    main().catch(console.error);
}