# Best Practices

Habits that keep a TypeScript codebase safe, readable and cheap to change.

## Let Inference Work

> Annotate boundaries (parameters, exported return types, empty initial values) and let TypeScript infer the rest.

```ts
// ❌ Noise: every type is obvious
const total: number = items.reduce((sum: number, item: CartItem): number => sum + item.price, 0);

// ✅
const total = items.reduce((sum, item) => sum + item.price, 0);

// ✅ Annotations where they add information
export function calculateShipping(cart: Cart, country: CountryCode): Money { /* ... */ }
const [selected, setSelected] = useState<Product | null>(null);
```

::: tip When to use
Always. Reviewers should be able to read the code as JavaScript, with types visible only where they define a contract.
:::

## Avoid any; Use unknown at the Edges

> `any` disables checking and spreads silently. Use `unknown` for untrusted data and narrow or parse it.

```ts
// ❌
function handleWebhook(body: any) { charge(body.amount); }

// ✅
function handleWebhook(body: unknown) {
  const event = StripeEventSchema.parse(body);
  if (event.type === 'payment_intent.succeeded') markPaid(event.data.object.id);
}
```

**Enforce it**
- `strict: true` (includes `noImplicitAny`)
- ESLint: `@typescript-eslint/no-explicit-any`, `no-unsafe-assignment`, `no-unsafe-member-access`

::: tip When to use
Every boundary: webhooks, API responses, storage, `postMessage`, third-party callbacks. Keep any remaining `any` behind a typed facade so it doesn't leak.
:::

## Make Illegal States Unrepresentable

> Prefer unions of precise shapes over one type with many optional fields and boolean flags.

```ts
// ❌ What does { isLoggedIn: false, user: {...} } mean?
interface Session { isLoggedIn: boolean; user?: User; token?: string; expiresAt?: Date }

// ✅ Each state carries exactly its data
type Session =
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User; token: string; expiresAt: Date };

// ❌ Two booleans = four combinations, one of them nonsense
interface ButtonProps { primary?: boolean; danger?: boolean }

// ✅
interface ButtonProps2 { variant?: 'primary' | 'danger' | 'default' }
```

::: tip When to use
Component props with mutually exclusive options, async state, auth/session state, payment status. Fewer states to handle means fewer bugs and fewer tests.
:::

## Derive Types, Don't Duplicate Them

> Have one source of truth (a schema, a constant, a generated type) and derive the rest with utilities.

```ts
// Source of truth: generated from the API or a Zod schema
type Product = z.infer<typeof ProductSchema>;

type ProductPreview = Pick<Product, 'id' | 'name' | 'price' | 'imageUrl'>;
type CreateProductInput = Omit<Product, 'id' | 'createdAt'>;
type UpdateProductInput = Partial<CreateProductInput>;
type ProductCategory = Product['category'];

const SORT_OPTIONS = ['price', 'name', 'newest'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];
```

::: tip When to use
DTOs, props built from models, enums from constant arrays, types from config and loaders. When the source changes, everything derived updates and the compiler shows what broke.
:::

## Prefer readonly and Immutable Updates

> Mark data you don't intend to mutate as `readonly`, and use non-mutating array methods. Mutation bugs become compile errors.

```ts
function applyCoupon(cart: Readonly<Cart>, coupon: Coupon): Cart {
  return { ...cart, discount: coupon.percent, items: cart.items.map((i) => ({ ...i })) };
}

function topSellers(products: readonly Product[]) {
  return products.toSorted((a, b) => b.sales - a.sales).slice(0, 5);   // no mutation of the prop
}

const DEFAULTS = Object.freeze({ pageSize: 20, currency: 'EUR' }) satisfies Readonly<Settings>;
```

::: tip When to use
React/Vue/Redux state, props, cached data shared between components and function parameters. `toSorted`, `toReversed`, `with` and `toSpliced` are the immutable array methods (lib `ES2023`).
:::

## Keep Assertions Rare and Justified

> Every `as`, `!` and `@ts-expect-error` is a place where you override the compiler. Keep them few, local and commented.

```ts
// ❌ Spread throughout the code
const user = data as User;
const el = document.querySelector('.price')!;

// ✅ Concentrated in one boundary function with a runtime check
function parseUser(data: unknown): User { return UserSchema.parse(data); }

// ✅ When unavoidable, explain why
// The Map is populated for every key in KEYS during init()
const value = registry.get(key)!;
```

::: tip When to use
Code review rule of thumb: an assertion without a nearby check or comment is a bug waiting to happen. Search for `as ` and `!` occasionally to clean them up.
:::

## Name Types for the Domain <Badge type="tip" text="extra" />

> Type names should describe business concepts, not implementation details. Avoid `I`/`T` prefixes and `Data`/`Info` suffixes.

```ts
// ❌
interface IUserData { ... }
type TProps = { ... };
type ResponseObj = { ... };

// ✅
interface Customer { ... }
type CheckoutSummaryProps = { ... };
type OrdersPage = Paginated<Order>;

// Generic parameter names: T for one, descriptive when several
function mapEntries<Key extends string, Value, Result>(/* ... */) {}
```

::: tip When to use
Shared models and component props: good names make type errors readable ("`Cents` is not assignable to `Euros`" vs "`number` is not assignable to `number`").
:::

## Organize Types Close to Their Code <Badge type="tip" text="extra" />

> Co-locate types with the module that owns them; reserve a shared folder for truly cross-cutting types.

```text
src/
├── features/
│   ├── cart/
│   │   ├── cart.types.ts       ← CartItem, CartState (owned by cart)
│   │   ├── cart.api.ts
│   │   └── CartDrawer.tsx      ← props type defined in the same file
│   └── orders/
├── lib/
│   └── http.ts                 ← HttpError, Result
└── types/
    ├── utils.ts                ← Prettify, Brand, DeepPartial
    ├── env.d.ts                ← ImportMetaEnv
    └── global.d.ts             ← Window augmentation
```

::: tip When to use
Any project beyond a few files. A giant `types.ts` for the whole app becomes a dumping ground and creates import cycles; feature-owned types scale.
:::

## Write JavaScript First, Then Type It <Badge type="tip" text="extra" />

> TypeScript is at its best describing ordinary JavaScript. If the types get very complex, the runtime design is often too clever.

```ts
// ❌ A 40-line conditional type to make one generic function "perfect"
// ✅ Two clear functions, or overloads, or a simpler data shape

function formatDate(d: Date): string;
function formatDate(d: Date | null): string | null;
function formatDate(d: Date | null) { return d ? d.toLocaleDateString() : null; }
```

::: tip When to use
Application code: favor simple, readable types. Save advanced type-level programming for shared libraries and utilities where the effort pays off across many call sites.
:::
