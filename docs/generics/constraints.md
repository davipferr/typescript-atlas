# Constraints & Inference

Limiting what a type parameter can be, connecting keys to objects, and controlling how TypeScript infers type arguments.

## Generic Constraints (extends)

> `T extends Shape` requires the type argument to be assignable to `Shape`, so you can safely use its members inside the function.

```ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
longest('abc', 'de');        // string
longest([1, 2], [1, 2, 3]);  // number[]
longest(10, 20);             // ❌ number has no length

interface Entity { id: string }

function upsert<T extends Entity>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  return i === -1 ? [...list, item] : list.with(i, item);
}
const next = upsert(products, updatedProduct);   // Product[], not Entity[]
```

::: tip When to use
Any generic that needs to read something from `T`: an `id` for upserts, `length` for comparisons, a `createdAt` for sorting. The constraint documents the minimum requirement while keeping the full type.
:::

## keyof Constraints

> `K extends keyof T` restricts a parameter to the actual keys of an object, and `T[K]` gives the matching value type.

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

const emails = pluck(users, 'email');     // string[]
const ages = pluck(users, 'age');         // number[]
pluck(users, 'emial');                    // ❌ typo caught

function sortBy<T, K extends keyof T>(items: T[], key: K, dir: 'asc' | 'desc' = 'asc') {
  return [...items].sort((a, b) => {
    const r = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0;
    return dir === 'asc' ? r : -r;
  });
}

function setField<T, K extends keyof T>(obj: T, key: K, value: T[K]) {
  obj[key] = value;
}
setField(form, 'age', 'thirty');          // ❌ value must be number
```

::: tip When to use
Table sorting by column, `pluck`/`groupBy` by property, generic form field setters, typed `get(obj, key)` helpers and typed event maps (`on<K extends keyof Events>`).
:::

## Constraining to Functions and Constructors

> Constraints can describe functions or classes, which lets you type wrappers and factories precisely.

```ts
// Any function
function timed<F extends (...args: any[]) => any>(label: string, fn: F) {
  return ((...args: Parameters<F>): ReturnType<F> => {
    const start = performance.now();
    try { return fn(...args); }
    finally { console.debug(label, performance.now() - start, 'ms'); }
  }) as F;
}
const fastSearch = timed('search', searchProducts);   // same signature as searchProducts

// Any class
type Ctor<T> = new (...args: any[]) => T;
function registerElement<T extends HTMLElement>(tag: string, Element: Ctor<T>) {
  if (!customElements.get(tag)) customElements.define(tag, Element);
}
```

::: tip When to use
Instrumentation/logging wrappers, plugin registries, DI containers and custom element registration.
:::

## Inference from Arguments

> TypeScript infers type arguments from **every** argument that uses them. Where you put `T` decides what it's inferred from.

```ts
function createStore<S>(initial: S, reducers: Record<string, (s: S) => S>) { /* ... */ }

createStore({ count: 0 }, {
  inc: (s) => ({ count: s.count + 1 })     // s inferred from `initial`
});

// Inference picks the "best common type"
function pair<T>(a: T, b: T) { return [a, b]; }
pair(1, 2);           // T = number
pair(1, 'a');         // ❌ T = number, 'a' not assignable (in strict cases)
pair<number | string>(1, 'a');   // explicit
```

::: tip When to use
Design generic APIs so the "source of truth" argument comes first (`initial`, `schema`, `items`) and callbacks are inferred from it. This is how React Query, Zustand and Zod give you inference without annotations.
:::

## NoInfer <Badge type="tip" text="extra" />

> `NoInfer<T>` (TS 5.4) tells TypeScript **not** to use that position to infer `T`, so it's only checked against the inferred type.

```ts
function createFSM<S extends string>(states: S[], initial: NoInfer<S>) { /* ... */ }

createFSM(['idle', 'loading', 'done'], 'idle');     // ✅
createFSM(['idle', 'loading', 'done'], 'paused');   // ❌ without NoInfer, S would widen to include 'paused'

function useTabs<T extends string>(tabs: readonly T[], defaultTab: NoInfer<T>) { /* ... */ }
```

::: tip When to use
"Default value" or "initial value" parameters that must be one of the options passed in another argument: initial state, default tab, fallback locale.
:::

## const Type Parameters <Badge type="tip" text="extra" />

> `<const T>` (TS 5.0) infers arguments as if they had `as const`, keeping literal types without the caller writing it.

```ts
function defineRoutes<const T extends readonly { path: string; name: string }[]>(routes: T) {
  return routes;
}

const routes = defineRoutes([
  { path: '/', name: 'home' },
  { path: '/cart', name: 'cart' }
]);
type RouteName = (typeof routes)[number]['name'];   // 'home' | 'cart' (not string)

function routeTo(name: RouteName) {}
```

::: tip When to use
"define" helpers in libraries and app config: `defineRoutes`, `defineConfig`, `createEnum(['a', 'b'])`, i18n key registration, where callers shouldn't have to remember `as const`.
:::

## Generics Gone Too Far <Badge type="tip" text="extra" />

> Generics should relate two or more things. A type parameter used once adds complexity without safety.

```ts
// ❌ T used once: just use the type directly
function logValue<T>(value: T): void { console.log(value); }
function logValue2(value: unknown): void { console.log(value); }   // ✅

// ❌ Return type generic the caller "chooses": a disguised assertion
function getItem<T>(key: string): T { return JSON.parse(localStorage.getItem(key)!); }
const user = getItem<User>('user');   // looks safe, isn't

// ✅ Honest version: return unknown, validate at the call site, or accept a parser
function getItem2<T>(key: string, parse: (raw: unknown) => T): T | null {
  const raw = localStorage.getItem(key);
  return raw ? parse(JSON.parse(raw)) : null;
}
```

::: tip When to use
Review generic signatures: if `T` appears only in the return type, it's an unchecked cast. Push for a parser/validator argument or `unknown`.
:::
