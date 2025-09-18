# Repository Guidelines

## Project Structure & Module Organization
Runtime code lives in `src/`, with `index.ts` bootstrapping Express and `app.ts` wiring middleware plus routes. Group HTTP behavior under `src/controllers`, `src/services`, `src/repositories`, and `src/routes`; database access is configured via `src/data-source.ts` and helpers in `src/database`. Shared utilities sit in `config/`, `utils/`, `types/`, and `validation/`. Build artifacts belong in `dist/`, while integration scripts such as `test-gateway-apis.js` and shell utilities stay at the repo root.

## Build, Test, and Development Commands
Run `npm install` to sync dependencies. Use `npm run dev` for the hot-reload TypeScript server (expects a populated `.env`). Ship production bundles with `npm run build`, then launch them through `npm start`. Populate baseline records via `npm run seed:plans`, and create an admin with `npm run create:superadmin` once the database is reachable.

## Coding Style & Naming Conventions
Write TypeScript with two-space indentation and favor async/await. Keep imports aligned with path aliases defined in `tsconfig.json`. Name files and symbols by domain: PascalCase for classes, camelCase for variables and functions, and UPPER_SNAKE_CASE for constants. Co-locate DTOs and Joi schemas under `src/validation`, and route sensitive logging through `loggerService` redaction helpers.

## Testing Guidelines
Testing is script-driven. Start the API, ensure Postgres, Redis, and MQTT are online, then run integrations like `node test-gateway-apis.js`. Clone existing scripts for new scenarios, document required seed data at the top, and print clear pass/fail summaries so CI can parse results. Keep fixtures deterministic and avoid external side effects.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits, e.g. `feat: add parking reservation window`. For pull requests, outline behavior changes, list affected endpoints or scripts, link tracking issues, and call out environment or migration needs. Include curl excerpts or logs when they clarify API adjustments and note any follow-up testing that reviewers should perform.

## Security & Configuration Tips
Copy `env.example` to `.env` and keep secrets out of Git. Surface new defaults in `src/config` and validate them with matching Joi schemas under `src/validation` to fail fast on misconfiguration. Always use the redaction utilities before logging user-identifiable data.
