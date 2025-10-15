# Repository Guidelines

## Project Structure & Module Organization
Application code lives in `src/`. `controllers/` expose HTTP handlers, `services/` hold parking and billing rules, `repositories/` wrap the TypeORM entities, and `routes/` compose Express routers. Shared helpers sit in `utils/`, schema guards in `validation/`, and reusable types in `types/`. Database bootstrapping runs through `src/data-source.ts`, while migrations and SQL assets live in `src/database/`. Operational scripts are in `src/scripts/`, and Jest integration suites live under `tests/`. Build artefacts compile to `dist/` and should stay uncommitted.

## Build, Test, and Development Commands
Run `npm install` once per environment. Use `npm run dev` for hot reloading `src/index.ts`, `npm run build` to emit compiled JavaScript into `dist/`, and `npm start` to launch the built server. Manage database state via `npm run migration:generate -- src/migrations/<name>`, `npm run migration:run`, and `npm run migration:revert`. Seed helpers such as `npm run seed:plans` and `npm run create:superadmin` are safe to run against local databases. Always lint with `npm run lint` or `npm run lint:fix` before requesting review.

## Coding Style & Naming Conventions
Write TypeScript with two-space indentation and single quotes. Use `camelCase` for variables/functions, `PascalCase` for classes and TypeORM entities, and `UPPER_SNAKE_CASE` for environment constants. Stick to root-relative imports configured in `tsconfig.json`. Keep comments for domain-specific logic; avoid narrating straightforward code. Run `npm run lint:fix` to autoformat.

## Testing Guidelines
The suite uses Jest with Supertest. Name specs `*.test.ts`, placing larger fixtures in `tests/fixtures/`. Use `npm test` for a full run, `npm run test:watch` while developing, and `npm run test:coverage` when altering auth, billing, or parking allocation flows. Update snapshots or HTTP contract fixtures within the same change set.

## Commit & Pull Request Guidelines
Write small, focused commits with imperative titles such as "Add subscription plan seeding". Include related migrations or seed files alongside code updates. Pull requests should link the Linear/Jira issue, summarize behavior changes, call out env or migration impacts, and attach API contract evidence when routes change. Confirm lint, tests, and migrations succeed before requesting review.

## Security & Configuration Tips
Base new environments on `env.example` and rotate credentials outside source control. Keep RSA keys, MQTT secrets, and third-party tokens out of Git history. Review `src/scripts/` output before targeting non-development databases, and double-check `data-source.ts` points to the expected deployment.
