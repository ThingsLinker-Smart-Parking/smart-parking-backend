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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const data_source_1 = require("./data-source");
const loggerService_1 = require("./services/loggerService");
const logging_1 = require("./middleware/logging");
const errorHandler_1 = require("./middleware/errorHandler");
const swagger_1 = __importDefault(require("./config/swagger"));
// Import Routes - SIMPLIFIED SYSTEM
const auth_1 = __importDefault(require("./routes/auth"));
const node_1 = __importDefault(require("./routes/node"));
const gateway_1 = __importDefault(require("./routes/gateway"));
const parkingSlot_1 = __importDefault(require("./routes/parkingSlot"));
const parkingLot_1 = __importDefault(require("./routes/parkingLot"));
const floor_1 = __importDefault(require("./routes/floor"));
const subscription_1 = __importDefault(require("./routes/subscription"));
const subscriptionPlan_1 = __importDefault(require("./routes/subscriptionPlan"));
const health_1 = __importDefault(require("./routes/health"));
const parking_1 = __importDefault(require("./routes/parking"));
const subscriptionService_1 = require("./services/subscriptionService");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.set("trust proxy", process.env.TRUST_PROXY ?? "1");
// Swagger setup
const specs = (0, swagger_jsdoc_1.default)(swagger_1.default);
// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:5000",
            "http://localhost:8080",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "http://127.0.0.1:5000",
            "http://127.0.0.1:8080",
            "capacitor://localhost",
            "ionic://localhost",
            "https://smart-parking-backend-production-5449.up.railway.app",
        ];
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes("localhost")) {
            callback(null, true);
        }
        else {
            loggerService_1.logger.security("CORS request blocked", "medium", {
                origin,
                blockedBy: "CORS policy",
            });
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
// Security and Performance Middleware
app.use((0, compression_1.default)({
    filter: (req, res) => {
        if (req.headers["x-no-compression"]) {
            return false;
        }
        return compression_1.default.filter(req, res);
    },
    threshold: 1024, // Only compress responses above 1KB
    level: 6, // Compression level (1-9, 6 is good balance)
}));
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for Swagger
            connectSrc: ["'self'", "http://localhost:3000", "https://smart-parking-backend-production-5449.up.railway.app"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
app.use((0, cors_1.default)(corsOptions));
// Structured logging middleware (replaces Morgan)
app.use(logging_1.requestLoggingMiddleware);
app.use(logging_1.securityLoggingMiddleware);
app.use(logging_1.rateLimitLoggingMiddleware);
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Rate Limiting Configuration
const createRateLimiter = (windowMs, max, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: {
            success: false,
            message,
            error: "RATE_LIMIT_EXCEEDED",
        },
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        // Skip successful requests for rate limiting (optional)
        skipSuccessfulRequests: false,
        // Skip failed requests for rate limiting (optional)
        skipFailedRequests: false,
    });
};
// Different rate limits for different endpoint types
const generalApiLimiter = createRateLimiter(15 * 60 * 1000, // 15 minutes
1000, // Limit each IP to 1000 requests per 15 minutes for general API endpoints (testing)
"Too many requests from this IP, please try again after 15 minutes");
const authLimiter = createRateLimiter(15 * 60 * 1000, // 15 minutes
1000, // Limit each IP to 1000 requests per 15 minutes for auth endpoints (testing)
"Too many authentication attempts, please try again after 15 minutes");
// Strict limiter for sensitive endpoints (can be used for admin operations)
const strictLimiter = createRateLimiter(5 * 60 * 1000, // 5 minutes
10, // Limit each IP to 10 requests per 5 minutes for sensitive endpoints
"Too many requests for sensitive operations, please try again after 5 minutes");
// Apply rate limiting middleware
app.use("/api/auth", authLimiter); // Stricter limit for authentication
app.use("/api/health/detailed", strictLimiter); // Strict limit for sensitive admin endpoints
app.use("/api", generalApiLimiter); // General limit for all API endpoints
// Export Swagger JSON endpoint
app.get("/swagger.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
});
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
});
// Swagger UI - MUST come before routes
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Smart Parking API Docs",
    swaggerOptions: {
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        tryItOutEnabled: true,
        requestInterceptor: (req) => {
            // Allow CORS requests from Swagger UI
            req.headers['Access-Control-Allow-Origin'] = '*';
            return req;
        }
    }
}));
// Handle preflight requests
app.options(/.*/, (0, cors_1.default)(corsOptions));
// Replace with specific paths:
//app.options(/api*/, cors(corsOptions));
// API Versioning
const API_VERSION = process.env.API_VERSION || "v1";
// Simplified Routes with versioning
app.use(`/api/${API_VERSION}/auth`, auth_1.default);
app.use(`/api/${API_VERSION}/nodes`, node_1.default);
app.use(`/api/${API_VERSION}/gateways`, gateway_1.default);
app.use(`/api/${API_VERSION}/parking-slots`, parkingSlot_1.default);
app.use(`/api/${API_VERSION}/parking-lots`, parkingLot_1.default);
app.use(`/api/${API_VERSION}/floors`, floor_1.default);
app.use(`/api/${API_VERSION}/subscriptions`, subscription_1.default);
app.use(`/api/${API_VERSION}/subscription-plans`, subscriptionPlan_1.default);
app.use(`/api/${API_VERSION}/parking`, parking_1.default);
// Legacy routes (without versioning) for backward compatibility
app.use("/api/auth", auth_1.default);
app.use("/api/nodes", node_1.default);
app.use("/api/gateways", gateway_1.default);
app.use("/api/parking-slots", parkingSlot_1.default);
app.use("/api/parking-lots", parkingLot_1.default);
app.use("/api/floors", floor_1.default);
app.use("/api/subscriptions", subscription_1.default);
app.use("/api/subscription-plans", subscriptionPlan_1.default);
app.use("/api/parking", parking_1.default);
// Health routes (unversioned)
app.use("/api/health", health_1.default);
// Test endpoint without authentication
app.get("/api/test", (req, res) => {
    const port = process.env.PORT || '3000';
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost';
    const baseUrl = `${protocol}://${host}`;
    res.json({
        message: "Server is working!",
        timestamp: new Date().toISOString(),
        swagger: `${baseUrl}/api-docs`,
        swaggerJson: `${baseUrl}/swagger.json`,
        openApiJson: `${baseUrl}/api-docs.json`,
        environment: process.env.NODE_ENV || 'development',
        port: port
    });
});
// Redirect root to API docs
app.get("/", (_, res) => {
    res.redirect("/api-docs");
});
app.all("/payments/cashfree/return", async (req, res) => {
    try {
        if (req.method === "HEAD") {
            return res.status(200).end();
        }
        // Log incoming request for debugging
        console.log('Cashfree return request:', {
            method: req.method,
            query: req.query,
            body: req.body,
            headers: {
                'content-type': req.headers['content-type'],
                'user-agent': req.headers['user-agent']
            }
        });
        const payload = {};
        const assignEntries = (source) => {
            if (!source) {
                return;
            }
            for (const [key, value] of Object.entries(source)) {
                if (value === undefined || value === null) {
                    continue;
                }
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        payload[key] = value[0];
                    }
                }
                else {
                    payload[key] = value;
                }
            }
        };
        assignEntries(req.query);
        if ((req.method === "POST" || req.method === "PUT") &&
            req.body &&
            typeof req.body === "object" &&
            !Array.isArray(req.body)) {
            assignEntries(req.body);
        }
        // Note: These variables are kept for potential future use in URL construction
        // const forwardedProto = req.get("x-forwarded-proto");
        // const forwardedHost = req.get("x-forwarded-host");
        // const requestHost = forwardedHost ?? req.get("host");
        // const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol;
        // Flutter app deep links
        const flutterAppScheme = process.env.FLUTTER_APP_SCHEME || "smartparking";
        const getValue = (...keys) => {
            for (const key of keys) {
                const value = payload[key];
                if (value === undefined || value === null) {
                    continue;
                }
                const str = Array.isArray(value) ? String(value[0]) : String(value);
                const trimmed = str.trim();
                if (trimmed &&
                    trimmed.toLowerCase() !== "undefined" &&
                    trimmed.toLowerCase() !== "null") {
                    return trimmed;
                }
            }
            return "";
        };
        const orderId = getValue("order_id", "orderId");
        const referenceId = getValue("reference_id", "referenceId", "cfPaymentId", "paymentId");
        const paymentSessionId = getValue("payment_session_id", "paymentSessionId");
        const statusRaw = getValue("txStatus", "transaction_status", "status");
        let displayStatus = statusRaw || "PENDING";
        let flowStatus = "PENDING";
        // Check Cashfree status first - trust their response for immediate redirect
        const cashfreeIndicatesSuccess = statusRaw &&
            (statusRaw.toUpperCase() === "SUCCESS" ||
                statusRaw.toUpperCase() === "PAID");
        if (!orderId && !paymentSessionId) {
            flowStatus = "ERROR";
        }
        else {
            try {
                const finalizeResult = await subscriptionService_1.subscriptionService.finalizeCashfreeReturn({
                    orderId,
                    statusHint: statusRaw,
                    referenceId,
                    paymentSessionId,
                    rawQuery: payload,
                });
                flowStatus = finalizeResult.status;
                displayStatus = finalizeResult.cashfreeStatus || displayStatus;
            }
            catch (error) {
                flowStatus = "ERROR";
            }
        }
        // Return HTML page with JavaScript to handle Flutter app communication
        const isSuccess = flowStatus === "SUCCESS" || cashfreeIndicatesSuccess;
        const redirectPath = isSuccess ? "/admin/dashboard" : "/admin/subscribe-plan";
        const deepLinkUrl = `${flutterAppScheme}:${redirectPath}?${isSuccess ? 'payment_success=true' : 'payment_failed=true'}&order_id=${orderId}&status=${isSuccess ? 'success' : 'failed'}`;
        const webRedirectPath = `/#/payment/result?order_id=${orderId}&status=${isSuccess ? 'success' : 'failed'}`;
        const redirectDelaySeconds = 5;
        return res.status(200).send(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${isSuccess ? 'Payment Successful' : 'Payment Failed'}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <h2>${isSuccess ? '✅ Payment Successful!' : '❌ Payment Failed'}</h2>
    <p>Redirecting in 5 seconds...</p>
    <p>Order ID: ${orderId}</p>

    <script>
        // Try multiple methods to communicate with Flutter app
        function redirectToApp() {
            const deepLink = '${deepLinkUrl}';

            // Method 1: Try deep link
            try {
                window.location.href = deepLink;
            } catch (e) {
                console.log('Deep link failed:', e);
            }

            // Method 2: Post message to parent (for WebView)
            try {
                const message = {
                    type: 'paymentResult',
                    success: ${isSuccess},
                    orderId: '${orderId}',
                    status: '${isSuccess ? 'success' : 'failed'}',
                    redirectPath: '${redirectPath}'
                };

                if (window.parent && window.parent !== window) {
                    window.parent.postMessage(message, '*');
                }

                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage(message, '*');
                }
            } catch (e) {
                console.log('PostMessage failed:', e);
            }

            // Method 3: Try to close window if it's a popup
            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    console.log('Cannot close window');
                }
            }, 5000);
        }

        // Execute immediately
        redirectToApp();

        // Fallback redirect for web deployments
        setTimeout(() => {
            try {
                window.location.replace('${webRedirectPath}');
            } catch (e) {
                console.log('Fallback redirect failed', e);
            }
        }, ${redirectDelaySeconds * 1000});
    </script>
