# Decorators

Functions that attach behavior to classes and their members with `@` syntax. TS 5 implements the standard (TC39) version; frameworks like Angular and NestJS still use the legacy one.

## What Decorators Are

> A decorator is a function applied with `@name` to a class, method, accessor or field. It runs **once, when the class is defined**, and can replace or wrap the decorated thing.

```ts
function logged<This, Args extends unknown[], R>(
  target: (this: This, ...args: Args) => R,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>
) {
  const name = String(context.name);
  return function (this: This, ...args: Args): R {
    console.debug(`→ ${name}`, args);
    const result = target.apply(this, args);
    console.debug(`← ${name}`, result);
    return result;
  };
}

class CheckoutService {
  @logged
  applyCoupon(code: string) { return code === 'SAVE10' ? 0.1 : 0; }
}
```

**Two flavors**

| | Standard (TS 5.0+) | Legacy |
| --- | --- | --- |
| Config | nothing (default) | `"experimentalDecorators": true` |
| Signature | `(value, context)` | `(target, key, descriptor)` |
| Parameter decorators | ❌ | ✅ |
| Used by | Lit 3, new libraries | Angular, NestJS, TypeORM, class-validator, MobX 5 |

::: tip When to use
Cross-cutting concerns that you'd otherwise repeat in many methods: logging, timing, caching, retries, auth checks, validation, binding. In framework code, you'll mostly **use** decorators the framework provides.
:::

## Method Decorators

> A method decorator receives the original method and a context object, and may return a replacement function.

```ts
function retry(times = 3, delayMs = 500) {
  return function <This, Args extends unknown[], R>(
    target: (this: This, ...args: Args) => Promise<R>,
    _context: ClassMethodDecoratorContext
  ) {
    return async function (this: This, ...args: Args): Promise<R> {
      for (let attempt = 1; ; attempt++) {
        try { return await target.apply(this, args); }
        catch (err) {
          if (attempt >= times) throw err;
          await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
      }
    };
  };
}

class PaymentsApi {
  @retry(3, 1000)
  async capture(paymentId: string) { /* flaky network call */ }
}
```

::: tip When to use
Retry/backoff for network calls, timing and metrics, memoization, permission checks (`@requireRole('admin')`), debouncing UI methods.
:::

## Decorator Factories

> A function that **returns** a decorator, so you can pass configuration: `@retry(3)` instead of `@retry`.

```ts
function throttle(ms: number) {
  return function <This, Args extends unknown[]>(
    target: (this: This, ...args: Args) => void,
    _context: ClassMethodDecoratorContext
  ) {
    let last = 0;
    return function (this: This, ...args: Args) {
      const now = Date.now();
      if (now - last >= ms) { last = now; target.apply(this, args); }
    };
  };
}

class InfiniteList {
  @throttle(200)
  onScroll() { /* load more when near the bottom */ }
}
```

::: tip When to use
Any decorator that needs options: timing thresholds, roles, cache TTLs, route paths (`@Get('/users/:id')`), component selectors (`@Component({...})`).
:::

## Autobind with addInitializer

> `context.addInitializer` runs code per instance at construction. Classic use: binding methods so they can be passed as callbacks.

```ts
function bound<This, T extends (this: This, ...args: any[]) => any>(
  _target: T,
  context: ClassMethodDecoratorContext<This, T>
) {
  context.addInitializer(function (this: This) {
    const self = this as any;
    self[context.name] = self[context.name].bind(this);
  });
}

class Dropdown {
  isOpen = false;

  @bound
  toggle() { this.isOpen = !this.isOpen; }

  mount(btn: HTMLButtonElement) {
    btn.addEventListener('click', this.toggle);   // `this` is correct without .bind()
  }
}
```

::: tip When to use
Class-based UI code passing methods as event listeners. (Alternative without decorators: arrow function class fields, `toggle = () => {...}`.)
:::

## Class Decorators

> A class decorator receives the class itself. It can register it, add metadata, or return a subclass that replaces it.

```ts
const registry = new Map<string, CustomElementConstructor>();

function customElement(tag: string) {
  return function <T extends CustomElementConstructor>(target: T, context: ClassDecoratorContext<T>) {
    context.addInitializer(() => {
      customElements.define(tag, target);
      registry.set(tag, target);
    });
  };
}

@customElement('price-tag')
class PriceTag extends HTMLElement {
  connectedCallback() { this.textContent = `€${this.getAttribute('value')}`; }
}

// Sealing / freezing
function sealed<T extends abstract new (...args: any) => any>(target: T, _ctx: ClassDecoratorContext) {
  Object.seal(target);
  Object.seal(target.prototype);
}
```

::: tip When to use
Registering classes in a container or registry (custom elements, DI providers, plugins, routes), and marking classes with metadata (`@Entity('users')`, `@Controller('/users')`).
:::

## Field and Accessor Decorators

> Field decorators can transform the initial value. `accessor` fields (auto-accessors) let decorators intercept get/set, which powers reactivity.

```ts
function clamp(min: number, max: number) {
  return function <This>(_: undefined, _context: ClassFieldDecoratorContext<This, number>) {
    return (initial: number) => Math.min(max, Math.max(min, initial));
  };
}

function observed<This, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>
): ClassAccessorDecoratorResult<This, V> {
  return {
    set(value) {
      target.set.call(this, value);
      (this as any).requestUpdate?.(String(context.name));   // re-render on change
    }
  };
}

class VolumeSlider extends BaseElement {
  @clamp(0, 100) initial = 150;      // stored as 100
  @observed accessor value = 50;     // setting it triggers requestUpdate()
}
```

::: tip When to use
Reactive properties in Web Components (Lit's `@property()` and `@state()` use `accessor`), default value normalization, and observable state.
:::

## Decorator Metadata <Badge type="tip" text="extra" />

> TS 5.2 adds `context.metadata`, a per-class object decorators can write to and read later via `Class[Symbol.metadata]`.

```ts
function column(name: string) {
  return (_: undefined, ctx: ClassFieldDecoratorContext) => {
    const cols = ((ctx.metadata.columns as Record<string, string>) ??= {});
    cols[String(ctx.name)] = name;
  };
}

class UserRow {
  @column('user_id') id = '';
  @column('full_name') name = '';
}

const columns = UserRow[Symbol.metadata]?.columns;   // { id: 'user_id', name: 'full_name' }
```

::: tip When to use
Building mini ORMs, serializers, form generators and validators that read declarative annotations at runtime. Requires a `Symbol.metadata` polyfill in most runtimes today.
:::

## Legacy Decorators in Frameworks

> Angular, NestJS, TypeORM and class-validator use `experimentalDecorators` (and often `emitDecoratorMetadata`), with a different signature and parameter decorators.

```ts
// NestJS: routing, DI and validation are all decorators
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}   // injected via emitted metadata

  @Get(':id')
  findOne(@Param('id') id: string) { return this.products.findOne(id); }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateProductDto) { return this.products.create(dto); }
}

export class CreateProductDto {
  @IsString() @MinLength(3) name!: string;
  @IsNumber() @Min(0) price!: number;
}

// The legacy signature, if you write your own
function LogLegacy(target: object, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: unknown[]) {
    console.log(key, args);
    return original.apply(this, args);
  };
}
```

::: warning Gotcha
The two systems are **not compatible**. If the project has `experimentalDecorators: true`, write legacy decorators; standard ones won't type-check (and vice versa).
:::

::: tip When to use
Whenever you work in Angular or NestJS: know that `@Injectable()`, `@Input()`, `@Get()`, `@Body()`, `@Column()` are plain functions running at class definition time, which makes framework errors much easier to reason about.
:::
