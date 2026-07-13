# Task 1 Report: Project Scaffolding, Dependencies, and npm Scripts

## What Was Done

All 8 steps from the task brief were completed in order.

## Commands Run + Results

### Step 1: npm install (base deps + postinstall)
```
npm install
```
- Result: 607 packages installed; postinstall ran `api:load`, downloaded channel data.
- Verified: `ls temp/data/channels.json && echo OK` → `OK`

### Step 2: Install app dependencies
```
npm install --save express @tanstack/react-virtual react react-dom
npm install --save-dev @types/express @types/react @types/react-dom @vitejs/plugin-react vite vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event supertest @types/supertest concurrently --legacy-peer-deps
```
- Note: `--legacy-peer-deps` was required for the devDependencies install because `@vitejs/plugin-react@6.x` has a peer dep on `@babel/core@^8.0.0` while the project has `@babel/core@7.x` (installed transitively through Jest). Using `--legacy-peer-deps` is the correct fix here since Vite/Vitest do not actually invoke Babel in this setup (they use their own transform pipeline), so the conflict is nominal.
- Side effect: the `--legacy-peer-deps` install removed `@swc/core` from `node_modules` (it was previously an indirect dep). Reinstalled explicitly: `npm install --save @swc/core`. This moved `@swc/core` to an explicit entry in `dependencies` (was previously implicit), which is fine — it was already a required dep for `@swc/jest` and Jest transforms.

### Step 3: npm scripts added to package.json
Added 5 scripts as specified: `app:catalog`, `app:dev`, `app:build`, `app:start`, `app:test:web`.

### Step 4: .gitignore updated
Appended `/app/catalog.json` and `/app/web/dist/`.

### Step 5: app/.env.example created
Created with exact content from brief.

### Step 6: Vite + Vitest config created
- `app/web/vite.config.ts` — exact content from brief
- `app/web/src/test/setup.ts` — `import '@testing-library/jest-dom'`

### Step 7: app/tsconfig.json created
Exact content from brief.

### Step 8: Jest verification
```
npx jest tests/commands/playlist/format.test.ts
```
Result: PASS — 1 test suite, 1 test passed, 0.824s.

## Files Changed

- `package.json` — added 5 app scripts, new deps: `express`, `react`, `react-dom`, `@tanstack/react-virtual`, `@swc/core` (explicit); devDeps: `@types/express`, `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `vite`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `supertest`, `@types/supertest`, `concurrently`
- `package-lock.json` — updated (3677 line change due to new deps)
- `.gitignore` — appended 2 lines
- `app/.env.example` — new file (6 env vars)
- `app/web/vite.config.ts` — new file
- `app/web/src/test/setup.ts` — new file
- `app/tsconfig.json` — new file

## Self-Review Findings

- All files match brief verbatim.
- No extra source files were created (no `app/server/`, `app/web/src/` beyond `test/setup.ts`).
- Scripts point at paths exactly as specified (`scripts/commands/app/catalog.ts` — left as-is per brief note).
- `.gitignore` entries used root-anchored paths (`/app/catalog.json`, `/app/web/dist/`) as specified.
- Jest config untouched — still uses `@swc/jest` transform and `tests/(.*?/)?.*test.ts$` testRegex.

## Concerns

1. **`@swc/core` moved to explicit `dependencies`**: Was previously an implicit transitive dep; now listed explicitly in `package.json` `dependencies` (not `devDependencies`). Functionally correct since it's required at runtime for Jest transforms, but slightly non-ideal placement. Could be moved to `devDependencies` in a cleanup pass.
2. **`--legacy-peer-deps` for devDependencies install**: The `@vitejs/plugin-react@6.x` / `@babel/core` conflict is nominal (Vite doesn't use Babel in this config), but it's worth noting this flag was needed. If `@babel/core` is upgraded to v8 later, the `overrides` field may need updating.
3. **npm allow-scripts warnings**: Several packages (`esbuild`, `fsevents`, `unrs-resolver`) have unreviewed install scripts. These are common false positives in this ecosystem; not a blocker.

---

## Fix report (review round 1)

### Three Changes Made

1. **`@swc/core` moved to `devDependencies`** (`package.json`): Removed `"@swc/core": "^1.15.43"` from the `dependencies` section and added it to `devDependencies` (alphabetically adjacent to `@vitejs/plugin-react`). It is a Jest transform engine and only needed during development/test, not at runtime.

2. **`.npmrc` created** at repo root containing `legacy-peer-deps=true`: Permanently records the workaround for the `@vitejs/plugin-react@6.x` / `@babel/core@7.x` peer-dep conflict, making a plain `npm install` (no flags) reproducible on any clean clone.

3. **`.gitignore` trailing newline added**: The file previously ended without a newline (`0x2f` was the last byte). A `\n` was appended so the file ends cleanly at `/app/web/dist/\n`.

### Commands Run and Output

#### `npm install` (no flags)
```
removed 11 packages, and audited 798 packages in 2s
147 packages are looking for funding
  run `npm fund` for details
6 vulnerabilities (1 low, 3 moderate, 2 high)
...
npm warn allow-scripts 4 packages have install scripts not yet covered by allowScripts:
```
**Result: SUCCESS — no peer-dependency error, no `--legacy-peer-deps` flag required.**

#### `node -e "require.resolve('@swc/core')" && echo swc-ok`
```
swc-ok
```
**Result: `@swc/core` is installed and resolvable.**

#### `npx jest tests/commands/playlist/format.test.ts`
```
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        0.569 s, estimated 1 s
```
**Result: PASS — SWC Jest transform continues to work correctly after the move.**

### No Concerns
All three fixes are clean and minimal. The `.npmrc` only sets `legacy-peer-deps=true` and touches no other npm behavior.
