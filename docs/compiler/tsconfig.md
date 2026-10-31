# tsconfig Essentials

The compiler options that change how safe your code is and how it fits your toolchain, and when each one matters.

## The strict Flag Family

> `"strict": true` turns on a bundle of checks. It's the baseline for any new project.

```jsonc
{
  "compilerOptions": {
    "strict": true
    // includes:
    // noImplicitAny           → parameters without types are errors, not `any`
    // strictNullChecks        → null/undefined must be handled explicitly
    // strictFunctionTypes     → callback parameters are checked soundly
    // strictBindCallApply     → .call/.bind/.apply are typed
    // strictPropertyInitialization → class fields must be initialized
    // noImplicitThis          → `this` of type any is an error
    // useUnknownInCatchVariables → catch (err) is `unknown`
    // alwaysStrict            → emits "use strict"
  }
}
```

::: tip When to use
Always for new code. On an existing JS migration, start without `strict`, then enable `noImplicitAny` and `strictNullChecks` individually; they catch most real bugs.
:::

## Extra Safety Flags

> Options beyond `strict` that catch real bugs. Worth enabling in new projects.

```jsonc
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,   // arr[i] and dict[key] include `| undefined`
    "exactOptionalPropertyTypes": true, // `prop?: string` can't be explicitly set to undefined
    "noImplicitOverride": true,         // `override` keyword required
    "noImplicitReturns": true,          // all code paths must return
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true  // dict.key must be dict['key']
  }
}
```

```ts
// noUncheckedIndexedAccess in action
const params = new URLSearchParams(location.search);
const ids = location.pathname.split('/');
const productId = ids[2];          // string | undefined (honest!)
const translations: Record<string, string> = {};
translations['missing'].toUpperCase();   // ❌ now caught
```

::: tip When to use
`noUncheckedIndexedAccess` is the most valuable: it catches out-of-bounds and missing-key bugs. Turn these on from day one; retrofitting them later is painful.
:::

## target and lib

> `target` is the JS version emitted (and which syntax gets down-leveled). `lib` is which built-in APIs are typed as available.

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",                       // keep class fields, top-level await, ?? as-is
    "lib": ["ES2023", "DOM", "DOM.Iterable"]  // Array.prototype.findLast, fetch, NodeList iteration...
  }
}
```

```ts
[1, 2, 3].toSorted();       // ❌ if lib doesn't include ES2023
document.querySelector('a');// ❌ if lib doesn't include DOM (e.g. in a Node project)
```

::: warning Gotcha
`lib` only affects types. Saying `ES2023` doesn't polyfill `toSorted` for old browsers; it just stops TS complaining. Match `lib` to what your **runtime** supports.
:::

::: tip When to use
Browser apps: include `DOM`. Node services: omit `DOM` so `window`/`document` usage is flagged, and use `@types/node`. Workers: `WebWorker` lib.
:::

## module and moduleResolution

> These control how imports are interpreted. Pick the pair that matches who resolves your imports: a bundler or Node.

```jsonc
// Apps built by Vite / webpack / esbuild / Next
{ "compilerOptions": { "module": "ESNext", "moduleResolution": "bundler" } }

