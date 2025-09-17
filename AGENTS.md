# Repository Guidelines

## Project Structure & Module Organization
Runtime code lives in `src/`. `index.ts` boots Express, while `app.ts` assembles middleware and routes. Business logic is grouped into `controllers`, `services`, `repositories`, and HTTP definitions under `routes`. Data access is configured via `src/data-source.ts` and the supporting files in `src/database`. Shared helpers reside in `config/`, `utils/`, `types/`, and `validation/`. Compiled output lands in `dist/`. Repository-level scripts named `test-*.js` and `*.sh` provide manual regression coverage.

## Build, Test, and Development Commands
- `npm install`: install project dependencies.
- `npm run dev`: launch the TypeScript server with hot reloading; requires a prepared `.env`.
- `npm run build`: emit the production bundle into `dist/`.
- `npm start`: run the compiled server from `dist/`.
- `npm run seed:plans`: populate core parking plans for integration scenarios.
- `npm run create:superadmin`: create the initial administrative account.
- `node test-gateway-apis.js`: execute gateway integration checks once the API is running.

## Coding Style & Naming Conventions
Use TypeScript with two-space indentation. Keep imports aligned with path aliases defined in `tsconfig.json`. Prefer async/await over callbacks, and contain domain-specific behavior within services. Name classes in PascalCase, variables and functions in camelCase, and constants in UPPER_SNAKE_CASE. Co-locate DTOs and Joi schemas under `src/validation`. When logging, route sensitive payloads through the `loggerService` redaction helpers.

## Testing Guidelines
This codebase relies on targeted integration scripts rather than Jest. Start the server, ensure Postgres, Redis, and MQTT endpoints are reachable, and run the relevant `node test-*.js` script. When adding scenarios, clone an existing script, describe required seed data at the top, and print clear pass/fail summaries. Keep fixtures deterministic so automation can run unattended.

## Commit & Pull Request Guidelines
Follow Conventional Commits (e.g., `feat: add parking reservation window`). Each pull request should outline behavioral changes, impacted endpoints or scripts, linked tracking issues, and environment or migration notes. Attach curl outputs or log excerpts when they clarify API adjustments.

## Security & Configuration Tips
Copy `env.example` to `.env`, fill in credentials locally, and keep secrets out of version control. Expose new configuration defaults in `src/config` and enforce validation through matching Joi schemas in `src/validation` to catch misconfiguration during startup. Use the redaction utilities whenever logging user-identifiable fields.
