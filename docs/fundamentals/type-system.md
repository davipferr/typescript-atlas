# How the Type System Works

The mental model behind everything else: static types that vanish at runtime, inference, structural typing and the escape hatches.

## Static Types, Erased at Runtime

> TypeScript is JavaScript plus a type layer that is checked **at compile time** and then **completely removed**. No types exist when the code runs.

```ts
// What you write
function applyDiscount(price: number, percent: number): number {
  return price - (price * percent) / 100;
}

// What actually ships (types erased)
function applyDiscount(price, percent) {
  return price - (price * percent) / 100;
}

// ❌ Caught in the editor, before anything runs
applyDiscount('19.99', 10);
// Argument of type 'string' is not assignable to parameter of type 'number'.
```

**Consequences**
- Types cost nothing at runtime, but they also **protect nothing at runtime**: data from `fetch`, `localStorage` or a form is whatever it is.
- You can't ask "is this a `User`?" at runtime with a type. You need a real check (`typeof`, `in`, a schema). See [Runtime Validation](/async/runtime-validation).
- Type errors don't stop JavaScript from being emitted unless you configure `noEmitOnError`.

::: tip When to use
Always keep this in mind at the **boundaries** of your app (API responses, URL params, user input, third-party scripts). Inside the app, trust the types; at the edges, verify the data.
:::

## Type Annotations

> An annotation (`: Type`) tells the compiler what a variable, parameter or return value must be. Mismatches become compile errors.

```ts
let username: string = 'ana';
let retries: number = 3;
let isAdmin: boolean = false;

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

const tags: string[] = ['sale', 'new'];
let selectedId: number | null = null;   // nothing selected yet
```

::: tip When to use
Annotate **function parameters** (TypeScript can't infer them), **public return types** of exported functions (documents the contract and stops accidental changes), and variables declared without an initial value.
:::

## Type Inference

> When a value is assigned at declaration, TypeScript **infers** the type from it. Most local variables never need an annotation.

```ts
let count = 0;                  // number
const title = 'Dashboard';      // 'Dashboard' (literal: a const can't change)
const user = { id: 1, name: 'Ana', roles: ['admin'] };
// { id: number; name: string; roles: string[] }

const total = [12, 30, 8].reduce((sum, n) => sum + n, 0);   // number

// Return type inferred as { ok: boolean; data: string[] }
function loadTags() {
  return { ok: true, data: ['a', 'b'] };
}

// Contextual typing: the callback's parameters are inferred from where it's used
window.addEventListener('keydown', (e) => {
  e.key;            // e is KeyboardEvent, no annotation needed
});
```

::: tip When to use
Let inference do the work for locals, callbacks and simple returns. Redundant annotations (`const n: number = 5`) are noise. Add one only when the inferred type is too wide or too narrow for your intent.
:::

## Widening and Literal Types

> `let` widens a literal to its general type (`'GET'` → `string`), while `const` keeps the exact literal. This matters when a value must match a union.

```ts
let method = 'GET';            // string (could be reassigned to anything)
const fixed = 'GET';           // 'GET'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
function request(url: string, method: HttpMethod) { /* ... */ }

request('/api', fixed);        // ✅
request('/api', method);       // ❌ string is not assignable to HttpMethod

// Objects widen their properties too
const options = { method: 'GET' };          // { method: string }
request('/api', options.method);            // ❌

// Fixes: annotate, or freeze the literal with as const
const options2 = { method: 'GET' } as const;   // { readonly method: 'GET' }
request('/api', options2.method);              // ✅
```

::: tip When to use
When you get "`string` is not assignable to `'a' | 'b'`" on a config object, the fix is usually an annotation (`const opts: RequestOptions = ...`), `as const`, or `satisfies`. See [Assertions, satisfies & as const](/narrowing/assertions).
:::

## Structural Typing

> TypeScript compares types by **shape**, not by name. Any value with the required properties is compatible, regardless of where it came from.

```ts
interface Point { x: number; y: number }

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

class Vector { constructor(public x: number, public y: number, public z = 0) {} }
const mouse = { x: 10, y: 20, pressed: true };

distance(new Vector(1, 2), mouse);   // ✅ both have x and y: extra properties are fine

// Two unrelated aliases with the same shape are interchangeable
type UserId = string;
type OrderId = string;
const id: OrderId = 'u_123' as UserId;   // ✅ no error (see Branded Types for a fix)
```

::: tip When to use
Structural typing is why you can pass a plain object where an interface is expected, mock dependencies in tests with object literals, and accept any DOM-like object. When two same-shaped types must **not** be mixed (IDs, currencies), use [branded types](/patterns/type-safe-patterns).
:::

## any vs unknown

> `any` switches type checking off for a value. `unknown` means "could be anything, prove it before use". Prefer `unknown`.

```ts
const raw: any = JSON.parse(text);
raw.user.profile.name.toUpperCase();   // compiles, may crash at runtime
const n: number = raw;                 // any spreads silently into typed code

const data: unknown = JSON.parse(text);
data.user;                             // ❌ 'data' is of type 'unknown'

if (typeof data === 'object' && data !== null && 'user' in data) {
  data.user;                           // ✅ narrowed first
}

// unknown is the honest type for anything external
function handleMessage(event: MessageEvent<unknown>) {
  if (isChatMessage(event.data)) render(event.data);
}
```

::: warning Gotcha
`JSON.parse`, `response.json()` and `localStorage.getItem` + parse return `any` by default. Immediately assign the result to `unknown` (or validate it) so `any` doesn't leak through your codebase.
:::

::: tip When to use
`unknown`: parsed JSON, `catch` errors, `postMessage` payloads, values from third-party scripts. `any`: only as a temporary step while migrating JS, or in rare internal generic plumbing. Enable `noImplicitAny` (part of `strict`) so it never appears by accident.
:::

## Type Checking Is Gradual

> You can adopt types incrementally: JS files can be checked with JSDoc, strictness can be raised step by step, and suppressions exist for edge cases.

```ts
// @ts-expect-error: the test intentionally passes a wrong type
formatPrice('10', 'EUR');

// In a plain .js file, with "checkJs": true or // @ts-check at the top
/** @param {number} cents @param {string} currency */
export function formatPrice(cents, currency) { /* ... */ }
```

::: tip When to use
Migrating an existing JS project, or keeping a build-free JS library type-checked. Details in [Type-Checking Workflow](/compiler/workflow).
:::
