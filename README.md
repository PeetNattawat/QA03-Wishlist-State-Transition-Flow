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

| Tool          | Required                | Check                            |
| ------------- | ----------------------- | -------------------------------- |
| Node.js       | **>= 20** (`engines`)   | `node -v`                        |
| npm           | ships with Node         | `npm -v`                         |
| Git           | any recent version      | `git --version`                  |
| Disk          | ~500 MB for browsers    | —                                |

```bash
node -v          # >= 20
npm -v
git --version
```

The package manager is **npm** — the repo contains `package-lock.json` and CI
runs `npm ci`. Do not use yarn/pnpm; a second lockfile will drift from CI.

---

## 3. Getting started / Setup

### 3.1 Clone the repository

```bash
git clone https://github.com/PeetNattawat/QA03-Wishlist-State-Transition-Flow.git
cd QA03-Wishlist-State-Transition-Flow
```

Default branch is `main`.

> **Note on folder layout:** this Git repository's root **is** the automation
> suite itself (`package.json`, `playwright.config.ts` and `tests/` sit at the
> top level). A fresh clone therefore gives you a folder named
> `QA03-Wishlist-State-Transition-Flow`, and every command in this README runs
> from that folder. Inside Peet's Emma workspace the same content is checked
> out at `automation-testing/`, so there you run `cd automation-testing`
> instead — there is no extra nested sub-folder to descend into in either case.

Verify you are in the right place before continuing:

```bash
ls package.json playwright.config.ts tests
```

### 3.2 Quick start (recommended)

Two commands take a fresh clone to a runnable suite:

```bash
npm install
npm run setup
```

`npm run setup` (`scripts/setup.js`) performs §3.3 and §3.4 for you:

1. creates `config/<TEST_ENV>.env` from `.env.example` and fills in the
   non-secret default `STORE_BASE_URL=https://storedemo.testdino.com`;
2. installs the Playwright browser binaries (`npx playwright install`).

It is **safe to re-run**: an existing `config/<env>.env` is never overwritten,
it is reported as `[SKIP]` and your own values are preserved.

| Flag / variable          | Effect                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| `--chromium-only`        | Install only the browser CI uses. Faster, but plain `npm test` (which also runs firefox/webkit) will then fail — use `npm run test:chromium`. |
| `--with-deps`            | Also install the OS-level browser libraries. Required on most Linux/CI images. |
| `--skip-browsers`        | Only create the env file.                                                   |
| `TEST_ENV=staging`       | Create `config/staging.env` instead. No non-secret default exists for staging/production, so `STORE_BASE_URL` is left blank and the script warns you to fill it in. |

```bash
npm run setup -- --chromium-only        # note the "--" before script flags
npm run setup -- --with-deps            # Linux / CI
```

Verify with §3.5, or read on for what the script does by hand.

### 3.3 Manual alternative — install dependencies

```bash
npm install                     # dev deps (local development)
# or, for a reproducible lockfile-exact install (what CI does):
# npm ci

npx playwright install          # browser binaries — required, not installed by npm
```

- `npm install` only installs `@playwright/test`; the actual Chromium/Firefox/WebKit
  binaries come from `npx playwright install` and are cached outside the repo.
- On Linux/CI add the system libraries too: `npx playwright install --with-deps`.
- To save time and disk you can install just the browser CI uses:
  `npx playwright install chromium`.

### 3.4 Manual alternative — create your environment config

> Skip this section if you ran `npm run setup` — it is exactly what the script
> automates. Read it to understand what was generated, or when you need an
> environment other than `development`.

**Every file in `config/` is gitignored** (`.gitignore`: `config/*.env`,
`config/*.local.env`) — only `.env.example` is committed. Git cannot track an
empty directory either, so a fresh clone has **no `config/` folder at all** and
the tests have no `baseURL` until you create one. This step is mandatory, not
optional.

```bash
mkdir -p config                                 # bash / Git Bash
cp .env.example config/development.env

md config                                       # cmd
copy .env.example config\development.env

New-Item -ItemType Directory -Force config      # PowerShell
Copy-Item .env.example config\development.env
```

