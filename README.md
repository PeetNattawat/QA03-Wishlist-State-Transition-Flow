# Automation Testing — Playwright + TypeScript

Web UI **and** API automation framework for the QA team, built to
`qa/guidelines/playwright-automation-setup.md`.
Page Object Model, multi-environment, zero credentials in source control.

---

## 1. Overview

| Area     | Choice                                                               |
| -------- | -------------------------------------------------------------------- |
| Runner   | `@playwright/test` (auto-wait, trace viewer, HTML report)            |
| Language | TypeScript, `strict: true` (+ `noUnusedLocals`, `noImplicitReturns`) |
| Browsers | Chromium, Firefox, WebKit                                            |
| Config   | `dotenv`, one file per environment, CI secrets in CI                 |
| Quality  | ESLint (type-aware, `typescript-eslint` strict) + Prettier           |
| Auth     | `storageState` session reuse via a Playwright _setup project_        |
| CI       | GitHub Actions (`.github/workflows/playwright.yml`)                  |

**Assumptions**

- The real system under test is not available yet. To keep the framework
  _provably runnable_ (not an empty skeleton), the sample suites target public
  demo endpoints: `https://the-internet.herokuapp.com` (UI) and
  `https://jsonplaceholder.typicode.com` (API). Point `BASE_URL` / `API_URL` at
  the real system and only the locators inside `pages/` need to change.
- Node.js 20+ is installed (verified on Node 24).

---

## 2. Prerequisites

```bash
node -v          # >= 20
npm -v
```

## 3. Install

```bash
npm install
npx playwright install          # browser binaries (add --with-deps on Linux/CI)
```

Create your environment files (both are gitignored):

```bash
cp .env.example config/development.env         # non-secret defaults (URLs)
cp .env.example config/development.local.env   # secrets (credentials, tokens)
```

Fill in at least:

| Variable                                          | Purpose                                    |
| ------------------------------------------------- | ------------------------------------------ |
| `BASE_URL`                                        | Web app under test                         |
| `API_URL`                                         | API under test                             |
| `TEST_USERNAME` / `TEST_PASSWORD`                 | Valid account (login suite + global setup) |
| `TEST_INVALID_USERNAME` / `TEST_INVALID_PASSWORD` | Negative login cases                       |
| `TEST_LOCKED_*`, `TEST_ADMIN_*`                   | Optional — their tests skip when unset     |
| `API_TOKEN`                                       | Optional bearer token for API calls        |

> **Never commit a real value.** Only `.env.example` is tracked; `.env*`,
> `config/*.env` and `auth/*.json` are gitignored. A missing variable fails
> loudly via `utils/env.ts#requireEnv` — tests never silently fall back.

---

## 4. Project structure

```
automation-testing/
├── tests/
│   ├── auth/        login.spec.ts, logout.spec.ts     (unauthenticated UI)
│   ├── user/        user.spec.ts                      (authenticated UI, storageState)
│   └── api/         user-api.spec.ts                  (API only, no browser)
├── pages/           BasePage.ts, LoginPage.ts, HomePage.ts
├── components/      Header.ts                         (UI reused across pages)
├── fixtures/        test.fixture.ts                   (composes POM + API client)
├── utils/           apiClient, env, testUsers, dataGenerator, dateUtils, commonUtils
├── test-data/       users.json (env-var references only), testData.json
├── config/          development.env, staging.env, production.env  (gitignored)
├── auth/            storageState.json                 (generated, gitignored)
├── playwright/      global.setup.ts                   (login once → storageState)
├── reports/         html report                       (gitignored)
├── screenshots/     ad-hoc captures                   (gitignored)
├── test-results/    failure artifacts                 (gitignored)
├── playwright.config.ts, tsconfig.json, eslint.config.js, .prettierrc
└── .github/workflows/playwright.yml
```

**Layering rules**

- `pages/` — locators, actions and page-scoped assertions. No test-case logic.
- `components/` — UI reused across pages (header, sidebar, modal).
- `tests/` — only `test.describe` / `test` / `test.step` calling Page Objects.
  **No locators and no URLs inside a spec.**
- `fixtures/` — composition only; not a DI framework.
- `utils/` — pure helpers (env access, data generation, API client).

---

## 5. Running tests

```bash
npm test                    # every project (setup, chromium, firefox, webkit, authenticated, api)
npm run test:headed
npm run test:chromium
npm run test:firefox
npm run test:webkit
npm run test:api            # API project only
npm run test:smoke          # --grep @smoke
npm run test:regression     # --grep @regression
```

