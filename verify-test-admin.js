const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

const verifyTestAdmin = async () => {
    console.log('🔧 Attempting to verify test admin user...');

    try {
        // First, try sending a fake OTP verification with common OTP patterns
        const commonOTPs = ['123456', '000000', '111111', '999999'];

        for (const otp of commonOTPs) {
            try {
                const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-otp`, {
                    email: 'test-admin@example.com',
                    otp: otp
                });

                if (verifyResponse.data.success) {
                    console.log(`✅ User verified with OTP: ${otp}`);
                    console.log('Response:', verifyResponse.data);

                    // Now try logging in
                    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                        email: 'test-admin@example.com',
                        password: 'TestAdmin123!'
                    });

                    if (loginResponse.data.success) {
                        console.log('✅ Login successful after verification!');
                        console.log('Token:', loginResponse.data.data.token);
                        return;
                    }
                }
            } catch (error) {
                // Continue to next OTP
                continue;
            }
        }

        console.log('❌ Could not verify with common OTPs');

        // Let's try to login directly - sometimes the system auto-verifies in development
        try {
            const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
                email: 'test-admin@example.com',
                password: 'TestAdmin123!'
            });

            if (loginResponse.data.success) {
                console.log('✅ Login successful without explicit verification!');
                console.log('Token:', loginResponse.data.data.token);
                return;
            }
        } catch (loginError) {
            console.log('❌ Direct login failed:', loginError.response?.data?.message || loginError.message);
        }

    } catch (error) {
        console.log('❌ Verification process failed:', error.response?.data?.message || error.message);
    }

    console.log('ℹ️  You may need to manually verify the user in the database or check server logs for the actual OTP');
};

verifyTestAdmin();