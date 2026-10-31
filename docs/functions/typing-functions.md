# Typing Functions

Parameters, return types, optional and rest arguments, function types and the `this` parameter.

## Parameter and Return Types

> Parameters must be annotated (TS can't guess them). Return types are inferred, but annotating them on exported functions locks the contract.

```ts
export function calculateTotal(items: CartItem[], taxRate: number): number {
  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  return Math.round(subtotal * (1 + taxRate) * 100) / 100;
}

// Arrow functions, same rules
const toSlug = (title: string): string =>
  title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

// async functions always return a Promise
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}
```

::: tip When to use
Explicit return types on **exported/public** functions, library APIs and recursive functions (which need them). Skip them on small internal helpers and callbacks where inference is obvious.
:::

## Optional and Default Parameters

> `param?: T` can be omitted (it's `T | undefined` inside). A default value makes it optional **and** infers its type.

```ts
function paginate(page: number, pageSize = 20, sort?: 'asc' | 'desc') {
  // pageSize: number, sort: 'asc' | 'desc' | undefined
  return `/api/products?page=${page}&size=${pageSize}${sort ? `&sort=${sort}` : ''}`;
}

paginate(1);
paginate(2, 50);
paginate(3, undefined, 'desc');    // skip a middle argument with undefined

// ❌ Required parameters can't come after optional ones
function bad(a?: string, b: number) {}
```

::: tip When to use
Defaults for config-like arguments (page size, timeouts, locale). When you have more than two optional parameters, switch to a single **options object** instead.
:::

## Options Objects with Destructuring

> Type the whole object, then destructure with defaults in the signature. Callers get named, order-free arguments.

```ts
interface FetchOptions {
  retries?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

async function fetchJson<T>(
  url: string,
  { retries = 2, timeoutMs = 8000, headers = {} }: FetchOptions = {}
): Promise<T> {
  // retries: number, timeoutMs: number (defaults remove the undefined)
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
  return res.json() as Promise<T>;
}

fetchJson<User[]>('/api/users', { timeoutMs: 3000 });
```

::: warning Gotcha
You can't annotate inside a destructuring pattern: `({ retries: number })` **renames** `retries` to a variable called `number`. Put the type after the whole pattern.
:::

::: tip When to use
Any function with several optional settings: API clients, `createStore(options)`, UI widget initializers, utility functions you expect to grow.
:::

## Rest Parameters

> `...args: T[]` collects the remaining arguments into a typed array. Tuples make each position typed.

```ts
function mergeClasses(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
mergeClasses('btn', isActive && 'btn-active', disabled ? 'btn-disabled' : null);

function log(level: 'info' | 'error', ...details: unknown[]) {
  console[level](new Date().toISOString(), ...details);
}

// Tuple rest: forward exact arguments to another function
function withRetry<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    try { return await fn(...args); } catch { return fn(...args); }
  };
}
```

::: tip When to use
Class-name helpers, logging, variadic math (`max(...nums)`), and wrappers that forward arguments unchanged (retry, debounce, memoize).
:::

## Function Type Expressions

> Describe a function's shape with `(a: A, b: B) => R`. Use it for callbacks, props and variables holding functions.

```ts
type Comparator<T> = (a: T, b: T) => number;
type Unsubscribe = () => void;
type Listener<T> = (payload: T) => void;

const byPrice: Comparator<Product> = (a, b) => a.price - b.price;  // a, b inferred
products.sort(byPrice);

function onStoreChange(listener: Listener<CartState>): Unsubscribe {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

interface SearchProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
}
```

::: tip When to use
Callback props in components, event listener registries, strategy functions (comparators, validators, formatters), and anything returned from a function (unsubscribe/cleanup).
:::

## Call Signatures and Callable Objects

> Inside an object type, `(args): R` describes something that is **callable and has properties** at the same time.

```ts
type Formatter = {
  (value: number): string;      // call signature
  locale: string;               // ...plus a property
};

const currency = ((v: number) =>
  new Intl.NumberFormat(currency.locale, { style: 'currency', currency: 'EUR' }).format(v)
) as Formatter;
currency.locale = 'pt-PT';
currency(1999.5);

// Construct signatures describe things called with `new`
type WidgetConstructor = { new (el: HTMLElement): Widget };
function mount(Ctor: WidgetConstructor, el: HTMLElement) { return new Ctor(el); }
```

::: tip When to use
Typing libraries that expose functions with attached config (`axios`, `dayjs`, `debounce().cancel`), and plugin systems that receive classes to instantiate.
:::

## Callbacks Returning void

> A callback type returning `void` accepts functions that return anything. The return value is simply ignored.

```ts
type OnSave = () => void;
const save: OnSave = () => fetch('/api/save');   // returns a Promise: still allowed

// This is what makes common code compile
const results: string[] = [];
['a', 'b'].forEach((s) => results.push(s));     // push returns number

// But a function *declaration* with : void must not return a value
function notify(): void {
  return 'done';    // ❌
}
```

::: warning Gotcha
Floating promises: an async function passed where `() => void` is expected will not be awaited and its errors won't be caught. Lint with `@typescript-eslint/no-misused-promises`.
:::

::: tip When to use
Type event handlers and fire-and-forget callbacks as `void`-returning so callers can pass any function. Use `() => Promise<void>` when the caller must `await` it.
:::

## The this Parameter <Badge type="tip" text="extra" />

> A fake first parameter named `this` declares what `this` must be inside a function. It's erased from the output.

```ts
interface Button { label: string; el: HTMLButtonElement }

function handleClick(this: HTMLButtonElement, e: MouseEvent) {
  this.disabled = true;           // ✅ typed
}
button.addEventListener('click', handleClick);

const counter = {
  count: 0,
  inc(this: { count: number }) { this.count++; }
};
const inc = counter.inc;
inc();        // ❌ The 'this' context of type 'void' is not assignable
```

::: tip When to use
Plain `function` event handlers that use `this`, old-style plugin APIs (jQuery, Chart.js callbacks), and catching methods that are detached from their object.
:::
