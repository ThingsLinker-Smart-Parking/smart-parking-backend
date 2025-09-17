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
- `node test-email.js` - Test email service functionality
- `node test-ultrasonic-sensors.js` - Test ultrasonic sensor system

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
- **Documentation**: Swagger/OpenAPI at `/api-docs`

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
- `Payment` - Payment transaction records

### Authentication Flow
1. User registration creates unverified account
2. OTP sent via email for verification
3. JWT tokens issued after verification
4. Role-based access control (user/admin/super-admin)
5. Password reset uses OTP verification

### API Structure
- `/api/auth/*` - Authentication endpoints
- `/api/parking-lots/*` - Parking management
- `/api/subscriptions/*` - Subscription management
- `/api/health` - Health check
- `/api-docs` - Interactive Swagger documentation

### Environment Configuration
Key environment variables in `.env`:
- Database: `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- JWT: `JWT_SECRET`
- Email: `SMTP_HOST`, `EMAIL`, `EMAIL_PASSWORD`
- MQTT: `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`

### Development Notes
- TypeORM synchronization is enabled in development (`NODE_ENV !== 'production'`)
- Email service logs to console in development mode
- CORS configured for local development origins
- All entities exported from `src/models/index.ts`
- Swagger UI available at root (`/`) and `/api-docs`
- ESLint and TypeScript strict mode enabled for code quality
- Jest configured for unit and integration testing
- Rate limiting and security middleware enabled by default

### Code Quality & Standards
- **TypeScript**: Strict type checking enabled
- **Linting**: ESLint with TypeScript parser configured
- **Testing**: Jest with supertest for API testing
- **Security**: Helmet, CORS, rate limiting, input validation
- **Error Handling**: Centralized error handling middleware
- **Logging**: Winston logger with structured logging

### Testing Strategy
The project includes comprehensive test scripts covering:
- Complete authentication flows
- Email verification and OTP handling
- Subscription and payment processing
- Unverified user edge cases
- Rate limiting and security features