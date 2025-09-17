import { User } from '../models/User';
import { AppDataSource } from '../data-source';

export interface OTPConfig {
    length: number;
    expiryMinutes: number;
    maxAttempts: number;
    resendCooldownMinutes: number;
}

export class OTPService {
    private config: OTPConfig = {
        length: 6,
        expiryMinutes: 15,
        maxAttempts: 3,
        resendCooldownMinutes: 1
    };

    /**
     * Generate a new OTP
     */
    generateOTP(): string {
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
    generateOTPExpiry(): Date {
        return new Date(Date.now() + this.config.expiryMinutes * 60 * 1000);
    }

    /**
     * Check if OTP is expired
     */
    isOTPExpired(expiryDate: Date): boolean {
        return new Date() > expiryDate;
    }

    /**
     * Validate OTP format
     */
    validateOTPFormat(otp: string): boolean {
        const otpRegex = new RegExp(`^\\d{${this.config.length}}$`);
        return otpRegex.test(otp);
    }

    /**
     * Check if user can request new OTP (cooldown period)
     */
    canRequestNewOTP(user: User): boolean {
        if (!user.otpExpiry) return true;
        
        const cooldownTime = new Date(user.otpExpiry.getTime() + this.config.resendCooldownMinutes * 60 * 1000);
        return new Date() > cooldownTime;
    }

    /**
     * Get OTP configuration
     */
    getConfig(): OTPConfig {
        return { ...this.config };
    }

    /**
     * Update OTP configuration
     */
    updateConfig(newConfig: Partial<OTPConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Reset user's OTP attempts
     */
    async resetOTPAttempts(userId: number): Promise<void> {
        const userRepository = AppDataSource.getRepository(User);
        await userRepository.update(userId, {
            otp: null,
            otpExpiry: null
        });
    }

    /**
     * Check if OTP matches and is valid
     */
    validateOTP(user: User, otp: string): { isValid: boolean; message: string } {
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
    async generateAndSaveOTP(user: User, purpose: 'verification' | 'password_reset'): Promise<string> {
        const otp = this.generateOTP();
        const expiry = this.generateOTPExpiry();

        user.otp = otp;
        user.otpExpiry = expiry;

        const userRepository = AppDataSource.getRepository(User);
        await userRepository.save(user);

        return otp;
    }

    /**
     * Clear OTP after successful use
     */
    async clearOTP(user: User): Promise<void> {
        user.otp = null;
        user.otpExpiry = null;

        const userRepository = AppDataSource.getRepository(User);
        await userRepository.save(user);
    }
}

export const otpService = new OTPService();