</body>
</html>`);
    }
    catch (error) {
        console.error('Error in Cashfree return handler:', error);
        loggerService_1.logger.error('Cashfree return handler error', error, {
            category: 'payment',
            endpoint: '/payments/cashfree/return',
            method: req.method,
            query: req.query,
            body: req.body
        });
        // Return a simple error page
        return res.status(500).send(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Payment Processing Error</title>
        <style>
          body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; }
          .card { background: rgba(15, 23, 42, 0.92); padding: 32px 36px; border-radius: 16px; text-align: center; max-width: 420px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Payment Processing Error</h1>
          <p>We encountered an issue while processing your payment result. Please check your payment status in the app or contact support.</p>
        </div>
        <script>
          setTimeout(function() {
            try { window.close(); } catch (_) {}
          }, 3000);
        </script>
      </body>
    </html>`);
    }
});
// Handle unhandled routes (must be after all other routes)
app.all("*", errorHandler_1.handleNotFound);
// Global error handling middleware (must be last)
app.use(errorHandler_1.globalErrorHandler);
// Initialize Data Source and MQTT
data_source_1.AppDataSource.initialize()
    .then(() => {
    loggerService_1.logger.info("Database connection established", {
        category: "system",
        database: "PostgreSQL",
        status: "connected",
    });
    const mqttBroker = process.env.MQTT_BROKER_URL;
    if (!mqttBroker) {
        loggerService_1.logger.info("MQTT service initialization skipped (broker url not configured)");
        return;
    }
    Promise.resolve().then(() => __importStar(require("./services/mqttService"))).then(async () => {
        loggerService_1.logger.info("MQTT service initialized", {
            broker: mqttBroker,
        });
        // Initialize MQTT cron jobs for health monitoring and maintenance
        try {
            const { mqttCronService } = await Promise.resolve().then(() => __importStar(require("./services/mqttCronService")));
            mqttCronService.initialize();
            loggerService_1.logger.info("MQTT cron service initialized");
        }
        catch (cronError) {
            loggerService_1.logger.error("Failed to initialize MQTT cron service", cronError);
        }
    })
        .catch((mqttError) => {
        loggerService_1.logger.error("Failed to initialize MQTT service", mqttError, {
            broker: mqttBroker,
        });
    });
})
    .catch((err) => {
    loggerService_1.logger.error("Database connection failed", err, {
        category: "system",
        database: "PostgreSQL",
        status: "failed",
    });
});
exports.default = app;
