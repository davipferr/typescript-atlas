# Narrowing & Type Guards

How TypeScript refines a wide type into a specific one by following your runtime checks.

## Control Flow Analysis

> TypeScript follows `if`, `return`, `throw`, `switch` and assignments, and **narrows** the type of a variable in each branch.

```ts
function render(value: string | number | null) {
  if (value === null) return '—';          // null handled and gone
  // value: string | number
  if (typeof value === 'number') {
    return value.toFixed(2);               // number
  }
  return value.trim();                     // string
}

let input: string | string[] = getQuery();
if (!Array.isArray(input)) input = [input];
input;                                     // string[] after the assignment
```

::: tip When to use
You get it for free. Write your checks as **early returns** (guard clauses): the remaining code ends up with clean, narrow types.
:::

## typeof Guards

> `typeof x === 'string' | 'number' | 'boolean' | 'bigint' | 'symbol' | 'undefined' | 'function' | 'object'` narrows primitives.

```ts
function toCents(price: number | string): number {
  if (typeof price === 'string') {
    return Math.round(parseFloat(price.replace(',', '.')) * 100);
  }
  return Math.round(price * 100);
}

function call(cb: (() => void) | string) {
  typeof cb === 'function' ? cb() : console.log(cb);
}
```

::: warning Gotcha
`typeof null === 'object'`. A check like `typeof x === 'object'` still leaves `null` in the type: combine it with `x !== null`.
:::

::: tip When to use
Functions that accept multiple primitive formats (price as string or number, a callback or a URL string), and the first step of validating `unknown` data.
:::

## Truthiness and Equality Narrowing

> `if (x)`, `x != null`, `===` and `switch` all narrow. Comparing two values narrows both to what they have in common.

```ts
function greet(name?: string | null) {
  if (!name) return 'Hello, guest';     // removes undefined, null AND ''
  return `Hello, ${name}`;              // string
}

function setQty(qty: number | null | undefined) {
  if (qty != null) save(qty);           // != null removes both null and undefined, keeps 0
}

function sync(a: string | number, b: string | boolean) {
  if (a === b) {
    a.toUpperCase();                    // both narrowed to string
  }
}
```

::: warning Gotcha
Truthiness also drops `0`, `''` and `NaN`. For numbers and strings where those are valid values, use `!= null` or `!== undefined` instead of `if (x)`.
:::

::: tip When to use
Optional values (`user?.name`), quantities and counters (use `!= null`), and comparing against literal constants.
:::

## The in Operator

> `'prop' in obj` narrows a union to the members that have that property.

```ts
type Card = { cardNumber: string; cvc: string };
type PayPal = { email: string };
type Payment = Card | PayPal;

function describe(p: Payment) {
  if ('cardNumber' in p) return `Card •••• ${p.cardNumber.slice(-4)}`;
  return `PayPal (${p.email})`;
}

// Also the way to check unknown objects
function hasMessage(e: unknown): e is { message: string } {
  return typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string';
}
```

::: tip When to use
Unions of object types that don't share a discriminant field, and validating the shape of `unknown` values (`'data' in json`).
:::

## instanceof Guards

> `x instanceof Class` narrows to that class. Works with built-ins (`Date`, `Error`, `HTMLElement`) and your own classes.

```ts
function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('pt-PT');
}

try {
  await saveOrder(order);
} catch (err) {
  if (err instanceof ValidationError) showFieldErrors(err.fields);
  else if (err instanceof DOMException && err.name === 'AbortError') return;
  else throw err;
}

document.addEventListener('click', (e) => {
  if (e.target instanceof HTMLButtonElement) e.target.disabled = true;
});
```

::: tip When to use
Error handling with custom error classes, DOM event targets, and inputs that may be a `Date`, `File`, `Blob` or `URL` object.
:::

## User-Defined Type Predicates

> A function returning `value is T` becomes a reusable guard: when it returns true, the caller's variable is narrowed to `T`.

```ts
interface Product { id: string; name: string; price: number }

function isProduct(x: unknown): x is Product {
  return (
    typeof x === 'object' && x !== null &&
    'id' in x && typeof x.id === 'string' &&
    'price' in x && typeof x.price === 'number'
  );
}

const data: unknown = await res.json();
if (isProduct(data)) addToCart(data);

// Filtering: the predicate narrows the array type
const items = [product, null, product2].filter((p): p is Product => p !== null);  // Product[]

// Since TS 5.5 simple predicates are inferred automatically
const valid = [1, null, 2].filter((n) => n !== null);   // number[]
```

::: warning Gotcha
TypeScript trusts your predicate blindly. If the implementation is wrong, the types lie. For complex shapes, generate guards from a schema (Zod) instead of writing them by hand.
:::

::: tip When to use
Reusable checks for `unknown` data, removing `null`/`undefined` from arrays, and narrowing union members in `.filter()`/`.find()`.
:::

## Assertion Functions

> A function with `asserts x is T` (or `asserts x`) throws if the check fails. After the call, the variable is narrowed.

```ts
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertIsDefined<T>(value: T, name: string): asserts value is NonNullable<T> {
  if (value == null) throw new Error(`${name} is required`);
}

const root = document.getElementById('root');
assertIsDefined(root, '#root');
root.append(app);                    // HTMLElement, no null

const apiUrl = import.meta.env.VITE_API_URL;
assert(typeof apiUrl === 'string', 'VITE_API_URL missing');
```

::: tip When to use
Startup checks (env vars, required DOM nodes), invariants inside reducers, and test helpers. Assertion functions must be declared with an explicit type annotation when stored in a `const`.
:::

## Narrowing Pitfalls in Callbacks <Badge type="tip" text="extra" />

> Narrowing on a `let` or object property is reset inside callbacks, because the value could change before the callback runs.

```ts
let user: User | null = getUser();
if (user) {
  button.addEventListener('click', () => {
    user.name;          // ❌ possibly null (it's a let; may be reassigned)
  });
}

// Fix: copy into a const
if (user) {
  const u = user;
  button.addEventListener('click', () => u.name);   // ✅
}

// Property narrowing is lost after function calls that might mutate
if (state.user) {
  doSomething();
  state.user.name;     // still narrowed (TS is optimistic), but beware real mutations
}
```

::: tip When to use
When a variable is narrowed outside but "possibly null" inside an arrow function, copy it into a `const` before the callback.
:::
