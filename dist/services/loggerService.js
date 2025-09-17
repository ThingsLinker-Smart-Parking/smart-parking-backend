"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Define log levels with colors
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};
winston_1.default.addColors(colors);
// Custom format for structured logging
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    // Format metadata
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    // Include stack trace for errors
    const stackString = stack ? `\n${stack}` : '';
    return `[${timestamp}] ${level}: ${message}${metaString}${stackString}`;
}));
// Custom format for production (structured JSON)
const productionFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return JSON.stringify({
        timestamp,
        level,
        message,
        service: 'smart-parking-backend',
        environment: process.env.NODE_ENV || 'development',
        ...meta
    });
}));
// Create logs directory if it doesn't exist
const logsDir = path_1.default.join(process.cwd(), 'logs');
// Determine log level based on environment
const logLevel = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'warn';
};
// Configure transports
const transports = [];
// Console transport (always enabled)
transports.push(new winston_1.default.transports.Console({
    level: logLevel(),
    format: process.env.NODE_ENV === 'production' ? productionFormat : logFormat
}));
// File transports (only in production or when explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
    // Combined logs
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logsDir, 'combined.log'),
        level: 'info',
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
    // Error logs
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logsDir, 'error.log'),
        level: 'error',
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
    // HTTP access logs
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join(logsDir, 'access.log'),
        level: 'http',
        format: productionFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 10
    }));
}
// Create logger configuration
const loggerConfig = {
    level: logLevel(),
    levels,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })),
    transports,
    exitOnError: false
};
// Create the winston logger instance
const winstonLogger = winston_1.default.createLogger(loggerConfig);
// Custom logging methods with enhanced functionality
class LoggerService {
    constructor() {
        this.logger = winstonLogger;
    }
    // Enhanced error logging
    error(message, error, meta = {}) {
        const logMeta = {
            ...meta,
            errorDetails: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                ...error
            } : undefined
        };
        this.logger.error(message, logMeta);
    }
    // Warning logging
    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }
    // Info logging
    info(message, meta = {}) {
        this.logger.info(message, meta);
    }
    // HTTP request logging
    http(message, meta = {}) {
        this.logger.http(message, meta);
    }
    // Debug logging
    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }
    // Database operation logging
    database(operation, table, meta = {}) {
        this.info(`Database ${operation}`, {
            category: 'database',
            table,
            ...meta
        });
    }
    // Authentication logging
    auth(event, userId, meta = {}) {
        this.info(`Authentication: ${event}`, {
            category: 'auth',
            userId,
            ...meta
        });
    }
    // API request logging
    api(method, endpoint, statusCode, responseTime, meta = {}) {
        this.http(`${method} ${endpoint}`, {
            category: 'api',
            method,
            endpoint,
            statusCode,
            responseTime,
            ...meta
        });
    }
    // Security event logging
    security(event, severity, meta = {}) {
        const logMethod = severity === 'critical' || severity === 'high' ? this.error :
            severity === 'medium' ? this.warn : this.info;
        logMethod.call(this, `Security Event: ${event}`, {
            category: 'security',
            severity,
            ...meta
        });
    }
    // Performance logging
    performance(operation, duration, meta = {}) {
        const logMethod = duration > 1000 ? this.warn : this.info;
        logMethod.call(this, `Performance: ${operation}`, {
            category: 'performance',
            duration,
            slow: duration > 1000,
            ...meta
        });
    }
    // IoT/MQTT logging
    iot(event, deviceId, meta = {}) {
        this.info(`IoT Event: ${event}`, {
            category: 'iot',
            deviceId,
            ...meta
        });
    }
    // Business logic logging
    business(event, entity, entityId, meta = {}) {
        this.info(`Business Event: ${event}`, {
            category: 'business',
            entity,
            entityId,
            ...meta
        });
    }
    // Create child logger for specific context
    child(defaultMeta) {
        const childLogger = new LoggerService();
        childLogger.logger = this.logger.child(defaultMeta);
        return childLogger;
    }
    // Get underlying winston logger (for compatibility)
    getWinstonLogger() {
        return this.logger;
    }
    // Log system startup information
    startup(service, version, environment) {
        this.info('Service starting up', {
            category: 'system',
            service,
            version,
            environment,
            nodeVersion: process.version,
            platform: process.platform
        });
    }
    // Log system shutdown information
    shutdown(service, reason) {
        this.info('Service shutting down', {
            category: 'system',
            service,
            reason
        });
    }
}
// Create singleton instance
exports.logger = new LoggerService();
// Export logger for compatibility with existing code
exports.default = exports.logger;