// Code run directly by Node (libraries, servers without a bundler)
{ "compilerOptions": { "module": "NodeNext", "moduleResolution": "NodeNext" } }
```

```ts
// With NodeNext in an ESM package, relative imports need the runtime extension
import { db } from './db.js';    // even though the file is db.ts
```

::: tip When to use
`bundler` for front-end apps (allows extensionless imports and `exports` conditions). `NodeNext` for Node services and published packages, so TS enforces exactly what Node will do at runtime.
:::

## noEmit and isolatedModules

> In modern setups, a bundler or runtime strips the types and `tsc` only type-checks (`noEmit`). `isolatedModules` flags code that single-file transpilers can't handle.

```jsonc
{
  "compilerOptions": {
    "noEmit": true,             // tsc is a type checker only
    "isolatedModules": true,    // every file must be compilable on its own
    "verbatimModuleSyntax": true // imports/exports kept exactly as written (type imports must say `type`)
  }
}
```

```ts
// ❌ under isolatedModules: re-exporting a type without `type`
export { Product } from './types';        // esbuild can't know Product is only a type
export type { Product } from './types';   // ✅
```

::: tip When to use
Any project using Vite, esbuild, SWC, Babel, Bun, Deno or Node's type stripping, which is almost every project today. These tools are fast because they ignore types; `tsc --noEmit` in CI and the editor provide the checking.
:::

## Emitting: outDir, declaration and sourceMap

> When `tsc` itself builds the code (libraries, simple Node services), these control what it writes.

```jsonc
{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,       // emit .d.ts for consumers
    "declarationMap": true,    // "go to definition" lands in .ts source
    "sourceMap": true,         // stack traces and debugger map to .ts lines
    "removeComments": false,
    "noEmitOnError": true      // don't produce JS when types fail
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}
```

::: tip When to use
Publishing an npm package (`declaration` is mandatory for consumers to get types) and Node services compiled with `tsc`. App bundlers handle emit themselves.
:::

## extends and Project References

> `extends` shares a base config; project references (`references` + `composite`) split a repo into independently checked projects.

```jsonc
// tsconfig.base.json shared across a monorepo
{ "compilerOptions": { "strict": true, "target": "ES2022", "skipLibCheck": true } }

// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2023", "DOM"], "jsx": "react-jsx" },
  "references": [{ "path": "../../packages/shared" }]
}

// Vite's default: separate configs for browser code and node config files
// tsconfig.json → references tsconfig.app.json + tsconfig.node.json
```

```bash
tsc --build   # builds referenced projects in order, with incremental caching
```

::: tip When to use
Monorepos (shared `types`/`ui` packages), and apps where browser code and Node code (config files, scripts, server) need different `lib`/`types`. Community bases like `@tsconfig/strictest` save setup time.
:::

## skipLibCheck and Other Practical Options

> A few options that make day-to-day life smoother.

```jsonc
{
  "compilerOptions": {
    "skipLibCheck": true,          // don't type-check node_modules .d.ts files (faster, avoids lib conflicts)
    "esModuleInterop": true,       // import React from 'react' works for CJS packages
    "resolveJsonModule": true,     // import data from './x.json'
    "forceConsistentCasingInFileNames": true,  // catches Windows/macOS vs Linux CI path bugs
    "jsx": "react-jsx",            // or "preserve" for Vue/Solid/Next
    "types": ["vite/client"]       // only these global @types are loaded
  }
}
```

::: tip When to use
`skipLibCheck` is standard in apps. `forceConsistentCasingInFileNames` saves you from "works on my Mac, fails on CI". Restrict `types` when test runner globals (Jest vs Vitest vs Cypress) clash.
:::

## erasableSyntaxOnly and Type Stripping <Badge type="tip" text="extra" />

> Node 22.18+/23.6+ runs `.ts` files by **stripping** types. `erasableSyntaxOnly` (TS 5.8) forbids TS features that need code generation.

```jsonc
{ "compilerOptions": { "erasableSyntaxOnly": true, "verbatimModuleSyntax": true } }
```

```ts
enum Role { Admin }                         // ❌ generates an object
namespace Utils { export const x = 1; }     // ❌ generates an IIFE
class A { constructor(private x: number) {} } // ❌ parameter property generates assignments

const Role = { Admin: 'admin' } as const;   // ✅ erasable alternatives
class B { #x: number; constructor(x: number) { this.#x = x; } }
```

```bash
node src/server.ts    # runs directly, no build step
```

::: tip When to use
Scripts, CLIs and Node services run without a build, and libraries that want to be friendly to every type-stripping tool. It also nudges code towards "JavaScript + types only".
:::
