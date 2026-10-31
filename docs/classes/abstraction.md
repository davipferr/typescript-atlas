# Abstraction & Class Patterns

Abstract classes, interfaces as contracts, fluent `this` types, singletons, generic classes and mixins.

## Abstract Classes

> An `abstract` class can't be instantiated. It shares implementation with subclasses and forces them to implement `abstract` members.

```ts
abstract class PaymentProvider {
  constructor(protected readonly apiKey: string) {}

  abstract readonly name: string;
  protected abstract charge(cents: number, currency: string): Promise<string>;

  // Template method: shared flow, provider-specific step
  async pay(order: Order): Promise<Receipt> {
    if (order.total <= 0) throw new Error('Nothing to charge');
    const transactionId = await this.charge(order.total, order.currency);
    return { orderId: order.id, transactionId, provider: this.name };
  }
}

class StripeProvider extends PaymentProvider {
  readonly name = 'stripe';
  protected async charge(cents: number, currency: string) {
    const intent = await stripe.paymentIntents.create({ amount: cents, currency });
    return intent.id;
  }
}

new PaymentProvider('k');   // ❌ cannot create an instance of an abstract class
```

::: tip When to use
When subclasses share **real code** (a common flow, helpers, state) and differ in a few steps: payment/shipping providers, base repositories, base UI components. If there's no shared code, an interface is enough.
:::

## Abstract Class vs Interface

> An interface is a pure contract with zero runtime output. An abstract class is a contract **plus** shared implementation and exists at runtime.

```ts
// Contract only
interface Notifier { send(to: string, message: string): Promise<void> }

class EmailNotifier implements Notifier {
  async send(to: string, message: string) { /* ... */ }
}
class SlackNotifier implements Notifier {
  async send(to: string, message: string) { /* ... */ }
}

// A class can implement many interfaces but extend only one class
class AuditedEmailNotifier extends BaseService implements Notifier, Disposable {
  async send() {}
  [Symbol.dispose]() {}
}
```

::: tip When to use
Default to **interfaces** for dependencies (easy to mock, no inheritance coupling). Reach for abstract classes only when implementations need shared logic or protected helpers.
:::

## Fluent APIs with this Types

> Returning `this` (the polymorphic `this` type) keeps method chaining typed correctly in subclasses.

```ts
class QueryBuilder {
  protected parts: string[] = [];
  where(cond: string): this { this.parts.push(`WHERE ${cond}`); return this; }
  limit(n: number): this { this.parts.push(`LIMIT ${n}`); return this; }
  build() { return this.parts.join(' '); }
}

class UserQuery extends QueryBuilder {
  active(): this { return this.where('active = true'); }
}

new UserQuery().where('age > 18').active().limit(10).build();
// .where() returns UserQuery (not QueryBuilder), so .active() is still available
```

::: tip When to use
Builders (query builders, request builders, test data builders), chainable configuration APIs and validation schemas.
:::

## Singletons and Private Constructors

> A `private` (or `protected`) constructor prevents `new` from outside, so instances are created only through a static method.

```ts
class AnalyticsClient {
  static #instance: AnalyticsClient | null = null;

  private constructor(private readonly writeKey: string) {}

  static get(): AnalyticsClient {
    return (this.#instance ??= new AnalyticsClient(import.meta.env.VITE_SEGMENT_KEY));
  }

  track(event: string, props: Record<string, unknown> = {}) { /* ... */ }
}

AnalyticsClient.get().track('signup');
new AnalyticsClient('x');   // ❌ constructor is private

// Same pattern for validated construction
class Email {
  private constructor(readonly value: string) {}
  static parse(input: string): Email | null {
    return /^\S+@\S+\.\S+$/.test(input) ? new Email(input.toLowerCase()) : null;
  }
}
```

::: tip When to use
SDK clients, a single DB connection pool, and **smart constructors** where creation must go through validation (`Email.parse`). In module-based code, often a simple exported `const` instance does the job.
:::

## Generic Classes

> Classes can take type parameters, so one implementation works for many data types with full type safety.

```ts
class TypedEventTarget<Events extends Record<string, unknown>> {
  #listeners = new Map<keyof Events, Set<(payload: any) => void>>();

  on<K extends keyof Events>(event: K, fn: (payload: Events[K]) => void) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event)!.add(fn);
    return () => this.#listeners.get(event)!.delete(fn);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]) {
    this.#listeners.get(event)?.forEach((fn) => fn(payload));
  }
}

const cartEvents = new TypedEventTarget<{ added: Product; cleared: undefined }>();
cartEvents.on('added', (p) => toast(`${p.name} added`));   // p: Product
cartEvents.emit('added', 42);                              // ❌

class Repository<T extends { id: string }> {
  constructor(private readonly endpoint: string) {}
  async findById(id: string): Promise<T> { return (await fetch(`${this.endpoint}/${id}`)).json(); }
  async save(entity: T): Promise<void> { /* ... */ }
}
const products = new Repository<Product>('/api/products');
```

::: tip When to use
Repositories, caches, queues, event emitters, collections and state stores: containers whose logic doesn't depend on the specific item type.
:::

## Mixins <Badge type="tip" text="extra" />

> A mixin is a function that takes a class and returns a subclass with extra behavior, letting you compose features without deep inheritance.

```ts
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
    touch() { (this as any).updatedAt = new Date(); }
  };
}

function Serializable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    toJSON() { return { ...this }; }
  };
}

class Note { constructor(public text: string) {} }
const SmartNote = Serializable(Timestamped(Note));

const n = new SmartNote('Buy milk');
n.createdAt; n.touch(); n.toJSON();   // all typed
```

::: tip When to use
Web Components and Lit (e.g. `LocalizeMixin(LitElement)`), and adding cross-cutting behavior (timestamps, events, serialization) to unrelated classes. Prefer composition with plain objects when you can.
:::

## Implementing Disposable (using) <Badge type="tip" text="extra" />

> TS 5.2 supports `using`: objects with `[Symbol.dispose]` are cleaned up automatically when the block ends.

```ts
class TempListener implements Disposable {
  constructor(private target: EventTarget, private type: string, private fn: EventListener) {
    target.addEventListener(type, fn);
  }
  [Symbol.dispose]() { this.target.removeEventListener(this.type, this.fn); }
}

function measureScroll() {
  using _ = new TempListener(window, 'scroll', onScroll);
  // ... do work ...
}  // listener removed here, even if an exception was thrown

// Async version: Symbol.asyncDispose + await using (DB connections, file handles)
```

::: tip When to use
Temporary listeners, locks, DB transactions, file handles in Node, and test setup/teardown. Needs `lib: ["esnext.disposable"]` and a runtime or polyfill with `Symbol.dispose`.
:::
