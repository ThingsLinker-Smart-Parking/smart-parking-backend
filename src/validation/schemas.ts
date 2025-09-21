import Joi from 'joi';

// Custom UUID validation pattern
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Common validation schemas
export const commonSchemas = {
  uuid: Joi.string().pattern(uuidPattern).required().messages({
    'string.pattern.base': 'Invalid UUID format',
    'any.required': 'UUID is required'
  }),
  
  email: Joi.string().email().required().messages({
    'string.email': 'Invalid email format',
    'any.required': 'Email is required'
  }),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]{10,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid phone number format'
    }),
  
  name: Joi.string()
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
  
  address: Joi.string()
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
export const userSchemas = {
  register: Joi.object({
    firstName: Joi.string()
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
    lastName: Joi.string()
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
    email: commonSchemas.email,
    password: commonSchemas.password,
    role: Joi.string().valid('user', 'admin', 'super_admin').default('user').messages({
      'any.only': 'Role must be one of: user, admin, super_admin'
    })
  }),
  
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),
  
  verifyOtp: Joi.object({
    email: commonSchemas.email,
    otp: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .required()
      .messages({
        'string.pattern.base': 'OTP must be a 6-digit number',
        'any.required': 'OTP is required'
      })
  }),
  
  forgotPassword: Joi.object({
    email: commonSchemas.email
  }),
  
  resetPassword: Joi.object({
    email: commonSchemas.email,
    otp: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .required()
      .messages({
        'string.pattern.base': 'OTP must be a 6-digit number',
        'any.required': 'OTP is required'
      }),
    newPassword: commonSchemas.password
  }),
  
  resendOtp: Joi.object({
    email: commonSchemas.email,
    purpose: Joi.string()
      .valid('verification', 'password_reset')
      .default('verification')
      .messages({
        'any.only': 'Purpose must be either verification or password_reset'
      })
  }),
  
  recoverAccount: Joi.object({
    email: commonSchemas.email
  }),
  
  updateProfile: Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s\-\.]+$/)
      .optional()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters',
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and dots'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-Z\s\-\.]+$/)
      .optional()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters',
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and dots'
      }),
    currentPassword: Joi.string().when('newPassword', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    }).messages({
      'any.required': 'Current password is required when changing password'
    }),
    newPassword: commonSchemas.password.optional()
  }).with('newPassword', 'currentPassword').min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

// Parking Lot validation schemas
export const parkingLotSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Parking lot name must be at least 3 characters long',
        'string.max': 'Parking lot name cannot exceed 100 characters',
        'any.required': 'Parking lot name is required'
      }),
    address: commonSchemas.address
  }),
  
  update: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    address: Joi.string().min(10).max(500).optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),
  
  assignGateway: Joi.object({
    gatewayId: commonSchemas.uuid
  })
};

// Floor validation schemas
export const floorSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(1)
      .max(50)
      .required()
      .messages({
        'string.min': 'Floor name must be at least 1 character long',
        'string.max': 'Floor name cannot exceed 50 characters',
        'any.required': 'Floor name is required'
      }),
    description: Joi.string().max(500).optional()
  }),
  
  update: Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    description: Joi.string().max(500).optional()
  }).min(1)
};

// Parking Slot validation schemas
export const parkingSlotSchemas = {
  create: Joi.object({
    slotNumber: Joi.string()
      .min(1)
      .max(20)
      .required()
      .messages({
        'string.min': 'Slot number must be at least 1 character long',
        'string.max': 'Slot number cannot exceed 20 characters',
        'any.required': 'Slot number is required'
      }),
    slotType: Joi.string()
      .valid('regular', 'handicapped', 'electric', 'compact')
      .default('regular')
      .messages({
        'any.only': 'Slot type must be one of: regular, handicapped, electric, compact'
      })
  }),
  
  update: Joi.object({
    slotNumber: Joi.string().min(1).max(20).optional(),
    slotType: Joi.string().valid('regular', 'handicapped', 'electric', 'compact').optional(),
    isOccupied: Joi.boolean().optional()
  }).min(1)
};

