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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const loggerService_1 = require("./services/loggerService");
const errorHandler_1 = require("./middleware/errorHandler");
const PORT = process.env.PORT || 3001;
const packageJson = require('../package.json');
// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
    loggerService_1.logger.info(`Received ${signal}, starting graceful shutdown`);
    try {
        // Stop MQTT cron jobs
        const { mqttCronService } = await Promise.resolve().then(() => __importStar(require('./services/mqttCronService')));
        mqttCronService.stopAll();
        loggerService_1.logger.info('MQTT cron service stopped');
    }
    catch (err) {
        loggerService_1.logger.warn('Failed to stop MQTT cron service', err);
    }
    loggerService_1.logger.shutdown('smart-parking-backend', `Shutdown complete after ${signal}`);
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
