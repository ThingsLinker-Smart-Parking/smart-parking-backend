const { DataSource } = require('typeorm');
const bcrypt = require('bcrypt');

// Database configuration (matches your data-source.ts)
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'your_username',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_NAME || 'smart_parking_db',
    synchronize: false,
    logging: false,
    entities: ['src/models/*.ts'],
    migrations: ['src/migrations/*.ts'],
});

const setupTestUsers = async () => {
    try {
        console.log('🔗 Connecting to database...');
        await AppDataSource.initialize();
        console.log('✅ Database connected successfully');

        const userRepository = AppDataSource.getRepository('User');

        // Create Super Admin user
        const superAdminEmail = 'superadmin@gateway-test.com';
        const existingSuperAdmin = await userRepository.findOne({ 
            where: { email: superAdminEmail } 
        });

        if (!existingSuperAdmin) {
            const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);
            
            const superAdmin = userRepository.create({
                email: superAdminEmail,
                passwordHash: hashedPassword,
                firstName: 'Super',
                lastName: 'Admin',
                role: 'super_admin',
                isVerified: true,
                isActive: true
            });

            await userRepository.save(superAdmin);
            console.log('✅ Super Admin user created and verified');
        } else {
            // Update existing user to be verified
            existingSuperAdmin.isVerified = true;
            existingSuperAdmin.isActive = true;
            existingSuperAdmin.role = 'super_admin';
            await userRepository.save(existingSuperAdmin);
            console.log('✅ Super Admin user updated and verified');
        }

        // Create Admin user
        const adminEmail = 'admin@gateway-test.com';
        const existingAdmin = await userRepository.findOne({ 
            where: { email: adminEmail } 
        });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash('Admin123!', 10);
            
            const admin = userRepository.create({
                email: adminEmail,
                passwordHash: hashedPassword,
                firstName: 'Admin',
                lastName: 'User',
                role: 'admin',
                isVerified: true,
                isActive: true
            });

            await userRepository.save(admin);
            console.log('✅ Admin user created and verified');
        } else {
            // Update existing user to be verified
            existingAdmin.isVerified = true;
            existingAdmin.isActive = true;
            existingAdmin.role = 'admin';
            await userRepository.save(existingAdmin);
            console.log('✅ Admin user updated and verified');
        }

        console.log('\n🎉 Test users setup complete!');
        console.log('📋 Created users:');
        console.log('   Super Admin: superadmin@gateway-test.com / SuperAdmin123!');
        console.log('   Admin: admin@gateway-test.com / Admin123!');
        console.log('\n💡 You can now run the full gateway tests with: node test-gateway-apis.js');

    } catch (error) {
        console.error('❌ Error setting up test users:', error.message);
        console.log('\n💡 Make sure:');
        console.log('   1. Your database is running');
        console.log('   2. Database credentials in .env are correct');
        console.log('   3. Database tables are created (npm run migration:run)');
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

// Run setup if this file is executed directly
if (require.main === module) {
    setupTestUsers();
}

module.exports = { setupTestUsers };