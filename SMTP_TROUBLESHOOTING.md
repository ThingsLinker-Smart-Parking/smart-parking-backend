# 🔧 Hostinger SMTP Troubleshooting Guide

## ❌ Current Error
```
Error: Invalid login: 535 5.7.8 Error: authentication failed: (reason unavailable)
```

## 🔍 Common Issues & Solutions

### 1. **Password Issues**
- **App Password Required**: Hostinger often requires an "App Password" instead of your regular email password
- **Special Characters**: The `$` in your password might need escaping
- **Password Length**: Ensure the password is correct and complete

### 2. **SMTP Settings**
- **Port**: Try alternative ports (465, 587, 25)
- **Security**: Try different security settings (TLS, SSL, STARTTLS)
- **Authentication**: Some servers require different authentication methods

### 3. **Account Settings**
- **SMTP Enabled**: Ensure SMTP is enabled in your Hostinger email settings
- **Less Secure Apps**: Check if you need to enable "less secure app access"
- **2FA**: If 2FA is enabled, you might need an app-specific password

## 🛠️ Alternative Configurations to Try

### Configuration 1: Port 465 with SSL
```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
EMAIL=tag@thingslinker.com
EMAIL_PASSWORD=94Thingslinker94$
DEFAULT_EMAIL=tag@thingslinker.com
```

### Configuration 2: Port 587 with STARTTLS
```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
EMAIL=tag@thingslinker.com
EMAIL_PASSWORD=94Thingslinker94$
DEFAULT_EMAIL=tag@thingslinker.com
```

### Configuration 3: Alternative Host
```env
SMTP_HOST=mail.thingslinker.com
SMTP_PORT=587
EMAIL=tag@thingslinker.com
EMAIL_PASSWORD=94Thingslinker94$
DEFAULT_EMAIL=tag@thingslinker.com
```

## 🔐 How to Get App Password (Recommended)

1. **Login to Hostinger Control Panel**
2. **Go to Email → Manage**
3. **Select your email account**
4. **Look for "App Passwords" or "SMTP Settings"**
5. **Generate a new app password**
6. **Use this password instead of your regular password**

## 📧 Testing Steps

1. **Update .env with new settings**
2. **Rebuild the project**: `npm run build`
3. **Test email service**: `node test-email.js`
4. **Check server logs for detailed errors**

## 🚨 Emergency Fallback

If SMTP continues to fail, the system will automatically fall back to development mode:
- Emails will be logged to the console
- OTP codes will be visible in server logs
- System will continue to work for development/testing

## 📞 Hostinger Support

If issues persist:
- Contact Hostinger support
- Ask specifically about SMTP settings for your email account
- Request SMTP credentials and settings
- Ask about app-specific passwords

## 🔄 Quick Test Commands

```bash
# Test with current settings
node test-email.js

# Test with alternative port 465
SMTP_PORT=465 node test-email.js

# Test with alternative port 25
SMTP_PORT=25 node test-email.js
```

## 📝 Next Steps

1. Try the alternative configurations above
2. Check Hostinger email settings for SMTP configuration
3. Generate an app password if available
4. Test with different ports and security settings
5. Contact Hostinger support if needed
