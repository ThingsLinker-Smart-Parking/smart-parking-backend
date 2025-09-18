import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { URLSearchParams } from "url";
import dotenv from "dotenv";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { AppDataSource } from "./data-source";
import { logger } from "./services/loggerService";
import {
  requestLoggingMiddleware,
  securityLoggingMiddleware,
  rateLimitLoggingMiddleware,
} from "./middleware/logging";
import { globalErrorHandler, handleNotFound } from "./middleware/errorHandler";
import swaggerOptions from "./config/swagger";

// Import Routes - SIMPLIFIED SYSTEM
import authRoutes from "./routes/auth";
import nodeRoutes from "./routes/node";
import gatewayRoutes from "./routes/gateway";
import parkingSlotRoutes from "./routes/parkingSlot";
import parkingLotRoutes from "./routes/parkingLot";
import floorRoutes from "./routes/floor";
import subscriptionRoutes from "./routes/subscription";
import subscriptionPlanRoutes from "./routes/subscriptionPlan";
import healthRoutes from "./routes/health";
import parkingRoutes from "./routes/parking";
import { subscriptionService } from "./services/subscriptionService";

dotenv.config();

const app = express();

app.set("trust proxy", process.env.TRUST_PROXY ?? "1");

// Swagger setup
const specs = swaggerJsdoc(swaggerOptions);

// CORS Configuration
const corsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) {
    if (!origin) return callback(null, true);

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
    } else {
      logger.security("CORS request blocked", "medium", {
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
app.use(
  compression({
    filter: (req: express.Request, res: express.Response) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 1024, // Only compress responses above 1KB
    level: 6, // Compression level (1-9, 6 is good balance)
  }),
);

app.use(
  helmet({
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
  }),
);

app.use(cors(corsOptions));

// Structured logging middleware (replaces Morgan)
app.use(requestLoggingMiddleware);
app.use(securityLoggingMiddleware);
app.use(rateLimitLoggingMiddleware);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiting Configuration
const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
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
const generalApiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // Limit each IP to 100 requests per 15 minutes for general API endpoints
  "Too many requests from this IP, please try again after 15 minutes",
);

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // Limit each IP to 20 requests per 15 minutes for auth endpoints
  "Too many authentication attempts, please try again after 15 minutes",
);

// Strict limiter for sensitive endpoints (can be used for admin operations)
const strictLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  10, // Limit each IP to 10 requests per 5 minutes for sensitive endpoints
  "Too many requests for sensitive operations, please try again after 5 minutes",
);

// Apply rate limiting middleware
app.use("/api/auth", authLimiter); // Stricter limit for authentication
app.use("/api/health/detailed", strictLimiter); // Strict limit for sensitive admin endpoints
app.use("/api", generalApiLimiter); // General limit for all API endpoints

// Swagger UI - MUST come before routes
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Smart Parking API Docs",
  }),
);

// Handle preflight requests
app.options(/.*/, cors(corsOptions));
// Replace with specific paths:
//app.options(/api*/, cors(corsOptions));

// API Versioning
const API_VERSION = process.env.API_VERSION || "v1";

