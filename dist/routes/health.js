"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthCheckService_1 = require("../services/healthCheckService");
const auth_1 = require("../middleware/auth");
const loggerService_1 = require("../services/loggerService");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check endpoint
 *     description: Returns the basic health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Uptime in milliseconds
 *                 version:
 *                   type: string
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         responseTime:
 *                           type: number
 *       503:
 *         description: Service is unhealthy
 */
router.get('/', async (_, res) => {
    try {
        const healthResult = await healthCheckService_1.healthCheckService.performHealthCheck();
        const statusCode = healthResult.status === 'healthy' ? 200 :
            healthResult.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(healthResult);
    }
    catch (error) {
        loggerService_1.logger.error('Health check endpoint error', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/health/detailed:
 *   get:
 *     summary: Detailed health check (Admin only)
 *     description: Returns detailed health information including environment and configuration
 *     tags: [Health]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Detailed health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 environment:
 *                   type: object
 *                 configuration:
 *                   type: object
 *                 dependencies:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 */
router.get('/detailed', auth_1.authenticateToken, (0, auth_1.requireRole)(['admin', 'super_admin']), async (_, res) => {
    try {
        const detailedHealth = await healthCheckService_1.healthCheckService.performDetailedHealthCheck();
        const statusCode = detailedHealth.status === 'healthy' ? 200 :
            detailedHealth.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(detailedHealth);
    }
    catch (error) {
        loggerService_1.logger.error('Detailed health check endpoint error', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Detailed health check failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/health/ready:
 *   get:
 *     summary: Readiness probe for Kubernetes
 *     description: Checks if the service is ready to serve traffic
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                 details:
 *                   type: object
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (_, res) => {
    try {
        const readinessResult = await healthCheckService_1.healthCheckService.performReadinessCheck();
        const statusCode = readinessResult.ready ? 200 : 503;
        res.status(statusCode).json(readinessResult);
    }
    catch (error) {
        loggerService_1.logger.error('Readiness check endpoint error', error);
        res.status(503).json({
            ready: false,
            details: {
                error: 'Readiness check failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});
/**
 * @swagger
 * /api/health/live:
 *   get:
 *     summary: Liveness probe for Kubernetes
 *     description: Checks if the service is alive and should not be restarted
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                 details:
 *                   type: object
 *       503:
 *         description: Service is not alive
 */
router.get('/live', async (_, res) => {
    try {
        const livenessResult = await healthCheckService_1.healthCheckService.performLivenessCheck();
        const statusCode = livenessResult.alive ? 200 : 503;
        res.status(statusCode).json(livenessResult);
    }
    catch (error) {
        loggerService_1.logger.error('Liveness check endpoint error', error);
        res.status(503).json({
            alive: false,
            details: {
                error: 'Liveness check failed',
                timestamp: new Date().toISOString()
            }
        });
    }
});
/**
 * @swagger
 * /api/health/ping:
 *   get:
 *     summary: Simple ping endpoint
 *     description: Returns a simple pong response for basic connectivity testing
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Pong response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: pong
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/ping', (_, res) => {
    res.json({
        message: 'pong',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
