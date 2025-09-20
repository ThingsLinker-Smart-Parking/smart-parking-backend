const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

const createTestAdmin = async () => {
    console.log('🔧 Creating test admin user...');

    try {
        // Try to register a new admin user
        const registerResponse = await axios.post(`${BASE_URL}/auth/signup`, {
            email: 'test-admin@example.com',
            password: 'TestAdmin123!',
            firstName: 'Test',
            lastName: 'Admin',
            role: 'admin'
        });

        console.log('✅ Admin user registered:', registerResponse.data);

        // Check if we need to verify email
        if (registerResponse.data.success && registerResponse.data.message.includes('verification')) {
            console.log('📧 Email verification required. Please check server logs for OTP or manually verify user in database.');
            return { email: 'test-admin@example.com', needsVerification: true };
        }

        return { email: 'test-admin@example.com', needsVerification: false };

    } catch (error) {
        console.log('❌ Registration failed:', error.response?.data?.message || error.message);

        // Try to login with existing user
        try {
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'test-admin@example.com',
                password: 'TestAdmin123!'
            });

            if (loginResponse.data.success) {
                console.log('✅ Existing admin user found and logged in');
                return {
                    email: 'test-admin@example.com',
                    token: loginResponse.data.data.token,
                    needsVerification: false
                };
            }
        } catch (loginError) {
            console.log('❌ Login also failed:', loginError.response?.data?.message || loginError.message);
        }

        return null;
    }
};

const testParkingLotCreation = async (token) => {
    console.log('🧪 Testing parking lot creation...');

    try {
        const response = await axios.post(`${BASE_URL}/parking-lots`, {
            name: 'Test Parking Lot',
            address: '123 Test Street'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Parking lot created successfully:', response.data);
        return response.data;

    } catch (error) {
        console.log('❌ Parking lot creation failed:', error.response?.data || error.message);
        console.log('Status:', error.response?.status);
        console.log('Headers:', error.response?.headers);
        return null;
    }
};

const main = async () => {
    const adminResult = await createTestAdmin();

    if (adminResult && adminResult.token) {
        await testParkingLotCreation(adminResult.token);
    } else {
        console.log('⚠️  Cannot test parking lot creation without valid admin token');
    }
};

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { createTestAdmin, testParkingLotCreation };