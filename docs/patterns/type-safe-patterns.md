# Type-Safe Patterns

Recurring designs that use the type system to make bugs impossible rather than just unlikely.

## Branded Types

> Add an invisible "brand" to a primitive so values that share a shape (two kinds of `string` IDs, cents vs euros) can't be mixed up.

```ts
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
type Cents = Brand<number, 'Cents'>;

const UserId = (s: string) => s as UserId;
const toCents = (euros: number) => Math.round(euros * 100) as Cents;

function getOrder(id: OrderId) {}
function refund(amount: Cents) {}

const userId = UserId('u_123');
getOrder(userId);           // ❌ UserId is not assignable to OrderId
refund(19.99);              // ❌ plain number is not Cents
refund(toCents(19.99));     // ✅
```

::: tip When to use
Entity IDs passed around a lot (`userId` vs `orderId` mix-ups), money units (cents vs decimal), sanitized vs raw HTML strings, validated emails. Create branded values only in one place (a parser or constructor function).
:::

## Parse, Don't Validate

> Instead of checking data and keeping the loose type, **parse** it into a stricter type once. The type then proves the check happened.

```ts
type Email = Brand<string, 'Email'>;
type NonEmptyArray<T> = [T, ...T[]];

function parseEmail(input: string): Email | null {
  const v = input.trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(v) ? (v as Email) : null;
}

function sendInvoice(to: Email, items: NonEmptyArray<LineItem>) {
  // no need to re-check: the types guarantee a valid email and at least one item
}

const email = parseEmail(form.email);
if (!email) return showError('Invalid email');
if (cart.length === 0) return showError('Empty cart');
sendInvoice(email, cart as NonEmptyArray<LineItem>);
```

::: tip When to use
Anywhere a check would otherwise be repeated defensively in several functions: validated input, non-empty lists, authenticated users (`AuthenticatedRequest`), published vs draft content.
:::

## State Machines with Unions

> Model each state as a union member holding only the data valid in that state, and write transitions as functions from state to state.

```ts
type Upload =
  | { state: 'idle' }
  | { state: 'uploading'; file: File; progress: number; abort: () => void }
  | { state: 'processing'; file: File }
  | { state: 'done'; url: string }
  | { state: 'failed'; file: File; error: string };

function retry(u: Upload): Upload {
  if (u.state !== 'failed') return u;            // retry only makes sense here
  return startUpload(u.file);
}

function UploadStatus({ upload }: { upload: Upload }) {
  switch (upload.state) {
    case 'uploading': return <Progress value={upload.progress} onCancel={upload.abort} />;
    case 'done':      return <a href={upload.url}>View file</a>;
    case 'failed':    return <RetryButton message={upload.error} />;
    default:          return null;
  }
}
```

::: tip When to use
Uploads, payments (`pending → authorized → captured | failed`), order lifecycles, onboarding wizards, WebSocket connection state. For complex machines with guards and side effects, XState is fully typed.
:::

## Typed Event Emitter / Pub-Sub

> An event map type (`event name → payload`) drives `on` and `emit` signatures, so subscribers and publishers can't disagree.

```ts
type Listener<T> = (payload: T) => void;

export function createEmitter<Events extends Record<string, unknown>>() {
  const listeners: { [K in keyof Events]?: Set<Listener<Events[K]>> } = {};
  return {
    on<K extends keyof Events>(event: K, fn: Listener<Events[K]>) {
      (listeners[event] ??= new Set()).add(fn);
      return () => listeners[event]!.delete(fn);
    },
    emit<K extends keyof Events>(event: K, payload: Events[K]) {
      listeners[event]?.forEach((fn) => fn(payload));
    }
  };
}

type AppEvents = {
  'cart:add': { productId: string; qty: number };
  'auth:logout': undefined;
  'toast': { message: string; tone: 'info' | 'error' };
};

export const bus = createEmitter<AppEvents>();
bus.on('cart:add', ({ productId, qty }) => track('add_to_cart', { productId, qty }));
bus.emit('toast', { message: 'Saved', tone: 'info' });
bus.emit('toast', { message: 'Saved' });       // ❌ tone missing
```

::: tip When to use
Decoupling features (analytics listening to cart events), micro-frontend communication, and MVC/publisher-subscriber architectures in vanilla TS apps.
:::

## Type-Safe Builders