Then open `config/development.env` and fill in the value — `.env.example` ships
`STORE_BASE_URL` **blank** on purpose:

```dotenv
TEST_ENV=development
STORE_BASE_URL=https://storedemo.testdino.com
```

| Variable         | Required | Secret | Purpose                                                                                     |
| ---------------- | -------- | ------ | ------------------------------------------------------------------------------------------- |
| `STORE_BASE_URL` | ✅ yes   | no     | Base URL of the demo store. Public, credential-free instance: `https://storedemo.testdino.com` |
| `TEST_ENV`       | no       | no     | Which `config/<env>` pair to load. Defaults to `development` when unset.                     |

There are **no credentials** to configure: the system under test has no login,
no API layer and no tokens. If this suite is ever repointed at a real system,
put credentials in `config/<env>.local.env` (also gitignored) or CI secrets —
never in `config/<env>.env`, and never in source.

**Resolution order** (first value wins — `dotenv` never overwrites an
already-defined variable, see `playwright.config.ts`):

1. real process environment / CI secrets
2. `config/<TEST_ENV>.local.env` — local secrets
3. `config/<TEST_ENV>.env` — per-env, non-secret defaults

A missing or blank variable fails loudly via `utils/env.ts#requireEnv`; tests
never silently fall back to a hard-coded URL.

`config/staging.env` and `config/production.env` follow the same pattern but
ship `STORE_BASE_URL=` **empty** — fill them in only when you actually have a
staging/production target. (Production is read-only/smoke suites only.)

### 3.5 First run — verify the setup

Run the smoke test first; it is the fastest end-to-end proof that Node, the
browsers and the environment config are all wired correctly:

```bash
npm run test:smoke
```

Expected: **3 passed** — one `@smoke @critical` wishlist → cart journey, run
once per browser project (chromium + firefox + webkit). With
`npm run setup -- --chromium-only` you have only one browser installed, so use
`npm run test:smoke -- --project=chromium` instead (**1 passed**).

Then run the whole suite on the CI browser:

```bash
npm run test:chromium
```

Expected: **9 passed** (one spec file, `tests/e2e/wishlist/wishlist-cart.spec.ts`).
Plain `npm test` runs the same 9 tests across all three browser projects
(chromium + firefox + webkit = 27) — see §5.

Open the report to confirm reporting works:

```bash
npm run report
```

Finally, confirm the static-quality toolchain runs clean:

```bash
npm run typecheck && npm run lint
```

### 3.6 Setup troubleshooting

| Symptom                                                                    | Cause                                                                   | Fix                                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `Missing required environment variable "STORE_BASE_URL"`                    | `config/<env>.env` missing or the value is blank                        | Run `npm run setup` (or redo §3.4) — the file is gitignored, a clone never contains it |
| `npm run setup` reports `Could not resolve @playwright/test`                | `npm install` has not been run yet                                       | `npm install`, then `npm run setup`                                        |
| `npm run setup` says `[SKIP] … already exists` but the value is still wrong | The script never overwrites your file, by design                        | Edit `config/<env>.env` by hand, or delete it and re-run `npm run setup`   |
| Every test fails on navigation / `page.goto: Invalid URL`                   | `baseURL` is `undefined` because `STORE_BASE_URL` never loaded          | Check the filename matches `TEST_ENV` exactly (`development.env`, not `.env`) |
| `browserType.launch: Executable doesn't exist`                              | `npx playwright install` was skipped                                     | `npx playwright install` (`--with-deps` on Linux)                          |
| `npm error engine … required: { node: '>=20' }`                             | Node too old                                                             | Install Node 20 LTS or newer                                               |
| Tests pass locally but fail in CI                                           | CI uses `TEST_ENV: staging` with `STORE_BASE_URL` from the workflow `env:` | See §9 — keep the workflow value in sync                                   |
| `eslint . --ext .ts` style command errors                                   | ESLint 10 is flat-config only                                            | Use `npm run lint`; globs live in `eslint.config.js`                       |

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
├── scripts/             setup.js                  (npm run setup — env file + browsers)
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
