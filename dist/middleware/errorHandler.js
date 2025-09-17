"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUncaughtException = exports.handleUnhandledRejection = exports.handleNotFound = exports.catchAsync = exports.globalErrorHandler = exports.ExternalServiceError = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
const loggerService_1 = require("../services/loggerService");
// Custom error class for application errors
class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', isOperational = true, details) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.details = details;
        // Maintain proper stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.AppError = AppError;
// Specific error classes for different scenarios
class ValidationError extends AppError {
    constructor(message = 'Validation failed', details) {
        super(message, 400, 'VALIDATION_ERROR', true, details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR', true);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR', true);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND', true);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'RESOURCE_CONFLICT', true);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends AppError {
    constructor(message = 'Database operation failed', details) {
        super(message, 500, 'DATABASE_ERROR', true, details);
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends AppError {
    constructor(service, message = 'External service unavailable') {
        super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, { service });
    }
}
exports.ExternalServiceError = ExternalServiceError;
// Development vs Production error details
const getErrorDetails = (error, isDevelopment) => {
    if (!isDevelopment) {
        return undefined;
    }
    return {
        stack: error.stack,
        name: error.name
    };
};
// Format error response
const formatErrorResponse = (error, req, isDevelopment) => {
    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : 500;
    const errorCode = isAppError ? error.errorCode : 'INTERNAL_ERROR';
    const response = {
        success: false,
        message: error.message || 'An unexpected error occurred',
        error: errorCode,
        errorCode: isAppError ? error.errorCode : undefined,
        details: isAppError ? error.details : undefined,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
        path: req.originalUrl || req.url
    };
    // Add stack trace in development
    if (isDevelopment) {
        response.stack = error.stack;
    }
    return response;
};
// Log error with appropriate level and context
const logError = (error, req, res) => {
    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : 500;
    const logContext = {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode,
        userId: req.user?.id,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        errorCode: isAppError ? error.errorCode : 'INTERNAL_ERROR',
        isOperational: isAppError ? error.isOperational : false
    };
    // Log based on error severity
    if (statusCode >= 500) {
        // Server errors - always log as errors
        loggerService_1.logger.error('Server error occurred', error, logContext);
    }
    else if (statusCode >= 400) {
        // Client errors - log as warnings for debugging
        loggerService_1.logger.warn('Client error occurred', {
            ...logContext,
            message: error.message,
            stack: error.stack
        });
    }
    // Log security-related errors
    if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
        loggerService_1.logger.security(`Security event: ${error.message}`, 'medium', logContext);
    }
};
// Handle specific error types
const handleCastError = (error) => {
    return new ValidationError(`Invalid ${error.path}: ${error.value}`);
};
const handleDuplicateFieldError = (error) => {
    const duplicateField = Object.keys(error.keyValue)[0];
    return new ConflictError(`${duplicateField} already exists`);
};
const handleValidationError = (error) => {
    const errors = Object.values(error.errors).map((val) => val.message);
    return new ValidationError('Invalid input data', errors);
};
const handleJWTError = () => {
    return new AuthenticationError('Invalid token. Please log in again');
};
const handleJWTExpiredError = () => {
    return new AuthenticationError('Your token has expired. Please log in again');
};
// Main error handling middleware
const globalErrorHandler = (error, req, res, next) => {
    let err = error;
    const isDevelopment = process.env.NODE_ENV === 'development';
    // Handle specific error types
    if (error.name === 'CastError') {
        err = handleCastError(error);
    }
    else if (error.code === 11000) {
        err = handleDuplicateFieldError(error);
    }
    else if (error.name === 'ValidationError') {
        err = handleValidationError(error);
    }
    else if (error.name === 'JsonWebTokenError') {
        err = handleJWTError();
    }
    else if (error.name === 'TokenExpiredError') {
        err = handleJWTExpiredError();
    }
    // If it's not an operational error, convert to AppError
    if (!(err instanceof AppError)) {
        err = new AppError(isDevelopment ? err.message : 'Something went wrong', 500, 'INTERNAL_ERROR', false);
    }
    const appError = err;
    // Log the error
    logError(appError, req, res);
    // Format and send error response
    const errorResponse = formatErrorResponse(appError, req, isDevelopment);
    res.status(appError.statusCode).json(errorResponse);
};
exports.globalErrorHandler = globalErrorHandler;
// Async error wrapper to catch async errors in route handlers
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.catchAsync = catchAsync;
// Handle unhandled routes (404 errors)
const handleNotFound = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl} not found`);
    next(error);
};
exports.handleNotFound = handleNotFound;
// Graceful error handling for unhandled promise rejections
const handleUnhandledRejection = (reason, promise) => {
    loggerService_1.logger.error('Unhandled Promise Rejection', reason, {
        category: 'system',
        promise: promise.toString(),
        fatal: true
    });
    // Give the server time to finish existing requests
    setTimeout(() => {
        process.exit(1);
    }, 1000);
};
exports.handleUnhandledRejection = handleUnhandledRejection;
// Graceful error handling for uncaught exceptions
const handleUncaughtException = (error) => {
    loggerService_1.logger.error('Uncaught Exception', error, {
        category: 'system',
        fatal: true
    });
    process.exit(1);
};
exports.handleUncaughtException = handleUncaughtException;