Switch environment without touching code:

```bash
TEST_ENV=staging npm test              # bash
$env:TEST_ENV='staging'; npm test      # PowerShell
```

Playwright projects:

| Project                           | Contains                     | Session                                              |
| --------------------------------- | ---------------------------- | ---------------------------------------------------- |
| `setup`                           | `playwright/global.setup.ts` | logs in, writes `auth/storageState.json`             |
| `chromium` / `firefox` / `webkit` | `tests/auth/**`              | forced clean session (login must start logged out)   |
| `authenticated`                   | `tests/user/**`              | reuses `auth/storageState.json` (depends on `setup`) |
| `api`                             | `tests/api/**`               | no browser                                           |

---

## 6. Debugging

```bash
npm run test:debug                                  # Playwright Inspector
npx playwright test --ui                            # UI mode (watch + time travel)
npx playwright test tests/auth/login.spec.ts:17     # single test
npx playwright show-trace test-results/<dir>/trace.zip
```

On failure the config captures automatically: **screenshot**
(`only-on-failure`), **video** (`retain-on-failure`) and **trace**
(`retain-on-failure`) into `test-results/<test-dir>/`.

`waitForTimeout()` is banned by ESLint — use web-first `expect()` assertions.

---

## 7. Reporting

```bash
npm run report        # serves reports/html
```

The HTML report shows passed/failed/skipped, duration, every `test.step`, and
the attached screenshot / video / trace per failure.

---

## 8. API testing

`utils/apiClient.ts` wraps `APIRequestContext` (`get/post/put/patch/delete`,
`raw()` escape hatch, `dispose()`), and is exposed as the `apiClient` fixture
initialised from `API_URL` + optional `API_TOKEN`.

Every API test asserts at least: status code, content type, payload schema
(`utils/commonUtils.ts#missingKeys`), and — where relevant — response time
budget and negative/404 behaviour. Request bodies use
`utils/dataGenerator.ts` so nothing unique is hard-coded.

---

## 9. Authentication & session reuse

1. `setup` project runs `playwright/global.setup.ts`, logging in through the
   real UI with `TEST_USERNAME` / `TEST_PASSWORD`.
2. It writes `auth/storageState.json`.
3. The `authenticated` project consumes that state, so `tests/user/**` never
   logs in again.
4. The state file is regenerated on every run and **must not be cached across
   CI pipelines**. Authenticated specs must never log out — the server-side
   session is shared by the whole project.

> Deviation from the blueprint: implemented as a Playwright _setup project_
> (`dependencies: ['setup']`) rather than the legacy `globalSetup` hook, so the
> login appears in the HTML report and can fail the run visibly.

---

## 10. Coding standard

| Item             | Convention              | Example                                   |
| ---------------- | ----------------------- | ----------------------------------------- |
| Page Object file | PascalCase              | `LoginPage.ts`                            |
| Spec file        | kebab-case + `.spec.ts` | `user-api.spec.ts`                        |
| Function         | camelCase, verb first   | `expectErrorVisible()`                    |
| Folder           | lowercase               | `pages/`, `test-data/`                    |
| Test name        | readable sentence       | `'User can login with valid credentials'` |

Locator priority: `getByRole` → `getByLabel` → `getByPlaceholder` →
`getByText` → `getByTestId` → CSS → (avoid XPath). Ask developers for
`data-testid` where a locator is unstable.

Tags: `@smoke`, `@regression`, `@critical`, `@api`, `@ui`.
Every test maps to an Acceptance Criterion in the file's header comment.

Before every commit:

```bash
npm run lint
npm run typecheck
npm run format
```

> `npm run lint` uses ESLint 10 flat config — the blueprint's `--ext .ts` flag no
> longer exists; the file globs live in `eslint.config.js`.

---

## 11. CI/CD

`.github/workflows/playwright.yml` runs on push to `main`/`develop`, on PRs and
on manual dispatch: `npm ci` → `lint` + `typecheck` → `playwright install
--with-deps` → tests, sharded by project (`chromium`, `authenticated`, `api`).
The HTML report and `test-results/` are uploaded as artifacts on every run.

All URLs and credentials come from GitHub repository secrets
(`STAGING_BASE_URL`, `STAGING_API_URL`, `STAGING_TEST_USERNAME`,
`STAGING_TEST_PASSWORD`, `STAGING_TEST_INVALID_USERNAME`,
`STAGING_TEST_INVALID_PASSWORD`, `STAGING_API_TOKEN`) — nothing is hard-coded
in the workflow.
