# Runtime Validation

Types disappear at runtime, so data entering the app must be checked. Validate at the edges, then trust the types inside.

## Trust Boundaries

> Anything that enters from outside your code is `unknown` until checked: API responses, `JSON.parse`, forms, URL params, storage, env vars, `postMessage`.

```ts
// ❌ The type is a lie if the server changes or returns an error page
const user = (await res.json()) as User;
user.address.city;   // TypeError at runtime: address is undefined

// ✅ Treat it as unknown and parse it into a trusted type
const raw: unknown = await res.json();
const user = parseUser(raw);   // throws or returns a real User
```

**Common boundaries in a web app**
- `fetch` responses (especially third-party APIs)
- `localStorage` / `sessionStorage` / IndexedDB (data from older app versions)
- URL search params and route params (always strings, user-editable)
- Form data and file uploads
- `process.env` / `import.meta.env`
- Webhooks, WebSocket and `postMessage` payloads

::: tip When to use
Validate **once, at the boundary**, and convert to your domain types there. Everything after that can rely on the static types without defensive checks everywhere.
:::

## Hand-Written Type Guards

> For small shapes, a type predicate function is enough and has zero dependencies.

```ts
interface CartItem { productId: string; qty: number }

function isCartItem(x: unknown): x is CartItem {
  return (
    typeof x === 'object' && x !== null &&
    'productId' in x && typeof x.productId === 'string' &&
    'qty' in x && typeof x.qty === 'number' && Number.isInteger(x.qty) && x.qty > 0
  );
}

function loadCart(): CartItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem('cart') ?? '[]');
    return Array.isArray(raw) ? raw.filter(isCartItem) : [];
  } catch {
    return [];       // corrupted storage shouldn't crash the app
  }
}
```

::: tip When to use
One or two small shapes (storage items, message payloads). Beyond that, guards get long and drift from the types, so switch to a schema library.
:::

## Schema Validation with Zod <Badge type="tip" text="extra" />

> Define a schema once and get **both** the runtime validator and the TypeScript type (`z.infer`). Standard Schema libraries (Valibot, ArkType) work the same way.

```ts
import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  tags: z.array(z.string()).default([]),
  status: z.enum(['draft', 'active', 'archived']),
  publishedAt: z.coerce.date().nullable()      // ISO string → Date
});

export type Product = z.infer<typeof ProductSchema>;   // no duplicate interface

async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`);
  return ProductSchema.parse(await res.json());   // throws ZodError with a precise path
}

// Non-throwing variant
const result = ProductSchema.safeParse(data);
if (!result.success) console.error(result.error.issues);
else result.data.price;   // typed
```

::: tip When to use
Third-party API responses, form validation (React Hook Form, Conform, TanStack Form resolvers), tRPC/Server Action inputs, and config. The schema becomes the single source of truth for both runtime and compile time.
:::

## Validating Forms and Inputs

> Form data is always strings (or `File`s). Parse it into a typed object, with coercion and field-level errors.

```ts
const SignupSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(12, 'At least 12 characters'),
  age: z.coerce.number().int().min(16),       // '18' → 18
  terms: z.literal('on', { message: 'You must accept the terms' })
});
type SignupInput = z.infer<typeof SignupSchema>;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const parsed = SignupSchema.safeParse(Object.fromEntries(new FormData(form)));
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;   // { email?: string[], ... }
    return showFieldErrors(errors);
  }
  submit(parsed.data);   // SignupInput
});
```

::: tip When to use
Any form. Share the same schema between client (instant feedback) and server (the real security check).
:::

## Validating Environment Variables <Badge type="tip" text="extra" />

> Parse env vars at startup so a missing or malformed variable crashes immediately with a clear message.

```ts
// src/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  FEATURE_NEW_CHECKOUT: z.stringbool().default(false)
});

export const env = EnvSchema.parse(process.env);
// env.PORT is number, env.FEATURE_NEW_CHECKOUT is boolean

// elsewhere
import { env } from './env';
app.listen(env.PORT);
```

::: tip When to use
Every server and every front-end build that reads env vars. Import `env` instead of touching `process.env` directly anywhere else.
:::

## Parsing URL and Search Params

> URL params are user-controlled strings. Parse and default them before using them as filters or IDs.

```ts
const FiltersSchema = z.object({
  q: z.string().trim().default(''),
  page: z.coerce.number().int().min(1).catch(1),         // invalid → 1
  sort: z.enum(['price', 'name', 'newest']).catch('newest'),
  inStock: z.enum(['true', 'false']).transform((v) => v === 'true').optional()
});
type Filters = z.infer<typeof FiltersSchema>;

const filters: Filters = FiltersSchema.parse(Object.fromEntries(new URLSearchParams(location.search)));
// /products?page=abc&sort=hack → { q: '', page: 1, sort: 'newest' }
```

::: tip When to use
Search/filter pages, pagination, shareable URLs and route params (`/orders/:id`). Routers like TanStack Router accept the schema directly for typed search params.
:::

## Sharing Types Across Client and Server <Badge type="tip" text="extra" />

> When frontend and backend are both TypeScript, share schemas or generate types so the contract can't drift.

```ts
// packages/shared/src/orders.ts (monorepo package used by both sides)
export const CreateOrderSchema = z.object({ items: z.array(z.object({ sku: z.string(), qty: z.number() })) });
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// Server validates with the schema; client uses the type for the request body

// Other options:
// - OpenAPI → openapi-typescript generates types from the backend spec
// - GraphQL → graphql-codegen generates typed hooks/operations
// - tRPC / Hono RPC → the client is typed directly from the server router
```

::: tip When to use
Full-stack TS apps and monorepos. If the backend is another language, generate types from its OpenAPI spec in CI so breaking API changes fail the frontend build.
:::
