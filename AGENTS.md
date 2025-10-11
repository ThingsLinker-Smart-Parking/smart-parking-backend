# Repository Guidelines

## Project Structure & Module Organization
Application code lives in `src/`. `controllers/` expose HTTP handlers, `services/` keep business rules, `repositories/` wrap TypeORM entities, and `routes/` bind Express routers. Shared helpers sit in `utils/`, schema guards in `validation/`, and shared types in `types/`. Database bootstrapping relies on `src/data-source.ts`, with migrations and SQL assets under `src/database/`. Seeding and operational scripts are grouped in `src/scripts/`. Integration-style tests live in `tests/`; expect suites like `auth.test.ts`. Transpiled artifacts land in `dist/` and should remain ignored.

## Build, Test, and Development Commands
Run `npm install` once per environment. Use `npm run dev` for hot-reload on `src/index.ts`, `npm run build` to emit TypeScript to `dist/`, and `npm start` to execute the compiled server. Database flows rely on TypeORM CLI shorthands: `npm run migration:generate -- src/migrations/<name>`, `npm run migration:run`, and `npm run migration:revert`. Administrative helpers include `npm run seed:plans` and `npm run create:superadmin`. Prefer `npm run lint` or `npm run lint:fix` before opening a pull request.

## Coding Style & Naming Conventions
Stick to TypeScript with two-space indentation and single quotes. Use `camelCase` for variables and functions, `PascalCase` for classes/entities, and `UPPER_SNAKE_CASE` for environment constants. Guard imports via the root `tsconfig.json`; avoid relative path churn. Add comments only where logic is non-obvious or encodes domain rules.

## Testing Guidelines
Jest with Supertest backs the suite. Name files `*.test.ts` and place fixtures under `tests/fixtures/` when they outgrow inline mocks. Run `npm test` for CI parity, `npm run test:watch` during development, and `npm run test:coverage` when altering auth, billing, or parking allocation flows. Update snapshots or HTTP contract fixtures as part of the same change.

## Commit & Pull Request Guidelines
Keep commits small, scoped, and titled with imperative phrases such as "Add subscription plan seeding". Include related migrations or seed updates in the same commit. Pull requests should link the Linear/Jira issue, summarize behavior changes in a couple of sentences, list any env or migration impacts, and attach API contract screenshots when routes change. Ensure lint, tests, and migrations succeed before requesting review.

## Security & Configuration Tips
Copy `.env` from `env.example` and rotate credentials outside source control. Keep RSA keys, MQTT secrets, and third-party tokens in the environment, not in Git. Review `src/scripts/` outputs before running against non-development databases, and double-check `data-source.ts` points at the intended deployment.