// Node validation schemas
export const nodeSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Node name must be at least 3 characters long',
        'string.max': 'Node name cannot exceed 100 characters',
        'any.required': 'Node name is required'
      }),
    chirpstackDeviceId: Joi.string()
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
    description: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
    parkingSlotId: commonSchemas.uuid,
    latitude: Joi.number()
      .min(-90)
      .max(90)
      .optional()
      .messages({
        'number.min': 'Latitude must be between -90 and 90',
        'number.max': 'Latitude must be between -90 and 90'
      }),
    longitude: Joi.number()
      .min(-180)
      .max(180)
      .optional()
      .messages({
        'number.min': 'Longitude must be between -180 and 180',
        'number.max': 'Longitude must be between -180 and 180'
      })
  }),

  updateStatus: Joi.object({
    distance: Joi.number().min(0).optional(),
    percentage: Joi.number().min(0).max(100).optional(),
    batteryLevel: Joi.number().min(0).max(100).optional()
  }).min(1).messages({
    'object.min': 'At least one status field must be provided'
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(100).optional().messages({
      'string.min': 'Node name must be at least 3 characters long',
      'string.max': 'Node name cannot exceed 100 characters'
    }),
    chirpstackDeviceId: Joi.string()
      .min(16)
      .max(16)
      .pattern(/^[0-9a-fA-F]{16}$/)
      .optional()
      .messages({
        'string.min': 'ChirpStack Device ID must be exactly 16 characters',
        'string.max': 'ChirpStack Device ID must be exactly 16 characters',
        'string.pattern.base': 'ChirpStack Device ID must be a valid 16-character hexadecimal string'
      }),
    description: Joi.string().max(500).optional(),
    parkingSlotId: commonSchemas.uuid.optional(),
    latitude: Joi.number().min(-90).max(90).optional().messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90'
    }),
    longitude: Joi.number().min(-180).max(180).optional().messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180'
    }),
    isActive: Joi.boolean().optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  })
};

// Gateway validation schemas
export const gatewaySchemas = {
  create: Joi.object({
    gatewayId: Joi.string()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.min': 'Gateway ID must be at least 3 characters long',
        'string.max': 'Gateway ID cannot exceed 50 characters',
        'any.required': 'Gateway ID is required'
      }),
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Gateway name must be at least 3 characters long',
        'string.max': 'Gateway name cannot exceed 100 characters',
        'any.required': 'Gateway name is required'
      }),
    location: Joi.string().max(200).optional()
  }),
  
  update: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    location: Joi.string().max(200).optional(),
    isActive: Joi.boolean().optional()
  }).min(1),
  
  linkAdmin: Joi.object({
    adminId: commonSchemas.uuid
  })
};

// Subscription validation schemas
export const subscriptionSchemas = {
  create: Joi.object({
    planId: commonSchemas.uuid,
    paymentMethodId: Joi.string().optional() // For future payment integration
  }),
  
  update: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'cancelled', 'expired').optional()
  }).min(1)
};

