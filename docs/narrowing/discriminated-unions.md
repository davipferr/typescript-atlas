# Discriminated Unions

The most useful pattern in TypeScript: union members tagged with a literal field, so a `switch` knows exactly which shape it has.

## Discriminated Unions

> A union where every member has a common literal property (the **discriminant**, e.g. `kind`, `type`, `status`). Checking it narrows to one member.

```ts
type Notification =
  | { type: 'email'; to: string; subject: string }
  | { type: 'sms'; phone: string; text: string }
  | { type: 'push'; deviceId: string; title: string; badge?: number };

function send(n: Notification) {
  switch (n.type) {
    case 'email': return mailer.send(n.to, n.subject);   // n: email variant
    case 'sms':   return sms.send(n.phone, n.text);      // n: sms variant
    case 'push':  return push.send(n.deviceId, n.title);
  }
}
```

::: tip When to use
Whenever a value can be one of several **shapes**: payment methods, notification channels, form field definitions, CMS content blocks, WebSocket messages. Prefer it over one object with many optional fields.
:::

## Modeling Async State

> Replace `isLoading` / `error` / `data` booleans with a union of states. Impossible combinations become unrepresentable.

```ts
// ❌ Allows nonsense: loading true AND error set AND data present
type BadState = { isLoading: boolean; error?: string; data?: User[] };

// ✅ Exactly one state at a time, each with its own data
type RemoteData<T, E = string> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

function UsersList({ state }: { state: RemoteData<User[]> }) {
  switch (state.status) {
    case 'idle':    return null;
    case 'loading': return <Spinner />;
    case 'error':   return <Alert>{state.error}</Alert>;
    case 'success': return <ul>{state.data.map(renderUser)}</ul>;   // data only exists here
  }
}
```

::: tip When to use
Data fetching state, file uploads (`idle | uploading(progress) | done(url) | failed`), multi-step forms, auth (`anonymous | authenticated(user)`). This alone removes a whole class of UI bugs.
:::

## Exhaustiveness Checking with never

> In the `default` branch, assign the value to `never`. If someone adds a new union member, every unhandled `switch` turns into a compile error.

```ts
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

type Plan = 'free' | 'pro' | 'enterprise';

function monthlyPrice(plan: Plan): number {
  switch (plan) {
    case 'free': return 0;
    case 'pro': return 12;
    case 'enterprise': return 99;
    default: return assertNever(plan);
  }
}

// Later: type Plan = 'free' | 'pro' | 'team' | 'enterprise'
// ❌ Argument of type '"team"' is not assignable to parameter of type 'never'
```

::: tip When to use
Every `switch` over a union that represents business cases (plans, statuses, roles, message types). It turns "we forgot to handle the new status" into a build failure.
:::

## Exhaustive Lookup Objects <Badge type="tip" text="extra" />

> A `Record` keyed by the union (or `satisfies Record<...>`) is a switch-free exhaustive mapping.

```ts
type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

const statusLabel = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  shipped: 'On its way',
  cancelled: 'Cancelled'
} satisfies Record<OrderStatus, string>;   // missing or extra keys are errors

const statusIcon: Record<OrderStatus, string> = {
  pending: '⏳', paid: '💳', shipped: '🚚', cancelled: '✖️'
};

badge.textContent = `${statusIcon[order.status]} ${statusLabel[order.status]}`;
```

::: tip When to use
Labels, colors, icons, permissions, or handler functions per union member. More declarative than a `switch` and just as safe.
:::

## Typed Reducers and Actions

> Actions as a discriminated union make reducers fully typed: each `case` knows its payload.

```ts
type CartAction =
  | { type: 'add'; product: Product; qty: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

interface CartState { items: { product: Product; qty: number }[] }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add':
      return { items: [...state.items, { product: action.product, qty: action.qty }] };
    case 'remove':
      return { items: state.items.filter((i) => i.product.id !== action.productId) };
    case 'clear':
      return { items: [] };
    default:
      return assertNever(action);
  }
}

dispatch({ type: 'remove', productId: 'p1' });   // ✅
dispatch({ type: 'remove', id: 'p1' });          // ❌ caught
```

::: tip When to use
`useReducer`, Redux/NgRx/Pinia-style stores, undo/redo stacks, and any event-sourced logic.
:::

## Typed Messages and Events

> Messages crossing boundaries (WebSocket, `postMessage`, workers) are naturally discriminated unions.

```ts
type ServerMessage =
  | { type: 'chat'; from: string; text: string; sentAt: string }
  | { type: 'typing'; from: string }
  | { type: 'presence'; online: string[] };

socket.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data) as ServerMessage;   // validate in real code!
  if (msg.type === 'chat') appendMessage(msg.from, msg.text);
  else if (msg.type === 'presence') renderOnline(msg.online);
});

// Web Worker request/response protocol
type WorkerRequest = { type: 'resize'; file: File; width: number } | { type: 'cancel' };
```

::: tip When to use
WebSockets, Server-Sent Events, iframe/`postMessage` communication, Web Workers and service workers. Share the union between client and server to keep both in sync.
:::

## Narrowing by Destructured Discriminants <Badge type="tip" text="extra" />

> Since TS 4.6, destructuring the discriminant into a `const` still narrows the other destructured fields.

```ts
type Field =
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'date'; value: Date };

function FieldPreview({ kind, value }: Field) {
  if (kind === 'number') return value.toFixed(2);           // value: number
  if (kind === 'date') return value.toLocaleDateString();   // value: Date
  return value.trim();                                      // value: string
}

// Same idea with tuple-typed rest parameters
function emit(...[event, payload]: ['login', User] | ['logout', undefined]) {
  if (event === 'login') payload.email;   // payload: User
}
```

Both destructured names must be `const` (or unmodified parameters) and the property names must exist on every member.

::: tip When to use
Clean React props destructuring for variant components, and tuple-based argument unions in event emitters.
:::
