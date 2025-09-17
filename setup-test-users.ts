import dotenv from 'dotenv';
import { AppDataSource } from './src/data-source';
import { User } from './src/models/User';

dotenv.config();

const setupTestUsers = async () => {
    try {
        console.log('🔗 Connecting to database...');
        await AppDataSource.initialize();
        console.log('✅ Database connected successfully');

        const userRepository = AppDataSource.getRepository(User);

        // Create Super Admin user
        const superAdminEmail = 'superadmin@gateway-test.com';
        let existingSuperAdmin = await userRepository.findOne({ 
            where: { email: superAdminEmail } 
        });

        if (!existingSuperAdmin) {
            const superAdmin = userRepository.create({
                email: superAdminEmail,
                passwordHash: 'SuperAdmin123!', // Will be hashed by the entity
                firstName: 'Super',
                lastName: 'Admin',
                role: 'super_admin',
                isVerified: true,
                isActive: true
            });

            await userRepository.save(superAdmin);
            console.log('✅ Super Admin user created and verified');
        } else {
            // Update existing user to be verified and set as super admin
            existingSuperAdmin.isVerified = true;
            existingSuperAdmin.isActive = true;
            existingSuperAdmin.role = 'super_admin';
            await userRepository.save(existingSuperAdmin);
            console.log('✅ Super Admin user updated and verified');
        }

        // Create Admin user
        const adminEmail = 'admin@gateway-test.com';
        let existingAdmin = await userRepository.findOne({ 
            where: { email: adminEmail } 
        });

        if (existingAdmin) {
            // Delete existing admin to recreate with proper password
            await userRepository.remove(existingAdmin);
            console.log('🗑️  Removed existing admin user');
        }

        // Create new admin user
        const admin = userRepository.create({
            email: adminEmail,
            passwordHash: 'Admin123!', // Will be hashed by the entity
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            isVerified: true,
            isActive: true
        });

        await userRepository.save(admin);
        console.log('✅ Admin user created and verified');

        console.log('\n🎉 Test users setup complete!');
        console.log('📋 Created users:');
        console.log('   Super Admin: superadmin@gateway-test.com / SuperAdmin123!');
        console.log('   Admin: admin@gateway-test.com / Admin123!');
        console.log('\n💡 You can now run the full gateway tests with: node test-gateway-apis.js');

    } catch (error) {
        console.error('❌ Error setting up test users:', error);
        console.log('\n💡 Make sure:');
        console.log('   1. Your database is running');
        console.log('   2. Database credentials in .env are correct');
        console.log('   3. Database tables are created (npm run build && npm run migration:run)');
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('🔗 Database connection closed');
        }
    }
};

// Instructions
console.log('🔧 Gateway Test Users Setup');
console.log('This script creates verified test users for gateway API testing');
console.log('');

// Run setup
setupTestUsers();