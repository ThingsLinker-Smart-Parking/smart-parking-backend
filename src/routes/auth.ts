import { Router } from 'express';
import {
    signup,
    login,
    verifyOtp,
    forgotPassword,
    resetPassword,
    resendOtp,
    getOtpConfig,
    getUserProfile,
    updateUserProfile,
    refreshToken
} from '../controllers/authController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateBody, sanitize, userSchemas } from '../validation';
import { AppDataSource } from '../data-source';
import { User } from '../models/User';
import { otpService } from '../services/otpService';
import { emailService } from '../services/emailService';
import { In } from 'typeorm';

const router = Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "password123"
 *               firstName:
 *                 type: string
 *                 minLength: 2
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 minLength: 2
 *                 example: "Doe"
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *                 example: "user"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User created successfully. OTP sent for verification."
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Internal server error
 */
router.post('/signup', sanitize(), validateBody(userSchemas.register), signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to existing account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 *       500:
 *         description: Internal server error
 */
router.post('/login', sanitize(), validateBody(userSchemas.login), login);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid OTP or already verified
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/verify-otp', sanitize(), validateBody(userSchemas.verifyOtp), verifyOtp);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       429:
 *         description: Too many requests - please wait
 *       500:
 *         description: Internal server error
 */
router.post('/forgot-password', sanitize(), validateBody(userSchemas.forgotPassword), forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid OTP or password
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/reset-password', sanitize(), validateBody(userSchemas.resetPassword), resetPassword);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend OTP for verification or password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *               purpose:
 *                 type: string
 *                 enum: [verification, password_reset]
 *                 default: verification
 *                 example: "verification"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests - please wait
 *       500:
 *         description: Internal server error
 */
router.post('/resend-otp', sanitize(), validateBody(userSchemas.resendOtp), resendOtp);

/**
 * @swagger
 * /api/auth/otp-config:
 *   get:
 *     summary: Get OTP configuration (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     length:
 *                       type: number
 *                       example: 6
 *                     expiryMinutes:
 *                       type: number
 *                       example: 15
 *                     maxAttempts:
 *                       type: number
 *                       example: 3
 *                     resendCooldownMinutes:
 *                       type: number
 *                       example: 1
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/otp-config', authenticateToken, requireRole(['admin', 'super_admin']), getOtpConfig);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile with subscription status
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     subscription:
 *                       type: object
 *                       properties:
 *                         hasActiveSubscription:
 *                           type: boolean
 *                         status:
 *                           type: string
 *                           enum: [ACTIVE, EXPIRED, NO_SUBSCRIPTION]
 *                         subscription:
 *                           type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/profile', authenticateToken, getUserProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile details
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "Admin"
 *               lastName:
 *                 type: string
 *                 example: "User"
 *               phone:
 *                 type: string
 *                 example: "+1 555 123 4567"
 *               companyName:
 *                 type: string
 *                 example: "Smart Parking Inc."
 *               gstNumber:
 *                 type: string
 *                 example: "27AAACI1126H1Z2"
 *               address:
 *                 type: string
 *                 example: "221B Baker Street"
 *               city:
 *                 type: string
 *                 example: "London"
 *               state:
 *                 type: string
 *                 example: "Greater London"
 *               zipCode:
 *                 type: string
 *                 example: "NW1 6XE"
 *               country:
 *                 type: string
 *                 example: "United Kingdom"
 *               currentPassword:
 *                 type: string
 *                 example: "Admin123!"
 *               newPassword:
 *                 type: string
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     subscription:
 *                       type: object
 *       400:
 *         description: Validation failure or incorrect current password
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/profile', authenticateToken, sanitize(), validateBody(userSchemas.updateProfile), updateUserProfile);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/refresh', authenticateToken, refreshToken);

/**
 * @swagger
 * /api/auth/email-config:
 *   get:
 *     summary: Get email service configuration (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email configuration retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get('/email-config', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
    try {
        const { emailService } = await import('../services/emailService');
        const config = emailService.getConfig();
        
        // Remove sensitive information
        const safeConfig = {
            host: config.host,
            port: config.port,
            user: config.user,
            from: config.from,
            secure: config.secure,
            tls: config.tls
        };
        
        res.json({
            success: true,
            data: safeConfig
        });
    } catch (error) {
        console.error('Get email config error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
});

/**
 * @swagger
 * /api/auth/recover-account:
 *   post:
 *     summary: Recover unverified account by regenerating OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: Account recovered and new OTP sent
 *       400:
 *         description: Account not found or already verified
 *       500:
 *         description: Internal server error
 */
router.post('/recover-account', sanitize(), validateBody(userSchemas.recoverAccount), async (req, res) => {
    try {
        const { email } = req.body;

        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { email: email.toLowerCase().trim() } });

        if (!user) {
            return res.status(400).json({ 
                success: false,
                message: 'No account found with this email address' 
            });
        }

        if (user.isVerified) {
            return res.status(400).json({ 
                success: false,
                message: 'Account is already verified. Please login instead.' 
            });
        }

        // Generate new OTP
        const otp = await otpService.generateAndSaveOTP(user, 'verification');
        await userRepository.save(user);
        
        // Send new OTP email
        const emailSent = await emailService.sendOtpEmail(email, otp, 'verification');
        
        if (!emailSent) {
            console.warn(`Failed to send OTP email to ${email}`);
        }

        return res.json({
            success: true,
            message: 'Account recovered successfully. New OTP sent for verification.',
            data: {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        console.error('Recover account error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error' 
        });
    }
});

/**
 * DEVELOPMENT ONLY: Create test users
 * This endpoint should be removed in production
 */
if (process.env.NODE_ENV === 'development') {
    router.post('/create-test-users', async (req, res) => {
        try {
            const userRepository = AppDataSource.getRepository(User);

            // Clear existing test users
            await userRepository.delete({ 
                email: In(['superadmin@test.com', 'admin@test.com', 'user@test.com'])
            });

            const testUsers = [
                {
                    email: 'superadmin@test.com',
                    passwordHash: 'password123', // Will be hashed by entity hook
                    firstName: 'Super',
                    lastName: 'Admin',
                    role: 'super_admin' as const,
                    isVerified: true,
                    isActive: true,
                    otp: null,
                    otpExpiry: null
                },
                {
                    email: 'admin@test.com',
                    passwordHash: 'password123', // Will be hashed by entity hook
                    firstName: 'Test',
                    lastName: 'Admin',
                    role: 'admin' as const,
                    isVerified: true,
                    isActive: true,
                    otp: null,
                    otpExpiry: null
                },
                {
                    email: 'user@test.com',
                    passwordHash: 'password123', // Will be hashed by entity hook
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'user' as const,
                    isVerified: true,
                    isActive: true,
                    otp: null,
                    otpExpiry: null
                }
            ];

            // Create test users
            const createdUsers = [];
            for (const userData of testUsers) {
                const user = userRepository.create(userData);
                await userRepository.save(user);
                createdUsers.push({
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName
                });
            }

            return res.json({
                success: true,
                message: 'Test users created successfully',
                data: createdUsers,
                credentials: [
                    'Super Admin: superadmin@test.com / password123',
                    'Admin: admin@test.com / password123',
                    'User: user@test.com / password123'
                ]
            });
        } catch (error) {
            console.error('Create test users error:', error);
            return res.status(500).json({ 
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}

export default router;
