# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
- `npm run dev` - Start development server with nodemon (watches TypeScript files)
- `npm run build` - Compile TypeScript to JavaScript (output to `dist/`)
- `npm start` - Start production server from compiled JavaScript

### Database & Seeding
- `npm run seed:plans` - Seed subscription plans into database
- `npm run create:superadmin` - Create super admin user
- `npm run migration:generate src/database/migrations/MigrationName` - Generate new migration from entity changes
- `npm run migration:run` - Run pending migrations
- `npm run migration:show` - Show pending migrations
- `npm run migration:revert` - Revert last migration
- `npm run schema:sync` - Sync database schema (development only)

### Testing & Quality Assurance
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Run ESLint with automatic fixes

### Integration Test Scripts (Node.js scripts in project root)
- `node test-auth.js` - Test authentication endpoints
- `node test-unverified-user.js` - Test unverified user handling
- `node test-subscription.js` - Test subscription system
- `node test-subscription-flow.js` - Test complete subscription flow
- `node test-email.js` - Test email service functionality
- `node test-gateway-apis.js` - Test gateway management APIs
- `node test-gateway-apis-admin-only.js` - Test admin-only gateway features
- `node test-simple-node-api.js` - Test node management APIs
- `node test-parking-apis.js` - Test parking operations APIs
- `node test-webhook.js` - Test webhook functionality
- `node test-pricing-demo.js` - Test pricing and subscription demo
- `node test-all-api-issues.js` - Test all API endpoints for issues

### Development Setup
1. Copy `env.example` to `.env` and configure (see Environment Configuration section)
2. Ensure PostgreSQL database exists
3. Run `npm run dev` to start with auto-sync enabled

## Architecture Overview

### Core Stack
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with TypeORM (0.3.x)
- **Authentication**: JWT with OTP email verification
- **IoT Integration**: MQTT service for LoRa sensors via ChirpStack
- **Payment Gateway**: Cashfree integration with Flutter app deep linking support
- **Documentation**: Swagger/OpenAPI at `/` and `/api-docs`
- **Logging**: Winston with structured logging
- **Security**: Helmet, CORS, rate limiting, input validation

### Project Structure
```
src/
├── app.ts              # Express app setup, middleware, routes
├── index.ts            # Server entry point
├── data-source.ts      # TypeORM configuration
├── models/             # Database entities (TypeORM)
├── controllers/        # Route handlers
├── routes/             # Route definitions
├── services/           # Business logic (email, MQTT, OTP, subscriptions)
├── middleware/         # Auth middleware, logging, error handling
├── config/             # Swagger and environment configuration
├── scripts/            # Database seeding scripts
├── validation/         # Input validation schemas and middleware
├── utils/              # Utility functions and helpers
└── database/
    └── migrations/     # TypeORM migration files
```

### Key Services
- **Email Service** (`src/services/emailService.ts`): Handles OTP emails with development console logging and production SMTP
- **OTP Service** (`src/services/otpService.ts`): Manages OTP generation, validation, and rate limiting
- **MQTT Service** (`src/services/mqttService.ts`): Handles LoRa sensor communication via MQTT
- **Subscription Service** (`src/services/subscriptionService.ts`): Manages subscription plans and payments
- **Cashfree Payment Service** (`src/services/cashfreePaymentService.ts`): Handles Cashfree payment gateway integration
- **Gateway Service** (`src/services/gatewayService.ts`): Manages LoRa gateway operations
- **Logger Service** (`src/services/loggerService.ts`): Structured logging with Winston
- **Health Check Service** (`src/services/healthCheckService.ts`): System health monitoring
- **Database Optimization Service** (`src/services/databaseOptimizationService.ts`): Database performance monitoring and optimization

### Database Schema & Hierarchy

The system enforces a strict hierarchical ownership model:

```
User (Admin) → ParkingLot → Floor → ParkingSlot → Node → Gateway (linked)
```

**Core Entities** (all use UUID primary keys):
- `User` - Authentication and user management with role-based access control
- `ParkingLot` - Top-level parking facilities (owned by User/Admin)
- `Floor` - Multi-level parking support (belongs to ParkingLot)
- `ParkingSlot` - Individual parking spaces (belongs to Floor)
- `Node` - IoT sensor devices (must belong to ParkingSlot, assigned to Gateway)
- `Gateway` - LoRa network gateways (linked to User/Admin)
- `ParkingStatusLog` - Real-time parking status tracking with metadata

**Subscription System Entities**:
- `SubscriptionPlan` - Predefined pricing tiers with features and limits
- `Subscription` - User's active subscription with billing cycles and status
- `Payment` - Payment transaction records with Cashfree integration
- `PasswordResetToken` - Secure password reset token management

**Critical Hierarchy Rules**:
- ✅ Nodes MUST be created for specific parking slots (no standalone nodes)
- ✅ Nodes are assigned to gateways during creation and cannot be unassigned
- ✅ All entities enforce ownership through the hierarchy
- ✅ TypeORM synchronization enabled in development (`synchronize: process.env.NODE_ENV === 'development'`)

### Authentication Flow
1. User registration creates unverified account
2. OTP sent via email for verification (6 digits, 15 min expiry)
3. JWT tokens issued after verification
4. Role-based access control: `user`, `admin`, `super-admin`
5. Password reset uses OTP verification

