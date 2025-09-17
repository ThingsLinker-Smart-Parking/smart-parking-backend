import { Response } from 'express';
import { logger } from '../services/loggerService';

// Standard API response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errorCode?: string;
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
  meta?: any;
}

export interface PaginationMeta {
  total: number;
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  page?: number;
  totalPages?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorResponse extends ApiResponse {
  success: false;
  error: string;
  errorCode: string;
  details?: any;
  stack?: string; // Only in development
}

// Response builder class
export class ApiResponseBuilder {
  private response: Partial<ApiResponse> = {};

  constructor() {
    this.response.timestamp = new Date().toISOString();
    this.response.success = true;
  }

  static success<T>(data?: T, message = 'Success'): ApiResponseBuilder {
    const builder = new ApiResponseBuilder();
    builder.response.success = true;
    builder.response.message = message;
    if (data !== undefined) {
      builder.response.data = data;
    }
    return builder;
  }

  static error(
    message: string,
    errorCode = 'INTERNAL_ERROR',
    details?: any
  ): ApiResponseBuilder {
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

  static validationError(
    errors: ValidationError[],
    message = 'Validation failed'
  ): ApiResponseBuilder {
    const builder = new ApiResponseBuilder();
    builder.response.success = false;
    builder.response.message = message;
    builder.response.error = 'VALIDATION_ERROR';
    builder.response.errorCode = 'VALIDATION_ERROR';
    builder.response.meta = { validationErrors: errors };
    return builder;
  }

  static notFound(
    resource = 'Resource',
    id?: string
  ): ApiResponseBuilder {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;

    return ApiResponseBuilder.error(message, 'RESOURCE_NOT_FOUND');
  }

  static unauthorized(message = 'Unauthorized'): ApiResponseBuilder {
    return ApiResponseBuilder.error(message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Insufficient permissions'): ApiResponseBuilder {
    return ApiResponseBuilder.error(message, 'FORBIDDEN');
  }

  static conflict(message = 'Resource conflict'): ApiResponseBuilder {
    return ApiResponseBuilder.error(message, 'CONFLICT');
  }

  static rateLimit(message = 'Rate limit exceeded'): ApiResponseBuilder {
    return ApiResponseBuilder.error(message, 'RATE_LIMIT_EXCEEDED');
  }

  // Fluent interface methods
  withMessage(message: string): ApiResponseBuilder {
    this.response.message = message;
    return this;
  }

  withData<T>(data: T): ApiResponseBuilder {
    this.response.data = data;
    return this;
  }

  withMeta(meta: any): ApiResponseBuilder {
    this.response.meta = { ...this.response.meta, ...meta };
    return this;
  }

  withPagination(pagination: PaginationMeta): ApiResponseBuilder {
    this.response.pagination = pagination;
    return this;
  }

  withRequestId(requestId: string): ApiResponseBuilder {
    this.response.requestId = requestId;
    return this;
  }

  withErrorCode(errorCode: string): ApiResponseBuilder {
    this.response.errorCode = errorCode;
    return this;
  }

  // Build and send the response
  send(res: Response, statusCode = 200): Response {
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
  build(): ApiResponse {
    return this.response as ApiResponse;
  }

  private logResponse(statusCode: number): void {
    const logData = {
      statusCode,
      success: this.response.success,
      message: this.response.message,
      errorCode: this.response.errorCode,
      requestId: this.response.requestId,
      timestamp: this.response.timestamp
    };

    if (statusCode >= 500) {
      logger.error('API Response Error', logData);
    } else if (statusCode >= 400) {
      logger.warn('API Response Warning', logData);
    } else {
      logger.debug('API Response Success', logData);
    }
  }
}

// Helper functions for common responses
export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message = 'Success',
  statusCode = 200
): Response => {
  return ApiResponseBuilder.success(data, message).send(res, statusCode);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully'
): Response => {
  return ApiResponseBuilder.success(data, message).send(res, 201);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errorCode = 'INTERNAL_ERROR',
  details?: any
): Response => {
  return ApiResponseBuilder.error(message, errorCode)
    .withMeta(details)
    .send(res, statusCode);
};

export const sendValidationError = (
  res: Response,
  errors: ValidationError[],
  message = 'Validation failed'
): Response => {
  return ApiResponseBuilder.validationError(errors, message).send(res, 400);
};

export const sendNotFound = (
  res: Response,
  resource = 'Resource',
  id?: string
): Response => {
  return ApiResponseBuilder.notFound(resource, id).send(res, 404);
};

export const sendUnauthorized = (
  res: Response,
  message = 'Unauthorized'
): Response => {
  return ApiResponseBuilder.unauthorized(message).send(res, 401);
};

export const sendForbidden = (
  res: Response,
  message = 'Insufficient permissions'
): Response => {
  return ApiResponseBuilder.forbidden(message).send(res, 403);
};

export const sendConflict = (
  res: Response,
  message = 'Resource conflict'
): Response => {
  return ApiResponseBuilder.conflict(message).send(res, 409);
};

export const sendRateLimit = (
  res: Response,
  message = 'Rate limit exceeded'
): Response => {
  return ApiResponseBuilder.rateLimit(message).send(res, 429);
};

// Pagination helper
export const createPaginationMeta = (
  total: number,
  limit: number,
  offset: number,
  count?: number
): PaginationMeta => {
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

// Async error handler wrapper
export const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};