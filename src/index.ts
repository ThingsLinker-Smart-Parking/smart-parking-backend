import app from './app';
import { logger } from './services/loggerService';
import { handleUncaughtException, handleUnhandledRejection } from './middleware/errorHandler';

const PORT = process.env.PORT || 3001;
const packageJson = require('../package.json');

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Stop MQTT cron jobs
    const { mqttCronService } = await import('./services/mqttCronService');
    mqttCronService.stopAll();
    logger.info('MQTT cron service stopped');
  } catch (err) {
    logger.warn('Failed to stop MQTT cron service', err);
  }

  logger.shutdown('smart-parking-backend', `Shutdown complete after ${signal}`);
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions with centralized handler
process.on('uncaughtException', handleUncaughtException);

// Handle unhandled promise rejections with centralized handler
process.on('unhandledRejection', handleUnhandledRejection);

app.listen(PORT, () => {
  logger.startup(
    'smart-parking-backend',
    packageJson.version,
    process.env.NODE_ENV || 'development'
  );
  
  logger.info('Server started successfully', {
    category: 'system',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    url: `http://localhost:${PORT}`,
    apiDocs: `http://localhost:${PORT}/api-docs`
  });
});
