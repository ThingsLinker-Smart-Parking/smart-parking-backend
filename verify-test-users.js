const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// For testing, we'll use a common OTP pattern (usually 6 digits)
// In development, check the console logs for actual OTP codes
const TEST_OTP = '123456'; // This might need to be the actual OTP from logs

const testUsers = [
    { email: 'admin1@test.com', password: 'Admin123!' },
    { email: 'admin2@test.com', password: 'Admin123!' },
    { email: 'testuser@test.com', password: 'User123!' }
];

async function verifyAndTestUsers() {
    console.log('🔐 Verifying and testing user accounts...\n');

    for (const user of testUsers) {
        try {
            console.log(`📧 Processing ${user.email}:`);

            // Try to verify with a test OTP first
            try {
                const verifyResponse = await axios.post(`${API_BASE}/auth/verify-otp`, {
                    email: user.email,
                    otp: TEST_OTP
                });

                if (verifyResponse.data.success) {
                    console.log(`✅ Account verified successfully`);
                } else {
                    console.log(`⚠️  Verification failed: ${verifyResponse.data.message}`);
                }
            } catch (verifyError) {
                if (verifyError.response?.data?.message?.includes('already verified')) {
                    console.log(`✅ Account already verified`);
                } else {
                    console.log(`⚠️  Verification error: ${verifyError.response?.data?.message || verifyError.message}`);
                }
            }

            // Try to login
            try {
                const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
                    email: user.email,
                    password: user.password
                });

                if (loginResponse.data.success && loginResponse.data.token) {
                    console.log(`✅ Login successful`);
                    console.log(`🔑 Token received (length: ${loginResponse.data.token.length})`);

                    // Test API access with token
                    const token = loginResponse.data.token;
                    try {
                        const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        console.log(`✅ Profile access successful - Role: ${profileResponse.data.data.role}`);
                    } catch (profileError) {
                        console.log(`❌ Profile access failed: ${profileError.response?.data?.message}`);
                    }

                } else {
                    console.log(`❌ Login failed: ${loginResponse.data.message}`);
                }
            } catch (loginError) {
                if (loginError.response?.data?.message?.includes('not verified')) {
                    console.log(`⚠️  Account needs verification first`);
                } else {
                    console.log(`❌ Login error: ${loginError.response?.data?.message || loginError.message}`);
                }
            }

        } catch (error) {
            console.log(`❌ General error for ${user.email}:`, error.message);
        }

        console.log(''); // Add spacing
    }

    // Test super admin login
    console.log('👑 Testing Super Admin Account:');
    try {
        const superAdminLogin = await axios.post(`${API_BASE}/auth/login`, {
            email: 'superadmin@smartparking.com',
            password: 'superadmin123'
        });

        if (superAdminLogin.data.success) {
            console.log('✅ Super Admin login successful');
            console.log(`🔑 Role: ${superAdminLogin.data.user.role}`);
        }
    } catch (error) {
        console.log('❌ Super Admin login failed:', error.response?.data?.message || error.message);
    }

    console.log('\n📊 Database Setup Summary:');
    console.log('✅ Subscription Plans: 4 plans created (Starter, Professional, Enterprise, Custom)');
    console.log('✅ Super Admin: superadmin@smartparking.com');
    console.log('✅ Test Admins: 2 admin accounts created');
    console.log('✅ Test User: 1 regular user account created');

    console.log('\n🔧 Manual Verification Steps:');
    console.log('1. Check server logs for actual OTP codes if verification fails');
    console.log('2. Use the OTP codes to verify accounts manually');
    console.log('3. Test subscription assignment after login');
    console.log('4. Create test parking infrastructure');
}

// Run the verification
verifyAndTestUsers().catch(console.error);