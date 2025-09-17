import dotenv from 'dotenv';
import { logger } from '../services/loggerService';

// Load environment variables
dotenv.config();

// Environment validation schema
interface EnvironmentConfig {
  // App Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_VERSION: string;
  BASE_URL: string;

  // Database Configuration
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SSL: boolean;
  DB_LOGGING: boolean;
  DB_POOL_MAX: number;
  DB_POOL_MIN: number;
  DB_IDLE_TIMEOUT: number;
  DB_CONNECTION_TIMEOUT: number;

  // Security Configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  SESSION_SECRET: string;
  SESSION_MAX_AGE: number;
  WEBHOOK_SECRET: string;

  // Email Configuration
  SMTP_HOST: string;
  SMTP_PORT: number;
  EMAIL: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM_NAME: string;

  // Redis Configuration
  REDIS_URL?: string;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;

  // MQTT Configuration
  MQTT_BROKER_URL?: string;
  MQTT_USERNAME?: string;
  MQTT_PASSWORD?: string;
  MQTT_CLIENT_ID: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  AUTH_RATE_LIMIT_MAX: number;
  STRICT_RATE_LIMIT_MAX: number;

  // CORS Configuration
  ALLOWED_ORIGINS: string[];

  // Health Check Configuration
  HEALTH_CHECK_INTERVAL: number;
  DB_HEALTH_TIMEOUT: number;

  // External Services
  EXTERNAL_API_TIMEOUT: number;

  // Payment Gateway Configuration
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  CASHFREE_CLIENT_ID?: string;
  CASHFREE_CLIENT_SECRET?: string;
  CASHFREE_API_VERSION: string;
  CASHFREE_ENVIRONMENT: 'SANDBOX' | 'PRODUCTION';
  CASHFREE_RETURN_URL: string;

  // Logging Configuration
  LOG_LEVEL: string;
  ENABLE_FILE_LOGGING: boolean;

  // Security Headers
  ENABLE_CSP: boolean;
  ENABLE_HSTS: boolean;
  ENABLE_NO_SNIFF: boolean;

  // Development Tools
  ENABLE_SWAGGER: boolean;
  ENABLE_DEBUG_ROUTES: boolean;

  // File Upload
  MAX_FILE_SIZE: number;
  UPLOAD_DIR: string;

  // Monitoring
  MONITORING_ENABLED: boolean;
  ERROR_TRACKING_DSN?: string;
  METRICS_ENDPOINT?: string;
  ALERT_EMAIL?: string;
}

// Helper functions
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return parsed;
};

const getEnvBoolean = (key: string, defaultValue?: boolean): boolean => {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value.toLowerCase() === 'true';
};

const getEnvArray = (key: string, defaultValue?: string[]): string[] => {
  const value = process.env[key];
  if (!value) {
    if (defaultValue !== undefined) return defaultValue;
    return [];
  }
  return value.split(',').map(item => item.trim());
};

