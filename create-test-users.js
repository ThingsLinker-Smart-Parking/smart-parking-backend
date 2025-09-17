const { DataSource } = require('typeorm');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Database configuration
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'smart_parking',
    entities: ['dist/models/*.js'],
    synchronize: false,
});

async function createTestUsers() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const userRepository = AppDataSource.getRepository('User');

        // Hash passwords
        const hashedPassword = await bcrypt.hash('password123', 10);

        const testUsers = [
            {
                email: 'superadmin@test.com',
                passwordHash: hashedPassword,
                firstName: 'Super',
                lastName: 'Admin',
                role: 'super_admin',
                isVerified: true,
                isActive: true,
                otp: null,
                otpExpiry: null
            },
            {
                email: 'admin@test.com',
                passwordHash: hashedPassword,
                firstName: 'Test',
                lastName: 'Admin',
                role: 'admin',
                isVerified: true,
                isActive: true,
                otp: null,
                otpExpiry: null
            },
            {
                email: 'user@test.com',
                passwordHash: hashedPassword,
                firstName: 'Test',
                lastName: 'User',
                role: 'user',
                isVerified: true,
                isActive: true,
                otp: null,
                otpExpiry: null
            }
        ];

        // Clear existing test users
        await userRepository.delete({ 
            email: ['superadmin@test.com', 'admin@test.com', 'user@test.com']
        });

        // Create new test users
        for (const userData of testUsers) {
            const user = userRepository.create(userData);
            await userRepository.save(user);
            console.log(`✅ Created ${userData.role}: ${userData.email} (Password: password123)`);
        }

        console.log('\n🎉 All test users created successfully!');
        console.log('\nLogin credentials:');
        console.log('Super Admin: superadmin@test.com / password123');
        console.log('Admin: admin@test.com / password123');
        console.log('User: user@test.com / password123');

    } catch (error) {
        console.error('Error creating test users:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

createTestUsers();