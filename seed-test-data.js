const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

async function seedTestData() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        await client.connect();
        console.log('Connected to database\n');

        // ==================== SUBSCRIPTION PLANS ====================
        console.log('Creating subscription plans...');

        const basicPlanId = uuidv4();
        const proPlanId = uuidv4();
        const enterprisePlanId = uuidv4();

        await client.query(`
            INSERT INTO subscription_plan (
                id, name, description,
                "basePricePerMonth", "basePricePerYear", "basePricePerQuarter",
                "pricePerNodePerMonth", "pricePerNodePerYear", "pricePerNodePerQuarter",
                "usdToInrRate", "defaultBillingCycle",
                "maxGateways", "maxParkingLots", "maxFloors", "maxParkingSlots", "maxUsers",
                features, "includesAnalytics", "includesSupport", "includesAPI", "includesCustomization",
                "sortOrder", "isActive", "isPopular", "isCustom", "isDeleted",
                "createdAt", "updatedAt"
            )
            VALUES
            (
                $1, 'Basic', 'Perfect for small parking operations',
                19.99, 199.99, 54.99,
                2.00, 20.00, 5.50,
                83.00, 'monthly',
                2, 2, 4, 50, 2,
                $2, false, true, false, false,
                1, true, false, false, false,
                NOW(), NOW()
            ),
            (
                $3, 'Professional', 'For growing parking businesses',
                49.99, 499.99, 139.99,
                2.00, 20.00, 5.50,
                83.00, 'monthly',
                5, 5, 10, 200, 5,
                $4, true, true, true, false,
                2, true, true, false, false,
                NOW(), NOW()
            ),
            (
                $5, 'Enterprise', 'Unlimited parking management',
                149.99, 1499.99, 419.99,
                1.50, 15.00, 4.00,
                83.00, 'monthly',
                999, 999, 999, 999, 999,
                $6, true, true, true, true,
                3, true, false, false, false,
                NOW(), NOW()
            )
        `, [
            basicPlanId,
            JSON.stringify(['Basic parking management', 'Real-time monitoring', 'Email support', 'Up to 2 parking lots', 'Up to 50 parking slots', 'Up to 2 gateways']),
            proPlanId,
            JSON.stringify(['Advanced analytics', 'Priority support', 'Custom integrations', 'Up to 5 parking lots', 'Up to 200 parking slots', 'Up to 5 gateways', 'API access', 'Real-time dashboard']),
            enterprisePlanId,
            JSON.stringify(['Unlimited parking lots', 'Unlimited parking slots', 'Unlimited gateways', '24/7 premium support', 'Dedicated account manager', 'Custom features', 'White-label options', 'Advanced API access', 'Custom integrations'])
        ]);

        console.log('✓ Created 3 subscription plans (Basic, Professional, Enterprise)\n');

        // ==================== USERS ====================
        console.log('Creating test users...');

        const superAdminId = uuidv4();
        const adminId = uuidv4();
        const userId = uuidv4();
        const unverifiedUserId = uuidv4();

        const hashedPassword = await bcrypt.hash('Test@1234', 10);

        // Super Admin
        await client.query(`
            INSERT INTO "user" (id, email, "passwordHash", "firstName", "lastName", role, "isVerified", phone, "companyName", "isActive", "createdAt", "updatedAt")
            VALUES ($1, 'superadmin@test.com', $2, 'Super', 'Admin', 'super_admin', true, '+911234567890', 'Smart Parking HQ', true, NOW(), NOW())
        `, [superAdminId, hashedPassword]);
        console.log('✓ Super Admin: superadmin@test.com / Test@1234');

        // Admin (with Professional subscription)
        await client.query(`
            INSERT INTO "user" (id, email, "passwordHash", "firstName", "lastName", role, "isVerified", phone, "companyName", city, state, country, "isActive", "createdAt", "updatedAt")
            VALUES ($1, 'admin@test.com', $2, 'Admin', 'User', 'admin', true, '+911234567891', 'Downtown Parking Services', 'Mumbai', 'Maharashtra', 'India', true, NOW(), NOW())
        `, [adminId, hashedPassword]);
        console.log('✓ Admin: admin@test.com / Test@1234');

        // Regular User (with Basic subscription)
        await client.query(`
            INSERT INTO "user" (id, email, "passwordHash", "firstName", "lastName", role, "isVerified", phone, "companyName", city, state, country, "isActive", "createdAt", "updatedAt")
            VALUES ($1, 'user@test.com', $2, 'Regular', 'User', 'user', true, '+911234567892', 'Residential Parking Co', 'Pune', 'Maharashtra', 'India', true, NOW(), NOW())
        `, [userId, hashedPassword]);
        console.log('✓ User: user@test.com / Test@1234');

        // Unverified User
        await client.query(`
            INSERT INTO "user" (id, email, "passwordHash", "firstName", "lastName", role, "isVerified", phone, "isActive", "createdAt", "updatedAt")
            VALUES ($1, 'unverified@test.com', $2, 'Unverified', 'User', 'user', false, '+911234567893', true, NOW(), NOW())
        `, [unverifiedUserId, hashedPassword]);
        console.log('✓ Unverified User: unverified@test.com / Test@1234\n');

        // ==================== SUBSCRIPTIONS & PAYMENTS ====================
        console.log('Creating subscriptions and payments...');

        // Admin subscription (Professional plan - monthly, 3 nodes)
        const adminSubscriptionId = uuidv4();
        const adminPaymentId = uuidv4();
        const adminAmount = 49.99 + (3 * 2.00); // Base + 3 nodes
        const adminAmountINR = adminAmount * 83.00;

        await client.query(`
            INSERT INTO subscription (
                id, "adminId", "planId", "billingCycle", amount,
                "startDate", "endDate", "nextBillingDate",
                status, "paymentStatus",
                "gatewayLimit", "parkingLotLimit", "floorLimit", "parkingSlotLimit", "userLimit",
                "autoRenew", "isDeleted",
                "createdAt", "updatedAt"
            )
            VALUES (
                $1, $2, $3, 'monthly', $4,
                NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days',
                'active', 'paid',
                5, 5, 10, 200, 5,
                true, false,
                NOW(), NOW()
            )
        `, [adminSubscriptionId, adminId, proPlanId, adminAmount]);

        await client.query(`
            INSERT INTO payment (
                id, "transactionId", "userId", "subscriptionId",
                type, amount, currency, status, "paymentMethod",
                description, "processedAt", "isTest", "isDeleted",
                "createdAt", "updatedAt"
            )
            VALUES (
                $1, $2, $3, $4,
                'subscription', $5, 'INR', 'completed', 'cashfree',
                'Professional Plan - Monthly (3 nodes)', NOW(), true, false,
                NOW(), NOW()
            )
        `, [adminPaymentId, 'TEST_TXN_ADMIN_PRO_001', adminId, adminSubscriptionId, adminAmountINR]);

        console.log('✓ Admin subscription (Professional, active, 3 nodes)');

        // User subscription (Basic plan - monthly, 2 nodes)
        const userSubscriptionId = uuidv4();
        const userPaymentId = uuidv4();
        const userAmount = 19.99 + (2 * 2.00); // Base + 2 nodes
        const userAmountINR = userAmount * 83.00;

        await client.query(`
            INSERT INTO subscription (
                id, "adminId", "planId", "billingCycle", amount,
                "startDate", "endDate", "nextBillingDate",
                status, "paymentStatus",
                "gatewayLimit", "parkingLotLimit", "floorLimit", "parkingSlotLimit", "userLimit",
                "autoRenew", "isDeleted",
                "createdAt", "updatedAt"
            )
            VALUES (
                $1, $2, $3, 'monthly', $4,
                NOW(), NOW() + INTERVAL '30 days', NOW() + INTERVAL '30 days',
                'active', 'paid',
                2, 2, 4, 50, 2,
                true, false,
                NOW(), NOW()
            )
        `, [userSubscriptionId, userId, basicPlanId, userAmount]);

        await client.query(`
            INSERT INTO payment (
                id, "transactionId", "userId", "subscriptionId",
                type, amount, currency, status, "paymentMethod",
                description, "processedAt", "isTest", "isDeleted",
                "createdAt", "updatedAt"
            )
            VALUES (
                $1, $2, $3, $4,
                'subscription', $5, 'INR', 'completed', 'cashfree',
                'Basic Plan - Monthly (2 nodes)', NOW(), true, false,
                NOW(), NOW()
            )
        `, [userPaymentId, 'TEST_TXN_USER_BASIC_001', userId, userSubscriptionId, userAmountINR]);

        console.log('✓ User subscription (Basic, active, 2 nodes)\n');

        // ==================== PARKING INFRASTRUCTURE ====================
        console.log('Creating parking infrastructure...');

        // Admin parking lot
        const adminParkingLotId = uuidv4();
        await client.query(`
            INSERT INTO parking_lot (id, name, address, latitude, longitude, "isActive", "adminId", "createdAt")
            VALUES ($1, 'Downtown Parking Complex', 'Nariman Point, Mumbai, Maharashtra, India', 18.9258, 72.8220, true, $2, NOW())
        `, [adminParkingLotId, adminId]);
        console.log('✓ Parking Lot: Downtown Parking Complex (Admin)');

        // Admin parking floors
        const adminFloor1Id = uuidv4();
        const adminFloor2Id = uuidv4();

        await client.query(`
            INSERT INTO floor (id, name, level, "parkingLotId", "createdAt")
            VALUES
            ($1, 'Ground Floor', 0, $2, NOW()),
            ($3, 'First Floor', 1, $4, NOW())
        `, [adminFloor1Id, adminParkingLotId, adminFloor2Id, adminParkingLotId]);
        console.log('✓ Floors: Ground Floor, First Floor');

        // Admin parking slots
        const adminSlotIds = [];
        for (let i = 1; i <= 10; i++) {
            const slotId = uuidv4();
            adminSlotIds.push(slotId);
            const floorId = i <= 5 ? adminFloor1Id : adminFloor2Id;
            const status = i % 3 === 0 ? 'occupied' : 'available';

            await client.query(`
                INSERT INTO parking_slot (id, name, status, "floorId", "createdAt")
                VALUES ($1, $2, $3, $4, NOW())
            `, [slotId, `A-${i.toString().padStart(3, '0')}`, status, floorId]);
        }
        console.log('✓ Parking Slots: 10 slots (A-001 to A-010)\n');

        // User parking lot
        const userParkingLotId = uuidv4();
        await client.query(`
            INSERT INTO parking_lot (id, name, address, latitude, longitude, "isActive", "adminId", "createdAt")
            VALUES ($1, 'Residential Parking Area', 'Koregaon Park, Pune, Maharashtra, India', 18.5421, 73.8959, true, $2, NOW())
        `, [userParkingLotId, userId]);
        console.log('✓ Parking Lot: Residential Parking Area (User)');

        // User parking floor
        const userFloorId = uuidv4();
        await client.query(`
            INSERT INTO floor (id, name, level, "parkingLotId", "createdAt")
            VALUES ($1, 'Ground Level', 0, $2, NOW())
        `, [userFloorId, userParkingLotId]);
        console.log('✓ Floor: Ground Level');

        // User parking slots
        const userSlotIds = [];
        for (let i = 1; i <= 5; i++) {
            const slotId = uuidv4();
            userSlotIds.push(slotId);
            const status = i % 2 === 0 ? 'occupied' : 'available';

            await client.query(`
                INSERT INTO parking_slot (id, name, status, "floorId", "createdAt")
                VALUES ($1, $2, $3, $4, NOW())
            `, [slotId, `B-${i.toString().padStart(3, '0')}`, status, userFloorId]);
        }
        console.log('✓ Parking Slots: 5 slots (B-001 to B-005)\n');

        // ==================== GATEWAYS ====================
        console.log('Creating gateways...');

        // Admin gateways
        const adminGateway1Id = uuidv4();
        const adminGateway2Id = uuidv4();

        await client.query(`
            INSERT INTO gateway (id, "chirpstackGatewayId", name, description, location, latitude, longitude, "isActive", "isLinked", "parkingLotId", "linkedAdminId", "lastSeen", "linkedAt", "createdAt", "updatedAt")
            VALUES
            ($1, 'GW-ADMIN-001', 'Gateway 1 - Downtown', 'LoRa Gateway - Ground Floor', 'Ground Floor Entrance', 18.9258, 72.8220, true, true, $2, $3, NOW(), NOW(), NOW(), NOW()),
            ($4, 'GW-ADMIN-002', 'Gateway 2 - Downtown', 'LoRa Gateway - First Floor', 'First Floor Entrance', 18.9259, 72.8221, true, true, $5, $6, NOW(), NOW(), NOW(), NOW())
        `, [adminGateway1Id, adminParkingLotId, adminId, adminGateway2Id, adminParkingLotId, adminId]);
        console.log('✓ Admin Gateways: GW-ADMIN-001, GW-ADMIN-002');

        // User gateway
        const userGatewayId = uuidv4();
        await client.query(`
            INSERT INTO gateway (id, "chirpstackGatewayId", name, description, location, latitude, longitude, "isActive", "isLinked", "parkingLotId", "linkedAdminId", "lastSeen", "linkedAt", "createdAt", "updatedAt")
            VALUES ($1, 'GW-USER-001', 'Gateway 1 - Residential', 'LoRa Gateway - Main Entrance', 'Main Entrance', 18.5421, 73.8959, true, true, $2, $3, NOW(), NOW(), NOW(), NOW())
        `, [userGatewayId, userParkingLotId, userId]);
        console.log('✓ User Gateway: GW-USER-001\n');

        // ==================== NODES ====================
        console.log('Creating IoT nodes...');

        // Admin nodes (first 5 slots)
        for (let i = 0; i < 5; i++) {
            const nodeId = uuidv4();

            await client.query(`
                INSERT INTO node (id, "chirpstackDeviceId", name, description, latitude, longitude, "lastSeen", "isActive", "parkingSlotId", "adminId", metadata, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), true, $7, $8, $9, NOW(), NOW())
            `, [
                nodeId,
                `NODE-ADMIN-${(i + 1).toString().padStart(3, '0')}`,
                `Sensor Node ${i + 1}`,
                `Ultrasonic parking sensor for slot A-${(i + 1).toString().padStart(3, '0')}`,
                18.9258 + (i * 0.0001),
                72.8220 + (i * 0.0001),
                adminSlotIds[i],
                adminId,
                JSON.stringify({
                    batteryLevel: 85 + (i * 3),
                    rssi: -65 - i,
                    snr: 8.5 - (i * 0.5),
                    location: 'Downtown Complex',
                    sensorType: 'ultrasonic',
                    firmwareVersion: '1.2.3'
                })
            ]);
        }
        console.log('✓ Admin Nodes: 5 nodes (NODE-ADMIN-001 to NODE-ADMIN-005)');

        // User nodes (first 3 slots)
        for (let i = 0; i < 3; i++) {
            const nodeId = uuidv4();

            await client.query(`
                INSERT INTO node (id, "chirpstackDeviceId", name, description, latitude, longitude, "lastSeen", "isActive", "parkingSlotId", "adminId", metadata, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), true, $7, $8, $9, NOW(), NOW())
            `, [
                nodeId,
                `NODE-USER-${(i + 1).toString().padStart(3, '0')}`,
                `Residential Sensor ${i + 1}`,
                `Ultrasonic parking sensor for slot B-${(i + 1).toString().padStart(3, '0')}`,
                18.5421 + (i * 0.0001),
                73.8959 + (i * 0.0001),
                userSlotIds[i],
                userId,
                JSON.stringify({
                    batteryLevel: 90 + (i * 2),
                    rssi: -70 - i,
                    snr: 7.5 - (i * 0.5),
                    location: 'Residential Area',
                    sensorType: 'ultrasonic',
                    firmwareVersion: '1.2.3'
                })
            ]);
        }
        console.log('✓ User Nodes: 3 nodes (NODE-USER-001 to NODE-USER-003)\n');

        // ==================== PARKING STATUS LOGS ====================
        console.log('Creating parking status logs...');

        // Create some historical status logs for admin slots
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 3; j++) {
                const statusLogId = uuidv4();
                const status = j % 2 === 0 ? 'available' : 'occupied';
                const distance = status === 'available' ? 150 + Math.random() * 50 : 20 + Math.random() * 30;
                const percentage = status === 'available' ? 0 : 85 + Math.random() * 15;

                await client.query(`
                    INSERT INTO parking_status_log (id, "parkingSlotId", status, "detectedAt", distance, percentage, "batteryLevel", "signalQuality", metadata, "createdAt")
                    VALUES ($1, $2, $3, NOW() - INTERVAL '${j * 2} hours', $4, $5, $6, $7, $8, NOW() - INTERVAL '${j * 2} hours')
                `, [
                    statusLogId,
                    adminSlotIds[i],
                    status,
                    distance,
                    percentage,
                    85 + (i * 3),
                    distance > 100 ? 'excellent' : 'good',
                    JSON.stringify({
                        rssi: -65 - i,
                        snr: 8.5 - (i * 0.5),
                        gatewayId: i < 3 ? 'GW-ADMIN-001' : 'GW-ADMIN-002'
                    })
                ]);
            }
        }
        console.log('✓ Created 15 status logs for admin slots');

        // Create some historical status logs for user slots
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 2; j++) {
                const statusLogId = uuidv4();
                const status = j % 2 === 0 ? 'available' : 'occupied';
                const distance = status === 'available' ? 160 + Math.random() * 40 : 25 + Math.random() * 25;
                const percentage = status === 'available' ? 0 : 80 + Math.random() * 20;

                await client.query(`
                    INSERT INTO parking_status_log (id, "parkingSlotId", status, "detectedAt", distance, percentage, "batteryLevel", "signalQuality", metadata, "createdAt")
                    VALUES ($1, $2, $3, NOW() - INTERVAL '${j * 3} hours', $4, $5, $6, $7, $8, NOW() - INTERVAL '${j * 3} hours')
                `, [
                    statusLogId,
                    userSlotIds[i],
                    status,
                    distance,
                    percentage,
                    90 + (i * 2),
                    distance > 100 ? 'excellent' : 'good',
                    JSON.stringify({
                        rssi: -70 - i,
                        snr: 7.5 - (i * 0.5),
                        gatewayId: 'GW-USER-001'
                    })
                ]);
            }
        }
        console.log('✓ Created 6 status logs for user slots\n');

        // ==================== SUMMARY ====================
        console.log('='.repeat(60));
        console.log('TEST DATA SEEDING COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(60));
        console.log('\n📊 SUMMARY:');
        console.log('  • 3 Subscription Plans (Basic, Professional, Enterprise)');
        console.log('  • 4 Users (super-admin, admin, user, unverified user)');
        console.log('  • 2 Active Subscriptions with Payments');
        console.log('  • 2 Parking Lots (Downtown Complex, Residential Area)');
        console.log('  • 3 Floors (2 admin, 1 user)');
        console.log('  • 15 Parking Slots (10 admin, 5 user)');
        console.log('  • 3 Gateways (2 admin, 1 user)');
        console.log('  • 8 IoT Nodes (5 admin, 3 user)');
        console.log('  • 21 Status Logs (historical data)');

        console.log('\n🔐 TEST CREDENTIALS:');
        console.log('  ├─ Super Admin:');
        console.log('  │  Email: superadmin@test.com');
        console.log('  │  Password: Test@1234');
        console.log('  │  Role: super-admin');
        console.log('  │');
        console.log('  ├─ Admin (with Professional subscription):');
        console.log('  │  Email: admin@test.com');
        console.log('  │  Password: Test@1234');
        console.log('  │  Role: admin');
        console.log('  │  Parking Lot: Downtown Parking Complex (100 capacity)');
        console.log('  │  Slots: 10 (A-001 to A-010)');
        console.log('  │  Gateways: 2 (GW-ADMIN-001, GW-ADMIN-002)');
        console.log('  │  Nodes: 5 (NODE-ADMIN-001 to NODE-ADMIN-005)');
        console.log('  │');
        console.log('  ├─ User (with Basic subscription):');
        console.log('  │  Email: user@test.com');
        console.log('  │  Password: Test@1234');
        console.log('  │  Role: user');
        console.log('  │  Parking Lot: Residential Parking Area (30 capacity)');
        console.log('  │  Slots: 5 (B-001 to B-005)');
        console.log('  │  Gateway: 1 (GW-USER-001)');
        console.log('  │  Nodes: 3 (NODE-USER-001 to NODE-USER-003)');
        console.log('  │');
        console.log('  └─ Unverified User:');
        console.log('     Email: unverified@test.com');
        console.log('     Password: Test@1234');
        console.log('     Status: Not verified (cannot login)');

        console.log('\n💳 SUBSCRIPTION PLANS:');
        console.log('  • Basic: $19.99/month + $2/node (₹1,659 + ₹166/node)');
        console.log('    - 2 parking lots, 50 slots, 2 gateways');
        console.log('  • Professional: $49.99/month + $2/node (₹4,149 + ₹166/node)');
        console.log('    - 5 parking lots, 200 slots, 5 gateways, Analytics & API');
        console.log('  • Enterprise: $149.99/month + $1.50/node (₹12,449 + ₹124.50/node)');
        console.log('    - Unlimited resources, Premium support, Custom features');

        console.log('\n🚀 Next Steps:');
        console.log('  1. Server is running at: http://localhost:3001');
        console.log('  2. API Documentation: http://localhost:3001/api-docs');
        console.log('  3. Login with any test account to start testing');
        console.log('  4. Test subscription purchase with unverified@test.com');
        console.log('='.repeat(60));

        await client.end();
    } catch (error) {
        console.error('\n❌ Error during seeding:', error.message);
        console.error(error.stack);
        await client.end();
        process.exit(1);
    }
}

seedTestData();
