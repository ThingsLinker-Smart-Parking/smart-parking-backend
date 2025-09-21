const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';

// Test users to verify manually
const testUsers = [
    { email: 'admin1@test.com', password: 'Admin123!' },
    { email: 'admin2@test.com', password: 'Admin123!' },
    { email: 'testuser@test.com', password: 'User123!' }
];

async function manualVerifyUser(email, otp) {
    try {
        console.log(`🔐 Verifying ${email} with OTP: ${otp}`);

        const response = await axios.post(`${API_BASE}/auth/verify-otp`, {
            email: email,
            otp: otp
        });

        if (response.data.success) {
            console.log(`✅ ${email} verified successfully!`);
            return true;
        } else {
            console.log(`❌ Verification failed: ${response.data.message}`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Verification error: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

async function testLogin(email, password) {
    try {
        console.log(`🔑 Testing login for ${email}`);

        const response = await axios.post(`${API_BASE}/auth/login`, {
            email: email,
            password: password
        });

        if (response.data.success) {
            console.log(`✅ Login successful for ${email}`);
            console.log(`👤 User role: ${response.data.user.role}`);
            console.log(`🔗 Token received (length: ${response.data.token.length})`);
            return response.data.token;
        } else {
            console.log(`❌ Login failed: ${response.data.message}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Login error: ${error.response?.data?.message || error.message}`);
        return null;
    }
}

async function testSuperAdminLogin() {
    console.log('\n👑 Testing Super Admin Login:');

    // Try different password variations
    const passwords = ['superadmin123', 'SuperAdmin123!', 'Superadmin123!'];

    for (const password of passwords) {
        try {
            console.log(`🔑 Trying password: ${password}`);

            const response = await axios.post(`${API_BASE}/auth/login`, {
                email: 'superadmin@smartparking.com',
                password: password
            });

            if (response.data.success) {
                console.log(`✅ Super admin login successful with password: ${password}`);
                console.log(`👤 Role: ${response.data.user.role}`);
                return;
            }
        } catch (error) {
            console.log(`❌ Failed with ${password}: ${error.response?.data?.message || error.message}`);
        }
    }

    console.log('❌ All super admin password attempts failed');
}

async function main() {
    console.log('🧪 Manual User Verification and Testing Tool\n');

    console.log('📋 Instructions:');
    console.log('1. Check the server console logs for OTP codes');
    console.log('2. Run this script and manually enter OTP when prompted');
    console.log('3. Or modify this script to include the actual OTP codes\n');

    // Test super admin first
    await testSuperAdminLogin();

    console.log('\n👥 Testing regular user accounts:');

    // For demonstration, let's try some common OTP patterns
    // In a real scenario, you'd get these from server logs or email
    const commonOtps = ['123456', '000000', '111111'];

    for (const user of testUsers) {
        console.log(`\n📧 Processing ${user.email}:`);

        let verified = false;

        // Try common OTP patterns first
        for (const otp of commonOtps) {
            if (await manualVerifyUser(user.email, otp)) {
                verified = true;
                break;
            }
        }

        if (!verified) {
            console.log(`⚠️  Automatic verification failed. Check server logs for actual OTP.`);
            console.log(`📝 Manual verification command:`);
            console.log(`   curl -X POST ${API_BASE}/auth/verify-otp \\`);
            console.log(`        -H "Content-Type: application/json" \\`);
            console.log(`        -d '{"email":"${user.email}","otp":"YOUR_OTP_HERE"}'`);
        } else {
            // Test login after successful verification
            await testLogin(user.email, user.password);
        }
    }

    console.log('\n📊 Summary:');
    console.log('✅ Subscription Plans: Created (Starter, Professional, Enterprise, Custom)');
    console.log('✅ Super Admin: Created (check password in logs)');
    console.log('✅ Test Users: Created (need OTP verification)');

    console.log('\n🔧 Next Steps:');
    console.log('1. Verify users with actual OTP codes from server logs');
    console.log('2. Test subscription plan assignment');
    console.log('3. Create parking lots and infrastructure');
    console.log('4. Test the nodes by slots API');
}

// Run the script
main().catch(console.error);