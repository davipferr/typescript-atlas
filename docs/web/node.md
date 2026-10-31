# Node & Express

Typing server-side code: Express handlers and middleware, request augmentation, Node APIs and typed error handling.

## Typing Express Handlers

> `Request` and `Response` are generic: `Request<Params, ResBody, ReqBody, Query>` and `Response<ResBody>` type each part of the exchange.

```ts
import express, { type Request, type Response } from 'express';

const app = express();
app.use(express.json());

interface CreateOrderBody { items: { sku: string; qty: number }[]; couponCode?: string }
interface OrderParams { id: string }

app.get('/orders/:id', async (req: Request<OrderParams>, res: Response<Order | { error: string }>) => {
  const order = await db.orders.find(req.params.id);       // params.id: string
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

app.post('/orders', async (req: Request<{}, Order, CreateOrderBody>, res: Response<Order>) => {
  const order = await createOrder(req.body.items);          // body typed... but not validated!
  res.status(201).json(order);
});

// Route params are inferred from the path string in recent @types/express
app.get('/users/:userId/posts/:postId', (req, res) => {
  req.params.postId;    // string
});
```

::: warning Gotcha
`req.body` and `req.query` types are promises, not checks: clients can send anything. Validate with a schema in the handler or a middleware.
:::

::: tip When to use
Annotate `Response<T>` to make sure handlers send the documented shape, and type params/body for readability. Pair with schema validation for real safety.
:::

## Typed Middleware

> Middleware has the signature `(req, res, next) => void`. Use `RequestHandler` or `NextFunction` types, and factories for configurable middleware.

```ts
import type { RequestHandler, NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export const requestId: RequestHandler = (req, res, next) => {
  res.setHeader('x-request-id', crypto.randomUUID());
  next();
};

// Validation middleware factory: the body is parsed and replaced
export function validateBody<T>(schema: ZodType<T>): RequestHandler<any, any, T> {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ errors: result.error.issues });
    req.body = result.data;
    next();
  };
}

app.post('/products', validateBody(CreateProductSchema), async (req, res) => {
  const product = await products.create(req.body);   // typed AND validated
  res.status(201).json(product);
});
```

::: tip When to use
Validation, auth, rate limiting, logging. Factories (`validateBody(schema)`, `requireRole('admin')`) keep route definitions declarative.
:::

## Augmenting the Request

> Middleware that attaches data (`req.user`) needs module augmentation so every handler sees the property.

```ts
// src/types/express.d.ts
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: { id: string; role: 'admin' | 'customer' };
    requestId: string;
  }
}

// auth middleware
export const authenticate: RequestHandler = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.sendStatus(401);
  req.user = await verifyJwt(token);
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.sendStatus(403);
  next();
};
```

::: tip When to use
Authenticated user, tenant ID, request ID, locale, feature flags: anything middleware computes once for downstream handlers.
:::

## Typed Error Handling

> Express error middleware has four parameters. Custom error classes plus `instanceof` give typed, consistent error responses.

```ts
import type { ErrorRequestHandler } from 'express';

export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string) { super(404, `${resource} not found`, 'NOT_FOUND'); }
}

export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ code: err.code, message: err.message });
  }
  console.error(err);
  res.status(500).json({ code: 'INTERNAL', message: 'Unexpected error' });
};

app.use(errorHandler);   // registered last

// Express 5 forwards rejected promises from async handlers automatically
app.get('/products/:id', async (req, res) => {
  const p = await products.find(req.params.id);
  if (!p) throw new NotFoundError('Product');
  res.json(p);
});
```

::: tip When to use
Every API. One error hierarchy and one handler make status codes and response shapes consistent across all routes.
:::

## Layered Services with Interfaces <Badge type="tip" text="extra" />

> Type the boundaries between routes, services and data access with interfaces, so each layer can be tested or swapped independently.

```ts
export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
  list(filter: { category?: string; limit: number }): Promise<Product[]>;
  create(input: CreateProductInput): Promise<Product>;
}

export class ProductService {
  constructor(private readonly repo: ProductRepository, private readonly cache: Cache) {}

  async get(id: string): Promise<Product> {
    const cached = await this.cache.get<Product>(`product:${id}`);
    if (cached) return cached;
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundError('Product');
    await this.cache.set(`product:${id}`, product, 60);
    return product;
  }
}

// Production: Postgres; tests: in-memory fake implementing the same interface
const service = new ProductService(new PgProductRepository(pool), redisCache);
```

::: tip When to use
Any API beyond a handful of routes. Interfaces at the data-access layer make unit tests trivial (no DB mocks, just fake objects).
:::

## Typing Node APIs

> `@types/node` types the built-ins. Prefer the `node:` prefix and the promise-based APIs.

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

const config = JSON.parse(await readFile(join(import.meta.dirname, 'config.json'), 'utf8')) as unknown;

// Typed EventEmitter (Node 20+ @types): event name → argument tuple
interface JobEvents {
  progress: [jobId: string, percent: number];
  done: [jobId: string, resultUrl: string];
}
const jobs = new EventEmitter<JobEvents>();
jobs.on('progress', (id, pct) => console.log(id, pct));   // typed args
jobs.emit('done', 'j1', 'https://cdn/x.zip');
```

::: tip When to use
Scripts, CLIs, workers and servers. The generic `EventEmitter<Events>` is a quick win for job queues and internal pub/sub.
:::

## Typed Database Access <Badge type="tip" text="extra" />

> ORMs and query builders generate types from your schema, so query results are typed without hand-written interfaces.

```ts
// Prisma: types generated from schema.prisma
const orders = await prisma.order.findMany({
  where: { status: 'PAID' },
  include: { items: true }
});
// orders: (Order & { items: OrderItem[] })[]

// Drizzle: types inferred from TS table definitions
export const users = pgTable('users', { id: uuid('id').primaryKey(), email: text('email').notNull() });
type User = typeof users.$inferSelect;
type NewUser = typeof users.$inferInsert;

// Kysely / raw SQL: describe the DB once, get typed queries
const rows = await db.selectFrom('users').select(['id', 'email']).where('id', '=', id).execute();
```

::: tip When to use
Any server touching a database. Derive API DTOs from the generated row types with `Pick`/`Omit` so a schema change ripples to every endpoint at compile time.
:::
