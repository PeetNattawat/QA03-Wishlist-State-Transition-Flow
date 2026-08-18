# Automation Testing — Playwright + TypeScript

Web UI automation for the **Wishlist → Cart** flow of the public demo store
`storedemo.testdino.com`. Page Object Model, strict TypeScript, no credentials
(the target app has no login).

---

## 1. Overview

| Area     | Choice                                                  |
| -------- | ------------------------------------------------------- |
| Runner   | `@playwright/test`                                      |
| Language | TypeScript (`strict: true`)                             |
| Browsers | chromium, firefox, webkit — **CI runs chromium only**   |
| Config   | `dotenv`, one file per environment (`config/<env>.env`) |
| Quality  | ESLint (type-aware) + Prettier                          |
| CI       | GitHub Actions (`.github/workflows/playwright.yml`)     |

`STORE_BASE_URL` is the only variable the tests need. The target is public, so
it is not a secret.

---

## 2. Prerequisites

- **Node.js >= 20** (`node -v`) — enforced by `engines`
- **npm** (`npm -v`) — the repo has `package-lock.json` and CI runs `npm ci`.
  Do not use yarn/pnpm.
- ~500 MB free disk for browser binaries

---

## 3. Setup

### 3.1 Quick start

```bash
npm install
npm run setup
```

`npm run setup` (`scripts/setup.js`) does two things:

1. creates `config/development.env` with `STORE_BASE_URL=https://storedemo.testdino.com`
2. installs the Playwright browser binaries

Safe to re-run — an existing config file is reported `[SKIP]` and never
overwritten.

Optional flags (note the `--` before script flags):

```bash
npm run setup -- --chromium-only     # only the browser CI uses (faster)
npm run setup -- --with-deps         # also install OS libs (Linux / CI)
npm run setup -- --skip-browsers     # env file only
TEST_ENV=staging npm run setup       # create config/staging.env instead
```

Only `development` has a built-in default URL; for staging/production the
script leaves `STORE_BASE_URL` blank for you to fill in.

### 3.2 Verify it worked

```bash
npm run test:smoke      # expect 3 passed (1 smoke test x 3 browsers)
npm run test:chromium   # expect 9 passed
npm run report          # open the HTML report
```

With `--chromium-only`, use `npm run test:smoke -- --project=chromium`
(1 passed).

### 3.3 Manual fallback (if you skip `npm run setup`)

```bash
npm install
npx playwright install                # browsers; add --with-deps on Linux
mkdir -p config                       # PowerShell: New-Item -ItemType Directory -Force config
cp .env.example config/development.env
```

Then fill in `config/development.env`:

```dotenv
TEST_ENV=development
STORE_BASE_URL=https://storedemo.testdino.com
```

Notes:

- All of `config/*.env` is gitignored, so a fresh clone has **no `config/`
  folder at all** — creating it is mandatory.
- Load order, first value wins: real env / CI → `config/<env>.local.env`
  (secrets) → `config/<env>.env`.
- A missing or blank variable fails loudly via `utils/env.ts#requireEnv` —
  no silent fallback URL.

### 3.4 Troubleshooting

| Symptom                                                  | Fix                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Missing required environment variable "STORE_BASE_URL"` | Run `npm run setup`, or check the filename matches `TEST_ENV` (`development.env`, not `.env`) |
| `browserType.launch: Executable doesn't exist`           | `npx playwright install` (`--with-deps` on Linux)                                             |
| `Could not resolve @playwright/test` during setup        | Run `npm install` first                                                                       |
| Setup says `[SKIP]` but the value is wrong               | Edit `config/<env>.env` by hand, or delete it and re-run                                      |
| `npm error engine … node: '>=20'`                        | Install Node 20 LTS or newer                                                                  |

---

## 4. Project structure

```
tests/e2e/wishlist/   wishlist-cart.spec.ts  (@smoke / @regression)
pages/                BasePage, ProductsPage, WishlistPage, CartPage
components/           Toast.ts               (shared UI assertions)
fixtures/             test.fixture.ts        (composes the Page Objects)
utils/                env, commonUtils, dataGenerator, dateUtils
scripts/setup.js      npm run setup
test-data/            wishlist.json          (public fixture data)
config/               <env>.env              (gitignored)
reports/ screenshots/ test-results/          (gitignored)
playwright.config.ts, tsconfig.json, eslint.config.js, .prettierrc
.github/workflows/playwright.yml
```

**Layering rules**

- `pages/` — locators, actions, page-scoped assertions. No test-case logic.
- `tests/` — only `test.describe` / `test` / `test.step` calling Page Objects.
  **No locators, no URLs in a spec.**
- `components/` — UI reused across pages. `fixtures/` — composition only.
  `utils/` — pure helpers.

---

## 5. Running tests

```bash
npm test                 # all browser projects
npm run test:chromium    # or test:firefox / test:webkit
npm run test:headed
npm run test:smoke       # --grep @smoke
npm run test:regression  # --grep @regression
```

Switch environment without touching code:

```bash
TEST_ENV=staging npm test           # bash
$env:TEST_ENV='staging'; npm test   # PowerShell
```

---

## 6. Debugging

```bash
npm run test:debug                                       # Inspector
npx playwright test --ui                                 # UI mode
npx playwright test tests/e2e/wishlist/wishlist-cart.spec.ts:15
npx playwright show-trace test-results/<dir>/trace.zip
```

On failure the config auto-captures screenshot, video and trace into
`test-results/<test-dir>/`. `waitForTimeout()` is banned by ESLint — use
web-first `expect()` assertions.

---

## 7. Reporting

```bash
npm run report     # serves reports/html
```

Shows pass/fail/skip, duration, every `test.step`, and the screenshot / video /
trace attached to each failure.

---

## 8. Coding standard

| Item             | Convention              | Example                                          |
| ---------------- | ----------------------- | ------------------------------------------------ |
| Page Object file | PascalCase              | `WishlistPage.ts`                                |
| Spec file        | kebab-case + `.spec.ts` | `wishlist-cart.spec.ts`                          |
| Function         | camelCase, verb first   | `expectRowSubtotal()`                            |
| Folder           | lowercase               | `pages/`, `test-data/`                           |
| Test name        | readable sentence       | `'User can move a wishlist product to the cart'` |

- Locator priority: `getByRole` → `getByLabel` → `getByPlaceholder` →
  `getByText` → `getByTestId` → CSS → (avoid XPath).
- Tags: `@smoke`, `@critical`, `@regression`, `@ui`.
- Every test maps to an Acceptance Criterion in the spec's inline comments.

Before committing:

```bash
npm run lint && npm run typecheck && npm run format
```

---

## 9. CI/CD

`.github/workflows/playwright.yml` runs on push to `main`/`develop`, on PRs and
on manual dispatch: `npm ci` → `lint` + `typecheck` → `playwright install
--with-deps` → `playwright test --project=chromium`. The HTML report and
`test-results/` are uploaded as artifacts.

`STORE_BASE_URL` is set in the workflow `env:` block — intentionally not a
GitHub secret, since the store is public. If this suite is ever pointed at a
real system, move that value and any credentials into repository secrets first.
