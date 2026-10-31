# Overloads & Higher-Order Functions

Functions whose return type depends on their input, and functions that take or return other functions.

## Function Overloads

> Several signatures for one implementation. The caller sees only the overload signatures, so each input gets its own precise return type.

```ts
function parseDate(value: string): Date;
function parseDate(value: number): Date;
function parseDate(value: null | undefined): null;
function parseDate(value: string | number | null | undefined): Date | null {
  if (value == null) return null;
  return new Date(value);
}

const d1 = parseDate('2026-10-31');   // Date
const d2 = parseDate(null);           // null (not Date | null)

// Overloads on DOM-like APIs: the return type follows the argument
function create(tag: 'a'): HTMLAnchorElement;
function create(tag: 'img'): HTMLImageElement;
function create(tag: string): HTMLElement;
function create(tag: string) { return document.createElement(tag); }
```

**Rules**
- The implementation signature is **not visible** to callers and must be compatible with every overload.
- Overloads are checked top to bottom: put the most specific first.

::: tip When to use
When the return type depends on **which kind** of argument was passed and a union return would force callers to narrow. Before writing overloads, check if a union parameter or a generic is enough: they're simpler.
:::

## Overloads vs Unions vs Generics

> Choose the simplest tool: union params when the return doesn't change, generics when it mirrors the input, overloads for distinct mappings.

```ts
// 1. Union: same return regardless of input → no overloads needed
function len(x: string | unknown[]): number { return x.length; }

// 2. Generic: output type follows input type
function first<T>(items: T[]): T | undefined { return items[0]; }

// 3. Overloads: unrelated input → output mapping
function get(key: 'user'): User;
function get(key: 'settings'): Settings;
function get(key: string): unknown { return cache.get(key); }

// 3b. Often a lookup type replaces overloads entirely
interface Registry { user: User; settings: Settings }
function get2<K extends keyof Registry>(key: K): Registry[K] { return cache.get(key); }
```

::: tip When to use
Prefer the generic + lookup-type pattern (`K extends keyof Registry`) for typed caches, stores and event maps: it scales to dozens of keys where overloads would be unmanageable.
:::

## Typing Higher-Order Functions

> Functions that receive or return functions. Generics keep the wrapped function's exact parameters and return type.

```ts
function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const search = debounce((query: string, page: number) => fetchResults(query, page), 400);
search('tv', 1);     // ✅ still typed (query: string, page: number)
search(1);           // ❌

function memoize<A extends unknown[], R>(fn: (...args: A) => R) {
  const cache = new Map<string, R>();
  return (...args: A): R => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key)!;
  };
}
```

::: warning Gotcha
`setTimeout` returns `number` in the browser but `NodeJS.Timeout` in Node. `ReturnType<typeof setTimeout>` works in both environments.
:::

::: tip When to use
Debounce/throttle, memoize, retry, logging/timing wrappers, middleware: any utility that decorates a function without changing its signature.
:::

## Functions Returning Functions

> Factories and currying: the outer call configures, the inner call does the work. Types flow through each layer.

```ts
const createFormatter =
  (locale: string, currency: string) =>
  (amount: number): string =>
    new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

const eur = createFormatter('pt-PT', 'EUR');   // (amount: number) => string
eur(1250);

// Pre-configured API clients
function createApi(baseUrl: string, token: string) {
  return async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(baseUrl + path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...init?.headers }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  };
}
const api = createApi('https://api.example.com', token);
const orders = await api<Order[]>('/orders');
```

::: tip When to use
Formatters bound to a locale, API clients bound to a base URL/token, validators built from rules (`minLength(8)`), and Redux-style selectors.
:::

## Generic Callback Parameters

> When a function accepts a callback that works on its data, type the callback with the same generic so items are inferred.

```ts
function groupBy<T, K extends PropertyKey>(items: T[], getKey: (item: T) => K) {
  const out = {} as Record<K, T[]>;
  for (const item of items) (out[getKey(item)] ??= []).push(item);
  return out;
}

const byStatus = groupBy(orders, (o) => o.status);
// Record<'pending' | 'paid' | 'shipped', Order[]>   (o is inferred as Order)

function retryUntil<T>(task: () => Promise<T>, isDone: (result: T) => boolean) { /* ... */ }
```

::: tip When to use
Collection helpers (`groupBy`, `keyBy`, `sortBy`, `uniqBy`), polling utilities, and table/list components that receive a `renderRow(item)` callback.
:::

## Assertion and Predicate Signatures

> Return types like `value is T` and `asserts value is T` let a function **narrow** types for its caller.

```ts
function isDefined<T>(value: T | null | undefined): value is T {
  return value != null;
}
const ids = [1, null, 3, undefined].filter(isDefined);   // number[]

function assertIsString(value: unknown, name = 'value'): asserts value is string {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string`);
}
assertIsString(process.env.API_URL, 'API_URL');
process.env.API_URL;   // string from here on
```

::: tip When to use
Filtering out `null`s from arrays, validating config at startup, and test helpers. Full coverage in [Narrowing & Type Guards](/narrowing/type-guards).
:::
