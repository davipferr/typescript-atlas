# Promises, fetch & Errors

Typing asynchronous code: `Promise<T>`, typed fetch helpers, combinators, errors as `unknown` and Result types.

## Promise Types

> `Promise<T>` is a promise that resolves to `T`. An `async` function's return type is always `Promise<...>`.

```ts
async function getCart(userId: string): Promise<Cart> {
  const res = await fetch(`/api/users/${userId}/cart`);
  return res.json();
}

const cart = await getCart('u1');   // Cart
const p = getCart('u1');            // Promise<Cart>

// Wrapping a callback API
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
```

::: tip When to use
Annotate `Promise<T>` on exported async functions (service layer, API clients) so the resolved shape is part of the contract. Give `new Promise<T>` a type argument when resolving with nothing (`void`) or when inference can't see it.
:::

## Typing fetch Responses

> `response.json()` returns `Promise<any>`. Wrap fetch once in a generic helper so every call site gets a typed (and checked) result.

```ts
class HttpError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
  }
}

async function http<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers }
  });
  const body: unknown = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new HttpError(res.status, body);
  return body as T;      // ⚠️ trust boundary: validate if the API isn't yours
}

// Typed API module
export const productsApi = {
  list: (page = 1) => http<Paginated<Product>>(`/api/products?page=${page}`),
  get: (id: string) => http<Product>(`/api/products/${id}`),
  create: (input: CreateProductInput) =>
    http<Product>('/api/products', { method: 'POST', body: JSON.stringify(input) })
};
```

::: warning Gotcha
`http<Product>(url)` is a cast, not a check. For data you don't control (third-party APIs, user-editable JSON), pass a schema and validate. See [Runtime Validation](/async/runtime-validation).
:::

::: tip When to use
Every app that talks to a backend: one typed `http` helper plus small per-resource API objects. Even better, generate the types from OpenAPI/GraphQL so they never drift.
:::

## Promise Combinators

> `Promise.all`, `allSettled`, `race` and `any` are typed precisely; `Promise.all` with a tuple keeps each position's type.

```ts
const [user, orders, settings] = await Promise.all([
  getUser(id),          // Promise<User>
  getOrders(id),        // Promise<Order[]>
  getSettings(id)       // Promise<Settings>
]);
// user: User, orders: Order[], settings: Settings

const results = await Promise.allSettled(images.map(uploadImage));
const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
const urls = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));

const fastest = await Promise.race([fetchFromCdn(), wait(3000).then(() => null)]);  // Data | null
```

::: tip When to use
Dashboard pages loading several resources in parallel (`all`), bulk uploads where some can fail (`allSettled`), timeouts (`race`), and mirror fallbacks (`any`).
:::

## Errors Are unknown

> In `catch (err)`, `err` is `unknown` under `strict` (anything can be thrown). Narrow before using it.

```ts
try {
  await checkout(cart);
} catch (err) {
  err.message;                         // ❌ 'err' is of type 'unknown'

  if (err instanceof HttpError && err.status === 409) return showToast('Stock changed');
  if (err instanceof DOMException && err.name === 'AbortError') return;
  if (err instanceof Error) return reportError(err);
  reportError(new Error(String(err)));  // someone threw a string
}

// A reusable helper
function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Something went wrong';
}

promise.catch((reason: unknown) => {});   // .catch reason is `any` by default: annotate it
```

::: tip When to use
Every `catch`. Custom error classes (`HttpError`, `ValidationError`) plus `instanceof` give typed, specific error handling in UIs.
:::

## Result Types Instead of Throwing <Badge type="tip" text="extra" />

> Return `{ ok: true, value } | { ok: false, error }` for **expected** failures, so the type system forces callers to handle them.

```ts
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

type SignupError = 'EMAIL_TAKEN' | 'WEAK_PASSWORD' | 'RATE_LIMITED';

async function signup(input: SignupInput): Promise<Result<User, SignupError>> {
  const res = await fetch('/api/signup', { method: 'POST', body: JSON.stringify(input) });
  if (res.status === 409) return { ok: false, error: 'EMAIL_TAKEN' };
  if (res.status === 429) return { ok: false, error: 'RATE_LIMITED' };
  return { ok: true, value: await res.json() };
}

const result = await signup(form);
if (!result.ok) {
  const messages: Record<SignupError, string> = {
    EMAIL_TAKEN: 'That email is already registered',
    WEAK_PASSWORD: 'Use at least 12 characters',
    RATE_LIMITED: 'Too many attempts, try again later'
  };
  return showError(messages[result.error]);   // exhaustive
}
login(result.value);
```

::: tip When to use
Business errors the UI must handle (validation, conflicts, payment declined) and Server Actions returning errors to forms. Keep `throw` for truly unexpected failures (bugs, network down).
:::

## AbortController and Cancellation

> `AbortSignal` is typed in the DOM lib; pass it through your async functions to cancel stale requests.

```ts
async function search(query: string, signal?: AbortSignal): Promise<Product[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  return res.json();
}

let controller: AbortController | undefined;
input.addEventListener('input', async () => {
  controller?.abort();
  controller = new AbortController();
  try {
    render(await search(input.value, controller.signal));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;  // expected
    throw err;
  }
});

// Timeouts without manual timers
await fetch(url, { signal: AbortSignal.timeout(5000) });
await fetch(url, { signal: AbortSignal.any([userCancel.signal, AbortSignal.timeout(5000)]) });
```

::: tip When to use
Search-as-you-type, route changes that should cancel pending loads, `useEffect` cleanups, and request timeouts.
:::

## Typing Async Iteration <Badge type="tip" text="extra" />

> `AsyncGenerator<T>` and `for await` type streams of values: paginated APIs, streamed responses, server-sent chunks.

```ts
async function* paginate<T>(url: string): AsyncGenerator<T, void, undefined> {
  let next: string | null = url;
  while (next) {
    const page: { items: T[]; next: string | null } = await http(next);
    yield* page.items;
    next = page.next;
  }
}

for await (const order of paginate<Order>('/api/orders')) {
  if (order.total > 1000) flag(order);
}

// Streaming text (e.g. LLM responses)
const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
```

::: tip When to use
Exporting all pages of an API, processing large result sets lazily, and rendering streamed responses chunk by chunk.
:::