// Validate and create environment configuration
const createEnvironmentConfig = (): EnvironmentConfig => {
  try {
    const baseUrl = getEnvVar('BASE_URL', 'http://localhost:3000');

    const config: EnvironmentConfig = {
      // App Configuration
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      PORT: getEnvNumber('PORT', 3000),
      API_VERSION: getEnvVar('API_VERSION', 'v1'),
      BASE_URL: baseUrl,

      // Database Configuration
      DB_HOST: getEnvVar('DB_HOST'),
      DB_PORT: getEnvNumber('DB_PORT', 5432),
      DB_USERNAME: getEnvVar('DB_USERNAME'),
      DB_PASSWORD: getEnvVar('DB_PASSWORD'),
      DB_NAME: getEnvVar('DB_NAME'),
      DB_SSL: getEnvBoolean('DB_SSL', false),
      DB_LOGGING: getEnvBoolean('DB_LOGGING', false),
      DB_POOL_MAX: getEnvNumber('DB_POOL_MAX', 10),
      DB_POOL_MIN: getEnvNumber('DB_POOL_MIN', 1),
      DB_IDLE_TIMEOUT: getEnvNumber('DB_IDLE_TIMEOUT', 30000),
      DB_CONNECTION_TIMEOUT: getEnvNumber('DB_CONNECTION_TIMEOUT', 10000),

      // Security Configuration
      JWT_SECRET: getEnvVar('JWT_SECRET'),
      JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '24h'),
      SESSION_SECRET: getEnvVar('SESSION_SECRET'),
      SESSION_MAX_AGE: getEnvNumber('SESSION_MAX_AGE', 86400000),
      WEBHOOK_SECRET: getEnvVar('WEBHOOK_SECRET'),

      // Email Configuration
      SMTP_HOST: getEnvVar('SMTP_HOST'),
      SMTP_PORT: getEnvNumber('SMTP_PORT', 587),
      EMAIL: getEnvVar('EMAIL'),
      EMAIL_PASSWORD: getEnvVar('EMAIL_PASSWORD'),
      EMAIL_FROM_NAME: getEnvVar('EMAIL_FROM_NAME', 'Smart Parking System'),

      // Redis Configuration
      REDIS_URL: process.env.REDIS_URL,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      REDIS_DB: getEnvNumber('REDIS_DB', 0),

      // MQTT Configuration
      MQTT_BROKER_URL: process.env.MQTT_BROKER_URL,
      MQTT_USERNAME: process.env.MQTT_USERNAME,
      MQTT_PASSWORD: process.env.MQTT_PASSWORD,
      MQTT_CLIENT_ID: getEnvVar('MQTT_CLIENT_ID', 'smart-parking-backend'),

      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
      RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
      AUTH_RATE_LIMIT_MAX: getEnvNumber('AUTH_RATE_LIMIT_MAX', 20),
      STRICT_RATE_LIMIT_MAX: getEnvNumber('STRICT_RATE_LIMIT_MAX', 10),

      // CORS Configuration
      ALLOWED_ORIGINS: getEnvArray('ALLOWED_ORIGINS', [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5000',
        'capacitor://localhost',
        'ionic://localhost'
      ]),

      // Health Check Configuration
      HEALTH_CHECK_INTERVAL: getEnvNumber('HEALTH_CHECK_INTERVAL', 30000),
      DB_HEALTH_TIMEOUT: getEnvNumber('DB_HEALTH_TIMEOUT', 5000),

      // External Services
      EXTERNAL_API_TIMEOUT: getEnvNumber('EXTERNAL_API_TIMEOUT', 10000),

      // Payment Gateway Configuration
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
      PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
      CASHFREE_CLIENT_ID: process.env.CASHFREE_CLIENT_ID,
      CASHFREE_CLIENT_SECRET: process.env.CASHFREE_CLIENT_SECRET,
      CASHFREE_API_VERSION: getEnvVar('CASHFREE_API_VERSION', '2023-08-01'),
      CASHFREE_ENVIRONMENT:
        (process.env.CASHFREE_ENVIRONMENT || 'SANDBOX').toUpperCase() ===
        'PRODUCTION'
          ? 'PRODUCTION'
          : 'SANDBOX',
      CASHFREE_RETURN_URL: (() => {
        const raw = process.env.CASHFREE_RETURN_URL?.trim();
        let computed = raw && raw.length > 0 ? raw : `${baseUrl}/payments/cashfree/return`;
        if (computed.startsWith('https://localhost')) {
          computed = computed.replace('https://', 'http://');
        }
        if (computed.startsWith('https://127.0.0.1')) {
          computed = computed.replace('https://', 'http://');
        }
        return computed;
      })(),

      // Logging Configuration
      LOG_LEVEL: getEnvVar('LOG_LEVEL', 'debug'),
      ENABLE_FILE_LOGGING: getEnvBoolean('ENABLE_FILE_LOGGING', false),

      // Security Headers
      ENABLE_CSP: getEnvBoolean('ENABLE_CSP', true),
      ENABLE_HSTS: getEnvBoolean('ENABLE_HSTS', true),
      ENABLE_NO_SNIFF: getEnvBoolean('ENABLE_NO_SNIFF', true),

      // Development Tools
      ENABLE_SWAGGER: getEnvBoolean('ENABLE_SWAGGER', true),
      ENABLE_DEBUG_ROUTES: getEnvBoolean('ENABLE_DEBUG_ROUTES', false),

      // File Upload
      MAX_FILE_SIZE: getEnvNumber('MAX_FILE_SIZE', 5242880),
      UPLOAD_DIR: getEnvVar('UPLOAD_DIR', 'uploads'),

      // Monitoring
      MONITORING_ENABLED: getEnvBoolean('MONITORING_ENABLED', false),
      ERROR_TRACKING_DSN: process.env.ERROR_TRACKING_DSN,
      METRICS_ENDPOINT: process.env.METRICS_ENDPOINT,
      ALERT_EMAIL: process.env.ALERT_EMAIL
    };

    // Additional validation
    validateEnvironmentConfig(config);

    return config;
  } catch (error) {
    logger.error('Environment configuration validation failed', error);
    throw error;
  }
};

// Additional validation logic
const validateEnvironmentConfig = (config: EnvironmentConfig): void => {
  const errors: string[] = [];

  // Validate NODE_ENV
  if (!['development', 'production', 'test'].includes(config.NODE_ENV)) {
    errors.push('NODE_ENV must be one of: development, production, test');
  }

  // Validate JWT_SECRET in production
  if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long in production');
  }

  // Validate email configuration
  if (!config.EMAIL.includes('@')) {
    errors.push('EMAIL must be a valid email address');
  }

  // Validate URLs
  try {
    new URL(config.BASE_URL);
  } catch {
    errors.push('BASE_URL must be a valid URL');
  }

  // Validate Redis URL if provided
  if (config.REDIS_URL) {
    try {
      new URL(config.REDIS_URL);
    } catch {
      errors.push('REDIS_URL must be a valid URL');
    }
  }

  // Validate MQTT URL if provided
  if (config.MQTT_BROKER_URL) {
    try {
      new URL(config.MQTT_BROKER_URL);
    } catch {
      errors.push('MQTT_BROKER_URL must be a valid URL');
    }
  }

  // Validate port ranges
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (config.DB_PORT < 1 || config.DB_PORT > 65535) {
    errors.push('DB_PORT must be between 1 and 65535');
  }

  if (config.SMTP_PORT < 1 || config.SMTP_PORT > 65535) {
    errors.push('SMTP_PORT must be between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Environment configuration errors:\n${errors.join('\n')}`);
  }
};

// Create and export the configuration
export const env = createEnvironmentConfig();

// Export types for use in other modules
export type { EnvironmentConfig };

// Helper function to check if we're in development
export const isDevelopment = () => env.NODE_ENV === 'development';
export const isProduction = () => env.NODE_ENV === 'production';
export const isTest = () => env.NODE_ENV === 'test';

// Log configuration status
logger.info('Environment configuration loaded successfully', {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  dbHost: env.DB_HOST,
  dbPort: env.DB_PORT,
  redisConfigured: !!env.REDIS_URL,
  mqttConfigured: !!env.MQTT_BROKER_URL,
  swaggerEnabled: env.ENABLE_SWAGGER,
  monitoringEnabled: env.MONITORING_ENABLED
});
