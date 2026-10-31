# Modules

How ES modules work with types: type-only imports, re-exports, path aliases, JSON imports and the legacy namespaces.

## ES Modules with Types

> Types are exported and imported exactly like values. Any file with a top-level `import` or `export` is a module with its own scope.

```ts
// models/product.ts
export interface Product { id: string; name: string; price: number }
export type ProductId = Product['id'];
export const MAX_QTY = 10;
export function isOnSale(p: Product) { return p.price < 20; }

// cart.ts
import { type Product, MAX_QTY, isOnSale } from './models/product';

export default class Cart {
  items: Product[] = [];
}
```

::: warning Gotcha
A `.ts` file **without** any import/export is a global script: its declarations leak into every other file. Add `export {}` if a file has no exports.
:::

::: tip When to use
Always. Co-locate types with the code that owns them (`product.ts` exports both the `Product` type and product helpers) and import them where needed.
:::

## Type-Only Imports and Exports

> `import type` (or the inline `type` modifier) imports something **only for type checking**. It's guaranteed to be erased from the output.

```ts
import type { Product, Order } from './models';        // whole statement erased
import { type User, fetchUser } from './api/users';    // only User erased

export type { CheckoutState } from './checkout';       // re-export a type

// Why it matters: a value import used only as a type may still load the module at runtime
import { HeavyChartLib } from 'heavy-chart';           // ⚠️ may keep the import in output
import type { HeavyChartLib as T } from 'heavy-chart'; // ✅ never loads at runtime
```

With `"verbatimModuleSyntax": true`, TypeScript **requires** `type` on type-only imports, so what you write is exactly what bundlers keep or drop.

::: tip When to use
Always mark type imports with `type`, especially with Vite/esbuild/SWC (they compile files in isolation and can't tell types from values), to avoid circular-import side effects and to keep heavy modules out of bundles.
:::

## Re-exports and Barrel Files

> An `index.ts` that re-exports from several files gives a folder one public entry point.

```ts
// features/cart/index.ts
export { default as CartDrawer } from './CartDrawer';
export { useCart } from './useCart';
export type { CartItem, CartState } from './types';
export * as cartApi from './api';

// elsewhere
import { CartDrawer, useCart, type CartItem } from '@/features/cart';
```

::: warning Gotcha
Big barrels hurt: importing one thing can make the dev server and tests load the whole folder, and they invite circular dependencies. Keep barrels at feature boundaries, not in every folder.
:::

::: tip When to use
Public API of a feature folder or internal package in a monorepo, so other features can't reach into private files.
:::

## Path Aliases

> `paths` in tsconfig maps import prefixes like `@/` to folders. The bundler must be configured with the same alias.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@ui/*": ["./src/components/ui/*"]
    }
  }
}
```

```ts
import { Button } from '@ui/button';          // instead of '../../../components/ui/button'
import { formatPrice } from '@/lib/format';
```

::: warning Gotcha
`paths` only affects **type checking**. Vite (`resolve.alias` or `vite-tsconfig-paths`), Jest/Vitest and Node need their own config, or imports fail at runtime. Node can use `"imports": { "#lib/*": "./src/lib/*" }` in `package.json` instead, which both TS and Node understand.
:::

::: tip When to use
Any app with nested folders. Pick one prefix (`@/`) and use it everywhere for consistency.
:::

## Importing JSON and Assets

> `resolveJsonModule` lets you import `.json` with inferred types. Non-code assets (`.svg`, `.css`) need declarations.

```ts
import pkg from '../package.json';            // typed from the file contents
console.log(pkg.version);

import en from './locales/en.json';
type MessageKey = keyof typeof en;

// Import attributes (TS 5.3+): required by Node and browsers for native JSON modules
import config from './config.json' with { type: 'json' };

// Vite: asset imports are typed by `vite/client`
import logoUrl from './logo.svg';             // string
import styles from './Card.module.css';      // CSSModuleClasses
```

::: tip When to use
Translation files, static config and feature flags shipped with the app. For assets, include your bundler's client types (`/// <reference types="vite/client" />`) or write ambient module declarations.
:::

## Dynamic Imports

> `await import('./module')` returns a typed module object, so code-split modules keep full type information.

```ts
button.addEventListener('click', async () => {
  const { exportToPdf } = await import('./export/pdf');    // separate chunk
  await exportToPdf(report);                                 // typed
});

// React.lazy expects a default export
const AdminPanel = lazy(() => import('./admin/AdminPanel'));

// Typing a registry of lazy modules
const locales = {
  en: () => import('./locales/en.json'),
  pt: () => import('./locales/pt.json')
} satisfies Record<string, () => Promise<{ default: Record<string, string> }>>;
```

::: tip When to use
Heavy, rarely used features (PDF export, charts, rich text editors, admin routes) and per-locale translation loading.
:::

## Namespaces (Legacy)

> `namespace X { ... }` is TypeScript's pre-ES-modules way to group code. Today it's mostly found in old code and in `.d.ts` files.

```ts
// Legacy app code (avoid in new code)
namespace Validation {
  export interface Validator { isValid(s: string): boolean }
  export const zip = { isValid: (s: string) => /^\d{4}-\d{3}$/.test(s) };
}
Validation.zip.isValid('1000-001');

// Still useful in declarations: grouping types for a global library
declare namespace Analytics {
  interface Event { name: string; props?: Record<string, unknown> }
  function track(event: Event): void;
}
```

::: warning Gotcha
Namespaces emit JavaScript (IIFEs) and aren't supported by `isolatedModules` tools when they contain values, nor by `erasableSyntaxOnly`. Use ES modules for code organization.
:::

::: tip When to use
Recognize them in older codebases and in typings for script-tag globals (`google.maps`, `gtag`). For new code, ES modules always.
:::

## CommonJS Interop <Badge type="tip" text="extra" />

> When importing CommonJS packages, `esModuleInterop` makes `import x from 'cjs-lib'` behave like Node and bundlers expect.

```ts
// With "esModuleInterop": true (default in modern configs)
import express from 'express';            // module.exports = function ...
import * as path from 'node:path';        // namespace import works for both

// TS syntax for CommonJS output (rare today)
import fs = require('fs');
export = createServer;
```

::: tip When to use
Node projects still on CommonJS, or importing older npm packages. With `module: "nodenext"`, TypeScript follows Node's real rules based on `"type"` in `package.json` and file extensions (`.mts`, `.cts`).
:::
