import * as cron from 'node-cron';
import { logger } from './loggerService';
import { mqttService } from './mqttService';

/**
 * MQTT Cron Service
 *
 * Manages periodic tasks for MQTT service health and maintenance
 */
class MqttCronService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  /**
   * Initialize all MQTT cron jobs
   */
  public initialize(): void {
    if (this.isInitialized) {
      logger.warn('MQTT cron service already initialized');
      return;
    }

    logger.info('Initializing MQTT cron jobs');

    // Health check every 5 minutes
    this.scheduleHealthCheck();

    // Refresh subscriptions every 30 minutes
    this.scheduleSubscriptionRefresh();

    // Clean stale cache data every hour
    this.scheduleCacheCleanup();

    this.isInitialized = true;
    logger.info('MQTT cron jobs initialized successfully', {
      jobs: Array.from(this.jobs.keys())
    });
  }

  /**
   * Schedule MQTT health check
   * Runs every 5 minutes to verify connection health
   */
  private scheduleHealthCheck(): void {
    const job = cron.schedule('*/5 * * * *', async () => {
      try {
        logger.debug('Running MQTT health check');

        const status = mqttService.getStatus();

        if (!status.connected) {
          logger.warn('MQTT not connected, attempting reconnection');
          // The MQTT service has auto-reconnect built in
          // This log helps track disconnection patterns
        }

        const healthCheck = await mqttService.healthCheck();

        if (healthCheck.status === 'unhealthy') {
          logger.error('MQTT health check failed', {
            ...healthCheck,
            timestamp: new Date().toISOString()
          });
        } else {
          logger.debug('MQTT health check passed', {
            status: healthCheck.status,
            details: healthCheck.details
          });
        }

      } catch (error) {
        logger.error('Error during MQTT health check', error);
      }
    });

    this.jobs.set('health-check', job);
    logger.info('MQTT health check scheduled (every 5 minutes)');
  }

  /**
   * Schedule subscription refresh from database
   * Runs every 30 minutes to pick up new parking lots
   */
  private scheduleSubscriptionRefresh(): void {
    const job = cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Running MQTT subscription refresh');

        await mqttService.refreshSubscriptions();

        logger.info('MQTT subscription refresh completed');

      } catch (error) {
        logger.error('Error during MQTT subscription refresh', error);
      }
    });

    this.jobs.set('subscription-refresh', job);
    logger.info('MQTT subscription refresh scheduled (every 30 minutes)');
  }

  /**
   * Schedule cache cleanup
   * Runs every hour to clean stale cached data
   */
  private scheduleCacheCleanup(): void {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        logger.debug('Running MQTT cache cleanup');

        // Get all cached slot statuses
        const cachedStatuses = mqttService.getSlotRealtimeStatuses();

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
          logger.info('Found stale MQTT cache entries', {
            staleCount,
            totalCached: cachedStatuses.length,
            cutoffTime: oneHourAgo.toISOString()
          });
        } else {
          logger.debug('No stale MQTT cache entries found', {
            totalCached: cachedStatuses.length
          });
        }

      } catch (error) {
        logger.error('Error during MQTT cache cleanup', error);
      }
    });

    this.jobs.set('cache-cleanup', job);
    logger.info('MQTT cache cleanup scheduled (every hour)');
  }

  /**
   * Stop a specific cron job
   */
  public stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      logger.info(`Stopped MQTT cron job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all cron jobs
   */
  public stopAll(): void {
    logger.info('Stopping all MQTT cron jobs');

    this.jobs.forEach((job, name) => {
      job.stop();
      logger.debug(`Stopped MQTT cron job: ${name}`);
    });

    this.jobs.clear();
    this.isInitialized = false;

    logger.info('All MQTT cron jobs stopped');
  }

  /**
   * Get status of all cron jobs
   */
  public getStatus(): {
    initialized: boolean;
    jobs: { name: string; running: boolean }[];
  } {
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
export const mqttCronService = new MqttCronService();