// Subscription Plan validation schemas
export const subscriptionPlanSchemas = {
  create: Joi.object({
    name: Joi.string()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Plan name must be at least 3 characters long',
        'string.max': 'Plan name cannot exceed 100 characters',
        'any.required': 'Plan name is required'
      }),
    description: Joi.string().max(1000).allow('', null).optional(),
    
    // Pricing fields
    basePricePerMonth: Joi.number()
      .min(0)
      .precision(2)
      .required()
      .messages({
        'number.min': 'Monthly price cannot be negative',
        'any.required': 'Monthly price is required'
      }),
    basePricePerYear: Joi.number()
      .min(0)
      .precision(2)
      .required()
      .messages({
        'number.min': 'Yearly price cannot be negative',
        'any.required': 'Yearly price is required'
      }),
    basePricePerQuarter: Joi.number().min(0).precision(2).optional(),
    
    // Per-node pricing
    pricePerNodePerMonth: Joi.number()
      .min(0)
      .precision(2)
      .default(2.00)
      .messages({
        'number.min': 'Node price per month cannot be negative'
      }),
    pricePerNodePerYear: Joi.number()
      .min(0)
      .precision(2)
      .default(20.00)
      .messages({
        'number.min': 'Node price per year cannot be negative'
      }),
    pricePerNodePerQuarter: Joi.number().min(0).precision(2).optional(),
    
    // Exchange rate
    usdToInrRate: Joi.number()
      .min(1)
      .precision(2)
      .default(75.00)
      .messages({
        'number.min': 'Exchange rate must be at least 1'
      }),
    
    // Billing cycle
    defaultBillingCycle: Joi.string()
      .valid('monthly', 'yearly', 'quarterly')
      .default('monthly')
      .messages({
        'any.only': 'Billing cycle must be monthly, yearly, or quarterly'
      }),
    
    // Resource limits
    maxGateways: Joi.number().integer().min(0).default(0),
    maxParkingLots: Joi.number().integer().min(0).default(0),
    maxFloors: Joi.number().integer().min(0).default(0),
    maxParkingSlots: Joi.number().integer().min(0).default(0),
    maxUsers: Joi.number().integer().min(0).default(0),
    
    // Features and flags
    features: Joi.array()
      .items(Joi.string().min(1).max(200))
      .default([])
      .messages({
        'string.min': 'Feature name cannot be empty',
        'string.max': 'Feature name cannot exceed 200 characters'
      }),
    includesAnalytics: Joi.boolean().default(false),
    includesSupport: Joi.boolean().default(false),
    includesAPI: Joi.boolean().default(false),
    includesCustomization: Joi.boolean().default(false),
    
    // Plan metadata
    sortOrder: Joi.number().integer().min(0).default(0),
    isActive: Joi.boolean().default(true),
    isPopular: Joi.boolean().default(false),
    isCustom: Joi.boolean().default(false)
  }),
  
  update: Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().max(1000).allow('', null).optional(),
    
    // Pricing updates
    basePricePerMonth: Joi.number().min(0).precision(2).optional(),
    basePricePerYear: Joi.number().min(0).precision(2).optional(),
    basePricePerQuarter: Joi.number().min(0).precision(2).optional(),
    
    // Per-node pricing updates
    pricePerNodePerMonth: Joi.number().min(0).precision(2).optional(),
    pricePerNodePerYear: Joi.number().min(0).precision(2).optional(),
    pricePerNodePerQuarter: Joi.number().min(0).precision(2).optional(),
    
    // Exchange rate update
    usdToInrRate: Joi.number().min(1).precision(2).optional(),
    
    // Billing cycle update
    defaultBillingCycle: Joi.string()
      .valid('monthly', 'yearly', 'quarterly')
      .optional(),
    
    // Resource limit updates
    maxGateways: Joi.number().integer().min(0).optional(),
    maxParkingLots: Joi.number().integer().min(0).optional(),
    maxFloors: Joi.number().integer().min(0).optional(),
    maxParkingSlots: Joi.number().integer().min(0).optional(),
    maxUsers: Joi.number().integer().min(0).optional(),
    
    // Feature updates
    features: Joi.array().items(Joi.string().min(1).max(200)).optional(),
    includesAnalytics: Joi.boolean().optional(),
    includesSupport: Joi.boolean().optional(),
    includesAPI: Joi.boolean().optional(),
    includesCustomization: Joi.boolean().optional(),
    
    // Metadata updates
    sortOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
    isPopular: Joi.boolean().optional(),
    isCustom: Joi.boolean().optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),
  
  // Soft delete validation
  softDelete: Joi.object({
    reason: Joi.string()
      .min(10)
      .max(500)
      .optional()
      .messages({
        'string.min': 'Deletion reason must be at least 10 characters',
        'string.max': 'Deletion reason cannot exceed 500 characters'
      })
  }),
  
  // Exchange rate update (super admin only)
  updateExchangeRate: Joi.object({
    usdToInrRate: Joi.number()
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
  bulkUpdate: Joi.object({
    planIds: Joi.array()
      .items(commonSchemas.uuid)
      .min(1)
      .max(50)
      .required()
      .messages({
        'array.min': 'At least one plan ID is required',
        'array.max': 'Cannot update more than 50 plans at once',
        'any.required': 'Plan IDs are required'
      }),
    updates: Joi.object({
      isActive: Joi.boolean().optional(),
      sortOrder: Joi.number().integer().min(0).optional(),
      usdToInrRate: Joi.number().min(1).precision(2).optional()
    }).min(1).required()
  }),
  
  // Query filters for listing
  listFilters: Joi.object({
    isActive: Joi.boolean().optional(),
    isPopular: Joi.boolean().optional(),
    isCustom: Joi.boolean().optional(),
    billingCycle: Joi.string().valid('monthly', 'yearly', 'quarterly').optional(),
    minPrice: Joi.number().min(0).precision(2).optional(),
    maxPrice: Joi.number().min(0).precision(2).optional(),
    sortBy: Joi.string()
      .valid('name', 'basePricePerMonth', 'basePricePerYear', 'sortOrder', 'createdAt', 'updatedAt')
      .default('sortOrder')
      .optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc').optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    offset: Joi.number().integer().min(0).default(0).optional()
  })
};

// Parameter validation schemas
export const paramSchemas = {
  uuid: Joi.object({
    id: commonSchemas.uuid
  }),
  
  uuidPair: Joi.object({
    id: commonSchemas.uuid,
    gatewayId: commonSchemas.uuid
  })
};

// MQTT/IoT validation schemas
export const iotSchemas = {
  sensorData: Joi.object({
    nodeId: Joi.string().required(),
    gatewayId: Joi.string().optional(), // Gateway ID comes from ChirpStack data, not required in request
    sensorData: Joi.object({
      distance: Joi.number().min(0).optional(),
      occupied: Joi.boolean().required(),
      batteryLevel: Joi.number().min(0).max(100).optional(),
      temperature: Joi.number().optional(),
      timestamp: Joi.date().default(Date.now)
    }).required()
  })
};