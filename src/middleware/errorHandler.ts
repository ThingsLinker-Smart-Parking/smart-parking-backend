import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/loggerService';
import { LoggedRequest } from './logging';

// Custom error class for application errors
export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
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

// Specific error classes for different scenarios
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND', true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'RESOURCE_CONFLICT', true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', true, details);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service unavailable') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, { service });
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  errorCode?: string;
  details?: any;
  requestId?: string;
  timestamp: string;
  path?: string;
  stack?: string;
}

// Development vs Production error details
const getErrorDetails = (error: Error, isDevelopment: boolean) => {
  if (!isDevelopment) {
    return undefined;
  }

  return {
    stack: error.stack,
    name: error.name
  };
};

// Format error response
const formatErrorResponse = (
  error: AppError | Error,
  req: LoggedRequest,
  isDevelopment: boolean
): ErrorResponse => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const errorCode = isAppError ? error.errorCode : 'INTERNAL_ERROR';
  
  const response: ErrorResponse = {
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
const logError = (error: AppError | Error, req: LoggedRequest, res: Response) => {
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const url = req.originalUrl || req.url;

  // Skip logging for known browser artifacts (Next.js HMR, webpack dev server, etc.)
  const ignoredPaths = ['/_next/', '/webpack', '/__webpack'];
  if (statusCode === 404 && ignoredPaths.some(path => url.includes(path))) {
    return; // Silently ignore these 404s
  }

  const logContext = {
    requestId: req.requestId,
    method: req.method,
    url,
    statusCode,
    userId: (req as any).user?.id,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    errorCode: isAppError ? error.errorCode : 'INTERNAL_ERROR',
    isOperational: isAppError ? error.isOperational : false
  };

  // Log based on error severity
  if (statusCode >= 500) {
    // Server errors - always log as errors
    logger.error('Server error occurred', error, logContext);
  } else if (statusCode >= 400) {
    // Client errors - log as warnings for debugging
    logger.warn('Client error occurred', {
      ...logContext,
      message: error.message,
      stack: error.stack
    });
  }

  // Log security-related errors
  if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
    logger.security(`Security event: ${error.message}`, 'medium', logContext);
  }
};

// Handle specific error types
const handleCastError = (error: any): AppError => {
  return new ValidationError(`Invalid ${error.path}: ${error.value}`);
};

const handleDuplicateFieldError = (error: any): AppError => {
  const duplicateField = Object.keys(error.keyValue)[0];
  return new ConflictError(`${duplicateField} already exists`);
};

const handleValidationError = (error: any): AppError => {
  const errors = Object.values(error.errors).map((val: any) => val.message);
  return new ValidationError('Invalid input data', errors);
};

const handleJWTError = (): AppError => {
  return new AuthenticationError('Invalid token. Please log in again');
};

const handleJWTExpiredError = (): AppError => {
  return new AuthenticationError('Your token has expired. Please log in again');
};

// Main error handling middleware
export const globalErrorHandler = (
  error: Error,
  req: LoggedRequest,
  res: Response,
  next: NextFunction
): void => {
  let err = error;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Handle specific error types
  if (error.name === 'CastError') {
    err = handleCastError(error);
  } else if ((error as any).code === 11000) {
    err = handleDuplicateFieldError(error);
  } else if (error.name === 'ValidationError') {
    err = handleValidationError(error);
  } else if (error.name === 'JsonWebTokenError') {
    err = handleJWTError();
  } else if (error.name === 'TokenExpiredError') {
    err = handleJWTExpiredError();
  }

  // If it's not an operational error, convert to AppError
  if (!(err instanceof AppError)) {
    err = new AppError(
      isDevelopment ? err.message : 'Something went wrong',
      500,
      'INTERNAL_ERROR',
      false
    );
  }

  const appError = err as AppError;
  
  // Log the error
  logError(appError, req, res);

  // Format and send error response
  const errorResponse = formatErrorResponse(appError, req, isDevelopment);
  
  res.status(appError.statusCode).json(errorResponse);
};

// Async error wrapper to catch async errors in route handlers
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Handle unhandled routes (404 errors)
export const handleNotFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Graceful error handling for unhandled promise rejections
export const handleUnhandledRejection = (reason: any, promise: Promise<any>): void => {
  logger.error('Unhandled Promise Rejection', reason, {
    category: 'system',
    promise: promise.toString(),
    fatal: true
  });
  
  // Give the server time to finish existing requests
  setTimeout(() => {
    process.exit(1);
  }, 1000);
};

// Graceful error handling for uncaught exceptions
export const handleUncaughtException = (error: Error): void => {
  logger.error('Uncaught Exception', error, {
    category: 'system',
    fatal: true
  });
  
  process.exit(1);
};