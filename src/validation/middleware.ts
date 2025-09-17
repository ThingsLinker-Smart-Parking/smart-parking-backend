import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Enhanced request interface to include validated data
export interface ValidatedRequest<T = any> extends Request {
  validatedData?: T;
}

// Validation error response interface
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Format Joi validation errors into a consistent structure
const formatValidationErrors = (error: Joi.ValidationError): ValidationError[] => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
};

// Generic validation middleware factory
export const validate = (
  schema: Joi.ObjectSchema,
  source: 'body' | 'params' | 'query' = 'body',
  options: Joi.ValidationOptions = {}
) => {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    const dataToValidate = req[source];
    
    const validationOptions: Joi.ValidationOptions = {
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
    } else if (source === 'params') {
      req.params = value;
    } else if (source === 'query') {
      req.query = value;
    }

    next();
  };
};

// Convenience functions for common validation scenarios
export const validateBody = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) => {
  return validate(schema, 'body', options);
};

export const validateParams = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) => {
  return validate(schema, 'params', options);
};

export const validateQuery = (schema: Joi.ObjectSchema, options?: Joi.ValidationOptions) => {
  return validate(schema, 'query', options);
};

// Multiple validation middleware (for validating both params and body, for example)
export const validateMultiple = (validations: Array<{
  schema: Joi.ObjectSchema;
  source: 'body' | 'params' | 'query';
  options?: Joi.ValidationOptions;
}>) => {
  return async (req: ValidatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const errors: ValidationError[] = [];
    
    for (const validation of validations) {
      const { schema, source, options = {} } = validation;
      const dataToValidate = req[source];
      
      const validationOptions: Joi.ValidationOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options
      };

      const { error, value } = schema.validate(dataToValidate, validationOptions);

      if (error) {
        errors.push(...formatValidationErrors(error));
      } else {
        // Update request with sanitized data
        if (source === 'body') {
          req.body = value;
        } else if (source === 'params') {
          req.params = value;
        } else if (source === 'query') {
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

// Sanitization middleware for additional security
export const sanitize = (options: {
  trimStrings?: boolean;
  lowercaseEmails?: boolean;
  removeHtml?: boolean;
} = {}) => {
  const { trimStrings = true, lowercaseEmails = true, removeHtml = true } = options;
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const sanitized: any = {};
      
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
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
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

// Rate limiting by validation context (e.g., stricter limits for failed validations)
export const validationAwareRateLimit = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This can be expanded to implement different rate limiting based on validation failures
    // For now, it's a placeholder that can be enhanced based on specific requirements
    next();
  };
};

// Validation error aggregator for better error reporting
export const aggregateValidationErrors = (errors: ValidationError[]): {
  fieldErrors: Record<string, string[]>;
  generalErrors: string[];
} => {
  const fieldErrors: Record<string, string[]> = {};
  const generalErrors: string[] = [];
  
  errors.forEach(error => {
    if (error.field) {
      if (!fieldErrors[error.field]) {
        fieldErrors[error.field] = [];
      }
      fieldErrors[error.field].push(error.message);
    } else {
      generalErrors.push(error.message);
    }
  });
  
  return { fieldErrors, generalErrors };
};