# Utility Types

The built-in type helpers you use every day, grouped by what they do, with the scenario for each.

## Partial and Required

> `Partial<T>` makes every property optional; `Required<T>` makes every property required.

```ts
interface Product { id: string; name: string; price: number; description: string }

// PATCH endpoint: send only what changed
async function updateProduct(id: string, changes: Partial<Omit<Product, 'id'>>) {
  return fetch(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}
updateProduct('p1', { price: 79 });

// Options with defaults merged into a fully required config
interface ToastOptions { duration?: number; position?: 'top' | 'bottom'; dismissible?: boolean }
const defaults: Required<ToastOptions> = { duration: 4000, position: 'bottom', dismissible: true };
function toast(msg: string, opts: ToastOptions = {}) {
  const config: Required<ToastOptions> = { ...defaults, ...opts };
}
```

::: tip When to use
`Partial`: update payloads, form drafts, test factories (`makeUser(overrides: Partial<User>)`). `Required`: the resolved config after merging defaults.
:::

## Readonly

> `Readonly<T>` marks every property `readonly` (shallow). `ReadonlyArray<T>` / `readonly T[]` for arrays.

```ts
interface AppState { user: User | null; cart: CartItem[] }

function reducer(state: Readonly<AppState>, action: Action): AppState {
  state.user = null;                 // ❌ forces you to return a new object
  return { ...state, user: null };
}

const FEATURES: ReadonlyArray<string> = ['search', 'wishlist'];
```

::: tip When to use
Reducer/store state, props objects, config, and function parameters you promise not to mutate. Use a `DeepReadonly` helper if nesting matters.
:::

## Pick and Omit

> `Pick<T, Keys>` keeps only some properties; `Omit<T, Keys>` removes some. Derive smaller types instead of redefining them.

```ts
interface User {
  id: string; email: string; name: string;
  passwordHash: string; createdAt: Date; role: 'admin' | 'user';
}

type PublicUser = Omit<User, 'passwordHash'>;                 // safe to send to the client
type UserPreview = Pick<User, 'id' | 'name'>;                // for avatars and lists
type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'passwordHash'> & { password: string };

// Component props reuse
type AvatarProps = Pick<User, 'name'> & { size?: 'sm' | 'lg' };
```

::: warning Gotcha
`Omit` doesn't check that the keys exist: `Omit<User, 'pasword'>` silently keeps `passwordHash`. Some teams use a strict version: `type StrictOmit<T, K extends keyof T> = Omit<T, K>`.
:::

::: tip When to use
DTOs (create/update/public versions of an entity), list item previews, and component props derived from domain models.
:::

## Record

> `Record<K, V>` builds an object type with keys `K` and values `V`.

```ts
type Role = 'admin' | 'editor' | 'viewer';
type Permission = 'read' | 'write' | 'delete';

const permissions: Record<Role, Permission[]> = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read']
};

const productsById: Record<string, Product> = Object.fromEntries(products.map((p) => [p.id, p]));
```

::: tip When to use
Lookup tables keyed by a union (exhaustive) and normalized state (`byId` maps).
:::

## Exclude, Extract and NonNullable

> Union filters: `Exclude<U, X>` removes members, `Extract<U, X>` keeps matching members, `NonNullable<T>` drops `null | undefined`.

```ts
type Status = 'draft' | 'scheduled' | 'published' | 'archived';
type EditableStatus = Exclude<Status, 'archived'>;           // 'draft' | 'scheduled' | 'published'

type Shape = { kind: 'circle'; r: number } | { kind: 'rect'; w: number; h: number } | { kind: 'line' };
type Circle = Extract<Shape, { kind: 'circle' }>;            // pick one union member by its tag
type Areaful = Exclude<Shape, { kind: 'line' }>;

type MaybeUser = User | null | undefined;
type DefinitelyUser = NonNullable<MaybeUser>;               // User
```

::: tip When to use
Restricting allowed statuses for an action, pulling one variant out of a discriminated union (e.g. for a component that renders only one block type), and cleaning nullable types.
:::

## ReturnType and Parameters

> `ReturnType<F>` and `Parameters<F>` extract the return type and the parameter tuple of a function type.

```ts
function createStore() {
  return { user: null as User | null, theme: 'light' as 'light' | 'dark', cart: [] as CartItem[] };
}
type Store = ReturnType<typeof createStore>;

// Wrapping a third-party function without retyping it
import { track } from 'some-analytics';
type TrackArgs = Parameters<typeof track>;     // [event: string, props?: {...}]
const safeTrack = (...args: TrackArgs) => { try { track(...args); } catch {} };

type Timer = ReturnType<typeof setTimeout>;    // number or NodeJS.Timeout
type FirstParam = Parameters<typeof fetch>[0]; // RequestInfo | URL
```

::: tip When to use
Typing state created by factory functions, wrapping SDK functions (analytics, logging) and when a library doesn't export the type you need.
:::

## Awaited

> `Awaited<T>` unwraps the value a Promise resolves to, recursively. Pair it with `ReturnType` for async functions.

```ts
async function getDashboard() {
  const [stats, orders] = await Promise.all([fetchStats(), fetchOrders()]);
  return { stats, orders };
}

type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
// { stats: Stats; orders: Order[] }

// Next.js / Remix loaders
export async function loader() { return { products: await db.product.findMany() }; }
type LoaderData = Awaited<ReturnType<typeof loader>>;
```

::: tip When to use
Deriving types from async functions you already wrote (loaders, server actions, API services) instead of maintaining a parallel interface.
:::

## InstanceType and ConstructorParameters

> `InstanceType<C>` gives the instance type of a class constructor; `ConstructorParameters<C>` its constructor arguments.

```ts
class Modal { constructor(public el: HTMLElement, public opts: { closeOnEsc: boolean }) {} }

type ModalInstance = InstanceType<typeof Modal>;
type ModalArgs = ConstructorParameters<typeof Modal>;   // [el: HTMLElement, opts: {...}]

function createMany<C extends new (...args: any[]) => any>(Ctor: C, argsList: ConstructorParameters<C>[]) {
  return argsList.map((args) => new Ctor(...args) as InstanceType<C>);
}

// Vue: typing a template ref to a component
const modalRef = ref<InstanceType<typeof MyModal> | null>(null);
```

::: tip When to use
Factories and DI containers, and typing refs to class-based or Vue SFC components.
:::

## Writing Your Own Utilities <Badge type="tip" text="extra" />

> A handful of small project utilities cover what the built-ins don't. Keep them in one `types/utils.ts`.

```ts
export type Nullable<T> = T | null;
export type ValueOf<T> = T[keyof T];
export type Prettify<T> = { [K in keyof T]: T[K] } & {};
export type SetOptional<T, K extends keyof T> = Prettify<Omit<T, K> & Partial<Pick<T, K>>>;
export type SetRequired<T, K extends keyof T> = Prettify<Omit<T, K> & Required<Pick<T, K>>>;
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;
export type ArrayElement<A> = A extends readonly (infer E)[] ? E : never;

// Make only `id` optional (e.g. for an upsert)
type ProductUpsert = SetOptional<Product, 'id'>;
```

::: tip When to use
When the same `Omit & Partial<Pick>` combination appears in several places. Libraries like `type-fest` and `ts-essentials` ship tested versions of all of these.
:::
