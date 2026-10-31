# Class Basics

What TypeScript adds to JavaScript classes: declared fields, access modifiers, parameter properties and stricter initialization.

## Class Fields and Types

> Every property must be declared in the class body with a type (or an initializer it can infer from).

```ts
class ShoppingCart {
  items: CartItem[] = [];          // inferred and initialized
  couponCode: string | null = null;
  readonly currency: 'EUR' | 'USD';
  createdAt = new Date();

  constructor(currency: 'EUR' | 'USD') {
    this.currency = currency;
  }

  get total(): number {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  add(item: CartItem): this {
    this.items.push(item);
    return this;
  }
}

// ❌ strictPropertyInitialization: declared but never assigned
class Broken { name: string; }
```

::: tip When to use
Any class: domain models, services, API clients, custom elements. With `strict`, TS guarantees every field is initialized or explicitly optional.
:::

## Access Modifiers: public, private, protected

> `public` (default) is visible everywhere, `private` only inside the class, `protected` inside the class and subclasses. **Compile-time only**.

```ts
class ApiClient {
  public baseUrl: string;
  private token: string | null = null;
  protected retries = 3;

  constructor(baseUrl: string) { this.baseUrl = baseUrl; }

  setToken(token: string) { this.token = token; }

  protected async request<T>(path: string): Promise<T> {
    const res = await fetch(this.baseUrl + path, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {}
    });
    return res.json();
  }
}

class UsersApi extends ApiClient {
  list() { return this.request<User[]>('/users'); }   // ✅ protected is visible
  peek() { return this.token; }                        // ❌ private
}

const api = new UsersApi('/api');
api.request('/x');     // ❌ protected
```

::: tip When to use
Mark internals `private` to keep the public API small; use `protected` for hooks subclasses are meant to use or override (template-method pattern).
:::

## private vs #private

> TypeScript's `private` is erased (still accessible at runtime via `obj['field']`). JavaScript's `#field` is **truly private** at runtime.

```ts
class Session {
  private tsPrivate = 'visible in devtools, accessible with (s as any).tsPrivate';
  #jsPrivate = 'really hidden';

  static #instances = 0;
  #refresh() { /* private method */ }
}

const s = new Session();
(s as any).tsPrivate;   // works at runtime
(s as any).#jsPrivate;  // ❌ syntax error, impossible from outside
```

| | `private` | `#field` |
| --- | --- | --- |
| Enforced at runtime | ❌ | ✅ |
| Works with `JSON.stringify` / spread | included | not included |
| Accessible to tests via cast | ✅ | ❌ |
| Works with parameter properties | ✅ | ❌ |

::: tip When to use
`#field` for libraries and security-sensitive state (tokens, internal caches). `private` is fine for application code and when you need parameter properties or test access.
:::

## Parameter Properties

> Adding a modifier (`public`, `private`, `protected`, `readonly`) to a constructor parameter declares **and** assigns the field in one step.

```ts
// Without
class OrderService {
  private readonly http: HttpClient;
  private readonly logger: Logger;
  constructor(http: HttpClient, logger: Logger) {
    this.http = http;
    this.logger = logger;
  }
}

// With parameter properties
class OrderService2 {
  constructor(
    private readonly http: HttpClient,
    private readonly logger: Logger,
    public readonly region = 'eu-west-1'
  ) {}

  getOrders() { return this.http.get<Order[]>('/orders'); }
}
```

::: warning Gotcha
Parameter properties generate JavaScript, so they're not allowed under `erasableSyntaxOnly` (Node type stripping). Some teams avoid them for that reason.
:::

::: tip When to use
Dependency injection (Angular services, NestJS providers), small value classes and anything where the constructor just stores its arguments.
:::

## readonly Fields

> `readonly` fields can be assigned only in the declaration or the constructor.

```ts
class Money {
  constructor(readonly cents: number, readonly currency: 'EUR' | 'USD') {}

  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error('Currency mismatch');
    return new Money(this.cents + other.cents, this.currency);   // new instance
  }
}

const price = new Money(1999, 'EUR');
price.cents = 0;       // ❌
```

::: tip When to use
Value objects (`Money`, `DateRange`, `Coordinates`), IDs and injected dependencies. Immutable instances are easier to share across components and cache.
:::

## Getters, Setters and Static Members

> Accessors and `static` work like in JavaScript, with types. Getter and setter types may differ (TS 5.1+).

```ts
class Thermostat {
  static readonly MIN = 10;
  static readonly MAX = 30;
  static fromFahrenheit(f: number) { return new Thermostat((f - 32) / 1.8); }

  #celsius: number;
  constructor(c: number) { this.#celsius = c; }

  get celsius(): number { return this.#celsius; }
  set celsius(value: number | string) {             // accepts strings from inputs
    const n = Number(value);
    this.#celsius = Math.min(Thermostat.MAX, Math.max(Thermostat.MIN, n));
  }
}

const t = Thermostat.fromFahrenheit(72);
t.celsius = '25';        // ✅ setter accepts string
t.celsius;               // number
```

::: tip When to use
Getters for derived values (`total`, `isEmpty`), setters for validation/clamping, `static` for factory methods (`fromJSON`, `fromFahrenheit`) and shared constants.
:::

## Classes Are Also Types

> A class declaration creates both a **value** (the constructor) and a **type** (the instance shape). `typeof Class` is the constructor type.

```ts
class User { constructor(public name: string) {} }

const u: User = new User('Ana');             // User = instance type
const plain: User = { name: 'Rui' };         // ✅ structural: no instanceof guarantee!

function create(Ctor: typeof User, name: string) {   // the class itself
  return new Ctor(name);
}

type UserInstance = InstanceType<typeof User>;   // same as User
```

::: warning Gotcha
Because typing is structural, a plain object can satisfy a class type. If code relies on `instanceof` or methods, add a private field (`#brand`) to make the class nominal.
:::

::: tip When to use
Passing classes to factories, registries and DI containers (`typeof Service`), and understanding why test doubles can be plain objects.
:::

## override and noImplicitOverride <Badge type="tip" text="extra" />

> The `override` keyword marks methods that replace a parent method. With `noImplicitOverride`, forgetting it is an error.

```ts
class BaseWidget {
  render(): string { return ''; }
  destroy(): void {}
}

class Chart extends BaseWidget {
  override render() { return '<canvas></canvas>'; }
  override destory() {}     // ❌ typo caught: no 'destory' in the base class
}
```

::: tip When to use
Class hierarchies (UI components, Lit/Web Components, game-like entity classes in apps): it catches typos and breaks loudly when a base method is renamed.
:::
