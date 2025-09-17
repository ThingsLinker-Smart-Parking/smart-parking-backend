"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const data_source_1 = require("../data-source");
const User_1 = require("../models/User");
async function run() {
    try {
        if (!data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.initialize();
        }
        const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        let admin = await userRepo.findOne({ where: { email: 'admin@test.com' } });
        const passwordHash = await bcryptjs_1.default.hash('Admin@123', 10);
        if (!admin) {
            admin = userRepo.create({
                email: 'admin@test.com',
                passwordHash,
                firstName: 'Test',
                lastName: 'Admin',
                role: 'admin',
                isVerified: true,
                isActive: true,
            });
            await userRepo.save(admin);
            console.log('Created test admin admin@test.com / Admin@123');
        }
        else {
            admin.passwordHash = passwordHash;
            admin.role = 'admin';
            admin.isVerified = true;
            admin.isActive = true;
            await userRepo.save(admin);
            console.log('Updated test admin password to Admin@123');
        }
    }
    catch (error) {
        console.error('Failed to ensure test admin:', error);
    }
    finally {
        if (data_source_1.AppDataSource.isInitialized) {
            await data_source_1.AppDataSource.destroy();
        }
    }
}
run();
