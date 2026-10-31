# Type-Checking Workflow

How type checking fits into real projects: transpile vs check, CI, migrating JavaScript, typing tests and keeping the checker fast.

## Transpiling vs Type Checking

> Two separate jobs. **Transpiling** strips types to produce JS (fast, per file). **Type checking** analyzes the whole program (slower). Modern tools split them.

| Tool | Strips types | Checks types |
| --- | --- | --- |
| `tsc` | ✅ | ✅ |
| Vite / esbuild / SWC / Babel | ✅ | ❌ |
| Bun, Deno, Node (type stripping) | ✅ | ❌ (Deno: `deno check`) |
| `tsc --noEmit`, `vue-tsc`, editor | ❌ | ✅ |

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch"
  }
}
```

::: warning Gotcha
`vite dev` happily serves code with type errors. If nothing runs `tsc`, type errors reach production. Make `typecheck` part of `build` or CI.
:::

::: tip When to use
Every project that uses a bundler: let the bundler transpile, and run `tsc --noEmit` (or `vue-tsc --noEmit` / `svelte-check` / `astro check`) in CI and pre-push.
:::

## Type Checking in CI

> A dedicated CI step that fails the pipeline on type errors, alongside lint and tests.

```yaml
# .github/workflows/ci.yml (excerpt)
- run: npm ci
- run: npm run typecheck
- run: npm run lint
- run: npm test
```

```bash
tsc --noEmit --incremental     # caches results in .tsbuildinfo for faster reruns
tsc --build                    # for project references / monorepos
```

::: tip When to use
Every PR. Type errors are the cheapest bugs to catch: block merges on them.
:::

## Migrating JavaScript Gradually

> TS can check `.js` files and mixed codebases, so you can convert file by file instead of all at once.

```jsonc
{
  "compilerOptions": {
    "allowJs": true,      // .js files are part of the program (importable from .ts)
    "checkJs": false,     // turn on to type-check all JS, or use // @ts-check per file
    "strict": false,      // tighten later
    "noImplicitAny": false
  }
}
```

**A practical order**
1. Add `tsconfig` with `allowJs`, run the build unchanged.
2. Rename leaf modules first (utils, API layer, models) to `.ts`.
3. Turn on `noImplicitAny`, then `strictNullChecks`, then full `strict`.
4. Replace `any` and `@ts-expect-error` comments over time (track their count).

::: tip When to use
Legacy front-ends and Node services. Start with the **API/data layer**: typing the shapes of server data gives the biggest payoff across the app.
:::

## Typing Third-Party Code

> When a library's types are missing, wrong or too loose, fix them locally instead of spreading `any`.

```ts
// 1. Missing: minimal ambient declaration (src/types/vendor.d.ts)
declare module 'legacy-charts' {
  export function render(el: HTMLElement, data: number[]): void;
}

// 2. Too loose: wrap it once with a typed facade
import mixpanel from 'mixpanel-browser';
type AnalyticsEvent =
  | { name: 'signup'; plan: 'free' | 'pro' }
  | { name: 'purchase'; total: number };
export function track({ name, ...props }: AnalyticsEvent) {
  mixpanel.track(name, props);
}

// 3. Wrong: patch with module augmentation, or patch-package for real bugs
```

::: tip When to use
Analytics SDKs, payment SDKs and old jQuery-era plugins. A typed facade module also makes the vendor easy to replace later.
:::

## Type Tests <Badge type="tip" text="extra" />

> For complex generic utilities, assert types themselves with `expectTypeOf` (Vitest) or `@ts-expect-error`.

```ts
import { expectTypeOf, test } from 'vitest';
import { pluck, type DeepPartial } from './utils';

test('pluck keeps the property type', () => {
  expectTypeOf(pluck([{ id: 1 }], 'id')).toEqualTypeOf<number[]>();
});

test('DeepPartial makes nested props optional', () => {
  expectTypeOf<DeepPartial<{ a: { b: string } }>>().toEqualTypeOf<{ a?: { b?: string } }>();
});

// @ts-expect-error: 'nope' is not a key
pluck([{ id: 1 }], 'nope');
```

::: tip When to use
Shared libraries, design systems, API client generators and any utility type with conditional logic. Run with `vitest --typecheck`.
:::

## Keeping the Checker Fast <Badge type="tip" text="extra" />

> Slow type checking usually comes from huge unions, deep recursive types, or giant inferred types. A few habits keep the editor responsive.

```ts
// ✅ Annotate exported function return types: the checker doesn't re-infer them everywhere
export function buildRoutes(): RouteConfig[] { /* ... */ }

// ✅ Prefer interfaces with extends over long chains of & intersections
interface AdminUser extends User, Auditable {}

// ⚠️ Very large generated unions (e.g. every icon name × size × color) are expensive
```

```bash
tsc --noEmit --extendedDiagnostics   # time and memory per phase
tsc --noEmit --generateTrace trace   # open in Perfetto to find the slow type
```

::: tip When to use
When the editor lags or `tsc` takes minutes. TypeScript 7 (the native Go port) gives a large speedup on big codebases without code changes.
:::

## ESLint with Type Information <Badge type="tip" text="extra" />

> `typescript-eslint` with type-aware rules catches bugs the compiler allows: floating promises, unsafe `any`, misused async callbacks.

```js
// eslint.config.js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error'
    }
  }
);
```

```ts
saveDraft();                               // ❌ no-floating-promises: unhandled rejection risk
button.addEventListener('click', async () => { await save(); });  // ❌ misused promise in void callback
```

::: tip When to use
Any team codebase. `no-floating-promises` alone catches a whole category of silent production errors.
:::
