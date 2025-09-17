"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateValidationErrors = exports.validationAwareRateLimit = exports.sanitize = exports.validateMultiple = exports.validateQuery = exports.validateParams = exports.validateBody = exports.validate = void 0;
// Format Joi validation errors into a consistent structure
const formatValidationErrors = (error) => {
    return error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
    }));
};
// Generic validation middleware factory
const validate = (schema, source = 'body', options = {}) => {
    return (req, res, next) => {
        const dataToValidate = req[source];
        const validationOptions = {
            abortEarly: false, // Return all validation errors, not just the first one
            stripUnknown: true, // Remove unknown fields
            ...options
        };
        const { error, value } = schema.validate(dataToValidate, validationOptions);
        if (error) {
            const validationErrors = formatValidationErrors(error);
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors,
                error: 'VALIDATION_ERROR'
            });
            return;
        }
        // Store validated and sanitized data
        req.validatedData = value;
        // Also update the original request object with sanitized data
        if (source === 'body') {
            req.body = value;
        }
        else if (source === 'params') {
            req.params = value;
        }
        else if (source === 'query') {
            req.query = value;
        }
        next();
    };
};
exports.validate = validate;
// Convenience functions for common validation scenarios
const validateBody = (schema, options) => {
    return (0, exports.validate)(schema, 'body', options);
};
exports.validateBody = validateBody;
const validateParams = (schema, options) => {
    return (0, exports.validate)(schema, 'params', options);
};
exports.validateParams = validateParams;
const validateQuery = (schema, options) => {
    return (0, exports.validate)(schema, 'query', options);
};
exports.validateQuery = validateQuery;
// Multiple validation middleware (for validating both params and body, for example)
const validateMultiple = (validations) => {
    return async (req, res, next) => {
        const errors = [];
        for (const validation of validations) {
            const { schema, source, options = {} } = validation;
            const dataToValidate = req[source];
            const validationOptions = {
                abortEarly: false,
                stripUnknown: true,
                ...options
            };
            const { error, value } = schema.validate(dataToValidate, validationOptions);
            if (error) {
                errors.push(...formatValidationErrors(error));
            }
            else {
                // Update request with sanitized data
                if (source === 'body') {
                    req.body = value;
                }
                else if (source === 'params') {
                    req.params = value;
                }
                else if (source === 'query') {
                    req.query = value;
                }
            }
        }
        if (errors.length > 0) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
                error: 'VALIDATION_ERROR'
            });
            return;
        }
        next();
    };
};
exports.validateMultiple = validateMultiple;
// Sanitization middleware for additional security
const sanitize = (options = {}) => {
    const { trimStrings = true, lowercaseEmails = true, removeHtml = true } = options;
    return (req, res, next) => {
        const sanitizeObject = (obj) => {
            if (typeof obj !== 'object' || obj === null) {
                return obj;
            }
            if (Array.isArray(obj)) {
                return obj.map(sanitizeObject);
            }
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    let sanitizedValue = value;
                    // Trim whitespace
                    if (trimStrings) {
                        sanitizedValue = sanitizedValue.trim();
                    }
                    // Lowercase emails
                    if (lowercaseEmails && key.toLowerCase().includes('email')) {
                        sanitizedValue = sanitizedValue.toLowerCase();
                    }
                    // Remove HTML tags (basic protection)
                    if (removeHtml) {
                        sanitizedValue = sanitizedValue.replace(/<[^>]*>/g, '');
                    }
                    sanitized[key] = sanitizedValue;
                }
                else if (typeof value === 'object') {
                    sanitized[key] = sanitizeObject(value);
                }
                else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        };
        // Sanitize request body
        if (req.body) {
            req.body = sanitizeObject(req.body);
        }
        // Sanitize query parameters
        if (req.query) {
            req.query = sanitizeObject(req.query);
        }
        next();
    };
};
exports.sanitize = sanitize;
// Rate limiting by validation context (e.g., stricter limits for failed validations)
const validationAwareRateLimit = () => {
    return (req, res, next) => {
        // This can be expanded to implement different rate limiting based on validation failures
        // For now, it's a placeholder that can be enhanced based on specific requirements
        next();
    };
};
exports.validationAwareRateLimit = validationAwareRateLimit;
// Validation error aggregator for better error reporting
const aggregateValidationErrors = (errors) => {
    const fieldErrors = {};
    const generalErrors = [];
    errors.forEach(error => {
        if (error.field) {
            if (!fieldErrors[error.field]) {
                fieldErrors[error.field] = [];
            }
            fieldErrors[error.field].push(error.message);
        }
        else {
            generalErrors.push(error.message);
        }
    });
    return { fieldErrors, generalErrors };
};
exports.aggregateValidationErrors = aggregateValidationErrors;
