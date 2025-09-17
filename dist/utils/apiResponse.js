"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.createPaginationMeta = exports.sendRateLimit = exports.sendConflict = exports.sendForbidden = exports.sendUnauthorized = exports.sendNotFound = exports.sendValidationError = exports.sendError = exports.sendCreated = exports.sendSuccess = exports.ApiResponseBuilder = void 0;
const loggerService_1 = require("../services/loggerService");
// Response builder class
class ApiResponseBuilder {
    constructor() {
        this.response = {};
        this.response.timestamp = new Date().toISOString();
        this.response.success = true;
    }
    static success(data, message = 'Success') {
        const builder = new ApiResponseBuilder();
        builder.response.success = true;
        builder.response.message = message;
        if (data !== undefined) {
            builder.response.data = data;
        }
        return builder;
    }
    static error(message, errorCode = 'INTERNAL_ERROR', details) {
        const builder = new ApiResponseBuilder();
        builder.response.success = false;
        builder.response.message = message;
        builder.response.error = message;
        builder.response.errorCode = errorCode;
        if (details) {
            builder.response.meta = { details };
        }
        return builder;
    }
    static validationError(errors, message = 'Validation failed') {
        const builder = new ApiResponseBuilder();
        builder.response.success = false;
        builder.response.message = message;
        builder.response.error = 'VALIDATION_ERROR';
        builder.response.errorCode = 'VALIDATION_ERROR';
        builder.response.meta = { validationErrors: errors };
        return builder;
    }
    static notFound(resource = 'Resource', id) {
        const message = id
            ? `${resource} with ID '${id}' not found`
            : `${resource} not found`;
        return ApiResponseBuilder.error(message, 'RESOURCE_NOT_FOUND');
    }
    static unauthorized(message = 'Unauthorized') {
        return ApiResponseBuilder.error(message, 'UNAUTHORIZED');
    }
    static forbidden(message = 'Insufficient permissions') {
        return ApiResponseBuilder.error(message, 'FORBIDDEN');
    }
    static conflict(message = 'Resource conflict') {
        return ApiResponseBuilder.error(message, 'CONFLICT');
    }
    static rateLimit(message = 'Rate limit exceeded') {
        return ApiResponseBuilder.error(message, 'RATE_LIMIT_EXCEEDED');
    }
    // Fluent interface methods
    withMessage(message) {
        this.response.message = message;
        return this;
    }
    withData(data) {
        this.response.data = data;
        return this;
    }
    withMeta(meta) {
        this.response.meta = { ...this.response.meta, ...meta };
        return this;
    }
    withPagination(pagination) {
        this.response.pagination = pagination;
        return this;
    }
    withRequestId(requestId) {
        this.response.requestId = requestId;
        return this;
    }
    withErrorCode(errorCode) {
        this.response.errorCode = errorCode;
        return this;
    }
    // Build and send the response
    send(res, statusCode = 200) {
        // Add stack trace in development for errors
        if (!this.response.success && process.env.NODE_ENV === 'development') {
            this.response.meta = {
                ...this.response.meta,
                stack: new Error().stack
            };
        }
        // Log the response for monitoring
        this.logResponse(statusCode);
        return res.status(statusCode).json(this.response);
    }
    // Get the response object without sending
    build() {
        return this.response;
    }
    logResponse(statusCode) {
        const logData = {
            statusCode,
            success: this.response.success,
            message: this.response.message,
            errorCode: this.response.errorCode,
            requestId: this.response.requestId,
            timestamp: this.response.timestamp
        };
        if (statusCode >= 500) {
            loggerService_1.logger.error('API Response Error', logData);
        }
        else if (statusCode >= 400) {
            loggerService_1.logger.warn('API Response Warning', logData);
        }
        else {
            loggerService_1.logger.debug('API Response Success', logData);
        }
    }
}
exports.ApiResponseBuilder = ApiResponseBuilder;
// Helper functions for common responses
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    return ApiResponseBuilder.success(data, message).send(res, statusCode);
};
exports.sendSuccess = sendSuccess;
const sendCreated = (res, data, message = 'Resource created successfully') => {
    return ApiResponseBuilder.success(data, message).send(res, 201);
};
exports.sendCreated = sendCreated;
const sendError = (res, message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details) => {
    return ApiResponseBuilder.error(message, errorCode)
        .withMeta(details)
        .send(res, statusCode);
};
exports.sendError = sendError;
const sendValidationError = (res, errors, message = 'Validation failed') => {
    return ApiResponseBuilder.validationError(errors, message).send(res, 400);
};
exports.sendValidationError = sendValidationError;
const sendNotFound = (res, resource = 'Resource', id) => {
    return ApiResponseBuilder.notFound(resource, id).send(res, 404);
};
exports.sendNotFound = sendNotFound;
const sendUnauthorized = (res, message = 'Unauthorized') => {
    return ApiResponseBuilder.unauthorized(message).send(res, 401);
};
exports.sendUnauthorized = sendUnauthorized;
const sendForbidden = (res, message = 'Insufficient permissions') => {
    return ApiResponseBuilder.forbidden(message).send(res, 403);
};
exports.sendForbidden = sendForbidden;
const sendConflict = (res, message = 'Resource conflict') => {
    return ApiResponseBuilder.conflict(message).send(res, 409);
};
exports.sendConflict = sendConflict;
const sendRateLimit = (res, message = 'Rate limit exceeded') => {
    return ApiResponseBuilder.rateLimit(message).send(res, 429);
};
exports.sendRateLimit = sendRateLimit;
// Pagination helper
const createPaginationMeta = (total, limit, offset, count) => {
    const actualCount = count ?? Math.min(limit, total - offset);
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        count: actualCount,
        limit,
        offset,
        hasMore: offset + actualCount < total,
        page,
        totalPages
    };
};
exports.createPaginationMeta = createPaginationMeta;
// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
