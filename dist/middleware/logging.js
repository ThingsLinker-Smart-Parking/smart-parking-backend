"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logIoTEvent = exports.logBusinessEvent = exports.logDatabaseOperation = exports.logAuthEvent = exports.rateLimitLoggingMiddleware = exports.securityLoggingMiddleware = exports.errorLoggingMiddleware = exports.requestLoggingMiddleware = void 0;
const loggerService_1 = require("../services/loggerService");
// Generate unique request ID
const generateRequestId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
// Request logging middleware
const requestLoggingMiddleware = (req, res, next) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    // Add timing and ID to request object
    req.startTime = startTime;
    req.requestId = requestId;
    // Add request ID to response headers (useful for debugging)
    res.setHeader('X-Request-ID', requestId);
    // Extract client information
    const clientInfo = {
        ip: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        referer: req.get('Referer') || null
    };
    // Log incoming request
    loggerService_1.logger.http('Incoming request', {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        query: req.query,
        ...clientInfo
    });
    // Override res.end to capture response details
    const originalEnd = res.end.bind(res);
    res.end = function (chunk, encoding, cb) {
        const duration = Date.now() - startTime;
        const responseSize = res.get('content-length') || 0;
        // Log response
        loggerService_1.logger.api(req.method, req.originalUrl || req.url, res.statusCode, duration, {
            requestId,
            responseSize,
            ...clientInfo
        });
        // Log slow requests as warnings
        if (duration > 1000) {
            loggerService_1.logger.performance('Slow request detected', duration, {
                requestId,
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode
            });
        }
        // Log errors (4xx and 5xx status codes)
        if (res.statusCode >= 400) {
            const logMessage = `HTTP ${res.statusCode}`;
            const logMeta = {
                requestId,
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                duration,
                ...clientInfo
            };
            if (res.statusCode >= 500) {
                loggerService_1.logger.error(logMessage, undefined, logMeta);
            }
            else {
                loggerService_1.logger.warn(logMessage, logMeta);
            }
        }
        // Call the original end method and return the response
        return originalEnd(chunk, encoding, cb);
    };
    next();
};
exports.requestLoggingMiddleware = requestLoggingMiddleware;
// Error logging middleware (should be used after error handling middleware)
const errorLoggingMiddleware = (error, req, res, next) => {
    const requestId = req.requestId || 'unknown';
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    loggerService_1.logger.error('Request resulted in error', error, {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode || 500,
        duration,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    });
    next(error);
};
exports.errorLoggingMiddleware = errorLoggingMiddleware;
// Security logging middleware for suspicious activities
const securityLoggingMiddleware = (req, res, next) => {
    const requestId = req.requestId || generateRequestId();
    // Log potential security concerns
    const url = req.originalUrl || req.url;
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    // Detect potential security issues
    const securityChecks = [
        {
            condition: url.includes('../') || url.includes('..\\'),
            event: 'Path traversal attempt',
            severity: 'high'
        },
        {
            condition: url.toLowerCase().includes('<script') || url.toLowerCase().includes('javascript:'),
            event: 'XSS attempt in URL',
            severity: 'high'
        },
        {
            condition: url.toLowerCase().includes('union') && url.toLowerCase().includes('select'),
            event: 'SQL injection attempt in URL',
            severity: 'critical'
        },
        {
            condition: userAgent.toLowerCase().includes('bot') && !userAgent.toLowerCase().includes('google'),
            event: 'Non-Google bot detected',
            severity: 'low'
        },
        {
            condition: req.method === 'POST' && req.get('content-length') && parseInt(req.get('content-length')) > 10 * 1024 * 1024,
            event: 'Large POST request',
            severity: 'medium'
        }
    ];
    // Check for suspicious activities
    securityChecks.forEach(check => {
        if (check.condition) {
            loggerService_1.logger.security(check.event, check.severity, {
                requestId,
                method: req.method,
                url,
                ip,
                userAgent
            });
        }
    });
    next();
};
exports.securityLoggingMiddleware = securityLoggingMiddleware;
// Rate limit logging middleware
const rateLimitLoggingMiddleware = (req, res, next) => {
    // Check if rate limit headers are present (from express-rate-limit)
    const remainingRequests = res.get('RateLimit-Remaining');
    const resetTime = res.get('RateLimit-Reset');
    if (remainingRequests && parseInt(remainingRequests) < 10) {
        loggerService_1.logger.security('Rate limit approaching', 'medium', {
            ip: req.ip || req.connection.remoteAddress,
            remainingRequests: parseInt(remainingRequests),
            resetTime,
            url: req.originalUrl || req.url
        });
    }
    next();
};
exports.rateLimitLoggingMiddleware = rateLimitLoggingMiddleware;
// Authentication logging helper
const logAuthEvent = (event, email, userId, success = true, meta = {}) => {
    const logMethod = success ? loggerService_1.logger.info : loggerService_1.logger.warn;
    logMethod(`Authentication: ${event}`, {
        category: 'auth',
        event,
        email,
        userId,
        success,
        timestamp: new Date().toISOString(),
        ...meta
    });
    // Log failed authentication attempts as security events
    if (!success) {
        loggerService_1.logger.security(`Failed authentication attempt: ${event}`, 'medium', {
            email,
            userId,
            ...meta
        });
    }
};
exports.logAuthEvent = logAuthEvent;
// Database operation logging helper
const logDatabaseOperation = (operation, table, success = true, duration, meta = {}) => {
    const logMethod = success ? loggerService_1.logger.info : loggerService_1.logger.error;
    logMethod(`Database ${operation}`, {
        category: 'database',
        operation,
        table,
        success,
        duration,
        ...meta
    });
    // Log slow database operations
    if (duration && duration > 1000) {
        loggerService_1.logger.performance(`Slow database ${operation}`, duration, {
            table,
            ...meta
        });
    }
};
exports.logDatabaseOperation = logDatabaseOperation;
// Business event logging helper
const logBusinessEvent = (event, entity, entityId, userId, meta = {}) => {
    loggerService_1.logger.business(event, entity, entityId, {
        userId,
        timestamp: new Date().toISOString(),
        ...meta
    });
};
exports.logBusinessEvent = logBusinessEvent;
// IoT/MQTT event logging helper
const logIoTEvent = (event, gatewayId, nodeId, meta = {}) => {
    loggerService_1.logger.iot(event, nodeId, {
        gatewayId,
        timestamp: new Date().toISOString(),
        ...meta
    });
};
exports.logIoTEvent = logIoTEvent;
