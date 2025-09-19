"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.getUserProfile = exports.getOtpConfig = exports.resendOtp = exports.resetPassword = exports.forgotPassword = exports.verifyOtp = exports.login = exports.signup = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../data-source");
const User_1 = require("../models/User");
const emailService_1 = require("../services/emailService");
const otpService_1 = require("../services/otpService");
const loggerService_1 = require("../services/loggerService");
const subscriptionAuth_1 = require("../middleware/subscriptionAuth");
// Input validation helper
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
const validatePassword = (password) => {
    return Boolean(password && password.length >= 6);
};
const validateName = (name) => {
    return Boolean(name && name.trim().length >= 2);
};
const signup = async (req, res) => {
    const { email, password, firstName, lastName, role = 'user' } = req.body;
    try {
        // Input validation
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }
        if (!password || !validatePassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }
        if (!firstName || !validateName(firstName)) {
            return res.status(400).json({
                success: false,
                message: 'First name must be at least 2 characters long'
            });
        }
        if (!lastName || !validateName(lastName)) {
            return res.status(400).json({
                success: false,
                message: 'Last name must be at least 2 characters long'
            });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        // Check if user already exists
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser) {
            // If user exists but is not verified, allow re-registration
            if (!existingUser.isVerified) {
                // Check if OTP is expired or can be regenerated
                const canRegenerateOTP = !existingUser.otpExpiry ||
                    new Date() > new Date(existingUser.otpExpiry.getTime() + 15 * 60 * 1000); // 15 minutes after expiry
                if (canRegenerateOTP) {
                    // Update existing user with new details and regenerate OTP
                    existingUser.passwordHash = password;
                    existingUser.firstName = firstName.trim();
                    existingUser.lastName = lastName.trim();
                    existingUser.role = role === 'super_admin' ? 'user' : role;
                    // Generate new OTP
                    const otp = await otpService_1.otpService.generateAndSaveOTP(existingUser, 'verification');
                    await userRepository.save(existingUser);
                    // Send new OTP email
                    const emailSent = await emailService_1.emailService.sendOtpEmail(email, otp, 'verification');
                    if (!emailSent) {
                        loggerService_1.logger.warn('Failed to send OTP email, but user was updated', { email });
                    }
                    // Remove sensitive data from response
                    const { passwordHash, otp: userOtp, otpExpiry, ...userWithoutSensitiveData } = existingUser;
                    return res.status(200).json({
                        success: true,
                        message: 'Account details updated and new OTP sent for verification.',
                        data: userWithoutSensitiveData,
                        isExistingUser: true
                    });
                }
                else {
                    // OTP is still valid, suggest resending instead
                    return res.status(400).json({
                        success: false,
                        message: 'Account exists but not verified. Please use "Resend OTP" or wait for OTP to expire.',
                        code: 'OTP_STILL_VALID',
                        canResendOTP: true
                    });
                }
            }
            else {
                // User is already verified
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email and is verified. Please login instead.',
                    code: 'USER_VERIFIED'
                });
            }
        }
        // Create new user
        const newUser = userRepository.create({
            email: email.toLowerCase().trim(),
            passwordHash: password,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            role: role === 'super_admin' ? 'user' : role // Prevent super_admin creation via API
        });
        // Generate and save OTP using the service
        const otp = await otpService_1.otpService.generateAndSaveOTP(newUser, 'verification');
        // Save user first
        await userRepository.save(newUser);
        // Send OTP email
        const emailSent = await emailService_1.emailService.sendOtpEmail(email, otp, 'verification');
        if (!emailSent) {
            loggerService_1.logger.warn('Failed to send OTP email, but user was created', { email });
        }
        // Remove sensitive data from response
        const { passwordHash, otp: userOtp, otpExpiry, ...userWithoutSensitiveData } = newUser;
        return res.status(201).json({
            success: true,
            message: 'User created successfully. OTP sent for verification.',
            data: userWithoutSensitiveData
        });
    }
    catch (error) {
        loggerService_1.logger.error('Signup error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Input validation
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }
        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { email: email.toLowerCase().trim(), isActive: true }
        });
        if (!user || !(await user.validatePassword(password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }
        // Check if email is verified
        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                message: 'Email not verified. Please verify your email first.',
                needsVerification: true
            });
        }
        // Generate JWT token
        const jwtSecret = process.env.JWT_SECRET;
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            role: user.role,
            verified: user.isVerified
        }, jwtSecret);
        // Remove sensitive data from response
        const { passwordHash, otp, otpExpiry, ...userWithoutSensitiveData } = user;
        return res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userWithoutSensitiveData,
                token
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Login error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.login = login;
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        // Input validation
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }
        if (!otp || !otpService_1.otpService.validateOTPFormat(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid 6-digit OTP'
            });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email already verified'
            });
        }
        // Validate OTP using the service
        const otpValidation = otpService_1.otpService.validateOTP(user, otp);
        if (!otpValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: otpValidation.message
            });
        }
        // Mark user as verified and clear OTP
        user.isVerified = true;
        await otpService_1.otpService.clearOTP(user);
        await userRepository.save(user);
        // Send welcome email
        await emailService_1.emailService.sendWelcomeEmail(user.email, user.firstName);
        return res.json({
            success: true,
            message: 'Email verified successfully. Welcome to Smart Parking System!'
        });
    }
    catch (error) {
        loggerService_1.logger.error('OTP verification error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.verifyOtp = verifyOtp;
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        // Input validation
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { email: email.toLowerCase().trim(), isActive: true, isVerified: true }
        });
        if (!user) {
            // Don't reveal if user exists or not for security
            return res.json({
                success: true,
                message: 'If the email exists, a password reset OTP has been sent'
            });
        }
        // Check if user can request new OTP
        if (!otpService_1.otpService.canRequestNewOTP(user)) {
            return res.status(429).json({
                success: false,
                message: 'Please wait before requesting another OTP'
            });
        }
        // Generate and save OTP using the service
        const otp = await otpService_1.otpService.generateAndSaveOTP(user, 'password_reset');
        // Send OTP email
        const emailSent = await emailService_1.emailService.sendOtpEmail(email, otp, 'password_reset');
        if (!emailSent) {
            loggerService_1.logger.warn('Failed to send password reset OTP email', { email });
        }
        return res.json({
            success: true,
            message: 'Password reset OTP sent to your email'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Forgot password error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        // Input validation
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }
        if (!otp || !otpService_1.otpService.validateOTPFormat(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid 6-digit OTP'
            });
        }
        if (!newPassword || !validatePassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({
            where: { email: email.toLowerCase().trim(), isActive: true, isVerified: true }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Validate OTP using the service
        const otpValidation = otpService_1.otpService.validateOTP(user, otp);
        if (!otpValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: otpValidation.message
            });
        }
        // Update password and clear OTP
        user.passwordHash = newPassword;
        await otpService_1.otpService.clearOTP(user);
        await userRepository.save(user);
        return res.json({
            success: true,
            message: 'Password reset successfully. You can now login with your new password.'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Reset password error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.resetPassword = resetPassword;
const resendOtp = async (req, res) => {
    const { email, purpose = 'verification' } = req.body;
    try {
        // Input validation
        if (!email || !validateEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }
        if (!['verification', 'password_reset'].includes(purpose)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid purpose. Must be either "verification" or "password_reset"'
            });
        }
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        const user = await userRepository.findOne({ where: { email: email.toLowerCase().trim() } });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Check if user can request new OTP
        if (!otpService_1.otpService.canRequestNewOTP(user)) {
            return res.status(429).json({
                success: false,
                message: 'Please wait before requesting another OTP'
            });
        }
        // Generate and save new OTP using the service
        const otp = await otpService_1.otpService.generateAndSaveOTP(user, purpose);
        // Send OTP email
        const emailSent = await emailService_1.emailService.sendOtpEmail(email, otp, purpose);
        if (!emailSent) {
            loggerService_1.logger.warn('Failed to send OTP email', { email });
        }
        return res.json({
            success: true,
            message: 'OTP resent successfully'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Resend OTP error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.resendOtp = resendOtp;
// Get OTP configuration (for admin purposes)
const getOtpConfig = async (req, res) => {
    try {
        const config = otpService_1.otpService.getConfig();
        return res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get OTP config error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getOtpConfig = getOtpConfig;
// Get user profile with subscription status (for Flutter app)
const getUserProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Get subscription status
        const subscriptionStatus = await (0, subscriptionAuth_1.getSubscriptionStatus)(req.user.id);
        // Remove sensitive data from user object
        const { passwordHash, otp, otpExpiry, ...userProfile } = req.user;
        return res.json({
            success: true,
            data: {
                user: userProfile,
                subscription: subscriptionStatus
            }
        });
    }
    catch (error) {
        loggerService_1.logger.error('Get user profile error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.getUserProfile = getUserProfile;
// Refresh JWT token
const refreshToken = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        // Generate new JWT token
        const jwtSecret = process.env.JWT_SECRET;
        const token = jsonwebtoken_1.default.sign({
            userId: req.user.id,
            email: req.user.email,
            role: req.user.role,
            verified: req.user.isVerified
        }, jwtSecret);
        return res.json({
            success: true,
            data: { token },
            message: 'Token refreshed successfully'
        });
    }
    catch (error) {
        loggerService_1.logger.error('Refresh token error', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
exports.refreshToken = refreshToken;
