# Declaration Files & Augmentation

Describing JavaScript that has no types (`.d.ts`, `declare`, `@types`) and extending types you don't own.

## Declaration Files (.d.ts)

> A `.d.ts` file contains **only types**: no implementation. It describes the shape of JavaScript code that exists elsewhere.

```ts
// utils/legacy-format.js (plain JS you can't convert yet)
export function formatPhone(raw, country) { /* ... */ }

// utils/legacy-format.d.ts (sits next to it)
export declare function formatPhone(raw: string, country?: 'PT' | 'BR'): string;
```

Libraries ship them in their package (`"types": "dist/index.d.ts"`) and `tsc --declaration` generates them from your `.ts` sources.

::: tip When to use
Typing a JS file you can't migrate yet, typing a small untyped npm package, and publishing your own library so consumers get types.
:::

## @types and DefinitelyTyped

> Packages without bundled types often have community types in `@types/<name>`, installed as a dev dependency.

```bash
npm i -D @types/node @types/express @types/lodash-es
```

```ts
import debounce from 'lodash-es/debounce';   // typed via @types/lodash-es

// tsconfig: limit which global @types are loaded (avoids jest/mocha conflicts)
// "types": ["node", "vite/client"]
```

::: warning Gotcha
`@types` versions must match the library's major version. And if there are no types at all, TypeScript errors with "Could not find a declaration file for module": write a minimal `declare module` instead of turning off `noImplicitAny`.
:::

::: tip When to use
Check npm first: a "TS" badge means bundled types; "DT" means install `@types/...`. Node globals (`process`, `Buffer`) come from `@types/node`.
:::

## The declare Keyword

> `declare` tells TypeScript that something exists at runtime (provided by a script tag, the bundler or the environment) without emitting any code.

```ts
// Globals injected by a <script> tag or by the build
declare const __APP_VERSION__: string;          // Vite `define`
declare const gtag: (command: 'event', name: string, params?: object) => void;
declare function grecaptcha_execute(siteKey: string): Promise<string>;

footer.textContent = `v${__APP_VERSION__}`;
gtag('event', 'purchase', { value: 49.9 });
```

::: tip When to use
Build-time constants (`define` in Vite/webpack), third-party scripts loaded via `<script>` (Google Analytics, Stripe.js v2, reCAPTCHA, Hotjar) and legacy globals.
:::

## Ambient Module Declarations

> `declare module 'name' { ... }` types a whole module. Wildcards (`'*.svg'`) type every import matching a pattern.

```ts
// src/types/modules.d.ts

// Untyped npm package: minimal types for what you use
declare module 'tiny-confetti' {
  export default function confetti(opts?: { particles?: number; spread?: number }): void;
}

// Shorthand: everything is any (quick unblock, not great)
declare module 'old-untyped-lib';

// Asset imports handled by the bundler
declare module '*.svg' {
  const url: string;
  export default url;
}
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
declare module '*.md?raw' {
  const content: string;
  export default content;
}
```

::: tip When to use
Untyped packages, custom file loaders (`?raw`, `?worker`, `.graphql`, `.glsl`), and webpack setups without ready-made client types.
:::

## Global Augmentation

> Inside a module, `declare global { ... }` adds to global types like `Window`, `Document` or built-in interfaces through declaration merging.

```ts
// src/types/global.d.ts
export {};   // make this file a module

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    Intercom?: (command: string, ...args: unknown[]) => void;
    __INITIAL_STATE__?: AppState;
  }

  interface Array<T> {
    // only if you really add a polyfill at runtime!
    findLastIndex(predicate: (value: T) => boolean): number;
  }
}

window.dataLayer.push({ event: 'signup' });   // ✅ typed
window.Intercom?.('show');
```

::: tip When to use
Analytics/chat widgets on `window`, server-rendered initial state, custom DOM events in `WindowEventMap`, and typing polyfills you actually load.
:::

## Module Augmentation

> `declare module 'lib' { interface X { ... } }` reopens an interface exported by a library and adds members to it.

```ts
// Express: add the authenticated user to every request
import 'express';
declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; role: 'admin' | 'user' };
  }
}

// Vue: global properties available in every template
declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string) => string;
    $formatPrice: (cents: number) => string;
  }
}

// Vue Router: typed route meta
declare module 'vue-router' {
  interface RouteMeta { requiresAuth?: boolean; title?: string }
}
```

::: warning Gotcha
The augmenting file must be a module (have an import/export) and be included by tsconfig. Augment the **exact** module where the interface is declared (for Express, that's `express-serve-static-core`).
:::

::: tip When to use
Middleware that attaches data (`req.user`, `req.requestId`), plugin-provided globals (`$t`, `$router`), typed route meta, theme typing in styled-components/MUI (`DefaultTheme`, `Palette`).
:::

## Typing Environment Variables <Badge type="tip" text="extra" />

> Augment `ImportMetaEnv` (Vite) or `ProcessEnv` (Node) so env var names autocomplete and typos fail to compile.

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_STRIPE_KEY: string;
  readonly VITE_SENTRY_DSN?: string;
}
interface ImportMeta { readonly env: ImportMetaEnv }

// Node
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      NODE_ENV: 'development' | 'test' | 'production';
    }
  }
}
```

::: warning Gotcha
These declarations are promises, not checks. Validate env vars at startup (see [Runtime Validation](/async/runtime-validation)) so a missing variable fails fast instead of becoming `undefined` deep in the app.
:::

::: tip When to use
Every project that reads env vars. Combine with a startup schema check.
:::

## Triple-Slash Directives

> `/// <reference ... />` comments at the top of a file pull in type declarations. Mostly seen in `.d.ts` files.

```ts
/// <reference types="vite/client" />      // load a package's global types
/// <reference lib="dom" />                // include a built-in lib
/// <reference path="./legacy-globals.d.ts" />
```

::: tip When to use
`vite-env.d.ts` and similar entry declaration files. In normal code, use `import` and the `types` option in tsconfig instead.
:::

## JSDoc Types in JavaScript <Badge type="tip" text="extra" />

> TypeScript understands JSDoc annotations in `.js` files, so you can get type checking without a build step.

```js
// @ts-check

/** @typedef {{ id: string; name: string; price: number }} Product */

/**
 * @param {Product[]} items
 * @param {number} [taxRate=0.23]
 * @returns {number}
 */
export function total(items, taxRate = 0.23) {
  return items.reduce((s, p) => s + p.price, 0) * (1 + taxRate);
}

/** @type {import('./types').AppConfig} */
const config = { apiUrl: '/api' };

/** @satisfies {Record<string, string>} */
const labels = { save: 'Guardar' };
```

::: tip When to use
Config files (`vite.config.js`, `eslint.config.js`, `tailwind.config.js` with `/** @type {import('tailwindcss').Config} */`), build-free libraries and gradual migrations.
:::
