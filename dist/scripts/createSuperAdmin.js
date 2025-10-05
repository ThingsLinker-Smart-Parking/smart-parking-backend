"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuperAdmin = createSuperAdmin;
const data_source_1 = require("../data-source");
const User_1 = require("../models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function createSuperAdmin() {
    try {
        console.log('👑 Creating Super Admin User...');
        // Initialize database connection
        await data_source_1.AppDataSource.initialize();
        console.log('✅ Database connection established');
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        // Check if super admin already exists
        const existingSuperAdmin = await userRepository.findOne({
            where: { role: 'super_admin' }
        });
        if (existingSuperAdmin) {
            console.log('✅ Super admin already exists:', existingSuperAdmin.email);
            return existingSuperAdmin;
        }
        // Create super admin user
        const hashedPassword = await bcryptjs_1.default.hash('SuperAdmin2024!', 10);
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
        console.log('🔑 Password: SuperAdmin2024!');
        return superAdmin;
    }
    catch (error) {
        console.error('❌ Error creating super admin:', error);
        throw error;
    }
    finally {
        // Close database connection
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
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
