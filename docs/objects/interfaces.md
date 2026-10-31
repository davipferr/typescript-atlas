# Interfaces

Named contracts for object shapes: extending, merging, describing functions and classes, and when to choose `type` instead.

## Interfaces

> `interface Name { ... }` declares a named object shape. Any object with matching properties satisfies it.

```ts
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  isAvailable(): boolean;
}

const keyboard: Product = {
  id: 'p1', name: 'Keyboard', price: 89, stock: 4,
  isAvailable() { return this.stock > 0; }
};

function addToCart(product: Product, qty = 1) { /* ... */ }
```

::: tip When to use
API response shapes, component props, service contracts, domain entities: any object shape that's reused across files.
:::

## Extending Interfaces

> `interface B extends A` copies A's members into B. You can extend several interfaces at once.

```ts
interface Entity {
  id: string;
  createdAt: Date;
}

interface Timestamped {
  updatedAt: Date;
}

interface User extends Entity, Timestamped {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface AdminUser extends User {
  role: 'admin';                 // narrowing an inherited property is allowed
  permissions: string[];
}

interface Order extends Entity {
  status: string;
  status: number;                // ❌ conflicts are reported as errors
}
```

::: tip When to use
Building a family of related shapes (base entity → user → admin), and extending library types like `React.HTMLAttributes` with your own props.
:::

## Declaration Merging

> Two interfaces with the same name in the same scope **merge** into one. Types (`type`) can't do this.

```ts
interface Settings { theme: 'light' | 'dark' }
interface Settings { language: string }

const s: Settings = { theme: 'dark', language: 'pt' };   // both required

// The real use: adding properties to globals and library types
declare global {
  interface Window {
    dataLayer: unknown[];
    __APP_CONFIG__: { apiUrl: string };
  }
}
window.dataLayer.push({ event: 'page_view' });
```

::: warning Gotcha
Merging can happen by accident if you reuse a global name like `Event` or `Comment` in a non-module file. Put `export {}` or any import/export in the file to make it a module.
:::

::: tip When to use
Augmenting `Window`, `ProcessEnv`, Express's `Request`, Vue's `ComponentCustomProperties` and other library types. See [Declaration Files & Augmentation](/modules/declarations).
:::

## Interfaces for Functions

> An interface with a call signature describes a function. A function type alias is usually shorter.

```ts
interface Validator {
  (value: string): string | null;
}

type ValidatorAlt = (value: string) => string | null;   // same thing

const email: Validator = (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email');

// Useful when the function also has properties
interface Middleware {
  (req: Request, next: () => Promise<Response>): Promise<Response>;
  displayName: string;
}
```

::: tip When to use
Prefer `type X = (...) => R` for plain function types. Use the interface form only when the function also carries properties or overloads.
:::

## Implementing Interfaces in Classes

> `class X implements I` makes the compiler check that the class provides every member of the interface.

```ts
interface KeyValueStore {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

class LocalStorageAdapter implements KeyValueStore {
  get<T>(key: string) {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  set<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); }
  remove(key: string) { localStorage.removeItem(key); }
}

class MemoryStorage implements KeyValueStore {
  #data = new Map<string, unknown>();
  get<T>(key: string) { return (this.#data.get(key) as T) ?? null; }
  set<T>(key: string, value: T) { this.#data.set(key, value); }
  remove(key: string) { this.#data.delete(key); }
}

// Code depends on the interface, not on a specific class
function createCartService(storage: KeyValueStore) { /* ... */ }
createCartService(import.meta.env.SSR ? new MemoryStorage() : new LocalStorageAdapter());
```

::: tip When to use
Swappable implementations: storage adapters, payment providers, logger backends, and in-memory fakes for tests. `implements` only checks: it doesn't add any code or types to the class.
:::

## Interface vs Type Alias

> Both describe object shapes. Interfaces can merge and extend with clearer errors; type aliases can express unions, tuples, mapped and conditional types.

| Need | `interface` | `type` |
| --- | --- | --- |
| Object shape | ✅ | ✅ |
| Extend / combine | `extends` | `&` |
| Declaration merging | ✅ | ❌ |
| Unions, tuples, primitives | ❌ | ✅ |
| Mapped / conditional types | ❌ | ✅ |
| `implements` in a class | ✅ | ✅ (if it's an object type) |

```ts
interface ButtonProps { label: string; onClick: () => void }       // object shape

type Status = 'idle' | 'loading' | 'error';                        // union → type only
type Point = [number, number];                                      // tuple → type only
type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
```

::: tip When to use
Pick one convention for object shapes and be consistent. A common rule: **`interface` for public object contracts** (props, API models, things libraries may augment), **`type` for everything else** (unions, utilities, function types).
:::

## Optional and Readonly in Interfaces

> Interfaces support the same `?` and `readonly` modifiers as object types, plus index signatures.

```ts
interface AppConfig {
  readonly apiUrl: string;
  readonly env: 'development' | 'staging' | 'production';
  sentryDsn?: string;
  featureFlags: { readonly [flag: string]: boolean };
}

config.apiUrl = 'x';                 // ❌
config.featureFlags.newCheckout;     // boolean
```

::: tip When to use
App config loaded once at startup, feature flag maps, and any contract where consumers should read but not write.
:::
