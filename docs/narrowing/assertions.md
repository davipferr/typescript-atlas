# Assertions, satisfies & as const

Telling the compiler what you know (`as`, `!`), checking without widening (`satisfies`), and freezing literals (`as const`).

## Type Assertions (as)

> `value as T` tells the compiler to treat a value as `T`. It performs **no runtime check**: you take responsibility.

```ts
const input = document.querySelector('#email') as HTMLInputElement;
input.value;      // ✅ but crashes at runtime if #email isn't an <input>

const config = JSON.parse(raw) as AppConfig;   // a promise, not a guarantee

// Only allowed between related types
const n = 'hello' as number;               // ❌ neither type sufficiently overlaps
const n2 = 'hello' as unknown as number;   // ⚠️ double assertion: escape hatch
```

::: warning Gotcha
Assertions are the main way type safety leaks. Prefer a real check (`instanceof`, a type guard, a schema) whenever the value comes from outside your code.
:::

::: tip When to use
DOM queries where you control the HTML, test fixtures, and spots where you genuinely know more than the compiler (after a check it can't follow). Never on API data without validation.
:::

## Non-Null Assertion (!)

> A postfix `!` removes `null` and `undefined` from a type. It's an assertion: if you're wrong, it crashes at runtime.

```ts
const root = document.getElementById('root')!;   // HTMLElement (not | null)
createApp(App).mount(root);

const user = users.find((u) => u.id === id)!;    // "I know it exists"

// Map.get after has() is a classic case TS can't follow
if (cache.has(key)) return cache.get(key)!;
```

::: tip When to use
The root mount node, `Map.get` after `has`, and test code. In application logic, prefer handling the `null` (early return, `??`, `assertIsDefined`) so the failure has a clear error message.
:::

## Definite Assignment (!:)

> `prop!: T` on a class field tells TS it will be assigned, even though the constructor doesn't do it.

```ts
class ChartWidget {
  private canvas!: HTMLCanvasElement;   // set in init(), not in the constructor
  private ctx!: CanvasRenderingContext2D;

  init(el: HTMLElement) {
    this.canvas = el.querySelector('canvas')!;
    this.ctx = this.canvas.getContext('2d')!;
  }
}

// Angular: inputs and ViewChild are set by the framework
@Component({ /* ... */ })
class ProductCard {
  @Input() product!: Product;
  @ViewChild('img') img!: ElementRef<HTMLImageElement>;
}
```

::: tip When to use
Fields initialized by a framework (Angular inputs, ORM entities, dependency injection) or by a lifecycle method (`init`, `connectedCallback`) rather than the constructor.
:::

## satisfies

> `expr satisfies T` checks that a value matches `T` **without changing its inferred type**. You keep the precise literal types.

```ts
type Route = { path: string; auth?: boolean };

// With an annotation: keys are just string, specific info is lost
const routes1: Record<string, Route> = { home: { path: '/' }, admin: { path: '/admin', auth: true } };
routes1.typo;               // no error, it's Record<string, ...>

// With satisfies: validated AND precise
const routes = {
  home: { path: '/' },
  admin: { path: '/admin', auth: true }
} satisfies Record<string, Route>;

routes.admin.path;          // ✅ autocomplete for 'home' | 'admin'
routes.typo;                // ❌ property does not exist

// Colors: check the format, keep literal values
const palette = {
  primary: '#3178c6',
  danger: [220, 38, 38]
} satisfies Record<string, string | [number, number, number]>;
palette.primary.toUpperCase();   // knows it's a string, not the union
```

::: tip When to use
Config objects, route tables, theme tokens, i18n dictionaries, lookup maps: anything where you want both **validation** against a type and **precise inference** for autocomplete. Combine with `as const` for readonly literals.
:::

## as const

> `as const` makes a literal deeply `readonly` and infers the **narrowest** types: exact strings, numbers and tuples.

```ts
const ROLES = ['admin', 'editor', 'viewer'] as const;
// readonly ['admin', 'editor', 'viewer']
type Role = (typeof ROLES)[number];   // 'admin' | 'editor' | 'viewer'

// Validate unknown strings against the list at runtime too
const isRole = (x: string): x is Role => (ROLES as readonly string[]).includes(x);

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024 } as const;
type Breakpoint = keyof typeof BREAKPOINTS;    // 'sm' | 'md' | 'lg'

// Tuples returned from hooks keep their positions
function useCounter() {
  const [count, setCount] = useState(0);
  return [count, setCount] as const;    // not (number | Dispatch)[]
}
```

::: tip When to use
Single source of truth for allowed values (roles, statuses, locales) where you need **both** the runtime list (for a `<select>` or validation) and the type. Also for hook return tuples and constant config.
:::

## as const + satisfies <Badge type="tip" text="extra" />

> Together they give you readonly literal types **and** shape validation in one expression.

```ts
type NavItem = { label: string; href: `/${string}`; icon?: string };

export const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Pricing', href: '/pricing', icon: 'tag' },
  { label: 'Docs', href: 'docs' }          // ❌ href must start with '/'
] as const satisfies readonly NavItem[];

type NavHref = (typeof NAV)[number]['href'];   // '/' | '/pricing' | ...
```

::: tip When to use
Navigation menus, feature flag definitions, permissions matrices, and any constant table you also derive types from.
:::

## Suppression Comments

> `// @ts-expect-error` silences the next line **and errors if there's nothing to silence**. `// @ts-ignore` silences unconditionally.

```ts
// @ts-expect-error: testing that invalid input throws
expect(() => formatPrice('abc')).toThrow();

// @ts-ignore  ⚠️ stays silent forever, even after the underlying issue is fixed
legacyLib.undocumentedMethod();
```

::: tip When to use
`@ts-expect-error` in tests for invalid input and around known library type bugs (with a comment explaining why). Avoid `@ts-ignore`; ESLint's `ban-ts-comment` can enforce that.
:::
