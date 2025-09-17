"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const loggerService_1 = require("./services/loggerService");
const errorHandler_1 = require("./middleware/errorHandler");
const PORT = process.env.PORT || 3000;
const packageJson = require('../package.json');
// Graceful shutdown handling
const gracefulShutdown = (signal) => {
    loggerService_1.logger.shutdown('smart-parking-backend', `Received ${signal}`);
    process.exit(0);
};
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions with centralized handler
process.on('uncaughtException', errorHandler_1.handleUncaughtException);
// Handle unhandled promise rejections with centralized handler
process.on('unhandledRejection', errorHandler_1.handleUnhandledRejection);
app_1.default.listen(PORT, () => {
    loggerService_1.logger.startup('smart-parking-backend', packageJson.version, process.env.NODE_ENV || 'development');
    loggerService_1.logger.info('Server started successfully', {
        category: 'system',
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        url: `http://localhost:${PORT}`,
        apiDocs: `http://localhost:${PORT}/api-docs`
    });
});
