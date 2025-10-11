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
exports.mqttCronService = void 0;
const cron = __importStar(require("node-cron"));
const loggerService_1 = require("./loggerService");
const mqttService_1 = require("./mqttService");
/**
 * MQTT Cron Service
 *
 * Manages periodic tasks for MQTT service health and maintenance
 */
class MqttCronService {
    constructor() {
        this.jobs = new Map();
        this.isInitialized = false;
    }
    /**
     * Initialize all MQTT cron jobs
     */
    initialize() {
        if (this.isInitialized) {
            loggerService_1.logger.warn('MQTT cron service already initialized');
            return;
        }
        loggerService_1.logger.info('Initializing MQTT cron jobs');
        // Health check every 5 minutes
        this.scheduleHealthCheck();
        // Refresh subscriptions every 30 minutes
        this.scheduleSubscriptionRefresh();
        // Clean stale cache data every hour
        this.scheduleCacheCleanup();
        this.isInitialized = true;
        loggerService_1.logger.info('MQTT cron jobs initialized successfully', {
            jobs: Array.from(this.jobs.keys())
        });
    }
    /**
     * Schedule MQTT health check
     * Runs every 5 minutes to verify connection health
     */
    scheduleHealthCheck() {
        const job = cron.schedule('*/5 * * * *', async () => {
            try {
                loggerService_1.logger.debug('Running MQTT health check');
                const status = mqttService_1.mqttService.getStatus();
                if (!status.connected) {
                    loggerService_1.logger.warn('MQTT not connected, attempting reconnection');
                    // The MQTT service has auto-reconnect built in
                    // This log helps track disconnection patterns
                }
                const healthCheck = await mqttService_1.mqttService.healthCheck();
                if (healthCheck.status === 'unhealthy') {
                    loggerService_1.logger.error('MQTT health check failed', {
                        ...healthCheck,
                        timestamp: new Date().toISOString()
                    });
                }
                else {
                    loggerService_1.logger.debug('MQTT health check passed', {
                        status: healthCheck.status,
                        details: healthCheck.details
                    });
                }
            }
            catch (error) {
                loggerService_1.logger.error('Error during MQTT health check', error);
            }
        });
        this.jobs.set('health-check', job);
        loggerService_1.logger.info('MQTT health check scheduled (every 5 minutes)');
    }
    /**
     * Schedule subscription refresh from database
     * Runs every 30 minutes to pick up new parking lots
     */
    scheduleSubscriptionRefresh() {
        const job = cron.schedule('*/30 * * * *', async () => {
            try {
                loggerService_1.logger.info('Running MQTT subscription refresh');
                await mqttService_1.mqttService.refreshSubscriptions();
                loggerService_1.logger.info('MQTT subscription refresh completed');
            }
            catch (error) {
                loggerService_1.logger.error('Error during MQTT subscription refresh', error);
            }
        });
        this.jobs.set('subscription-refresh', job);
        loggerService_1.logger.info('MQTT subscription refresh scheduled (every 30 minutes)');
    }
    /**
     * Schedule cache cleanup
     * Runs every hour to clean stale cached data
     */
    scheduleCacheCleanup() {
        const job = cron.schedule('0 * * * *', async () => {
            try {
                loggerService_1.logger.debug('Running MQTT cache cleanup');
                // Get all cached slot statuses
                const cachedStatuses = mqttService_1.mqttService.getSlotRealtimeStatuses();
                // Filter out stale entries (older than 1 hour)
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                let staleCount = 0;
                cachedStatuses.forEach((status) => {
                    const receivedAt = new Date(status.receivedAt);
                    if (receivedAt < oneHourAgo) {
                        staleCount++;
                        // Note: Currently we don't have a method to remove individual cache entries
                        // This is a placeholder for future implementation
                    }
                });
                if (staleCount > 0) {
                    loggerService_1.logger.info('Found stale MQTT cache entries', {
                        staleCount,
                        totalCached: cachedStatuses.length,
                        cutoffTime: oneHourAgo.toISOString()
                    });
                }
                else {
                    loggerService_1.logger.debug('No stale MQTT cache entries found', {
                        totalCached: cachedStatuses.length
                    });
                }
            }
            catch (error) {
                loggerService_1.logger.error('Error during MQTT cache cleanup', error);
            }
        });
        this.jobs.set('cache-cleanup', job);
        loggerService_1.logger.info('MQTT cache cleanup scheduled (every hour)');
    }
    /**
     * Stop a specific cron job
     */
    stopJob(jobName) {
        const job = this.jobs.get(jobName);
        if (job) {
            job.stop();
            this.jobs.delete(jobName);
            loggerService_1.logger.info(`Stopped MQTT cron job: ${jobName}`);
            return true;
        }
        return false;
    }
    /**
     * Stop all cron jobs
     */
    stopAll() {
        loggerService_1.logger.info('Stopping all MQTT cron jobs');
        this.jobs.forEach((job, name) => {
            job.stop();
            loggerService_1.logger.debug(`Stopped MQTT cron job: ${name}`);
        });
        this.jobs.clear();
        this.isInitialized = false;
        loggerService_1.logger.info('All MQTT cron jobs stopped');
    }
    /**
     * Get status of all cron jobs
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            jobs: Array.from(this.jobs.entries()).map(([name, job]) => ({
                name,
                running: true // cron jobs don't expose running status directly
            }))
        };
    }
}
// Export singleton instance
exports.mqttCronService = new MqttCronService();
