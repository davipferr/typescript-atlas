# Generic Basics

Type parameters: write a function, type or class once and let it adapt to whatever type it's used with.

## Why Generics

> A generic is a **type parameter**: a placeholder filled in at each use, so the relationship between input and output types is preserved.

```ts
// any: works, but loses the type
function firstAny(items: any[]): any { return items[0]; }
const a = firstAny(['x']);         // any

// Generic: T is captured from the argument
function first<T>(items: T[]): T | undefined { return items[0]; }
const b = first(['x', 'y']);       // string | undefined
const c = first([{ id: 1 }]);      // { id: number } | undefined
```

::: tip When to use
Whenever the output type depends on the input type: collection helpers, wrappers, containers, API helpers. If a type parameter appears **only once** in a signature, you probably don't need it.
:::

## Generic Functions

> Declare type parameters in angle brackets before the parameter list. They're usually **inferred** from the arguments.

```ts
function uniqueBy<T>(items: T[], key: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
const uniqueUsers = uniqueBy(users, (u) => u.email);   // User[]

const toMap = <T, K>(items: T[], getKey: (item: T) => K) =>
  new Map(items.map((i) => [getKey(i), i] as const));   // Map<K, T>

// Explicit type argument when nothing to infer from
const ids = new Set<string>();
const state = useState<User | null>(null);
```

::: tip When to use
Let inference work by default. Pass type arguments explicitly when there's no argument to infer from (`useState<User | null>(null)`, `new Map<string, Product>()`, `fetchJson<Order[]>(url)`).
:::

## Generic Types and Interfaces

> Type aliases and interfaces can take parameters, turning them into reusable type templates.

```ts
interface ApiResponse<T> {
  data: T;
  meta: { requestId: string; durationMs: number };
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

async function listProducts(page: number): Promise<ApiResponse<Paginated<Product>>> {
  const res = await fetch(`/api/products?page=${page}`);
  return res.json();
}

const { data } = await listProducts(1);
data.items[0].price;     // fully typed through two generic layers
```

::: tip When to use
Envelope types your backend returns (`ApiResponse`, `Paginated`), result/option types, form state (`FormState<Values>`), and table column definitions (`Column<Row>`).
:::

## Multiple Type Parameters

> Use several parameters when a function relates several independent types.

```ts
function mapValues<K extends string, V, R>(obj: Record<K, V>, fn: (value: V, key: K) => R): Record<K, R> {
  const out = {} as Record<K, R>;
  for (const key in obj) out[key] = fn(obj[key], key);
  return out;
}

const prices = { basic: 900, pro: 2900 };
const formatted = mapValues(prices, (cents) => `€${(cents / 100).toFixed(2)}`);
// Record<'basic' | 'pro', string>

function zip<A, B>(a: A[], b: B[]): [A, B][] {
  return a.map((x, i) => [x, b[i]]);
}
```

::: tip When to use
Transformations where input, key and output types differ: `mapValues`, `zip`, `pairs`, adapters that convert one DTO into another.
:::

## Default Type Parameters

> `<T = Default>` gives a type parameter a fallback when it isn't provided or inferred.

```ts
interface FetchState<T = unknown, E = Error> {
  data?: T;
  error?: E;
  loading: boolean;
}

const s1: FetchState = { loading: true };              // T = unknown, E = Error
const s2: FetchState<User[]> = { loading: false, data: [] };

class EventBus<Events extends Record<string, unknown> = Record<string, unknown>> { /* ... */ }

// React does this: ComponentProps defaults, useRef<T = undefined>...
```

::: tip When to use
Library-style types where the common case shouldn't need type arguments: error types defaulting to `Error`, metadata defaulting to `Record<string, unknown>`, element types defaulting to `HTMLElement`.
:::

## Generic Classes

> Type parameters on a class are available to all its fields and methods.

```ts
class LruCache<K, V> {
  #map = new Map<K, V>();
  constructor(private readonly max = 100) {}

  get(key: K): V | undefined {
    const value = this.#map.get(key);
    if (value !== undefined) { this.#map.delete(key); this.#map.set(key, value); }
    return value;
  }

  set(key: K, value: V): void {
    this.#map.delete(key);
    this.#map.set(key, value);
    if (this.#map.size > this.max) this.#map.delete(this.#map.keys().next().value!);
  }
}

const imageCache = new LruCache<string, HTMLImageElement>(50);
```

::: tip When to use
Caches, queues, stores, repositories, observable/signal implementations. Note that **static** members can't use the class's type parameters.
:::

## Generic Components <Badge type="tip" text="extra" />

> UI components can be generic too, so props like `items` and `renderItem` stay connected.

```tsx
interface SelectProps<T> {
  options: T[];
  value: T | null;
  getLabel: (option: T) => string;
  onChange: (option: T) => void;
}

function Select<T>({ options, value, getLabel, onChange }: SelectProps<T>) {
  return (
    <ul role="listbox">
      {options.map((o) => (
        <li key={getLabel(o)} aria-selected={o === value} onClick={() => onChange(o)}>
          {getLabel(o)}
        </li>
      ))}
    </ul>
  );
}

<Select options={countries} value={country} getLabel={(c) => c.name} onChange={setCountry} />
// c is inferred as Country; onChange receives Country
```

::: tip When to use
Selects, autocompletes, data tables, lists and virtualized lists: any component whose callbacks receive the same item type you pass in. Vue supports this with `<script setup generic="T">`.
:::
