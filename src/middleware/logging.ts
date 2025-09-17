import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/loggerService';

// Extended Request interface for logging context
export interface LoggedRequest extends Request {
  startTime?: number;
  requestId?: string;
}

// Generate unique request ID
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Request logging middleware
export const requestLoggingMiddleware = (req: LoggedRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add timing and ID to request object
  req.startTime = startTime;
  req.requestId = requestId;
  
  // Add request ID to response headers (useful for debugging)
  res.setHeader('X-Request-ID', requestId);
  
  // Extract client information
  const clientInfo = {
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    referer: req.get('Referer') || null
  };
  
  // Log incoming request
  logger.http('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    query: req.query,
    ...clientInfo
  });
  
  // Override res.end to capture response details
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: any): Response {
    const duration = Date.now() - startTime;
    const responseSize = res.get('content-length') || 0;
    
    // Log response
    logger.api(req.method, req.originalUrl || req.url, res.statusCode, duration, {
      requestId,
      responseSize,
      ...clientInfo
    });
    
    // Log slow requests as warnings
    if (duration > 1000) {
      logger.performance('Slow request detected', duration, {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode
      });
    }
    
    // Log errors (4xx and 5xx status codes)
    if (res.statusCode >= 400) {
      const logMessage = `HTTP ${res.statusCode}`;
      const logMeta = {
        requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        duration,
        ...clientInfo
      };
      
      if (res.statusCode >= 500) {
        logger.error(logMessage, undefined, logMeta);
      } else {
        logger.warn(logMessage, logMeta);
      }
    }
    
    // Call the original end method and return the response
    return originalEnd(chunk, encoding, cb);
  };
  
  next();
};

// Error logging middleware (should be used after error handling middleware)
export const errorLoggingMiddleware = (error: Error, req: LoggedRequest, res: Response, next: NextFunction): void => {
  const requestId = req.requestId || 'unknown';
  const duration = req.startTime ? Date.now() - req.startTime : 0;
  
  logger.error('Request resulted in error', error, {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode || 500,
    duration,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  
  next(error);
};

// Security logging middleware for suspicious activities
export const securityLoggingMiddleware = (req: LoggedRequest, res: Response, next: NextFunction): void => {
  const requestId = req.requestId || generateRequestId();
  
  // Log potential security concerns
  const url = req.originalUrl || req.url;
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  // Detect potential security issues
  const securityChecks = [
    {
      condition: url.includes('../') || url.includes('..\\'),
      event: 'Path traversal attempt',
      severity: 'high' as const
    },
    {
      condition: url.toLowerCase().includes('<script') || url.toLowerCase().includes('javascript:'),
      event: 'XSS attempt in URL',
      severity: 'high' as const
    },
    {
      condition: url.toLowerCase().includes('union') && url.toLowerCase().includes('select'),
      event: 'SQL injection attempt in URL',
      severity: 'critical' as const
    },
    {
      condition: userAgent.toLowerCase().includes('bot') && !userAgent.toLowerCase().includes('google'),
      event: 'Non-Google bot detected',
      severity: 'low' as const
    },
    {
      condition: req.method === 'POST' && req.get('content-length') && parseInt(req.get('content-length')!) > 10 * 1024 * 1024,
      event: 'Large POST request',
      severity: 'medium' as const
    }
  ];
  
  // Check for suspicious activities
  securityChecks.forEach(check => {
    if (check.condition) {
      logger.security(check.event, check.severity, {
        requestId,
        method: req.method,
        url,
        ip,
        userAgent
      });
    }
  });
  
  next();
};

// Rate limit logging middleware
export const rateLimitLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Check if rate limit headers are present (from express-rate-limit)
  const remainingRequests = res.get('RateLimit-Remaining');
  const resetTime = res.get('RateLimit-Reset');
  
  if (remainingRequests && parseInt(remainingRequests) < 10) {
    logger.security('Rate limit approaching', 'medium', {
      ip: req.ip || req.connection.remoteAddress,
      remainingRequests: parseInt(remainingRequests),
      resetTime,
      url: req.originalUrl || req.url
    });
  }
  
  next();
};

// Authentication logging helper
export const logAuthEvent = (event: string, email?: string, userId?: string, success: boolean = true, meta: any = {}): void => {
  const logMethod = success ? logger.info : logger.warn;
  
  logMethod(`Authentication: ${event}`, {
    category: 'auth',
    event,
    email,
    userId,
    success,
    timestamp: new Date().toISOString(),
    ...meta
  });
  
  // Log failed authentication attempts as security events
  if (!success) {
    logger.security(`Failed authentication attempt: ${event}`, 'medium', {
      email,
      userId,
      ...meta
    });
  }
};

// Database operation logging helper
export const logDatabaseOperation = (
  operation: string, 
  table: string, 
  success: boolean = true, 
  duration?: number,
  meta: any = {}
): void => {
  const logMethod = success ? logger.info : logger.error;
  
  logMethod(`Database ${operation}`, {
    category: 'database',
    operation,
    table,
    success,
    duration,
    ...meta
  });
  
  // Log slow database operations
  if (duration && duration > 1000) {
    logger.performance(`Slow database ${operation}`, duration, {
      table,
      ...meta
    });
  }
};

// Business event logging helper
export const logBusinessEvent = (
  event: string,
  entity: string,
  entityId?: string,
  userId?: string,
  meta: any = {}
): void => {
  logger.business(event, entity, entityId, {
    userId,
    timestamp: new Date().toISOString(),
    ...meta
  });
};

// IoT/MQTT event logging helper
export const logIoTEvent = (
  event: string,
  gatewayId?: string,
  nodeId?: string,
  meta: any = {}
): void => {
  logger.iot(event, nodeId, {
    gatewayId,
    timestamp: new Date().toISOString(),
    ...meta
  });
};