"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckService = void 0;
const data_source_1 = require("../data-source");
const loggerService_1 = require("./loggerService");
const environment_1 = require("../config/environment");
class HealthCheckService {
    constructor() {
        this.startTime = Date.now();
    }
    async performHealthCheck() {
        const timestamp = new Date().toISOString();
        const uptime = Date.now() - this.startTime;
        loggerService_1.logger.debug('Performing health check', { timestamp });
        const checks = {
            database: await this.checkDatabase(),
            memory: await this.checkMemory(),
            disk: await this.checkDisk()
        };
        // Add optional service checks
        if (environment_1.env.REDIS_URL) {
            checks.redis = await this.checkRedis();
        }
        if (environment_1.env.MQTT_BROKER_URL) {
            checks.mqtt = await this.checkMqtt();
        }
        // Determine overall status
        const overallStatus = this.determineOverallStatus(Object.values(checks).filter((check) => check !== undefined));
        const result = {
            status: overallStatus,
            timestamp,
            uptime,
            version: process.env.npm_package_version || '1.0.0',
            checks
        };
        loggerService_1.logger.info('Health check completed', {
            status: overallStatus,
            responseTime: Date.now() - new Date(timestamp).getTime(),
            checks: Object.keys(checks).reduce((acc, key) => {
                const check = checks[key];
                if (check) {
                    acc[key] = check.status;
                }
                return acc;
            }, {})
        });
        return result;
    }
    async checkDatabase() {
        const startTime = Date.now();
        try {
            if (!data_source_1.AppDataSource.isInitialized) {
                throw new Error('Database connection not initialized');
            }
            // Simple query to test database connectivity
            await data_source_1.AppDataSource.query('SELECT 1');
            const responseTime = Date.now() - startTime;
            // Check if response time is acceptable
            const status = responseTime > environment_1.env.DB_HEALTH_TIMEOUT ? 'degraded' : 'healthy';
            return {
                status,
                responseTime,
                details: {
                    host: environment_1.env.DB_HOST,
                    port: environment_1.env.DB_PORT,
                    database: environment_1.env.DB_NAME,
                    ssl: environment_1.env.DB_SSL
                }
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            loggerService_1.logger.error('Database health check failed', error);
            return {
                status: 'unhealthy',
                responseTime,
                error: error instanceof Error ? error.message : 'Unknown database error',
                details: {
                    host: environment_1.env.DB_HOST,
                    port: environment_1.env.DB_PORT,
                    database: environment_1.env.DB_NAME
                }
            };
        }
    }
    async checkRedis() {
        const startTime = Date.now();
        try {
            // Note: You'll need to implement Redis connection check
            // This is a placeholder that assumes Redis client is available
            const redis = await Promise.resolve().then(() => __importStar(require('redis')));
            const client = redis.createClient({ url: environment_1.env.REDIS_URL });
            await client.connect();
            await client.ping();
            await client.disconnect();
            const responseTime = Date.now() - startTime;
            return {
                status: 'healthy',
                responseTime,
                details: {
                    url: environment_1.env.REDIS_URL,
                    database: environment_1.env.REDIS_DB
                }
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            loggerService_1.logger.error('Redis health check failed', error);
            return {
                status: 'unhealthy',
                responseTime,
                error: error instanceof Error ? error.message : 'Unknown Redis error'
            };
        }
    }
    async checkMqtt() {
        const startTime = Date.now();
        try {
            // Note: You'll need to implement MQTT connection check
            // This is a placeholder
            const responseTime = Date.now() - startTime;
            return {
                status: 'healthy',
                responseTime,
                details: {
                    brokerUrl: environment_1.env.MQTT_BROKER_URL,
                    clientId: environment_1.env.MQTT_CLIENT_ID
                }
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            loggerService_1.logger.error('MQTT health check failed', error);
            return {
                status: 'unhealthy',
                responseTime,
                error: error instanceof Error ? error.message : 'Unknown MQTT error'
            };
        }
    }
    async checkMemory() {
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
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                status: 'unhealthy',
                responseTime,
                error: error instanceof Error ? error.message : 'Unknown memory check error'
            };
        }
    }
    async checkDisk() {
        const startTime = Date.now();
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
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
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                status: 'unhealthy',
                responseTime,
                error: error instanceof Error ? error.message : 'Unknown disk check error'
            };
        }
    }
    determineOverallStatus(checks) {
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
    async performDetailedHealthCheck() {
        const basicCheck = await this.performHealthCheck();
        return {
            ...basicCheck,
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                pid: process.pid,
                nodeEnv: environment_1.env.NODE_ENV
            },
            configuration: {
                port: environment_1.env.PORT,
                apiVersion: environment_1.env.API_VERSION,
                corsEnabled: environment_1.env.ALLOWED_ORIGINS.length > 0,
                swaggerEnabled: environment_1.env.ENABLE_SWAGGER,
                monitoringEnabled: environment_1.env.MONITORING_ENABLED,
                logLevel: environment_1.env.LOG_LEVEL
            },
            dependencies: {
                database: {
                    type: 'postgresql',
                    host: environment_1.env.DB_HOST,
                    port: environment_1.env.DB_PORT,
                    ssl: environment_1.env.DB_SSL
                },
                redis: environment_1.env.REDIS_URL ? {
                    configured: true,
                    url: environment_1.env.REDIS_URL
                } : { configured: false },
                mqtt: environment_1.env.MQTT_BROKER_URL ? {
                    configured: true,
                    broker: environment_1.env.MQTT_BROKER_URL
                } : { configured: false }
            }
        };
    }
    // Readiness check for Kubernetes/Docker
    async performReadinessCheck() {
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
        }
        catch (error) {
            loggerService_1.logger.error('Readiness check failed', error);
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
    async performLivenessCheck() {
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
        }
        catch (error) {
            loggerService_1.logger.error('Liveness check failed', error);
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
exports.healthCheckService = new HealthCheckService();
