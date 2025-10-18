"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class EmailService {
    constructor() {
        this.transporter = null;
        this.config = {
            host: process.env.SMTP_HOST || 'smtp.hostinger.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.EMAIL || 'tag@thingslinker.com',
            password: process.env.EMAIL_PASSWORD || '94Thingslinker94$',
            from: process.env.DEFAULT_EMAIL || 'tag@thingslinker.com',
            secure: false, // Use TLS instead of SSL
            tls: true
        };
        this.initializeTransporter();
    }
    initializeTransporter() {
        if (this.config.user && this.config.password) {
            // Auto-detect secure setting based on port
            const isSecurePort = this.config.port === 465;
            this.transporter = nodemailer_1.default.createTransport({
                host: this.config.host,
                port: this.config.port,
                secure: isSecurePort, // true for 465, false for 587
                auth: {
                    user: this.config.user,
                    pass: this.config.password
                },
                tls: {
                    rejectUnauthorized: false // Allow self-signed certificates
                },
                // Additional options for better compatibility
                connectionTimeout: 60000, // 60 seconds
                greetingTimeout: 30000, // 30 seconds
                socketTimeout: 60000 // 60 seconds
            });
        }
    }
    async sendOtpEmail(email, otp, purpose) {
        try {
            const subject = purpose === 'verification'
                ? 'Verify Your Email - Smart Parking System'
                : 'Password Reset OTP - Smart Parking System';
            const htmlContent = this.generateOtpEmailTemplate(otp, purpose);
            if (this.transporter) {
                await this.transporter.sendMail({
                    from: this.config.from,
                    to: email,
                    subject: subject,
                    html: htmlContent
                });
                console.log(`✅ OTP email sent to ${email} for ${purpose}`);
                return true;
            }
            else {
                // Fallback to console logging for development
                console.log(`📧 [DEV MODE] OTP Email to ${email}:`);
                console.log(`   Subject: ${subject}`);
                console.log(`   OTP: ${otp}`);
                console.log(`   Purpose: ${purpose}`);
                return true;
            }
        }
        catch (error) {
            console.error('❌ Error sending OTP email:', error);
            return false;
        }
    }
    async sendWelcomeEmail(email, name) {
        try {
            const subject = 'Welcome to Smart Parking System!';
            const htmlContent = this.generateWelcomeEmailTemplate(name);
            if (this.transporter) {
                await this.transporter.sendMail({
                    from: this.config.from,
                    to: email,
                    subject: subject,
                    html: htmlContent
                });
                console.log(`✅ Welcome email sent to ${email}`);
                return true;
            }
            else {
                // Fallback to console logging for development
                console.log(`📧 [DEV MODE] Welcome Email to ${email}:`);
                console.log(`   Subject: ${subject}`);
                console.log(`   Name: ${name}`);
                return true;
            }
        }
        catch (error) {
            console.error('❌ Error sending welcome email:', error);
            return false;
        }
    }
    generateOtpEmailTemplate(otp, purpose) {
        const actionText = purpose === 'verification' ? 'verify your email' : 'reset your password';
        const expiryMinutes = 15;
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Smart Parking - OTP Verification</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .otp-box { background: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; font-size: 24px; font-weight: bold; letter-spacing: 5px; }
                .footer { text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 14px; }
                .warning { background: #f39c12; color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚗 Smart Parking System</h1>
                </div>
                <div class="content">
                    <h2>OTP Verification Required</h2>
                    <p>Hello!</p>
                    <p>You have requested to ${actionText} for your Smart Parking System account.</p>
                    
                    <div class="otp-box">
                        ${otp}
                    </div>
                    
                    <p><strong>Please enter this OTP to complete the process.</strong></p>
                    
                    <div class="warning">
                        ⚠️ <strong>Important:</strong> This OTP will expire in ${expiryMinutes} minutes.
                    </div>
                    
                    <p>If you didn't request this, please ignore this email.</p>
                    
                    <p>Best regards,<br>The Smart Parking Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
    generateWelcomeEmailTemplate(name) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Smart Parking System</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .welcome-box { background: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚗 Smart Parking System</h1>
                </div>
                <div class="content">
                    <div class="welcome-box">
                        <h2>🎉 Welcome, ${name}!</h2>
                    </div>
                    
                    <p>Thank you for joining the Smart Parking System! Your account has been successfully verified.</p>
                    
                    <h3>What you can do now:</h3>
                    <ul>
                        <li>Access your dashboard</li>
                        <li>Manage parking lots</li>
                        <li>Monitor real-time parking status</li>
                        <li>View parking analytics</li>
                    </ul>
                    
                    <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                    
                    <p>Best regards,<br>The Smart Parking Team</p>
                </div>
                <div class="footer">
                    <p>Welcome to the future of parking management!</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
    // Test email service configuration
    async testConnection() {
        if (!this.transporter) {
            console.log('📧 Email service not configured - running in development mode');
            return true;
        }
        try {
            await this.transporter.verify();
            console.log('✅ Email service connection verified');
            return true;
        }
        catch (error) {
            console.error('❌ Email service connection failed:', error);
            return false;
        }
    }
    // Get email configuration (for debugging)
    getConfig() {
        return { ...this.config };
    }
    /**
     * Send support ticket notification email
     */
    async sendTicketNotification(email, type, data) {
        try {
            let subject = '';
            let htmlContent = '';
            switch (type) {
                case 'new_ticket':
                    subject = `New Support Ticket: #${data.ticketNumber} - ${data.title}`;
                    htmlContent = this.generateNewTicketEmailTemplate(data);
                    break;
                case 'new_message':
                    subject = `New message on ticket #${data.ticketNumber}`;
                    htmlContent = this.generateNewMessageEmailTemplate(data);
                    break;
                case 'status_changed':
                    subject = `Ticket #${data.ticketNumber} status changed to ${data.newStatus}`;
                    htmlContent = this.generateStatusChangedEmailTemplate(data);
                    break;
            }
            if (this.transporter) {
                await this.transporter.sendMail({
                    from: this.config.from,
                    to: email,
                    subject: subject,
                    html: htmlContent,
                });
                console.log(`✅ Ticket notification email sent to ${email} (${type})`);
                return true;
            }
            else {
                // Fallback to console logging for development
                console.log(`📧 [DEV MODE] Ticket Notification to ${email}:`);
                console.log(`   Type: ${type}`);
                console.log(`   Subject: ${subject}`);
                console.log(`   Data:`, data);
                return true;
            }
        }
        catch (error) {
            console.error('❌ Error sending ticket notification:', error);
            return false;
        }
    }
    generateNewTicketEmailTemplate(data) {
        const priorityColor = {
            urgent: '#e74c3c',
            high: '#e67e22',
            medium: '#f39c12',
            low: '#3498db',
        }[data.priority] || '#95a5a6';
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Support Ticket</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${priorityColor}; }
                .button { display: inline-block; padding: 12px 24px; background: #FF9500; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 14px; }
                .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
                .priority-${data.priority} { background: ${priorityColor}; color: white; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎫 New Support Ticket</h1>
                </div>
                <div class="content">
                    <p>A new support ticket has been created.</p>

                    <div class="ticket-info">
                        <h3>Ticket #${data.ticketNumber}</h3>
                        <p><strong>Title:</strong> ${data.title}</p>
                        <p><strong>Category:</strong> ${data.category}</p>
                        <p><strong>Priority:</strong> <span class="badge priority-${data.priority}">${data.priority}</span></p>
                        <p><strong>Created by:</strong> ${data.userName} (${data.userEmail})</p>
                        <hr>
                        <p><strong>Description:</strong></p>
                        <p>${data.description}</p>
                    </div>

                    <a href="${data.ticketUrl}" class="button">View Ticket</a>

                    <p>Please respond to this ticket as soon as possible.</p>
                </div>
                <div class="footer">
                    <p>Smart Parking System - Support Notification</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
    generateNewMessageEmailTemplate(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Message on Support Ticket</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #3498db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3498db; }
                .button { display: inline-block; padding: 12px 24px; background: #FF9500; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💬 New Message</h1>
                </div>
                <div class="content">
                    <p>A new message has been posted on ticket #${data.ticketNumber}.</p>

                    <div class="message-box">
                        <p><strong>From:</strong> ${data.senderName}</p>
                        <hr>
                        <p>${data.message}</p>
                    </div>

                    <a href="${data.ticketUrl}" class="button">View Conversation</a>
                </div>
                <div class="footer">
                    <p>Smart Parking System - Support Notification</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
    generateStatusChangedEmailTemplate(data) {
        const statusColor = {
            open: '#3498db',
            in_progress: '#f39c12',
            resolved: '#27ae60',
            unresolved: '#e74c3c',
            closed: '#95a5a6',
        }[data.newStatus] || '#95a5a6';
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ticket Status Changed</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
                .status-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
                .status-badge { display: inline-block; padding: 10px 20px; background: ${statusColor}; color: white; border-radius: 5px; font-size: 18px; font-weight: bold; text-transform: uppercase; }
                .button { display: inline-block; padding: 12px 24px; background: #FF9500; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #7f8c8d; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✓ Status Update</h1>
                </div>
                <div class="content">
                    <p>Your support ticket status has been updated.</p>

                    <div class="status-box">
                        <h3>Ticket #${data.ticketNumber}</h3>
                        <p>${data.title}</p>
                        <div style="margin: 20px 0;">
                            <p><strong>New Status:</strong></p>
                            <span class="status-badge">${data.newStatus.replace('_', ' ')}</span>
                        </div>
                    </div>

                    <a href="${data.ticketUrl}" class="button">View Ticket</a>
                </div>
                <div class="footer">
                    <p>Smart Parking System - Support Notification</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }
}
exports.emailService = new EmailService();
