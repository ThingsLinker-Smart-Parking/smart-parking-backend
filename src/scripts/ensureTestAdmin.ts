import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';

async function run() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);
    let admin = await userRepo.findOne({ where: { email: 'admin@test.com' } });

    const passwordHash = await bcrypt.hash('Admin@123', 10);

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
    } else {
      admin.passwordHash = passwordHash;
      admin.role = 'admin';
      admin.isVerified = true;
      admin.isActive = true;
      await userRepo.save(admin);
      console.log('Updated test admin password to Admin@123');
    }
  } catch (error) {
    console.error('Failed to ensure test admin:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

run();
