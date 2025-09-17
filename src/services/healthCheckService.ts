import { AppDataSource } from '../data-source';
import { logger } from './loggerService';
import { env } from '../config/environment';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheck;
    redis?: HealthCheck;
    mqtt?: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
    [key: string]: HealthCheck | undefined;
  };
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  error?: string;
}

class HealthCheckService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    logger.debug('Performing health check', { timestamp });

    const checks: {
      database: HealthCheck;
      memory: HealthCheck;
      disk: HealthCheck;
      redis?: HealthCheck;
      mqtt?: HealthCheck;
      [key: string]: HealthCheck | undefined;
    } = {
      database: await this.checkDatabase(),
      memory: await this.checkMemory(),
      disk: await this.checkDisk()
    };

    // Add optional service checks
    if (env.REDIS_URL) {
      checks.redis = await this.checkRedis();
    }

    if (env.MQTT_BROKER_URL) {
      checks.mqtt = await this.checkMqtt();
    }

    // Determine overall status
    const overallStatus = this.determineOverallStatus(
      Object.values(checks).filter((check): check is HealthCheck => check !== undefined)
    );

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp,
      uptime,
      version: process.env.npm_package_version || '1.0.0',
      checks
    };

    logger.info('Health check completed', {
      status: overallStatus,
      responseTime: Date.now() - new Date(timestamp).getTime(),
      checks: Object.keys(checks).reduce((acc, key) => {
        const check = checks[key];
        if (check) {
          acc[key] = check.status;
        }
        return acc;
      }, {} as Record<string, string>)
    });

    return result;
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      if (!AppDataSource.isInitialized) {
        throw new Error('Database connection not initialized');
      }

      // Simple query to test database connectivity
      await AppDataSource.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      // Check if response time is acceptable
      const status = responseTime > env.DB_HEALTH_TIMEOUT ? 'degraded' : 'healthy';

      return {
        status,
        responseTime,
        details: {
          host: env.DB_HOST,
          port: env.DB_PORT,
          database: env.DB_NAME,
          ssl: env.DB_SSL
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Database health check failed', error);

      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
        details: {
          host: env.DB_HOST,
          port: env.DB_PORT,
          database: env.DB_NAME
        }
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Note: You'll need to implement Redis connection check
      // This is a placeholder that assumes Redis client is available
      const redis = await import('redis');
      const client = redis.createClient({ url: env.REDIS_URL });

      await client.connect();
      await client.ping();
      await client.disconnect();

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          url: env.REDIS_URL,
          database: env.REDIS_DB
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Redis health check failed', error);

      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown Redis error'
      };
    }
  }

  private async checkMqtt(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Note: You'll need to implement MQTT connection check
      // This is a placeholder
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          brokerUrl: env.MQTT_BROKER_URL,
          clientId: env.MQTT_CLIENT_ID
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('MQTT health check failed', error);

      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown MQTT error'
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const memoryUsage = process.memoryUsage();
      const responseTime = Date.now() - startTime;

      // Convert bytes to MB
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
      };

      // Check if memory usage is concerning (> 1GB RSS)
      const status = memoryUsageMB.rss > 1024 ? 'degraded' : 'healthy';

      return {
        status,
        responseTime,
        details: {
          ...memoryUsageMB,
          unit: 'MB'
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown memory check error'
      };
    }
  }

  private async checkDisk(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const fs = await import('fs');
      const path = await import('path');

      // Check disk space in the application directory
      const stats = await fs.promises.statfs(path.resolve('.'));
      const responseTime = Date.now() - startTime;

      // Calculate free space in GB
      const freeSpaceGB = Math.round((stats.bavail * stats.bsize) / 1024 / 1024 / 1024 * 100) / 100;
      const totalSpaceGB = Math.round((stats.blocks * stats.bsize) / 1024 / 1024 / 1024 * 100) / 100;
      const usedSpacePercent = Math.round(((totalSpaceGB - freeSpaceGB) / totalSpaceGB) * 100);

      // Check if disk usage is concerning (> 90%)
      const status = usedSpacePercent > 90 ? 'degraded' : 'healthy';

      return {
        status,
        responseTime,
        details: {
          freeSpaceGB,
          totalSpaceGB,
          usedSpacePercent,
          unit: 'GB'
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown disk check error'
      };
    }
  }

  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
    const statuses = checks.map(check => check.status);

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  // Detailed health check for admin endpoints
  async performDetailedHealthCheck(): Promise<HealthCheckResult & {
    environment: any;
    configuration: any;
    dependencies: any;
  }> {
    const basicCheck = await this.performHealthCheck();

    return {
      ...basicCheck,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
        nodeEnv: env.NODE_ENV
      },
      configuration: {
        port: env.PORT,
        apiVersion: env.API_VERSION,
        corsEnabled: env.ALLOWED_ORIGINS.length > 0,
        swaggerEnabled: env.ENABLE_SWAGGER,
        monitoringEnabled: env.MONITORING_ENABLED,
        logLevel: env.LOG_LEVEL
      },
      dependencies: {
        database: {
          type: 'postgresql',
          host: env.DB_HOST,
          port: env.DB_PORT,
          ssl: env.DB_SSL
        },
        redis: env.REDIS_URL ? {
          configured: true,
          url: env.REDIS_URL
        } : { configured: false },
        mqtt: env.MQTT_BROKER_URL ? {
          configured: true,
          broker: env.MQTT_BROKER_URL
        } : { configured: false }
      }
    };
  }

  // Readiness check for Kubernetes/Docker
  async performReadinessCheck(): Promise<{ ready: boolean; details: any }> {
    try {
      const dbCheck = await this.checkDatabase();

      // Service is ready if database is accessible
      const ready = dbCheck.status !== 'unhealthy';

      return {
        ready,
        details: {
          database: dbCheck.status,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Readiness check failed', error);

      return {
        ready: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Liveness check for Kubernetes/Docker
  async performLivenessCheck(): Promise<{ alive: boolean; details: any }> {
    try {
      // Service is alive if it can respond
      const memoryCheck = await this.checkMemory();

      return {
        alive: true,
        details: {
          uptime: Date.now() - this.startTime,
          memory: memoryCheck.details,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Liveness check failed', error);

      return {
        alive: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

export const healthCheckService = new HealthCheckService();