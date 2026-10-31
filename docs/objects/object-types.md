# Object Types

Describing the shape of objects: optional and readonly properties, dictionaries, excess property checks and nesting.

## Object Type Literals

> Describe an object by listing its properties and their types, inline or through a `type`/`interface`.

```ts
function renderCard(product: { name: string; price: number; imageUrl: string }) {
  return `<h3>${product.name}</h3><p>${product.price}</p>`;
}

type Address = {
  street: string;
  city: string;
  zip: string;
  country: 'PT' | 'ES' | 'FR';
};

type Customer = {
  id: string;
  name: string;
  shipping: Address;
  billing: Address;
  tags: string[];
  // methods: two equivalent syntaxes
  fullAddress(): string;
  formatName: (style: 'short' | 'long') => string;
};
```

::: tip When to use
Inline object types for one-off parameters; named types for anything reused or that represents a domain concept (API payloads, DB rows, component props).
:::

## Optional Properties

> `prop?: T` marks a property that may be absent. Reading it gives `T | undefined`, so you must handle the missing case.

```ts
interface UserProfile {
  id: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  social?: { twitter?: string; github?: string };
}

function avatar(user: UserProfile) {
  return user.avatarUrl ?? `/avatars/default.png`;
}

const github = user.social?.github;   // string | undefined
```

::: tip When to use
Fields that are genuinely optional in your domain (bio, avatar), PATCH payloads, and config objects with defaults. If a property is "optional" only during object construction, consider separate types (`Draft` vs `Saved`) instead.
:::

## Readonly Properties

> `readonly` forbids reassigning a property after creation. It's compile-time only and **shallow**.

```ts
interface Order {
  readonly id: string;
  readonly createdAt: Date;
  status: 'pending' | 'paid';
  readonly items: readonly OrderItem[];
}

order.status = 'paid';     // ✅
order.id = 'x';            // ❌ cannot assign to 'id' because it is read-only
order.items.push(item);    // ❌ readonly array

order.createdAt.setFullYear(2000);   // ⚠️ allowed: readonly is shallow
```

::: tip When to use
IDs, timestamps and anything that should never change after creation; state objects in Redux/Zustand/signals where mutation is a bug. Use `Readonly<T>` to apply it to every property at once.
:::

## Index Signatures

> `[key: string]: T` describes objects used as dictionaries, where keys aren't known ahead of time.

```ts
interface Translations {
  [key: string]: string;
}
const pt: Translations = { 'nav.home': 'Início', 'nav.cart': 'Carrinho' };

interface FormErrors {
  [field: string]: string | undefined;
}

// Mixing known and dynamic keys: known ones must match the index type
interface Headers {
  'content-type': string;
  [name: string]: string;
}
```

::: warning Gotcha
By default, `dict['missing']` is typed `string`, not `string | undefined`. Enable `noUncheckedIndexedAccess` to make dictionary and array lookups honest.
:::

::: tip When to use
Translation tables, caches keyed by ID, HTTP headers, CSS-in-JS style objects. When keys are a known union, prefer `Record<Key, T>`.
:::

## Record

> `Record<K, V>` is the shorthand for an object whose keys are `K` and values are `V`. With a union of keys, **every key is required**.

```ts
type Locale = 'en' | 'pt' | 'es';
const greetings: Record<Locale, string> = {
  en: 'Hello',
  pt: 'Olá',
  es: 'Hola'          // removing a key is a compile error
};

type Status = 'idle' | 'loading' | 'success' | 'error';
const statusColor: Record<Status, string> = {
  idle: 'gray', loading: 'blue', success: 'green', error: 'red'
};

const cache: Record<string, Product> = {};          // free-form dictionary
const partial: Partial<Record<Locale, string>> = { en: 'Hi' };  // some keys
```

::: tip When to use
Lookup tables tied to a union (status → color, locale → label, role → permissions). Adding a new union member immediately shows every map that needs updating.
:::

## Excess Property Checks

> Object **literals** assigned directly to a typed target can't have unknown properties. This catches typos in config objects.

```ts
interface ChartOptions { width: number; height: number; animate?: boolean }

const opts: ChartOptions = { width: 400, height: 300, animat: true };
// ❌ Object literal may only specify known properties. Did you mean 'animate'?

// Only applies to fresh literals. A variable with extra props passes (structural typing)
const raw = { width: 400, height: 300, theme: 'dark' };
const opts2: ChartOptions = raw;   // ✅ no error
```

::: tip When to use
You benefit automatically when passing config literals to functions (`createChart({...})`). Know the loophole: if data comes from a variable, typos won't be caught, so build config objects inline or with `satisfies`.
:::

## Nested and Derived Object Types

> Reference parts of other types instead of duplicating them, so a change in one place propagates everywhere.

```ts
interface ApiUser {
  id: string;
  name: string;
  address: { city: string; country: string };
  preferences: { theme: 'light' | 'dark'; newsletter: boolean };
}

type Address = ApiUser['address'];                 // indexed access
type Theme = ApiUser['preferences']['theme'];      // 'light' | 'dark'

function updatePreferences(id: string, prefs: Partial<ApiUser['preferences']>) {}
```

::: tip When to use
When a nested shape only exists as part of a bigger API type, pull it out with indexed access rather than redefining it. See [Type Operators](/type-manipulation/operators).
:::

## Method vs Function-Property Syntax <Badge type="tip" text="extra" />

> Method shorthand (`m(): void`) is checked **bivariantly**, function properties (`m: () => void`) strictly. Prefer function properties.

```ts
interface Handlers {
  onSelect(item: Product): void;          // method syntax: looser
  onRemove: (item: Product) => void;      // property syntax: strict
}

declare function takesAnyItem(item: Product | Service): void;
declare function takesOnlyDigital(item: DigitalProduct): void;

const h: Handlers = {
  onSelect: takesOnlyDigital,   // ⚠️ allowed (unsafe)
  onRemove: takesOnlyDigital    // ❌ caught under strictFunctionTypes
};
```

::: tip When to use
Use property syntax for callbacks in props and handler maps to get the stricter check. Method syntax is fine for class-like interfaces you implement.
:::
