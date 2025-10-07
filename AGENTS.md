# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`, split by layer: `controllers/` handle HTTP, `services/` host business logic, `repositories/` wrap TypeORM data access, and `routes/` wire Express routers. Shared helpers sit in `utils/`, validation schemas in `validation/`, and custom types in `types/`. Database bootstrap and migrations are under `database/` and `data-source.ts`. Scripts that seed or provision accounts live in `src/scripts/`. Tests are in `tests/` with integration-style suites such as `auth.test.ts`. Build artifacts output to `dist/`; keep it untracked.

## Build, Test, and Development Commands
Use `npm install` once per environment. `npm run dev` starts Nodemon against `src/index.ts` for hot reload. `npm run build` compiles TypeScript into `dist/`, and `npm start` runs the compiled server. Database workflows rely on TypeORM CLI: `npm run migration:generate -- src/migrations/<name>` to scaffold, `npm run migration:run` to apply, and `npm run migration:revert` to roll back (all load `src/data-source.ts`). Seeder helpers include `npm run seed:plans` and `npm run create:superadmin`. Keep `.env` based on `env.example` when running anything locally.

## Coding Style & Naming Conventions
The codebase is TypeScript-first with strict module resolution via `tsconfig.json`. Default to two-space indentation and single quotes. Use `camelCase` for variables/functions, `PascalCase` for classes/entities, and `UPPER_SNAKE_CASE` for environment constants. Before pushing, run `npm run lint` (ESLint flat config in `eslint.config.js`) and prefer `npm run lint:fix` to auto-resolve safe issues. Include short comments only when clarifying non-obvious logic or domain rules.

## Testing Guidelines
Tests use Jest with Supertest helpers. Name files `*.test.ts` and co-locate longer-lived fixtures under `tests/fixtures/` if new data is needed. Run `npm test` for the full suite, `npm run test:watch` during development, and `npm run test:coverage` before pull requests when you add features touching critical flows. Add integration coverage for new endpoints and update snapshot expectations when routes change.

## Commit & Pull Request Guidelines
Commit messages trend toward short, imperative summaries (e.g., “Add subscription plan seeding”). Group related changes per commit and include migrations or seed updates alongside code that depends on them. Pull requests should link relevant Linear/Jira ticket or GitHub issue, explain the change in 2–3 sentences, list migrations or env updates, and attach screenshots for API contract docs or admin UI responses when applicable. Request review from backend maintainers and ensure CI (lint + tests) passes before marking ready.
