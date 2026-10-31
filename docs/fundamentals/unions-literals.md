# Unions, Literals & Aliases

Combining types: "this or that" (unions), "this and that" (intersections), exact values (literals) and naming it all (aliases).

## Union Types

> `A | B` means a value can be **either** type. You can only use members that exist on **all** of them until you narrow.

```ts
function formatId(id: string | number) {
  id.toUpperCase();                      // ❌ doesn't exist on number
  return typeof id === 'string' ? id.toUpperCase() : `#${id}`;
}

let width: number | 'auto' = 'auto';
type Nullable<T> = T | null;

// Arrays of a union vs union of arrays
const a: (string | number)[] = ['a', 1];   // each item may be either
const b: string[] | number[] = [1, 2];     // all one or all the other
```

::: tip When to use
IDs that can be strings or numbers, CSS-like values (`number | 'auto'`), nullable values, and functions that accept several input formats (`Date | string | number`).
:::

## Literal Types

> A literal type is an **exact value** used as a type: `'dark'`, `404`, `true`. Combined in unions, they replace magic strings.

```ts
type Theme = 'light' | 'dark' | 'system';
type ButtonSize = 'sm' | 'md' | 'lg';
type HttpSuccess = 200 | 201 | 204;

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
setTheme('dark');      // ✅ autocompletes in the editor
setTheme('blue');      // ❌ typo caught at compile time

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: ButtonSize;
}
```

::: tip When to use
Component variants, theme names, sort directions (`'asc' | 'desc'`), HTTP methods, event names: any parameter that only accepts a known set of strings. You get autocomplete and typo protection for free.
:::

## Type Aliases

> `type Name = ...` gives a reusable name to any type: unions, objects, functions, tuples.

```ts
type ID = string | number;
type Money = { amount: number; currency: 'EUR' | 'USD' };
type Validator = (value: string) => string | null;   // error message or null
type Pair<T> = [T, T];

type CartItem = {
  productId: ID;
  quantity: number;
  unitPrice: Money;
};

const required: Validator = (v) => (v.trim() ? null : 'Required');
```

::: tip When to use
Give names to anything you repeat or that carries domain meaning (`Money`, `CartItem`, `Validator`). Aliases are mandatory for unions, tuples and function types, since interfaces can't express those.
:::

## Intersection Types

> `A & B` combines types: the value must satisfy **all** of them at once. Typical for mixing in extra properties.

```ts
type Timestamps = { createdAt: Date; updatedAt: Date };
type WithId = { id: string };

type Product = { name: string; price: number };
type ProductRecord = Product & WithId & Timestamps;

const p: ProductRecord = {
  id: 'p1', name: 'Mouse', price: 25,
  createdAt: new Date(), updatedAt: new Date()
};

// Extending props in components
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean };
```

::: warning Gotcha
Intersecting incompatible properties produces `never`: `{ id: string } & { id: number }` makes `id` impossible to satisfy. Interfaces with `extends` report that conflict as an error instead, which is easier to debug.
:::

::: tip When to use
Adding DB fields (`id`, timestamps) to a domain type, combining HTML element props with custom props, and composing small reusable "trait" types.
:::

## Template Literal Types

> Build string types from other string types using backtick syntax, the same way template strings build values.

```ts
type Size = 'sm' | 'md' | 'lg';
type Color = 'primary' | 'danger';
type ButtonClass = `btn-${Color}-${Size}`;   // 6 combinations

type CssUnit = 'px' | 'rem' | '%';
type CssLength = `${number}${CssUnit}`;
const gap: CssLength = '1.5rem';     // ✅
const bad: CssLength = '1.5em';      // ❌

type EventName = 'click' | 'focus';
type Handler = `on${Capitalize<EventName>}`;   // 'onClick' | 'onFocus'

type ApiRoute = `/api/${string}`;
function get(url: ApiRoute) {}
get('/api/users');   // ✅
get('/users');       // ❌
```

::: tip When to use
CSS class/utility names, typed route strings, event handler names, i18n keys (`'home.title'`), and environment variable prefixes. More advanced uses in [Type Operators](/type-manipulation/operators).
:::

## Optional vs `| undefined`

> `prop?: T` means the key may be **missing**. `prop: T | undefined` means the key must be **present**, possibly undefined.

```ts
type A = { nickname?: string };
type B = { nickname: string | undefined };

const a: A = {};                       // ✅
const b: B = {};                       // ❌ property 'nickname' is missing
const b2: B = { nickname: undefined }; // ✅

function greet(name?: string) {}       // can be called as greet()
function greet2(name: string | undefined) {}  // must be called as greet2(undefined)
```

::: tip When to use
Optional (`?`) for config objects and props callers usually skip. `T | undefined` when you want to force callers to think about the value explicitly (e.g. an update payload where "unset" must be intentional). `exactOptionalPropertyTypes` makes this distinction even stricter.
:::
