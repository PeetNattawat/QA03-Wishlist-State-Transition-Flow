# Automation Testing — Playwright + TypeScript

Web UI automation for the **Wishlist → Cart** flow of a public demo store
(`storedemo.testdino.com`). Page Object Model, strict TypeScript, zero
credentials — the target app is credential-free.

---

## 1. Overview

| Area     | Choice                                                       |
| -------- | ------------------------------------------------------------- |
| Runner   | `@playwright/test` (auto-wait, trace viewer, HTML report)     |
| Language | TypeScript, `strict: true`                                    |
| Browser  | Chromium (the only project configured — see §5)               |
| Config   | `dotenv`, one file per environment (`config/<env>.env`)       |
| Quality  | ESLint (type-aware, `typescript-eslint` `strictTypeChecked`) + Prettier |
| CI       | GitHub Actions (`.github/workflows/playwright.yml`)           |

**Scope note:** the suite targets one public, read-only demo storefront —
there is no login, no API layer, and no multi-environment secret to manage.
`STORE_BASE_URL` is the only environment value the tests need, and since the
target is public it is safe to keep directly in the CI workflow rather than
behind a GitHub secret.

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

Create your local environment file (gitignored):

```bash
cp .env.example config/development.local.env
```

The only variable is:

| Variable         | Purpose                                                    |
| ---------------- | ----------------------------------------------------------- |
| `STORE_BASE_URL` | Base URL of the demo store (`https://storedemo.testdino.com`) |

`config/development.env` already ships this value as a non-secret default —
you only need `config/development.local.env` if you want to point at a
different instance. A missing variable fails loudly via
`utils/env.ts#requireEnv`; tests never silently fall back to a hard-coded URL.

---

## 4. Project structure

```
automation-testing/
├── tests/
│   └── e2e/wishlist/    wishlist-cart.spec.ts   (wishlist → cart flow, @smoke/@regression)
├── pages/               BasePage, ProductsPage, WishlistPage, CartPage
├── components/          Toast.ts                 (toast/notification assertions, reused across pages)
├── fixtures/            test.fixture.ts           (composes the Page Objects + cart-quantity helpers)
├── utils/               env, commonUtils, dataGenerator, dateUtils
├── test-data/           wishlist.json             (catalog fixture data — public, no secrets)
├── config/              development.env, staging.env, production.env   (gitignored)
├── reports/             html report                (gitignored)
├── screenshots/         ad-hoc captures            (gitignored)
├── test-results/        failure artifacts          (gitignored)
├── playwright.config.ts, tsconfig.json, eslint.config.js, .prettierrc
└── .github/workflows/playwright.yml
```

**Layering rules**

- `pages/` — locators, actions and page-scoped assertions. No test-case logic.
- `components/` — UI reused across pages (e.g. toast notifications).
- `tests/` — only `test.describe` / `test` / `test.step` calling Page Objects.
  **No locators and no URLs inside a spec.**
- `fixtures/` — composition only; not a DI framework.
- `utils/` — pure helpers (env access, data generation).

---

## 5. Running tests

```bash
npm test                    # all configured projects (chromium — see below)
npm run test:headed
npm run test:chromium
npm run test:smoke          # --grep @smoke
npm run test:regression     # --grep @regression
```

Switch environment without touching code:

```bash
TEST_ENV=staging npm test              # bash
$env:TEST_ENV='staging'; npm test      # PowerShell
```

`playwright.config.ts` also declares `firefox` and `webkit` projects
(`npm run test:firefox` / `test:webkit`) for local cross-browser checks, but
CI runs `chromium` only.

---

## 6. Debugging

```bash
npm run test:debug                                        # Playwright Inspector
npx playwright test --ui                                  # UI mode (watch + time travel)
npx playwright test tests/e2e/wishlist/wishlist-cart.spec.ts:15   # single test
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

## 8. Coding standard

| Item             | Convention              | Example                                   |
| ---------------- | ----------------------- | ------------------------------------------ |
| Page Object file | PascalCase              | `WishlistPage.ts`                          |
| Spec file        | kebab-case + `.spec.ts` | `wishlist-cart.spec.ts`                    |
| Function         | camelCase, verb first   | `expectRowSubtotal()`                      |
| Folder           | lowercase               | `pages/`, `test-data/`                     |
| Test name        | readable sentence       | `'User can move a wishlist product to the cart and update its quantity'` |

Locator priority: `getByRole` → `getByLabel` → `getByPlaceholder` →
`getByText` → `getByTestId` → CSS → (avoid XPath).

Tags: `@smoke`, `@critical`, `@regression`, `@ui`.
Every test maps to an Acceptance Criterion in the spec file's inline comments.

Before every commit:

```bash
npm run lint
npm run typecheck
npm run format
```

> `npm run lint` uses ESLint 10 flat config — the file globs live in
> `eslint.config.js`. `@typescript-eslint/restrict-template-expressions` is
> configured with `allowNumber: true` since quantities/prices are routinely
> interpolated into test-step labels.

---

## 9. CI/CD

`.github/workflows/playwright.yml` runs on push to `main`/`develop`, on PRs
and on manual dispatch: `npm ci` → `lint` + `typecheck` → `playwright install
--with-deps` → `playwright test --project=chromium`. The HTML report and
`test-results/` are uploaded as artifacts on every run.

`STORE_BASE_URL` is set directly in the workflow's `env:` block — it points at
a public, credential-free demo store, so it is intentionally **not** a GitHub
secret. If this suite is ever pointed at a real, non-public system under
test, move that value (and any credentials) into repository secrets before
merging.
