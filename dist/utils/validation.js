"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePaymentProcessingInput = exports.validateCreateSubscriptionInput = exports.ValidationResult = exports.validateRequired = exports.validateUuidParam = exports.validateUuid = exports.validateCoordinates = exports.validateAmount = exports.validateCurrency = exports.validateNonNegativeInteger = exports.validatePositiveInteger = exports.validateEmail = exports.validateResource = exports.validatePaymentMethod = exports.validateBillingCycle = void 0;
// Validation helper functions
const validateBillingCycle = (cycle) => {
    return ['monthly', 'yearly', 'quarterly'].includes(cycle);
};
exports.validateBillingCycle = validateBillingCycle;
const validatePaymentMethod = (method) => {
    return ['stripe', 'paypal', 'razorpay', 'manual', 'bank_transfer', 'cashfree'].includes(method);
};
exports.validatePaymentMethod = validatePaymentMethod;
const validateResource = (resource) => {
    return ['gateways', 'parkingLots', 'floors', 'parkingSlots', 'users'].includes(resource);
};
exports.validateResource = validateResource;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePositiveInteger = (value) => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return !isNaN(num) && num > 0;
};
exports.validatePositiveInteger = validatePositiveInteger;
const validateNonNegativeInteger = (value) => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return !isNaN(num) && num >= 0;
};
exports.validateNonNegativeInteger = validateNonNegativeInteger;
const validateCurrency = (currency) => {
    return ['USD', 'INR', 'EUR', 'GBP'].includes(currency.toUpperCase());
};
exports.validateCurrency = validateCurrency;
const validateAmount = (amount) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num >= 0;
};
exports.validateAmount = validateAmount;
const validateCoordinates = (value, type) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num))
        return false;
    if (type === 'latitude') {
        return num >= -90 && num <= 90;
    }
    else {
        return num >= -180 && num <= 180;
    }
};
exports.validateCoordinates = validateCoordinates;
const validateUuid = (uuid) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};
exports.validateUuid = validateUuid;
const validateUuidParam = (value, paramName) => {
    if (!value) {
        return { isValid: false, error: `${paramName} is required` };
    }
    if (!(0, exports.validateUuid)(value)) {
        return { isValid: false, error: `${paramName} must be a valid UUID` };
    }
    return { isValid: true };
};
exports.validateUuidParam = validateUuidParam;
const validateRequired = (fields) => {
    const errors = [];
    Object.entries(fields).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            errors.push(`${key} is required`);
        }
    });
    return errors;
};
exports.validateRequired = validateRequired;
class ValidationResult {
    constructor() {
        this.errors = [];
    }
    addError(field, message) {
        this.errors.push({ field, message });
    }
    get isValid() {
        return this.errors.length === 0;
    }
    get errorMessages() {
        return this.errors.map(error => `${error.field}: ${error.message}`);
    }
}
exports.ValidationResult = ValidationResult;
const validateCreateSubscriptionInput = (data) => {
    const result = new ValidationResult();
    // Required fields
    if (data.planId === undefined || data.planId === null) {
        result.addError('planId', 'Plan ID is required');
    }
    else if (typeof data.planId !== 'string') {
        result.addError('planId', 'Plan ID must be a string');
    }
    else if (data.planId.trim().length === 0) {
        result.addError('planId', 'Plan ID is required');
    }
    if (!data.billingCycle) {
        result.addError('billingCycle', 'Billing cycle is required');
    }
    else if (!(0, exports.validateBillingCycle)(data.billingCycle)) {
        result.addError('billingCycle', 'Invalid billing cycle. Must be monthly, yearly, or quarterly');
    }
    if (!data.paymentMethod) {
        result.addError('paymentMethod', 'Payment method is required');
    }
    else if (!(0, exports.validatePaymentMethod)(data.paymentMethod)) {
        result.addError('paymentMethod', 'Invalid payment method');
    }
    // Optional fields validation
    if (data.nodeCount !== undefined && !(0, exports.validateNonNegativeInteger)(data.nodeCount)) {
        result.addError('nodeCount', 'Node count must be a non-negative integer');
    }
    if (data.trialDays !== undefined && !(0, exports.validateNonNegativeInteger)(data.trialDays)) {
        result.addError('trialDays', 'Trial days must be a non-negative integer');
    }
    if (data.autoRenew !== undefined && typeof data.autoRenew !== 'boolean') {
        result.addError('autoRenew', 'Auto renew must be a boolean value');
    }
    return result;
};
exports.validateCreateSubscriptionInput = validateCreateSubscriptionInput;
const validatePaymentProcessingInput = (data) => {
    const result = new ValidationResult();
    if (!data.paymentId) {
        result.addError('paymentId', 'Payment ID is required');
    }
    else if (!(0, exports.validateUuid)(data.paymentId)) {
        result.addError('paymentId', 'Payment ID must be a valid UUID');
    }
    if (!data.gatewayTransactionId) {
        result.addError('gatewayTransactionId', 'Gateway transaction ID is required');
    }
    if (data.success === undefined || typeof data.success !== 'boolean') {
        result.addError('success', 'Success status is required and must be boolean');
    }
    if (data.success === false && !data.failureReason) {
        result.addError('failureReason', 'Failure reason is required when payment fails');
    }
    return result;
};
exports.validatePaymentProcessingInput = validatePaymentProcessingInput;
