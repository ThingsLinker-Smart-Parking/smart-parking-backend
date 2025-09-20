const axios = require('axios');

const BASE_URL = 'https://smart-parking-backend-production-5449.up.railway.app/api';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlZmRiYjgyMS1jZTc1LTQ4MWYtYTE2OS1jODYyMzlhNTNhNjAiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwicm9sZSI6ImFkbWluIiwidmVyaWZpZWQiOnRydWUsImlhdCI6MTc1ODI4Nzg3NX0.dtU1JAEYTNg9dDRQfF6ENtCOEDHDxY5SEvufAQhvojI';

const makeRequest = async (method, endpoint, data = null) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`
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

const debugParkingLots = async () => {
    console.log('🔍 Debugging parking lots issue...');

    // Decode the token to see user info
    const tokenPayload = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64').toString());
    console.log('👤 Token payload:', JSON.stringify(tokenPayload, null, 2));

    // Get user profile
    console.log('\n📋 Getting user profile...');
    const profileResult = await makeRequest('GET', '/auth/profile');
    if (profileResult.success) {
        console.log('✅ Profile:', JSON.stringify(profileResult.data.data.user, null, 2));
    } else {
        console.log('❌ Profile failed:', profileResult.message);
    }

    // Create a new parking lot for testing
    console.log('\n🏗️ Creating test parking lot...');
    const createResult = await makeRequest('POST', '/parking-lots', {
        name: `Debug Parking Lot ${Date.now()}`,
        address: 'Debug Address for Testing'
    });

    if (createResult.success) {
        console.log('✅ Created parking lot:', createResult.data.data.id);
        console.log('📝 Admin info in created lot:', {
            id: createResult.data.data.admin.id,
            email: createResult.data.data.admin.email,
            role: createResult.data.data.admin.role
        });
    } else {
        console.log('❌ Create failed:', createResult.message);
        return;
    }

    // Get parking lots
    console.log('\n📋 Getting parking lots...');
    const getResult = await makeRequest('GET', '/parking-lots');
    if (getResult.success) {
        console.log('✅ Found parking lots:', getResult.data.count);
        getResult.data.data.forEach((lot, index) => {
            console.log(`${index + 1}. ${lot.name} (${lot.id})`);
            console.log(`   Created: ${lot.createdAt}`);
        });
    } else {
        console.log('❌ Get failed:', getResult.message);
    }

    // Check specific parking lot by ID
    if (createResult.success) {
        const createdId = createResult.data.data.id;
        console.log(`\n🔍 Getting specific parking lot: ${createdId}`);
        const getByIdResult = await makeRequest('GET', `/parking-lots/${createdId}`);

        if (getByIdResult.success) {
            console.log('✅ Found specific lot:', getByIdResult.data.data.name);
        } else {
            console.log('❌ Get by ID failed:', getByIdResult.message);
        }
    }
};

debugParkingLots().catch(console.error);