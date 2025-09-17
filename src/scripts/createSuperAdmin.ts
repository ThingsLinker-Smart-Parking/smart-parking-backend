import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

async function createSuperAdmin() {
    try {
        console.log('👑 Creating Super Admin User...');
        
        // Initialize database connection
        await AppDataSource.initialize();
        console.log('✅ Database connection established');

        const userRepository = AppDataSource.getRepository(User);

        // Check if super admin already exists
        const existingSuperAdmin = await userRepository.findOne({
            where: { role: 'super_admin' }
        });

        if (existingSuperAdmin) {
            console.log('✅ Super admin already exists:', existingSuperAdmin.email);
            return existingSuperAdmin;
        }

        // Create super admin user
        const hashedPassword = await bcrypt.hash('superadmin123', 10);
        
        const superAdmin = userRepository.create({
            email: 'superadmin@smartparking.com',
            passwordHash: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            role: 'super_admin',
            isVerified: true,
            isActive: true
        });

        await userRepository.save(superAdmin);
        console.log('✅ Super admin created successfully:', superAdmin.email);
        console.log('🔑 Password: superadmin123');
        
        return superAdmin;

    } catch (error) {
        console.error('❌ Error creating super admin:', error);
        throw error;
    } finally {
        // Close database connection
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the function if this file is executed directly
if (require.main === module) {
    createSuperAdmin()
        .then(() => {
            console.log('🎉 Super admin setup completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Super admin setup failed:', error);
            process.exit(1);
        });
}

export { createSuperAdmin };