### API Structure & Important Changes
- `/api/auth/*` - Authentication endpoints
- `/api/parking-lots/*` - Parking lot management
- `/api/floors/*` - Floor management within parking lots
- `/api/parking-slots/*` - Individual parking slot management
- `/api/nodes/*` - IoT sensor node management (hierarchy enforced)
- `/api/gateways/*` - LoRa gateway management
- `/api/parking/*` - Real-time parking status and operations
- `/api/subscriptions/*` - User subscription management
- `/api/subscription-plans/*` - Subscription plan management (admin only)
- `/api/health` - System health monitoring
- `/api-docs` - Interactive Swagger documentation
- `/swagger.json` - OpenAPI/Swagger specification (JSON export)
- `/api-docs.json` - OpenAPI/Swagger specification (JSON export, alternative endpoint)
- `/payments/cashfree/return` - Payment gateway callback handler

**Breaking API Changes**:
- ❌ OLD: `POST /api/nodes` with optional parkingSlotId
- ✅ NEW: `POST /api/nodes/parking-slot/{parkingSlotId}` (hierarchy enforced)
- Removed endpoints: `/api/nodes/unassigned`, `/api/nodes/{id}/assign-parking-slot`, `/api/nodes/{id}/unassign-parking-slot`

### Environment Configuration
Key environment variables in `.env`:

**Database**:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `DB_SSL` - Enable SSL for database connection
- `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_IDLE_TIMEOUT`, `DB_CONNECTION_TIMEOUT`
- `DB_LOGGING` - Enable SQL query logging

**Authentication & Security**:
- `JWT_SECRET`, `JWT_EXPIRES_IN` (default: 24h)
- `SESSION_SECRET`, `SESSION_MAX_AGE`
- `WEBHOOK_SECRET`

**Email (SMTP)**:
- `SMTP_HOST`, `SMTP_PORT` (Hostinger SMTP configured)
- `EMAIL`, `EMAIL_PASSWORD`, `DEFAULT_EMAIL`
- `EMAIL_FROM_NAME`

**MQTT (ChirpStack LoRa)**:
- `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`
- `MQTT_CLIENT_ID`

**Payment Gateway (Cashfree)**:
- `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`
- `CASHFREE_API_VERSION`, `CASHFREE_ENVIRONMENT` (SANDBOX/PRODUCTION)
- `CASHFREE_RETURN_URL` - Deep link for Flutter app

**API & App**:
- `API_VERSION`, `BASE_URL`, `FLUTTER_APP_SCHEME`
- `ALLOWED_ORIGINS` - CORS configuration

**Logging & Monitoring**:
- `LOG_LEVEL` (debug/info/warn/error)
- `ENABLE_FILE_LOGGING`

**Rate Limiting**:
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`
- `AUTH_RATE_LIMIT_MAX`, `STRICT_RATE_LIMIT_MAX`

### Development Notes
- TypeORM migrations use TypeORM 0.3.x format
- Email service logs to console in development mode (no actual SMTP)
- CORS configured for local development origins including Capacitor/Ionic
- All entities exported from `src/models/index.ts`
- Swagger UI available at both `/` and `/api-docs`
- ESLint v9+ with TypeScript parser (strict mode disabled for flexibility)
- Jest configured with 30s timeout and serial execution (`maxWorkers: 1`) to avoid database conflicts
- Performance indexes added for optimized queries
- Database uses UUID primary keys for all entities
- API versioning supported (v1 default, legacy routes for backward compatibility)

### Code Quality & Standards
- **TypeScript**: Strict type checking disabled (`strict: false` in tsconfig.json)
- **Decorators**: Experimental decorators enabled for TypeORM
- **Testing**: Jest with ts-jest and supertest for API testing
- **Security**: Centralized error handling, helmet, CORS, rate limiting, input validation via express-validator and Joi
- **Logging**: Winston logger with structured logging and configurable levels

### IoT Integration & Sensor Management

The system handles LoRa sensors via MQTT with ChirpStack integration:

**Sensor Data Flow**:
1. LoRa sensor → ChirpStack → MQTT → MQTT Service
2. MQTT Service processes payload (supports binary, JSON, and legacy formats)
3. Updates Node metadata (distance, battery, RSSI, temperature)
4. Determines parking status based on distance thresholds
5. Creates ParkingStatusLog entry with metadata
6. Updates ParkingSlot status in real-time

**Ultrasonic Sensor Features** (as documented in README):
- Dynamic range management (configurable min/max range)
- Threshold-based detection with hysteresis (prevents oscillation)
- Noise reduction via median filtering and smoothing windows
- Consecutive reading validation for status changes
- Auto-calibration using empty slot readings
- Comprehensive error handling and health monitoring
- Multiple payload format support

**Note**: While README mentions sensor API endpoints (`/api/sensors/nodes/{nodeId}/*`), verify implementation in codebase before use.

### Payment Integration & Flutter App Support

The system integrates with Cashfree payment gateway with special handling for Flutter mobile apps:

- Payment flow creates Cashfree order session
- Return URLs use deep linking scheme for Flutter app
- Webhook handling for payment status updates
- Subscription activation/renewal based on payment status
- Support for both web and mobile app payment flows

### Testing Strategy
Comprehensive test coverage via integration test scripts in project root:
- Authentication flows (signup, login, OTP verification, password reset)
- Email verification and OTP handling
- Subscription lifecycle and payment processing
- Unverified user edge cases and recovery flows
- Gateway and node management with hierarchy enforcement
- Parking slot operations and real-time status updates
- Webhook handling and payment callbacks
- Rate limiting and security features

All test scripts use direct HTTP requests and can be run with `node test-*.js`.
