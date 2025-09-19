# Gemini Project Context

This document provides a comprehensive overview of the Smart Parking Backend project, intended to be used as a context for the Gemini AI assistant.

## Project Overview

This is a Node.js and TypeScript backend for a smart parking management system. It utilizes LoRa technology and IoT sensors for real-time parking slot monitoring. The system is built with a modular architecture, featuring a robust authentication system, multi-tenant parking management, and a subscription-based billing model.

### Key Technologies

*   **Backend:** Node.js, Express.js, TypeScript
*   **Database:** PostgreSQL with TypeORM
*   **Authentication:** JWT (JSON Web Tokens)
*   **Real-time Communication:** MQTT for IoT device integration (ChirpStack)
*   **API Documentation:** Swagger (OpenAPI)
*   **Testing:** Jest, Supertest
*   **Payments:** Cashfree integration for subscriptions

### Architecture

The application follows a standard layered architecture:

1.  **Routes:** Define the API endpoints and handle incoming requests.
2.  **Controllers:** Contain the business logic for each route.
3.  **Services:** Encapsulate reusable business logic and interact with external services (e.g., MQTT, Email, Payments).
4.  **Models:** Define the database schema using TypeORM entities.
5.  **Middleware:** Provides functionalities like authentication, error handling, and logging.

## Building and Running

### Prerequisites

*   Node.js 18+
*   PostgreSQL 12+
*   npm or yarn

### Installation and Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Configure environment variables:**
    Create a `.env` file by copying `.env.example` and fill in the required values for the database, JWT secret, email service, and other configurations.

3.  **Run database migrations:**
    ```bash
    npm run migration:run
    ```

### Running the Application

*   **Development:**
    ```bash
    npm run dev
    ```
    This command starts the server in development mode with hot-reloading using `nodemon`.

*   **Production:**
    ```bash
    npm run build
    npm start
    ```
    This first compiles the TypeScript code to JavaScript and then starts the server.

### Testing

*   **Run all tests:**
    ```bash
    npm test
    ```

*   **Run tests in watch mode:**
    ```bash
    npm run test:watch
    ```

*   **Generate test coverage report:**
    ```bash
    npm run test:coverage
    ```

## Development Conventions

### Coding Style

*   The project follows the standard TypeScript and ESLint conventions.
*   Use `npm run lint` to check for linting errors and `npm run lint:fix` to automatically fix them.

### Commits

*   Commit messages should be clear and concise, describing the changes made.

### API Documentation

*   The API is documented using Swagger.
*   When adding new routes or modifying existing ones, update the Swagger annotations in the corresponding route files.
*   The Swagger documentation is available at `/api-docs` when the server is running.

### Database

*   Database schema changes are managed through TypeORM migrations.
*   To generate a new migration, use the `npm run migration:generate -- -n <MigrationName>` command.
*   To apply migrations, use `npm run migration:run`.
*   To revert a migration, use `npm run migration:revert`.

### Environment Variables

*   All environment variables are managed in the `src/config/environment.ts` file.
*   Do not commit the `.env` file to the repository. Use `.env.example` as a template.
