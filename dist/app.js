"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const compression_1 = __importDefault(require("compression"));
const url_1 = require("url");
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
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
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
100, // Limit each IP to 100 requests per 15 minutes for general API endpoints
"Too many requests from this IP, please try again after 15 minutes");
const authLimiter = createRateLimiter(15 * 60 * 1000, // 15 minutes
20, // Limit each IP to 20 requests per 15 minutes for auth endpoints
"Too many authentication attempts, please try again after 15 minutes");
// Strict limiter for sensitive endpoints (can be used for admin operations)
const strictLimiter = createRateLimiter(5 * 60 * 1000, // 5 minutes
10, // Limit each IP to 10 requests per 5 minutes for sensitive endpoints
"Too many requests for sensitive operations, please try again after 5 minutes");
// Apply rate limiting middleware
app.use("/api/auth", authLimiter); // Stricter limit for authentication
app.use("/api/health/detailed", strictLimiter); // Strict limit for sensitive admin endpoints
app.use("/api", generalApiLimiter); // General limit for all API endpoints
// Swagger UI - MUST come before routes
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Smart Parking API Docs",
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
app.get("/api/test", (_, res) => {
    res.json({
        message: "Server is working!",
        timestamp: new Date().toISOString(),
        swagger: "http://localhost:3000/api-docs",
    });
});
// Redirect root to API docs
app.get("/", (_, res) => {
    res.redirect("/api-docs");
});
app.all("/payments/cashfree/return", async (req, res) => {
    if (req.method === "HEAD") {
        return res.status(200).end();
    }
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
    const forwardedProto = req.get("x-forwarded-proto");
    const forwardedHost = req.get("x-forwarded-host");
    const requestHost = forwardedHost ?? req.get("host");
    const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol;
    // Flutter app deep links
    const flutterAppScheme = process.env.FLUTTER_APP_SCHEME || "smartparking";
    const subscriptionPath = "://admin/subscribe-plan";
    const dashboardPath = "://admin/dashboard";
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
    let message = "";
    if (!orderId && !paymentSessionId) {
        flowStatus = "ERROR";
        message = "Missing order reference. Please contact support.";
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
            message = finalizeResult.message || "";
        }
        catch (error) {
            flowStatus = "ERROR";
            message =
                error instanceof Error
                    ? error.message
                    : "Unexpected error occurred while processing payment.";
        }
    }
    const searchParams = new url_1.URLSearchParams();
    // Use Flutter app's expected parameter names
    // If Cashfree indicates success, trust that even if payment not found in our DB
    const cashfreeIndicatesSuccess = statusRaw &&
        (statusRaw.toUpperCase() === "SUCCESS" ||
            statusRaw.toUpperCase() === "PAID");
    const cashfreeIndicatesFailure = statusRaw &&
        (statusRaw.toUpperCase() === "FAILED" ||
            statusRaw.toUpperCase() === "CANCELLED" ||
            statusRaw.toUpperCase() === "USER_DROPPED");
    if (flowStatus === "SUCCESS" || cashfreeIndicatesSuccess) {
        searchParams.set("payment_success", "true");
    }
    else if (flowStatus === "FAILED" ||
        flowStatus === "ERROR" ||
        cashfreeIndicatesFailure) {
        searchParams.set("payment_failed", "true");
    }
    // Keep both old and new parameter names for compatibility
    if (flowStatus) {
        searchParams.set("status", flowStatus.toLowerCase());
    }
    if (displayStatus) {
        searchParams.set("cashfreeStatus", displayStatus.toUpperCase());
    }
    if (orderId) {
        searchParams.set("order_id", orderId); // Flutter expects 'order_id'
        searchParams.set("orderId", orderId); // Keep for compatibility
    }
    if (referenceId) {
        searchParams.set("referenceId", referenceId);
    }
    if (paymentSessionId) {
        searchParams.set("paymentSessionId", paymentSessionId);
    }
    if (message) {
        searchParams.set("message", message);
    }
    const queryString = searchParams.toString();
    const resolveUrl = (path) => {
        // For Flutter deep links: smartparking://admin/dashboard?params
        const deepLink = `${flutterAppScheme}${path}${queryString ? `?${queryString}` : ""}`;
        return deepLink;
    };
    const upperStatus = (displayStatus || "").toUpperCase();
    const resultPayload = {
        success: flowStatus === "SUCCESS",
        status: flowStatus,
        cashfreeStatus: upperStatus,
        orderId,
        referenceId,
        paymentSessionId,
        message,
        subscriptionUrl: resolveUrl(subscriptionPath),
        dashboardUrl: resolveUrl(dashboardPath),
    };
    if (req.headers.accept?.includes("application/json")) {
        return res.json(resultPayload);
    }
    const headline = flowStatus === "SUCCESS"
        ? "Payment Successful"
        : flowStatus === "FAILED"
            ? "Payment Failed"
            : flowStatus === "NOT_FOUND"
                ? "Payment Not Found"
                : flowStatus === "ERROR"
                    ? "Payment Processing Error"
                    : "Payment Pending";
    const description = message ||
        (flowStatus === "SUCCESS"
            ? "Your subscription has been activated. You can close this window."
            : flowStatus === "FAILED"
                ? "The payment did not complete. Please return to the app and try again."
                : flowStatus === "NOT_FOUND"
                    ? "We could not locate the payment record. Please contact support with your order reference."
                    : flowStatus === "ERROR"
                        ? "We encountered an issue while verifying your payment. Please check again in a moment."
                        : "The payment result is pending. The app will refresh once Cashfree confirms the status.");
    const payloadJson = JSON.stringify(resultPayload).replace(/</g, "\u003c");
    return res.status(200).send(`<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${headline}</title>
      <style>
        :root { color-scheme: dark; }
        body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; }
        .card { background: rgba(15, 23, 42, 0.92); padding: 32px 36px; border-radius: 16px; text-align: center; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.45); max-width: 420px; }
        .card h1 { font-size: 22px; margin: 0 0 12px; }
        .card p { font-size: 15px; margin: 0; opacity: 0.82; line-height: 1.45; }
        .meta { margin-top: 20px; font-size: 13px; color: #94a3b8; word-break: break-word; }

        /* Alert Dialog Styles */
        .alert-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .alert-dialog { background: #1e293b; border: 2px solid #10b981; border-radius: 12px; padding: 24px; max-width: 400px; text-align: center; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6); }
        .alert-dialog.success { border-color: #10b981; }
        .alert-dialog.error { border-color: #ef4444; }
        .alert-icon { font-size: 48px; margin-bottom: 16px; }
        .alert-icon.success { color: #10b981; }
        .alert-icon.error { color: #ef4444; }
        .alert-title { font-size: 20px; font-weight: bold; margin-bottom: 8px; }
        .alert-message { font-size: 14px; opacity: 0.9; margin-bottom: 16px; }
        .countdown { font-size: 12px; color: #94a3b8; }
        .hidden { display: none; }
      </style>
    </head>
    <body>
      <!-- Alert Dialog for Success/Error -->
      <div id="alertOverlay" class="alert-overlay hidden">
        <div id="alertDialog" class="alert-dialog">
          <div id="alertIcon" class="alert-icon">✅</div>
          <div id="alertTitle" class="alert-title">Payment Successful!</div>
          <div id="alertMessage" class="alert-message">Your subscription has been activated successfully.</div>
          <div id="countdown" class="countdown">Redirecting to dashboard in <span id="countdownNumber">5</span> seconds...</div>
        </div>
      </div>

      <!-- Main Card (Hidden when alert is shown) -->
      <div id="mainCard" class="card">
        <h1>${headline}</h1>
        <p>${description}</p>
        <div class="meta">Status: <strong>${upperStatus || "UNKNOWN"}</strong></div>
        ${orderId ? `<div class="meta">Order ID: ${orderId}</div>` : ""}
      </div>
      <script>
        (function () {
          var payload = ${payloadJson};
          var message = { type: 'cashfreeResult', data: payload };
          try {
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage(message, '*');
            } else if (window.parent && window.parent !== window) {
              window.parent.postMessage(message, '*');
            }
          } catch (err) {
            console.warn('cashfreeResult postMessage failed', err);
          }

          var targetUrl = null;
          if (payload && payload.success && payload.dashboardUrl) {
            targetUrl = payload.dashboardUrl;
          } else if (payload && !payload.success && payload.subscriptionUrl) {
            targetUrl = payload.subscriptionUrl;
          }

          function showAlert() {
            var alertOverlay = document.getElementById('alertOverlay');
            var alertDialog = document.getElementById('alertDialog');
            var alertIcon = document.getElementById('alertIcon');
            var alertTitle = document.getElementById('alertTitle');
            var alertMessage = document.getElementById('alertMessage');
            var countdown = document.getElementById('countdown');
            var countdownNumber = document.getElementById('countdownNumber');
            var mainCard = document.getElementById('mainCard');

            if (payload && payload.success) {
              // Success Alert
              alertIcon.textContent = '✅';
              alertIcon.className = 'alert-icon success';
              alertDialog.className = 'alert-dialog success';
              alertTitle.textContent = 'Payment Successful!';
              alertMessage.textContent = 'Your subscription has been activated successfully.';
              countdown.style.display = 'block';

              // Hide main card and show alert
              mainCard.style.display = 'none';
              alertOverlay.classList.remove('hidden');

              // Start countdown
              var timeLeft = 5;
              var countdownInterval = setInterval(function() {
                timeLeft--;
                countdownNumber.textContent = timeLeft;

                if (timeLeft <= 0) {
                  clearInterval(countdownInterval);
                  redirectToFlutterApp();
                }
              }, 1000);
            } else {
              // Error Alert
              alertIcon.textContent = '❌';
              alertIcon.className = 'alert-icon error';
              alertDialog.className = 'alert-dialog error';
              alertTitle.textContent = 'Payment Failed!';
              alertMessage.textContent = payload.message || 'The payment could not be processed. Please try again.';
              countdown.style.display = 'none';

              // Hide main card and show alert
              mainCard.style.display = 'none';
              alertOverlay.classList.remove('hidden');

              // Redirect after 3 seconds for failed payments
              setTimeout(redirectToFlutterApp, 3000);
            }
          }

          function redirectToFlutterApp() {
            if (targetUrl) {
              try {
                // Try to open the Flutter app with deep link
                window.location.href = targetUrl;

                // Fallback: try to close the window after a short delay
                setTimeout(function() {
                  try { window.close(); } catch (_) {}
                }, 2000);
              } catch (err) {
                console.warn('Failed to redirect to Flutter app:', err);
                try { window.close(); } catch (_) {}
              }
            } else {
              try { window.close(); } catch (_) {}
            }
          }

          // Show alert immediately
          setTimeout(showAlert, 500);
        })();
      </script>
    </body>
  </html>`);
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
    // Initialize MQTT service for ChirpStack integration
    // require('./services/mqttService'); // Temporarily disabled to fix 500 error
    loggerService_1.logger.info("MQTT service initialization skipped (temporarily disabled)");
})
    .catch((err) => {
    loggerService_1.logger.error("Database connection failed", err, {
        category: "system",
        database: "PostgreSQL",
        status: "failed",
    });
});
exports.default = app;
