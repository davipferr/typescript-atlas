# Conditional & Mapped Types

Types that make decisions (`T extends U ? X : Y`), extract parts with `infer`, and transform every property of an object type.

## Conditional Types

> `T extends U ? X : Y` picks a type based on whether `T` is assignable to `U`, like a ternary at the type level.

```ts
type IsString<T> = T extends string ? true : false;
type A = IsString<'hi'>;    // true
type B = IsString<42>;      // false

// Return type depends on an argument
type ApiReturn<Format extends 'json' | 'blob'> = Format extends 'json' ? unknown : Blob;

async function download<F extends 'json' | 'blob'>(url: string, format: F): Promise<ApiReturn<F>> {
  const res = await fetch(url);
  return (format === 'json' ? res.json() : res.blob()) as Promise<ApiReturn<F>>;
}

const file = await download('/report.pdf', 'blob');   // Blob
```

::: tip When to use
Library-level typing where the output depends on an option (`{ multiple: true }` → array), and building your own utility types. In app code you'll mostly **consume** conditional types rather than write them.
:::

## Distributive Conditional Types

> When `T` is a naked type parameter and receives a union, the conditional is applied **to each member** separately.

```ts
type ToArray<T> = T extends unknown ? T[] : never;
type R = ToArray<string | number>;         // string[] | number[]  (not (string | number)[])

// This is how Exclude and Extract work
type MyExclude<T, U> = T extends U ? never : T;
type Status = 'idle' | 'loading' | 'success' | 'error';
type Finished = MyExclude<Status, 'idle' | 'loading'>;   // 'success' | 'error'

// Wrap in a tuple to disable distribution
type ToArrayNonDist<T> = [T] extends [unknown] ? T[] : never;
type R2 = ToArrayNonDist<string | number>; // (string | number)[]
```

::: tip When to use
Filtering union members (`Exclude`, `Extract`, removing `null`), and mapping a union of event types to a union of handler types. Remember the `[T]` trick when distribution gives surprising results.
:::

## infer

> Inside a conditional type, `infer X` captures a part of the matched type into a new type variable.

```ts
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type Item = ElementOf<Product[]>;                 // Product

type UnwrapPromise<T> = T extends Promise<infer V> ? V : T;
type U = UnwrapPromise<Promise<User[]>>;          // User[]

type FirstArg<F> = F extends (first: infer A, ...rest: any[]) => any ? A : never;
type Evt = FirstArg<(e: MouseEvent, extra: number) => void>;   // MouseEvent

// Real use: get the data type from an existing API function
declare function fetchDashboard(): Promise<{ revenue: number; orders: Order[] }>;
type Dashboard = Awaited<ReturnType<typeof fetchDashboard>>;
```

::: tip When to use
Extracting types you don't own: the resolved type of an API function, the props of a third-party component, the element type of an array, a route param from a string. Built-ins like `ReturnType`, `Parameters` and `Awaited` are all `infer` under the hood.
:::

## Mapped Types

> `{ [K in Keys]: Type }` creates an object type by iterating over a union of keys, usually `keyof T`.

```ts
type FormValues = { email: string; password: string; remember: boolean };

type FormErrors<T> = { [K in keyof T]?: string };
type FormTouched<T> = { [K in keyof T]: boolean };

const errors: FormErrors<FormValues> = { email: 'Invalid email' };
const touched: FormTouched<FormValues> = { email: true, password: false, remember: false };

// Feature flags from a list of names
type Flags<Names extends string> = { [K in Names]: boolean };
type AppFlags = Flags<'newCheckout' | 'darkMode' | 'aiSearch'>;
```

::: tip When to use
Deriving related shapes from one source type: form errors/touched/dirty maps, loading flags per field, validation rules per field, permission matrices. Change the source type and every derived type follows.
:::

## Mapping Modifiers (readonly, ?)

> In mapped types, add or remove `readonly` and `?` with `+` and `-`.

```ts
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Concrete<T> = { [K in keyof T]-?: T[K] };   // remove optional
type Frozen<T> = { +readonly [K in keyof T]: T[K] };

interface DraftPost { title?: string; body?: string; readonly id: string }
type PublishedPost = Concrete<DraftPost>;   // title and body now required

// Build-in equivalents: Partial, Required, Readonly
```

::: tip When to use
Converting a draft/form type into a validated type (`Concrete<Draft>`), and unlocking a readonly type in internal builder code (`Mutable<T>`).
:::

## Key Remapping with as

> `[K in keyof T as NewKey]` renames keys, or filters them out by mapping to `never`.

```ts
// Rename: generate event handler props from state
type ChangeHandlers<T> = {
  [K in keyof T & string as `on${Capitalize<K>}Change`]: (value: T[K]) => void;
};
type FilterHandlers = ChangeHandlers<{ query: string; minPrice: number }>;
// { onQueryChange: (v: string) => void; onMinPriceChange: (v: number) => void }

// Filter: keep only function properties
type Methods<T> = { [K in keyof T as T[K] extends Function ? K : never]: T[K] };

// Filter: drop private-ish keys before sending to the client
type Public<T> = { [K in keyof T as K extends `_${string}` ? never : K]: T[K] };
type SafeUser = Public<{ id: string; name: string; _passwordHash: string }>;   // { id; name }
```

::: tip When to use
Generating handler/setter names, picking properties **by value type** (all `string` fields for a search index, all methods for a proxy), and stripping internal fields from DTOs.
:::

## Recursive Types

> Types can reference themselves, which models trees and lets utilities go deep into nested objects.

```ts
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

interface MenuItem {
  label: string;
  href?: string;
  children?: MenuItem[];
}

type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
type DeepReadonly<T> = T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

function updateSettings(patch: DeepPartial<Settings>) {}
updateSettings({ notifications: { email: false } });   // nested partial update

// Dot-paths of an object: 'user' | 'user.address' | 'user.address.city'
type Paths<T> = T extends object
  ? { [K in keyof T & string]: K | `${K}.${Paths<T[K]>}` }[keyof T & string]
  : never;
```

::: tip When to use
JSON values, navigation trees, comment threads, file explorers; deep partial updates for settings; typed dot-path helpers like `get(obj, 'a.b.c')` and form libraries (React Hook Form's `register('address.city')`).
:::

## Prettify / Simplify <Badge type="tip" text="extra" />

> A tiny mapped type that flattens intersections into a single object type so editor tooltips become readable.

```ts
type Prettify<T> = { [K in keyof T]: T[K] } & {};

type UserRow = { id: string } & { name: string } & Timestamps;
// hover: { id: string } & { name: string } & Timestamps  🤷

type UserRowPretty = Prettify<UserRow>;
// hover: { id: string; name: string; createdAt: Date; updatedAt: Date }  ✅
```

::: tip When to use
Public types built from many intersections or utilities (`Omit<A, 'x'> & B`), so consumers see the final shape on hover.
:::
