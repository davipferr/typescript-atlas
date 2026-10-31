# Core Types

The vocabulary: primitives, arrays, tuples, enums, and the special types `void`, `never`, `null` and `undefined`.

## Primitive Types

> `string`, `number`, `boolean`, `bigint`, `symbol`, `null` and `undefined`, always written in **lowercase**.

```ts
const productName: string = 'Keyboard';
const price: number = 89.9;          // ints and floats are both number
const inStock: boolean = true;
const views: bigint = 9_007_199_254_740_993n;
const id: symbol = Symbol('id');

// ❌ The capitalized versions are wrapper objects, almost never what you want
const bad: String = 'x';
```

::: tip When to use
Every annotation starts here. Use `bigint` for IDs or counters beyond `Number.MAX_SAFE_INTEGER` (e.g. Twitter/Snowflake IDs from an API).
:::

## Arrays

> Two equivalent syntaxes: `string[]` and `Array<string>`. Add `readonly` to forbid mutation.

```ts
const prices: number[] = [10, 20, 30];
const users: Array<{ id: number; name: string }> = [];
const matrix: number[][] = [[1, 2], [3, 4]];
const mixed: (string | number)[] = ['a', 1];   // parentheses matter!

function sum(values: readonly number[]) {
  values.push(4);                 // ❌ push does not exist on readonly number[]
  return values.reduce((a, b) => a + b, 0);
}
```

::: tip When to use
`T[]` for simple element types, `Array<...>` when the element type is long. Accept `readonly T[]` in function parameters to promise callers you won't mutate their array.
:::

## Tuples

> A tuple is a fixed-length array where **each position has its own type**. Elements can be named, optional or rest.

```ts
type Coordinates = [lat: number, lng: number];
const lisbon: Coordinates = [38.72, -9.14];

// Returning multiple values, React-hook style
function useToggle(initial = false): [boolean, () => void] {
  let value = initial;
  return [value, () => (value = !value)];
}
const [isOpen, toggle] = useToggle();

type HttpResponse = [status: number, body: string, headers?: Record<string, string>];
type Args = [event: string, ...payload: unknown[]];

// Readonly tuples (what `as const` produces)
const RGB = [255, 128, 0] as const;    // readonly [255, 128, 0]
```

::: warning Gotcha
Tuples aren't fully locked: `push` still compiles on a mutable tuple. Use `readonly [..]` if length really matters.
:::

::: tip When to use
Hook-style return values (`[state, setState]`), coordinate pairs, CSV rows, `Object.entries` results, and function argument lists in generics.
:::

## Enums

> `enum` creates a named set of constants that exists **at runtime** as an object. String enums are the readable choice.

```ts
enum OrderStatus {
  Pending = 'PENDING',
  Paid = 'PAID',
  Shipped = 'SHIPPED'
}

function badgeColor(status: OrderStatus) {
  return status === OrderStatus.Paid ? 'green' : 'gray';
}
badgeColor(OrderStatus.Paid);
badgeColor('PAID');                    // ❌ string literal not accepted

// Numeric enums auto-increment and allow reverse mapping
enum Direction { Up, Down, Left, Right }   // 0, 1, 2, 3
Direction[0];                              // 'Up'
```

::: warning Gotcha
Enums are one of the few TS features that **generate JavaScript**, so they don't work under `erasableSyntaxOnly` / Node's type stripping. Numeric enums also accept any number (`badgeColor(42)` compiles in older TS versions).
:::

::: tip When to use
When a codebase already uses them (Angular, NestJS) or you want the runtime object for iteration. For new code, a **union of string literals** or an `as const` object usually does the same job with zero runtime cost. See [Unions, Literals & Aliases](/fundamentals/unions-literals).
:::

## The Enum Alternative: as const Objects <Badge type="tip" text="extra" />

> An `as const` object plus a derived union gives you enum-like constants that are plain JavaScript.

```ts
export const OrderStatus = {
  Pending: 'PENDING',
  Paid: 'PAID',
  Shipped: 'SHIPPED'
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
// 'PENDING' | 'PAID' | 'SHIPPED'

function setStatus(status: OrderStatus) { /* ... */ }
setStatus(OrderStatus.Paid);   // ✅
setStatus('PAID');             // ✅ raw strings from the API work too

Object.values(OrderStatus);    // iterate for a <select>
```

::: tip When to use
Status codes, roles, feature flags, event names: anything you'd reach for an enum for, especially when values arrive as plain strings from an API.
:::

## void

> `void` means "this function doesn't return anything useful". Callers shouldn't use the result.

```ts
function trackClick(label: string): void {
  analytics.send({ type: 'click', label });
}

// A callback typed as returning void may still return something; it's just ignored
const ids: number[] = [];
[1, 2, 3].forEach((n) => ids.push(n));   // push returns a number: fine
```

::: tip When to use
Event handlers, loggers, side-effect functions. In callback types, `void` is what lets you pass functions like `arr.push` without errors.
:::

## never

> `never` is the type of values that **can't exist**: functions that never return, and branches that should be impossible.

```ts
function fail(message: string): never {
  throw new Error(message);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}

type Shape = { kind: 'circle'; r: number } | { kind: 'square'; size: number };
function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return Math.PI * s.r ** 2;
    case 'square': return s.size ** 2;
    default: return assertNever(s);   // compile error here if a new kind is added
  }
}
```

::: tip When to use
Throw helpers, infinite loops (workers, game loops), and **exhaustiveness checks** so adding a new union member forces you to handle it everywhere. Also appears in conditional types to "remove" members.
:::

## null and undefined

> With `strictNullChecks` (part of `strict`), `null` and `undefined` are their own types and must be declared explicitly.

```ts
let selectedUser: User | null = null;      // "no selection" is a valid state

function findUser(id: number): User | undefined {
  return users.find((u) => u.id === id);   // find returns T | undefined
}

const user = findUser(1);
user.name;                 // ❌ 'user' is possibly 'undefined'
user?.name;                // ✅ string | undefined
const name = user?.name ?? 'Guest';

const el = document.querySelector('#app');  // Element | null
el.innerHTML = '';         // ❌
```

::: tip When to use
Use `null` for "intentionally empty" (cleared selection, missing DB value) and `undefined` for "not provided" (optional params, missing keys). Strict null checks catch the classic "cannot read property of undefined" bugs at compile time, so never turn them off.
:::

## object, {} and Object

> `object` means "any non-primitive". `{}` means "anything except `null`/`undefined`". Neither is a good type for real data.

```ts
function track(payload: object) {}
track({ a: 1 });     // ✅
track('x');          // ❌ primitive

let anything: {} = 'hello';   // ✅ surprisingly allowed
anything = 42;                // ✅

// Better: describe the shape, or use Record for dictionaries
function sendEvent(payload: Record<string, unknown>) {}
```

::: tip When to use
`object` for generic constraints like `T extends object` (e.g. deep-clone helpers). For actual data, always write the shape or use `Record<string, unknown>`.
:::
