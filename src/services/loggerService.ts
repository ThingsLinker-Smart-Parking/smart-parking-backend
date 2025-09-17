import winston, { LoggerOptions } from 'winston';
import path from 'path';

// Define log levels with colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    
    // Format metadata
    const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    
    // Include stack trace for errors
    const stackString = stack ? `\n${stack}` : '';
    
    return `[${timestamp}] ${level}: ${message}${metaString}${stackString}`;
  })
);

// Custom format for production (structured JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'smart-parking-backend',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    });
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Determine log level based on environment
const logLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Configure transports
const transports: winston.transport[] = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    level: logLevel(),
    format: process.env.NODE_ENV === 'production' ? productionFormat : logFormat
  })
);

// File transports (only in production or when explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  // Combined logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      level: 'info',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Error logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // HTTP access logs
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  );
}

// Create logger configuration
const loggerConfig: LoggerOptions = {
  level: logLevel(),
  levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
  ),
  transports,
  exitOnError: false
};

// Create the winston logger instance
const winstonLogger = winston.createLogger(loggerConfig);

// Custom logging methods with enhanced functionality
class LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winstonLogger;
  }

  // Enhanced error logging
  error(message: string, error?: Error | any, meta: any = {}): void {
    const logMeta = {
      ...meta,
      errorDetails: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...error
      } : undefined
    };

    this.logger.error(message, logMeta);
  }

  // Warning logging
  warn(message: string, meta: any = {}): void {
    this.logger.warn(message, meta);
  }

  // Info logging
  info(message: string, meta: any = {}): void {
    this.logger.info(message, meta);
  }

  // HTTP request logging
  http(message: string, meta: any = {}): void {
    this.logger.http(message, meta);
  }

  // Debug logging
  debug(message: string, meta: any = {}): void {
    this.logger.debug(message, meta);
  }

  // Database operation logging
  database(operation: string, table: string, meta: any = {}): void {
    this.info(`Database ${operation}`, {
      category: 'database',
      table,
      ...meta
    });
  }

  // Authentication logging
  auth(event: string, userId?: string, meta: any = {}): void {
    this.info(`Authentication: ${event}`, {
      category: 'auth',
      userId,
      ...meta
    });
  }

  // API request logging
  api(method: string, endpoint: string, statusCode: number, responseTime: number, meta: any = {}): void {
    this.http(`${method} ${endpoint}`, {
      category: 'api',
      method,
      endpoint,
      statusCode,
      responseTime,
      ...meta
    });
  }

  // Security event logging
  security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta: any = {}): void {
    const logMethod = severity === 'critical' || severity === 'high' ? this.error : 
                     severity === 'medium' ? this.warn : this.info;
    
    logMethod.call(this, `Security Event: ${event}`, {
      category: 'security',
      severity,
      ...meta
    });
  }

  // Performance logging
  performance(operation: string, duration: number, meta: any = {}): void {
    const logMethod = duration > 1000 ? this.warn : this.info;
    
    logMethod.call(this, `Performance: ${operation}`, {
      category: 'performance',
      duration,
      slow: duration > 1000,
      ...meta
    });
  }

  // IoT/MQTT logging
  iot(event: string, deviceId?: string, meta: any = {}): void {
    this.info(`IoT Event: ${event}`, {
      category: 'iot',
      deviceId,
      ...meta
    });
  }

  // Business logic logging
  business(event: string, entity: string, entityId?: string, meta: any = {}): void {
    this.info(`Business Event: ${event}`, {
      category: 'business',
      entity,
      entityId,
      ...meta
    });
  }

  // Create child logger for specific context
  child(defaultMeta: any): LoggerService {
    const childLogger = new LoggerService();
    childLogger.logger = this.logger.child(defaultMeta);
    return childLogger;
  }

  // Get underlying winston logger (for compatibility)
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }

  // Log system startup information
  startup(service: string, version: string, environment: string): void {
    this.info('Service starting up', {
      category: 'system',
      service,
      version,
      environment,
      nodeVersion: process.version,
      platform: process.platform
    });
  }

  // Log system shutdown information
  shutdown(service: string, reason?: string): void {
    this.info('Service shutting down', {
      category: 'system',
      service,
      reason
    });
  }
}

// Create singleton instance
export const logger = new LoggerService();

// Export logger for compatibility with existing code
export default logger;