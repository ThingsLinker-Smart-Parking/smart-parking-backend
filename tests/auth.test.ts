import request from 'supertest';
import app from '../src/app';
import { AppDataSource } from '../src/data-source';
import { User } from '../src/models/User';

describe('Authentication Endpoints', () => {
  let testUser: User;

  beforeEach(async () => {
    // Create a test user
    const userRepository = AppDataSource.getRepository(User);
    testUser = userRepository.create({
      email: 'test@example.com',
      passwordHash: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isVerified: true,
      isActive: true
    });
    await userRepository.save(testUser);
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('User created successfully');
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.firstName).toBe(userData.firstName);
      expect(response.body.data.lastName).toBe(userData.lastName);
    });

    it('should reject duplicate email', async () => {
      const userData = {
        email: 'test@example.com', // Already exists
        password: 'password123',
        firstName: 'Duplicate',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const userData = {
        email: 'incomplete@example.com',
        // Missing password, firstName, lastName
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe(loginData.email);
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should reject unverified user', async () => {
      // Update user to be unverified
      const userRepository = AppDataSource.getRepository(User);
      testUser.isVerified = false;
      await userRepository.save(testUser);

      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not verified');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    beforeEach(async () => {
      // Set up user with OTP
      const userRepository = AppDataSource.getRepository(User);
      testUser.otp = '123456';
      testUser.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      testUser.isVerified = false;
      await userRepository.save(testUser);
    });

    it('should verify valid OTP', async () => {
      const otpData = {
        email: 'test@example.com',
        otp: '123456'
      };

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send(otpData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified successfully');

      // Check that user is now verified
      const userRepository = AppDataSource.getRepository(User);
      const updatedUser = await userRepository.findOne({ where: { email: testUser.email } });
      expect(updatedUser?.isVerified).toBe(true);
      expect(updatedUser?.otp).toBeNull();
    });

    it('should reject invalid OTP', async () => {
      const otpData = {
        email: 'test@example.com',
        otp: '999999'
      };

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send(otpData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired OTP');
    });

    it('should reject expired OTP', async () => {
      // Set OTP as expired
      const userRepository = AppDataSource.getRepository(User);
      testUser.otpExpiry = new Date(Date.now() - 1000); // 1 second ago
      await userRepository.save(testUser);

      const otpData = {
        email: 'test@example.com',
        otp: '123456'
      };

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send(otpData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired OTP');
    });
  });
});