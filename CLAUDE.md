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
- `npm run migration:generate` - Generate new migration from entity changes
- `npm run migration:run` - Run pending migrations
- `npm run migration:revert` - Revert last migration
- `npm run schema:sync` - Sync database schema (development only)

### Testing & Quality Assurance
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Run ESLint with automatic fixes
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

### Development Setup
1. Copy `env.example` to `.env` and configure
2. Ensure PostgreSQL database exists
3. Run `npm run dev` to start with auto-sync enabled

## Architecture Overview

### Core Stack
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with OTP email verification
- **IoT Integration**: MQTT service for LoRa sensors
- **Payment Gateway**: Cashfree integration with Flutter app support
- **Documentation**: Swagger/OpenAPI at `/api-docs`
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
├── middleware/         # Auth middleware
├── config/             # Swagger configuration
└── scripts/            # Database seeding scripts
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

### Database Schema
The system uses TypeORM with automatic schema synchronization in development. Key entities:

**Core Entities**:
- `User` - Authentication and user management
- `ParkingLot` - Top-level parking facilities
- `Floor` - Multi-level parking support
- `ParkingSlot` - Individual parking spaces
- `Node` - IoT sensor devices
- `Gateway` - LoRa network gateways
- `ParkingStatusLog` - Real-time parking status tracking

**Subscription System**:
- `SubscriptionPlan` - Predefined pricing tiers with features
- `Subscription` - User's active subscription with billing cycles
- `Payment` - Payment transaction records with Cashfree integration
- `PasswordResetToken` - Secure password reset token management

### Authentication Flow
1. User registration creates unverified account
2. OTP sent via email for verification
3. JWT tokens issued after verification
4. Role-based access control (user/admin/super-admin)
5. Password reset uses OTP verification

### API Structure
- `/api/auth/*` - Authentication endpoints
- `/api/parking-lots/*` - Parking lot management
- `/api/floors/*` - Floor management within parking lots
- `/api/parking-slots/*` - Individual parking slot management
- `/api/nodes/*` - IoT sensor node management
- `/api/gateways/*` - LoRa gateway management
- `/api/parking/*` - Real-time parking status and operations
- `/api/subscriptions/*` - User subscription management
- `/api/subscription-plans/*` - Subscription plan management
- `/api/health` - System health monitoring
- `/api-docs` - Interactive Swagger documentation
- `/payments/cashfree/return` - Payment gateway callback handler

### Environment Configuration
Key environment variables in `.env`:
- Database: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- Database Pool: `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_IDLE_TIMEOUT`, `DB_CONNECTION_TIMEOUT`
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`
- Email: `SMTP_HOST`, `SMTP_PORT`, `EMAIL`, `EMAIL_PASSWORD`, `EMAIL_FROM_NAME`
- MQTT: `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_CLIENT_ID`
- Payment: Cashfree integration variables
- Security: Rate limiting, CORS, session configuration
- Logging: `LOG_LEVEL`, `ENABLE_FILE_LOGGING`
- API: `API_VERSION`, `BASE_URL`, `FLUTTER_APP_SCHEME`

### Development Notes
- TypeORM synchronization is disabled by default (set `synchronize: false` in data-source.ts)
- Database migrations managed via TypeORM CLI commands
- Email service logs to console in development mode
- CORS configured for local development origins
- All entities exported from `src/models/index.ts`
- Swagger UI available at root (`/`) and `/api-docs`
- ESLint and TypeScript strict mode enabled for code quality
- Jest configured for unit and integration testing
- Rate limiting and security middleware enabled by default
- API versioning supported (default v1, legacy routes for backward compatibility)
- Comprehensive payment flow handling with Flutter app deep linking

### Code Quality & Standards
- **TypeScript**: Strict type checking enabled
- **Linting**: ESLint with TypeScript parser configured
- **Testing**: Jest with supertest for API testing
- **Security**: Helmet, CORS, rate limiting, input validation
- **Error Handling**: Centralized error handling middleware
- **Logging**: Winston logger with structured logging

### Testing Strategy
The project includes comprehensive test scripts covering:
- Complete authentication flows (`test-auth.js`)
- Email verification and OTP handling (`test-email.js`)
- Subscription and payment processing (`test-subscription.js`, `test-pricing-demo.js`)
- Unverified user edge cases (`test-unverified-user.js`)
- Gateway management and IoT integration (`test-gateway-apis.js`)
- Node management with hierarchy enforcement (`test-simple-node-api.js`)
- Webhook handling (`test-webhook.js`)
- Rate limiting and security features

All test scripts are located in project root and can be run with Node.js directly.