# Type Operators

Building types from other types and from values: `keyof`, `typeof`, indexed access and template literal types.

## keyof

> `keyof T` produces a union of the property names of `T`.

```ts
interface User { id: string; email: string; age: number }
type UserKey = keyof User;                // 'id' | 'email' | 'age'

function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Sortable columns limited to real fields
interface TableProps<Row> {
  rows: Row[];
  sortBy: keyof Row;
}

type Dict = { [key: string]: number };
type DictKey = keyof Dict;                // string | number (numeric keys are allowed in JS)
```

::: tip When to use
Anything that accepts a property name: sort/filter by column, form field names, `pick`/`omit` helpers, i18n key unions from a dictionary object.
:::

## typeof (Type Query)

> In a type position, `typeof value` gives you the type of an existing variable. Write the value once, derive the type.

```ts
const defaultSettings = {
  theme: 'light' as 'light' | 'dark',
  language: 'en',
  notifications: { email: true, push: false }
};
type Settings = typeof defaultSettings;

function createLogger(prefix: string) {
  return { info: (msg: string) => {}, error: (err: unknown) => {} };
}
type Logger = ReturnType<typeof createLogger>;

const en = { 'nav.home': 'Home', 'nav.cart': 'Cart' };
type TranslationKey = keyof typeof en;          // 'nav.home' | 'nav.cart'
function t(key: TranslationKey) {}
```

::: tip When to use
Deriving types from config objects, default state, translation files, factory functions and imported JSON (`typeof import('./en.json')`). The value stays the single source of truth.
:::

## Indexed Access Types

> `T['key']` looks up the type of a property. Works with unions of keys, nested paths and arrays (`T[number]`).

```ts
interface Order {
  id: string;
  status: 'pending' | 'paid' | 'shipped';
  customer: { name: string; address: { city: string } };
  items: { sku: string; qty: number }[];
}

type Status = Order['status'];                   // 'pending' | 'paid' | 'shipped'
type City = Order['customer']['address']['city'];// string
type OrderItem = Order['items'][number];         // { sku: string; qty: number }
type IdOrStatus = Order['id' | 'status'];        // string | 'pending' | ...

const PLANS = ['free', 'pro', 'team'] as const;
type Plan = (typeof PLANS)[number];              // 'free' | 'pro' | 'team'
```

::: tip When to use
Extracting a nested shape from a generated API type (OpenAPI, GraphQL codegen, Supabase types) instead of redefining it, and turning `as const` arrays into unions.
:::

## Value-of-Object Pattern

> `T[keyof T]` gives the union of all property **value** types, the counterpart of `keyof`.

```ts
const HttpStatus = { Ok: 200, Created: 201, NotFound: 404 } as const;
type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];   // 200 | 201 | 404

type ValueOf<T> = T[keyof T];

interface EventMap { login: { userId: string }; logout: undefined; purchase: { total: number } }
type AnyEventPayload = ValueOf<EventMap>;
```

::: tip When to use
Turning constant objects into unions of their values (status codes, routes, event names) and the `as const` enum alternative.
:::

## Template Literal Types in Depth

> Template literal types combine with unions, `keyof` and intrinsic helpers (`Uppercase`, `Capitalize`...) to generate string types.

```ts
type Entity = 'user' | 'order';
type Action = 'created' | 'updated' | 'deleted';
type DomainEvent = `${Entity}.${Action}`;      // 'user.created' | 'user.updated' | ... (6)

// Getter names from an object
type Getters<T> = { [K in keyof T & string as `get${Capitalize<K>}`]: () => T[K] };
type UserGetters = Getters<{ name: string; age: number }>;
// { getName: () => string; getAge: () => number }

// Parse parts of a string type with infer
type RouteParams<Path extends string> =
  Path extends `${string}:${infer Param}/${infer Rest}` ? Param | RouteParams<`/${Rest}`>
  : Path extends `${string}:${infer Param}` ? Param
  : never;

type P = RouteParams<'/shops/:shopId/products/:productId'>;   // 'shopId' | 'productId'
function navigate<Path extends string>(path: Path, params: Record<RouteParams<Path>, string>) {}
navigate('/users/:id', { id: '42' });     // ✅ params required and checked
```

::: tip When to use
Typed event names (`'user.created'`), typed router params (this is how TanStack Router and Hono type paths), CSS variable names, and generating method names from data.
:::

## Intrinsic String Types

> Built-in `Uppercase<S>`, `Lowercase<S>`, `Capitalize<S>` and `Uncapitalize<S>` transform string literal types.

```ts
type Method = 'get' | 'post';
type UpperMethod = Uppercase<Method>;          // 'GET' | 'POST'

type EnvKey = 'api_url' | 'sentry_dsn';
type EnvVar = `VITE_${Uppercase<EnvKey>}`;     // 'VITE_API_URL' | 'VITE_SENTRY_DSN'

type Handlers<E extends string> = { [K in E as `on${Capitalize<K>}`]?: () => void };
type ModalHandlers = Handlers<'open' | 'close'>;   // { onOpen?, onClose? }
```

::: tip When to use
Mapping between naming conventions: HTTP method casing, env var names, `onX` handler props from event names, CSS custom property names.
:::

## typeof import and Module Types <Badge type="tip" text="extra" />

> `typeof import('./module')` types a whole module, useful for lazy imports and JSON files.

```ts
type I18nMessages = typeof import('./locales/en.json');   // needs resolveJsonModule

let chartLib: typeof import('chart.js') | undefined;
async function loadChart() {
  chartLib ??= await import('chart.js');   // typed lazy loading
  return chartLib;
}
```

::: tip When to use
Typing dynamically imported (code-split) libraries, and deriving translation key types from the default locale JSON.
:::
