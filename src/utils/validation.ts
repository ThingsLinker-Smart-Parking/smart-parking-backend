import { BillingCycle } from '../models/SubscriptionPlan';
import { PaymentMethod } from '../models/Payment';

// Validation helper functions
export const validateBillingCycle = (cycle: string): cycle is BillingCycle => {
    return ['monthly', 'yearly', 'quarterly'].includes(cycle);
};

export const validatePaymentMethod = (method: string): method is PaymentMethod => {
    return ['stripe', 'paypal', 'razorpay', 'manual', 'bank_transfer', 'cashfree'].includes(method);
};

export const validateResource = (resource: string): boolean => {
    return ['gateways', 'parkingLots', 'floors', 'parkingSlots', 'users'].includes(resource);
};

export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePositiveInteger = (value: string | number): boolean => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return !isNaN(num) && num > 0;
};

export const validateNonNegativeInteger = (value: string | number): boolean => {
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    return !isNaN(num) && num >= 0;
};

export const validateCurrency = (currency: string): boolean => {
    return ['USD', 'INR', 'EUR', 'GBP'].includes(currency.toUpperCase());
};

export const validateAmount = (amount: string | number): boolean => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num >= 0;
};

export const validateCoordinates = (value: string | number, type: 'latitude' | 'longitude'): boolean => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return false;
    
    if (type === 'latitude') {
        return num >= -90 && num <= 90;
    } else {
        return num >= -180 && num <= 180;
    }
};

export const validateUuid = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

export const validateUuidParam = (value: string, paramName: string): { isValid: boolean; error?: string } => {
    if (!value) {
        return { isValid: false, error: `${paramName} is required` };
    }
    if (!validateUuid(value)) {
        return { isValid: false, error: `${paramName} must be a valid UUID` };
    }
    return { isValid: true };
};

export const validateRequired = (fields: Record<string, any>): string[] => {
    const errors: string[] = [];
    
    Object.entries(fields).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            errors.push(`${key} is required`);
        }
    });
    
    return errors;
};

export interface ValidationError {
    field: string;
    message: string;
}

export class ValidationResult {
    public errors: ValidationError[] = [];
    
    addError(field: string, message: string): void {
        this.errors.push({ field, message });
    }
    
    get isValid(): boolean {
        return this.errors.length === 0;
    }
    
    get errorMessages(): string[] {
        return this.errors.map(error => `${error.field}: ${error.message}`);
    }
}

export const validateCreateSubscriptionInput = (data: any): ValidationResult => {
    const result = new ValidationResult();
    
    // Required fields
    if (data.planId === undefined || data.planId === null) {
        result.addError('planId', 'Plan ID is required');
    } else if (typeof data.planId !== 'string') {
        result.addError('planId', 'Plan ID must be a string');
    } else if (data.planId.trim().length === 0) {
        result.addError('planId', 'Plan ID is required');
    }
    
    if (!data.billingCycle) {
        result.addError('billingCycle', 'Billing cycle is required');
    } else if (!validateBillingCycle(data.billingCycle)) {
        result.addError('billingCycle', 'Invalid billing cycle. Must be monthly, yearly, or quarterly');
    }
    
    if (!data.paymentMethod) {
        result.addError('paymentMethod', 'Payment method is required');
    } else if (!validatePaymentMethod(data.paymentMethod)) {
        result.addError('paymentMethod', 'Invalid payment method');
    }
    
    // Optional fields validation
    if (data.nodeCount !== undefined && !validateNonNegativeInteger(data.nodeCount)) {
        result.addError('nodeCount', 'Node count must be a non-negative integer');
    }
    
    if (data.trialDays !== undefined && !validateNonNegativeInteger(data.trialDays)) {
        result.addError('trialDays', 'Trial days must be a non-negative integer');
    }
    
    if (data.autoRenew !== undefined && typeof data.autoRenew !== 'boolean') {
        result.addError('autoRenew', 'Auto renew must be a boolean value');
    }
    
    return result;
};

export const validatePaymentProcessingInput = (data: any): ValidationResult => {
    const result = new ValidationResult();
    
    if (!data.paymentId) {
        result.addError('paymentId', 'Payment ID is required');
    } else if (!validateUuid(data.paymentId)) {
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
