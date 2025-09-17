"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = exports.OTPService = void 0;
const User_1 = require("../models/User");
const data_source_1 = require("../data-source");
class OTPService {
    constructor() {
        this.config = {
            length: 6,
            expiryMinutes: 15,
            maxAttempts: 3,
            resendCooldownMinutes: 1
        };
    }
    /**
     * Generate a new OTP
     */
    generateOTP() {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < this.config.length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }
    /**
     * Generate OTP expiry timestamp
     */
    generateOTPExpiry() {
        return new Date(Date.now() + this.config.expiryMinutes * 60 * 1000);
    }
    /**
     * Check if OTP is expired
     */
    isOTPExpired(expiryDate) {
        return new Date() > expiryDate;
    }
    /**
     * Validate OTP format
     */
    validateOTPFormat(otp) {
        const otpRegex = new RegExp(`^\\d{${this.config.length}}$`);
        return otpRegex.test(otp);
    }
    /**
     * Check if user can request new OTP (cooldown period)
     */
    canRequestNewOTP(user) {
        if (!user.otpExpiry)
            return true;
        const cooldownTime = new Date(user.otpExpiry.getTime() + this.config.resendCooldownMinutes * 60 * 1000);
        return new Date() > cooldownTime;
    }
    /**
     * Get OTP configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update OTP configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Reset user's OTP attempts
     */
    async resetOTPAttempts(userId) {
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        await userRepository.update(userId, {
            otp: null,
            otpExpiry: null
        });
    }
    /**
     * Check if OTP matches and is valid
     */
    validateOTP(user, otp) {
        // Check if OTP exists
        if (!user.otp) {
            return { isValid: false, message: 'No OTP found. Please request a new one.' };
        }
        // Check if OTP is expired
        if (!user.otpExpiry || this.isOTPExpired(user.otpExpiry)) {
            return { isValid: false, message: 'OTP has expired. Please request a new one.' };
        }
        // Check if OTP matches
        if (user.otp !== otp) {
            return { isValid: false, message: 'Invalid OTP. Please check and try again.' };
        }
        return { isValid: true, message: 'OTP is valid.' };
    }
    /**
     * Generate and save OTP for user
     */
    async generateAndSaveOTP(user, purpose) {
        const otp = this.generateOTP();
        const expiry = this.generateOTPExpiry();
        user.otp = otp;
        user.otpExpiry = expiry;
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        await userRepository.save(user);
        return otp;
    }
    /**
     * Clear OTP after successful use
     */
    async clearOTP(user) {
        user.otp = null;
        user.otpExpiry = null;
        const userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
        await userRepository.save(user);
    }
}
exports.OTPService = OTPService;
exports.otpService = new OTPService();