> A builder accumulates configuration step by step; generics can track what has been set so `build()` is only available when complete.

```ts
class RequestBuilder<HasUrl extends boolean = false> {
  private config: { url?: string; method: string; headers: Record<string, string>; body?: string } =
    { method: 'GET', headers: {} };

  url(url: string): RequestBuilder<true> {
    this.config.url = url;
    return this as unknown as RequestBuilder<true>;
  }
  method(m: 'GET' | 'POST' | 'PUT' | 'DELETE') { this.config.method = m; return this; }
  header(k: string, v: string) { this.config.headers[k] = v; return this; }
  json(data: unknown) { this.config.body = JSON.stringify(data); return this.header('Content-Type', 'application/json'); }

  send(this: RequestBuilder<true>) {
    const { url, ...init } = this.config;
    return fetch(url!, init);
  }
}

new RequestBuilder().method('POST').json({ a: 1 }).send();             // ❌ url not set
new RequestBuilder().url('/api/orders').method('POST').json(order).send();   // ✅
```

::: tip When to use
Test data builders, query/request builders and SDK configuration where some steps are mandatory. For most app code, a typed options object is simpler.
:::

## Dependency Injection with Interfaces

> Depend on interfaces, receive implementations through the constructor or a factory. Swapping (tests, environments) needs no code changes.

```ts
interface Clock { now(): Date }
interface Mailer { send(to: string, subject: string, html: string): Promise<void> }

export function createTrialService(deps: { clock: Clock; mailer: Mailer; users: UserRepository }) {
  return {
    async expireTrials() {
      const expired = await deps.users.findTrialsEndingBefore(deps.clock.now());
      await Promise.all(expired.map((u) => deps.mailer.send(u.email, 'Trial ended', '...')));
    }
  };
}

// Test: fake clock and mailer, no mocking library needed
const sent: string[] = [];
const service = createTrialService({
  clock: { now: () => new Date('2026-01-01') },
  mailer: { send: async (to) => { sent.push(to); } },
  users: fakeUsers
});
```

::: tip When to use
Anything touching time, network, storage or randomness. Function factories with a typed `deps` object give you DI without a framework; Angular and NestJS provide container-based DI.
:::

## Exhaustive Handler Maps <Badge type="tip" text="extra" />

> A mapped type over a discriminated union gives a handler per variant, each receiving the correctly narrowed payload.

```ts
type Block =
  | { type: 'heading'; text: string; level: 1 | 2 | 3 }
  | { type: 'image'; src: string; alt: string }
  | { type: 'quote'; text: string; author?: string };

type Handlers<U extends { type: string }, R> = {
  [K in U['type']]: (block: Extract<U, { type: K }>) => R;
};

const renderers: Handlers<Block, string> = {
  heading: (b) => `<h${b.level}>${b.text}</h${b.level}>`,
  image: (b) => `<img src="${b.src}" alt="${b.alt}">`,
  quote: (b) => `<blockquote>${b.text}</blockquote>`
};   // forgetting a block type is a compile error

const html = blocks.map((b) => (renderers[b.type] as (b: Block) => string)(b)).join('');
```

::: tip When to use
CMS/rich-text block renderers, WebSocket message routers, analytics event handlers, and command dispatchers.
:::

## Typed Feature Flags and Config <Badge type="tip" text="extra" />

> Define flags once as a constant, derive the type, and make every lookup checked.

```ts
export const FLAGS = {
  newCheckout: { default: false, description: 'One-page checkout' },
  aiSearch: { default: false, description: 'Semantic search' },
  maxCartItems: { default: 50, description: 'Cart limit' }
} as const satisfies Record<string, { default: boolean | number; description: string }>;

type FlagName = keyof typeof FLAGS;
type FlagValue<K extends FlagName> = (typeof FLAGS)[K]['default'] extends boolean ? boolean : number;

export function flag<K extends FlagName>(name: K): FlagValue<K> {
  return (remoteFlags[name] ?? FLAGS[name].default) as FlagValue<K>;
}

if (flag('newCheckout')) renderNewCheckout();     // boolean
const limit = flag('maxCartItems');               // number
flag('newCheckuot');                              // ❌ typo caught
```

::: tip When to use
Feature flags, remote config and permission keys: removing a flag from the constant immediately shows every place still using it.
:::
