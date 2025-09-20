"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iotSchemas = exports.paramSchemas = exports.subscriptionPlanSchemas = exports.subscriptionSchemas = exports.gatewaySchemas = exports.nodeSchemas = exports.parkingSlotSchemas = exports.floorSchemas = exports.parkingLotSchemas = exports.userSchemas = exports.commonSchemas = void 0;
const joi_1 = __importDefault(require("joi"));
// Custom UUID validation pattern
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Common validation schemas
exports.commonSchemas = {
    uuid: joi_1.default.string().pattern(uuidPattern).required().messages({
        'string.pattern.base': 'Invalid UUID format',
        'any.required': 'UUID is required'
    }),
    email: joi_1.default.string().email().required().messages({
        'string.email': 'Invalid email format',
        'any.required': 'Email is required'
    }),
    password: joi_1.default.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .required()
        .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
    }),
    phone: joi_1.default.string()
        .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
        .optional()
        .messages({
        'string.pattern.base': 'Invalid phone number format'
    }),
    name: joi_1.default.string()
        .min(2)
        .max(100)
        .pattern(/^[a-zA-Z\s\-\.]+$/)
        .required()
        .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and dots',
        'any.required': 'Name is required'
    }),
    address: joi_1.default.string()
        .min(10)
        .max(500)
        .required()
        .messages({
        'string.min': 'Address must be at least 10 characters long',
        'string.max': 'Address cannot exceed 500 characters',
        'any.required': 'Address is required'
    })
};
// User validation schemas
exports.userSchemas = {
    register: joi_1.default.object({
        firstName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s\-\.]+$/)
            .required()
            .messages({
            'string.min': 'First name must be at least 2 characters long',
            'string.max': 'First name cannot exceed 50 characters',
            'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and dots',
            'any.required': 'First name is required'
        }),
        lastName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s\-\.]+$/)
            .required()
            .messages({
            'string.min': 'Last name must be at least 2 characters long',
            'string.max': 'Last name cannot exceed 50 characters',
            'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and dots',
            'any.required': 'Last name is required'
        }),
        email: exports.commonSchemas.email,
        password: exports.commonSchemas.password,
        role: joi_1.default.string().valid('user', 'admin', 'super_admin').default('user').messages({
            'any.only': 'Role must be one of: user, admin, super_admin'
        })
    }),
    login: joi_1.default.object({
        email: exports.commonSchemas.email,
        password: joi_1.default.string().required().messages({
            'any.required': 'Password is required'
        })
    }),
    verifyOtp: joi_1.default.object({
        email: exports.commonSchemas.email,
        otp: joi_1.default.string()
            .pattern(/^[0-9]{6}$/)
            .required()
            .messages({
            'string.pattern.base': 'OTP must be a 6-digit number',
            'any.required': 'OTP is required'
        })
    }),
    forgotPassword: joi_1.default.object({
        email: exports.commonSchemas.email
    }),
    resetPassword: joi_1.default.object({
        email: exports.commonSchemas.email,
        otp: joi_1.default.string()
            .pattern(/^[0-9]{6}$/)
            .required()
            .messages({
            'string.pattern.base': 'OTP must be a 6-digit number',
            'any.required': 'OTP is required'
        }),
        newPassword: exports.commonSchemas.password
    }),
    resendOtp: joi_1.default.object({
        email: exports.commonSchemas.email,
        purpose: joi_1.default.string()
            .valid('verification', 'password_reset')
            .default('verification')
            .messages({
            'any.only': 'Purpose must be either verification or password_reset'
        })
    }),
    recoverAccount: joi_1.default.object({
        email: exports.commonSchemas.email
    }),
    updateProfile: joi_1.default.object({
        firstName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s\-\.]+$/)
            .optional()
            .messages({
            'string.min': 'First name must be at least 2 characters long',
            'string.max': 'First name cannot exceed 50 characters',
            'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and dots'
        }),
        lastName: joi_1.default.string()
            .min(2)
            .max(50)
            .pattern(/^[a-zA-Z\s\-\.]+$/)
            .optional()
            .messages({
            'string.min': 'Last name must be at least 2 characters long',
            'string.max': 'Last name cannot exceed 50 characters',
            'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and dots'
        }),
        currentPassword: joi_1.default.string().when('newPassword', {
            is: joi_1.default.exist(),
            then: joi_1.default.required(),
            otherwise: joi_1.default.optional()
        }).messages({
            'any.required': 'Current password is required when changing password'
        }),
        newPassword: exports.commonSchemas.password.optional()
    }).with('newPassword', 'currentPassword').min(1).messages({
        'object.min': 'At least one field must be provided for update'
    })
};
// Parking Lot validation schemas
exports.parkingLotSchemas = {
    create: joi_1.default.object({
        name: joi_1.default.string()
            .min(3)
            .max(100)
            .required()
            .messages({
            'string.min': 'Parking lot name must be at least 3 characters long',
            'string.max': 'Parking lot name cannot exceed 100 characters',
            'any.required': 'Parking lot name is required'
        }),
        address: exports.commonSchemas.address
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(3).max(100).optional(),
        address: joi_1.default.string().min(10).max(500).optional()
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
    }),
    assignGateway: joi_1.default.object({
        gatewayId: exports.commonSchemas.uuid
    })
};
// Floor validation schemas
exports.floorSchemas = {
    create: joi_1.default.object({
        name: joi_1.default.string()
            .min(1)
            .max(50)
            .required()
            .messages({
            'string.min': 'Floor name must be at least 1 character long',
            'string.max': 'Floor name cannot exceed 50 characters',
            'any.required': 'Floor name is required'
        }),
        description: joi_1.default.string().max(500).optional()
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(1).max(50).optional(),
        description: joi_1.default.string().max(500).optional()
    }).min(1)
};
// Parking Slot validation schemas
exports.parkingSlotSchemas = {
    create: joi_1.default.object({
        slotNumber: joi_1.default.string()
            .min(1)
            .max(20)
            .required()
            .messages({
            'string.min': 'Slot number must be at least 1 character long',
            'string.max': 'Slot number cannot exceed 20 characters',
            'any.required': 'Slot number is required'
        }),
        slotType: joi_1.default.string()
            .valid('regular', 'handicapped', 'electric', 'compact')
            .default('regular')
            .messages({
            'any.only': 'Slot type must be one of: regular, handicapped, electric, compact'
        })
    }),
    update: joi_1.default.object({
        slotNumber: joi_1.default.string().min(1).max(20).optional(),
        slotType: joi_1.default.string().valid('regular', 'handicapped', 'electric', 'compact').optional(),
        isOccupied: joi_1.default.boolean().optional()
    }).min(1)
};
// Node validation schemas
exports.nodeSchemas = {
    create: joi_1.default.object({
        name: joi_1.default.string()
            .min(3)
            .max(100)
            .required()
            .messages({
            'string.min': 'Node name must be at least 3 characters long',
            'string.max': 'Node name cannot exceed 100 characters',
            'any.required': 'Node name is required'
        }),
        chirpstackDeviceId: joi_1.default.string()
            .min(16)
            .max(16)
            .pattern(/^[0-9a-fA-F]{16}$/)
            .required()
            .messages({
            'string.min': 'ChirpStack Device ID must be exactly 16 characters',
            'string.max': 'ChirpStack Device ID must be exactly 16 characters',
            'string.pattern.base': 'ChirpStack Device ID must be a valid 16-character hexadecimal string',
            'any.required': 'ChirpStack Device ID is required'
        }),
        description: joi_1.default.string()
            .max(500)
            .optional()
            .messages({
            'string.max': 'Description cannot exceed 500 characters'
        }),
        parkingSlotId: exports.commonSchemas.uuid,
        latitude: joi_1.default.number()
            .min(-90)
            .max(90)
            .optional()
            .messages({
            'number.min': 'Latitude must be between -90 and 90',
            'number.max': 'Latitude must be between -90 and 90'
        }),
        longitude: joi_1.default.number()
            .min(-180)
            .max(180)
            .optional()
            .messages({
            'number.min': 'Longitude must be between -180 and 180',
            'number.max': 'Longitude must be between -180 and 180'
        })
    }),
    updateStatus: joi_1.default.object({
        distance: joi_1.default.number().min(0).optional(),
        percentage: joi_1.default.number().min(0).max(100).optional(),
        batteryLevel: joi_1.default.number().min(0).max(100).optional()
    }).min(1).messages({
        'object.min': 'At least one status field must be provided'
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(3).max(100).optional(),
        description: joi_1.default.string().max(500).optional(),
        latitude: joi_1.default.number().min(-90).max(90).optional(),
        longitude: joi_1.default.number().min(-180).max(180).optional(),
        isActive: joi_1.default.boolean().optional()
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
    })
};
// Gateway validation schemas
exports.gatewaySchemas = {
    create: joi_1.default.object({
        gatewayId: joi_1.default.string()
            .min(3)
            .max(50)
            .required()
            .messages({
            'string.min': 'Gateway ID must be at least 3 characters long',
            'string.max': 'Gateway ID cannot exceed 50 characters',
            'any.required': 'Gateway ID is required'
        }),
        name: joi_1.default.string()
            .min(3)
            .max(100)
            .required()
            .messages({
            'string.min': 'Gateway name must be at least 3 characters long',
            'string.max': 'Gateway name cannot exceed 100 characters',
            'any.required': 'Gateway name is required'
        }),
        location: joi_1.default.string().max(200).optional()
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(3).max(100).optional(),
        location: joi_1.default.string().max(200).optional(),
        isActive: joi_1.default.boolean().optional()
    }).min(1),
    linkAdmin: joi_1.default.object({
        adminId: exports.commonSchemas.uuid
    })
};
// Subscription validation schemas
exports.subscriptionSchemas = {
    create: joi_1.default.object({
        planId: exports.commonSchemas.uuid,
        paymentMethodId: joi_1.default.string().optional() // For future payment integration
    }),
    update: joi_1.default.object({
        status: joi_1.default.string().valid('active', 'inactive', 'cancelled', 'expired').optional()
    }).min(1)
};
// Subscription Plan validation schemas
exports.subscriptionPlanSchemas = {
    create: joi_1.default.object({
        name: joi_1.default.string()
            .min(3)
            .max(100)
            .required()
            .messages({
            'string.min': 'Plan name must be at least 3 characters long',
            'string.max': 'Plan name cannot exceed 100 characters',
            'any.required': 'Plan name is required'
        }),
        description: joi_1.default.string().max(1000).allow('', null).optional(),
        // Pricing fields
        basePricePerMonth: joi_1.default.number()
            .min(0)
            .precision(2)
            .required()
            .messages({
            'number.min': 'Monthly price cannot be negative',
            'any.required': 'Monthly price is required'
        }),
        basePricePerYear: joi_1.default.number()
            .min(0)
            .precision(2)
            .required()
            .messages({
            'number.min': 'Yearly price cannot be negative',
            'any.required': 'Yearly price is required'
        }),
        basePricePerQuarter: joi_1.default.number().min(0).precision(2).optional(),
        // Per-node pricing
        pricePerNodePerMonth: joi_1.default.number()
            .min(0)
            .precision(2)
            .default(2.00)
            .messages({
            'number.min': 'Node price per month cannot be negative'
        }),
        pricePerNodePerYear: joi_1.default.number()
            .min(0)
            .precision(2)
            .default(20.00)
            .messages({
            'number.min': 'Node price per year cannot be negative'
        }),
        pricePerNodePerQuarter: joi_1.default.number().min(0).precision(2).optional(),
        // Exchange rate
        usdToInrRate: joi_1.default.number()
            .min(1)
            .precision(2)
            .default(75.00)
            .messages({
            'number.min': 'Exchange rate must be at least 1'
        }),
        // Billing cycle
        defaultBillingCycle: joi_1.default.string()
            .valid('monthly', 'yearly', 'quarterly')
            .default('monthly')
            .messages({
            'any.only': 'Billing cycle must be monthly, yearly, or quarterly'
        }),
        // Resource limits
        maxGateways: joi_1.default.number().integer().min(0).default(0),
        maxParkingLots: joi_1.default.number().integer().min(0).default(0),
        maxFloors: joi_1.default.number().integer().min(0).default(0),
        maxParkingSlots: joi_1.default.number().integer().min(0).default(0),
        maxUsers: joi_1.default.number().integer().min(0).default(0),
        // Features and flags
        features: joi_1.default.array()
            .items(joi_1.default.string().min(1).max(200))
            .default([])
            .messages({
            'string.min': 'Feature name cannot be empty',
            'string.max': 'Feature name cannot exceed 200 characters'
        }),
        includesAnalytics: joi_1.default.boolean().default(false),
        includesSupport: joi_1.default.boolean().default(false),
        includesAPI: joi_1.default.boolean().default(false),
        includesCustomization: joi_1.default.boolean().default(false),
        // Plan metadata
        sortOrder: joi_1.default.number().integer().min(0).default(0),
        isActive: joi_1.default.boolean().default(true),
        isPopular: joi_1.default.boolean().default(false),
        isCustom: joi_1.default.boolean().default(false)
    }),
    update: joi_1.default.object({
        name: joi_1.default.string().min(3).max(100).optional(),
        description: joi_1.default.string().max(1000).allow('', null).optional(),
        // Pricing updates
        basePricePerMonth: joi_1.default.number().min(0).precision(2).optional(),
        basePricePerYear: joi_1.default.number().min(0).precision(2).optional(),
        basePricePerQuarter: joi_1.default.number().min(0).precision(2).optional(),
        // Per-node pricing updates
        pricePerNodePerMonth: joi_1.default.number().min(0).precision(2).optional(),
        pricePerNodePerYear: joi_1.default.number().min(0).precision(2).optional(),
        pricePerNodePerQuarter: joi_1.default.number().min(0).precision(2).optional(),
        // Exchange rate update
        usdToInrRate: joi_1.default.number().min(1).precision(2).optional(),
        // Billing cycle update
        defaultBillingCycle: joi_1.default.string()
            .valid('monthly', 'yearly', 'quarterly')
            .optional(),
        // Resource limit updates
        maxGateways: joi_1.default.number().integer().min(0).optional(),
        maxParkingLots: joi_1.default.number().integer().min(0).optional(),
        maxFloors: joi_1.default.number().integer().min(0).optional(),
        maxParkingSlots: joi_1.default.number().integer().min(0).optional(),
        maxUsers: joi_1.default.number().integer().min(0).optional(),
        // Feature updates
        features: joi_1.default.array().items(joi_1.default.string().min(1).max(200)).optional(),
        includesAnalytics: joi_1.default.boolean().optional(),
        includesSupport: joi_1.default.boolean().optional(),
        includesAPI: joi_1.default.boolean().optional(),
        includesCustomization: joi_1.default.boolean().optional(),
        // Metadata updates
        sortOrder: joi_1.default.number().integer().min(0).optional(),
        isActive: joi_1.default.boolean().optional(),
        isPopular: joi_1.default.boolean().optional(),
        isCustom: joi_1.default.boolean().optional()
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
    }),
    // Soft delete validation
    softDelete: joi_1.default.object({
        reason: joi_1.default.string()
            .min(10)
            .max(500)
            .optional()
            .messages({
            'string.min': 'Deletion reason must be at least 10 characters',
            'string.max': 'Deletion reason cannot exceed 500 characters'
        })
    }),
    // Exchange rate update (super admin only)
    updateExchangeRate: joi_1.default.object({
        usdToInrRate: joi_1.default.number()
            .min(1)
            .max(200)
            .precision(2)
            .required()
            .messages({
            'number.min': 'Exchange rate must be at least 1',
            'number.max': 'Exchange rate cannot exceed 200',
            'any.required': 'Exchange rate is required'
        })
    }),
    // Bulk operations
    bulkUpdate: joi_1.default.object({
        planIds: joi_1.default.array()
            .items(exports.commonSchemas.uuid)
            .min(1)
            .max(50)
            .required()
            .messages({
            'array.min': 'At least one plan ID is required',
            'array.max': 'Cannot update more than 50 plans at once',
            'any.required': 'Plan IDs are required'
        }),
        updates: joi_1.default.object({
            isActive: joi_1.default.boolean().optional(),
            sortOrder: joi_1.default.number().integer().min(0).optional(),
            usdToInrRate: joi_1.default.number().min(1).precision(2).optional()
        }).min(1).required()
    }),
    // Query filters for listing
    listFilters: joi_1.default.object({
        isActive: joi_1.default.boolean().optional(),
        isPopular: joi_1.default.boolean().optional(),
        isCustom: joi_1.default.boolean().optional(),
        billingCycle: joi_1.default.string().valid('monthly', 'yearly', 'quarterly').optional(),
        minPrice: joi_1.default.number().min(0).precision(2).optional(),
        maxPrice: joi_1.default.number().min(0).precision(2).optional(),
        sortBy: joi_1.default.string()
            .valid('name', 'basePricePerMonth', 'basePricePerYear', 'sortOrder', 'createdAt', 'updatedAt')
            .default('sortOrder')
            .optional(),
        sortOrder: joi_1.default.string().valid('asc', 'desc').default('asc').optional(),
        limit: joi_1.default.number().integer().min(1).max(100).default(20).optional(),
        offset: joi_1.default.number().integer().min(0).default(0).optional()
    })
};
// Parameter validation schemas
exports.paramSchemas = {
    uuid: joi_1.default.object({
        id: exports.commonSchemas.uuid
    }),
    uuidPair: joi_1.default.object({
        id: exports.commonSchemas.uuid,
        gatewayId: exports.commonSchemas.uuid
    })
};
// MQTT/IoT validation schemas
exports.iotSchemas = {
    sensorData: joi_1.default.object({
        nodeId: joi_1.default.string().required(),
        gatewayId: joi_1.default.string().optional(), // Gateway ID comes from ChirpStack data, not required in request
        sensorData: joi_1.default.object({
            distance: joi_1.default.number().min(0).optional(),
            occupied: joi_1.default.boolean().required(),
            batteryLevel: joi_1.default.number().min(0).max(100).optional(),
            temperature: joi_1.default.number().optional(),
            timestamp: joi_1.default.date().default(Date.now)
        }).required()
    })
};