// Simplified Routes with versioning
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/nodes`, nodeRoutes);
app.use(`/api/${API_VERSION}/gateways`, gatewayRoutes);
app.use(`/api/${API_VERSION}/parking-slots`, parkingSlotRoutes);
app.use(`/api/${API_VERSION}/parking-lots`, parkingLotRoutes);
app.use(`/api/${API_VERSION}/floors`, floorRoutes);
app.use(`/api/${API_VERSION}/subscriptions`, subscriptionRoutes);
app.use(`/api/${API_VERSION}/subscription-plans`, subscriptionPlanRoutes);
app.use(`/api/${API_VERSION}/parking`, parkingRoutes);

// Legacy routes (without versioning) for backward compatibility
app.use("/api/auth", authRoutes);
app.use("/api/nodes", nodeRoutes);
app.use("/api/gateways", gatewayRoutes);
app.use("/api/parking-slots", parkingSlotRoutes);
app.use("/api/parking-lots", parkingLotRoutes);
app.use("/api/floors", floorRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/subscription-plans", subscriptionPlanRoutes);
app.use("/api/parking", parkingRoutes);

// Health routes (unversioned)
app.use("/api/health", healthRoutes);

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

  const payload: Record<string, any> = {};

  const assignEntries = (source: Record<string, any> | undefined) => {
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
      } else {
        payload[key] = value;
      }
    }
  };

  assignEntries(req.query as Record<string, any>);
  if (
    (req.method === "POST" || req.method === "PUT") &&
    req.body &&
    typeof req.body === "object" &&
    !Array.isArray(req.body)
  ) {
    assignEntries(req.body as Record<string, any>);
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const requestHost = forwardedHost ?? req.get("host");
  const protocol = forwardedProto?.split(",")[0]?.trim() || req.protocol;
  const baseAppUrl = requestHost
    ? `${protocol}://${requestHost}`.replace(/\/$/, "")
    : "";
  const subscriptionPath = "/admin/subscribe-plan";
  const dashboardPath = "/admin/dashboard";

  const getValue = (...keys: string[]): string => {
    for (const key of keys) {
      const value = payload[key];
      if (value === undefined || value === null) {
        continue;
      }
      const str = Array.isArray(value) ? String(value[0]) : String(value);
      const trimmed = str.trim();
      if (
        trimmed &&
        trimmed.toLowerCase() !== "undefined" &&
        trimmed.toLowerCase() !== "null"
      ) {
        return trimmed;
      }
    }
    return "";
  };

  const orderId = getValue("order_id", "orderId");
  const referenceId = getValue(
    "reference_id",
    "referenceId",
    "cfPaymentId",
    "paymentId",
  );
  const paymentSessionId = getValue("payment_session_id", "paymentSessionId");
  const statusRaw = getValue("txStatus", "transaction_status", "status");

  let displayStatus = statusRaw || "PENDING";
  let flowStatus: "SUCCESS" | "FAILED" | "PENDING" | "NOT_FOUND" | "ERROR" =
    "PENDING";
  let message = "";

  if (!orderId && !paymentSessionId) {
    flowStatus = "ERROR";
    message = "Missing order reference. Please contact support.";
  } else {
    try {
      const finalizeResult = await subscriptionService.finalizeCashfreeReturn({
        orderId,
        statusHint: statusRaw,
        referenceId,
        paymentSessionId,
        rawQuery: payload,
      });

      flowStatus = finalizeResult.status;
      displayStatus = finalizeResult.cashfreeStatus || displayStatus;
      message = finalizeResult.message || "";
    } catch (error) {
      flowStatus = "ERROR";
      message =
        error instanceof Error
          ? error.message
          : "Unexpected error occurred while processing payment.";
    }
  }

  const searchParams = new URLSearchParams();

  // Use Flutter app's expected parameter names
  // If Cashfree indicates success, trust that even if payment not found in our DB
  const cashfreeIndicatesSuccess =
    statusRaw &&
    (statusRaw.toUpperCase() === "SUCCESS" ||
      statusRaw.toUpperCase() === "PAID");
  const cashfreeIndicatesFailure =
    statusRaw &&
    (statusRaw.toUpperCase() === "FAILED" ||
      statusRaw.toUpperCase() === "CANCELLED" ||
      statusRaw.toUpperCase() === "USER_DROPPED");

  if (flowStatus === "SUCCESS" || cashfreeIndicatesSuccess) {
    searchParams.set("payment_success", "true");
  } else if (
    flowStatus === "FAILED" ||
    flowStatus === "ERROR" ||
    cashfreeIndicatesFailure
  ) {
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
  const resolveUrl = (path: string) => {
    const base = baseAppUrl || "";
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}${queryString ? `?${queryString}` : ""}`;
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

  const headline =
    flowStatus === "SUCCESS"
      ? "Payment Successful"
      : flowStatus === "FAILED"
        ? "Payment Failed"
        : flowStatus === "NOT_FOUND"
          ? "Payment Not Found"
          : flowStatus === "ERROR"
            ? "Payment Processing Error"
            : "Payment Pending";

  const description =
    message ||
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
      </style>
    </head>
    <body>
      <div class="card">
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
          try { window.close(); } catch (_) {}
        })();
      </script>
    </body>
  </html>`);
});

// Handle unhandled routes (must be after all other routes)
app.all("*", handleNotFound);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Initialize Data Source and MQTT
AppDataSource.initialize()
  .then(() => {
    logger.info("Database connection established", {
      category: "system",
      database: "PostgreSQL",
      status: "connected",
    });

    // Initialize MQTT service for ChirpStack integration
    // require('./services/mqttService'); // Temporarily disabled to fix 500 error
    logger.info("MQTT service initialization skipped (temporarily disabled)");
  })
  .catch((err) => {
    logger.error("Database connection failed", err, {
      category: "system",
      database: "PostgreSQL",
      status: "failed",
    });
  });

export default app;
