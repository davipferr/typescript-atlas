# React with TypeScript

Typing components, props, children, hooks, events, refs and context in React (`.tsx` files).

## Typing Props

> Describe props with an interface or type and annotate the destructured parameter. Optional props get defaults in the destructuring.

```tsx
interface ProductCardProps {
  product: Product;
  variant?: 'compact' | 'full';
  onAddToCart: (productId: string, qty: number) => void;
}

export function ProductCard({ product, variant = 'full', onAddToCart }: ProductCardProps) {
  return (
    <article className={`card card--${variant}`}>
      <h3>{product.name}</h3>
      <button onClick={() => onAddToCart(product.id, 1)}>Add</button>
    </article>
  );
}

<ProductCard product={p} onAddToCart={add} variant="mini" />   // ❌ 'mini' not allowed
```

::: tip When to use
Every component. Prefer plain function components with typed props over `React.FC` (which adds nothing useful today).
:::

## children and ReactNode

> `React.ReactNode` accepts anything renderable: elements, strings, numbers, arrays, `null`. Use it for `children` and "slot" props.

```tsx
import type { ReactNode, PropsWithChildren } from 'react';

interface CardProps {
  title: ReactNode;          // string or a JSX element
  actions?: ReactNode;
  children: ReactNode;
}

function Card({ title, actions, children }: CardProps) {
  return (
    <section>
      <header>{title}{actions}</header>
      {children}
    </section>
  );
}

// Shorthand
function Layout({ children }: PropsWithChildren) { return <main>{children}</main>; }

// Render props: a function returning ReactNode
interface ListProps<T> { items: T[]; renderItem: (item: T) => ReactNode }
```

::: tip When to use
`ReactNode` for children and slot props (`title`, `icon`, `footer`). Use `React.ReactElement` only when you need an actual element (e.g. to `cloneElement` it).
:::

## Extending Native Element Props

> `React.ComponentProps<'button'>` (or `ComponentPropsWithoutRef`) gives all the native attributes, so wrapper components accept everything a real element does.

```tsx
import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
};

export function Button({ variant = 'primary', loading, disabled, children, ...rest }: ButtonProps) {
  return (
    <button {...rest} disabled={disabled || loading} className={`btn btn-${variant}`}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

<Button type="submit" form="checkout" aria-label="Pay" onClick={pay}>Pay</Button>   // all native props work

// Props of another component
type ProductCardProps2 = ComponentProps<typeof ProductCard>;

// Remove or override some native props
type InputProps = Omit<ComponentProps<'input'>, 'size'> & { size?: 'sm' | 'lg' };
```

::: tip When to use
Design system primitives (`Button`, `Input`, `Link`) and any wrapper around a native element or third-party component.
:::

## useState

> `useState` infers from the initial value. Pass a type argument when the initial value doesn't represent all possible states (`null`, empty arrays, unions).

```tsx
const [count, setCount] = useState(0);                       // number
const [query, setQuery] = useState('');                      // string
const [user, setUser] = useState<User | null>(null);         // not just null
const [items, setItems] = useState<CartItem[]>([]);          // not never[]
const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

setItems((prev) => [...prev, newItem]);                      // prev: CartItem[]
```

::: tip When to use
Annotate whenever the initial value is `null`, `undefined`, `[]` or one member of a union. For related pieces of state, use a discriminated union with `useReducer` instead of several `useState`s.
:::

## useRef

> DOM refs: `useRef<HTMLInputElement>(null)`. Mutable instance values: `useRef<T>(initial)`. React 19 makes `ref.current` always writable.

```tsx
function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);        // RefObject<HTMLInputElement | null>
  const timerRef = useRef<number | undefined>(undefined); // mutable box, not a DOM ref

  useEffect(() => {
    inputRef.current?.focus();                            // may be null before mount
    return () => clearTimeout(timerRef.current);
  }, []);

  return <input ref={inputRef} />;
}

// React 19: ref is a normal prop for function components
function TextField({ ref, ...props }: ComponentProps<'input'>) {
  return <input ref={ref} {...props} />;
}
```

::: tip When to use
Focus management, measuring elements, integrating non-React libraries (maps, charts, editors), and storing timers or previous values that shouldn't trigger re-renders.
:::

## Event Handlers

> React wraps DOM events in typed synthetic events: `React.ChangeEvent<HTMLInputElement>`, `React.FormEvent<HTMLFormElement>`, `React.MouseEvent<HTMLButtonElement>`...

```tsx
function NewsletterForm() {
  const [email, setEmail] = useState('');

  // Inline: types are inferred
  // <input onChange={(e) => setEmail(e.target.value)} />

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    subscribe(String(data.get('email')));
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" value={email} onChange={handleChange} />
    </form>
  );
}

// Typing a handler prop
interface RowProps { onSelect: React.MouseEventHandler<HTMLTableRowElement> }
```

::: tip When to use
Inline handlers need nothing. For extracted handlers, hover the `onX` prop in the editor to see the exact event type, then copy it.
:::

## useReducer with Discriminated Actions

> A reducer typed with a union of actions makes every `dispatch` checked and each `case` narrowed.

```tsx
type State =
  | { status: 'editing'; values: CheckoutForm }
  | { status: 'submitting'; values: CheckoutForm }
  | { status: 'error'; values: CheckoutForm; message: string }
  | { status: 'done'; orderId: string };

type Action =
  | { type: 'change'; field: keyof CheckoutForm; value: string }
  | { type: 'submit' }
  | { type: 'failure'; message: string }
  | { type: 'success'; orderId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'change':
      if (state.status === 'done') return state;
      return { ...state, values: { ...state.values, [action.field]: action.value } };
    case 'submit':  return state.status === 'done' ? state : { status: 'submitting', values: state.values };
    case 'failure': return state.status === 'done' ? state : { status: 'error', values: state.values, message: action.message };
    case 'success': return { status: 'done', orderId: action.orderId };
  }
}

const [state, dispatch] = useReducer(reducer, { status: 'editing', values: emptyForm });
```

::: tip When to use
Multi-step forms, checkout flows, wizards and any component where several state fields change together.
:::

## Typed Context

> Create context with `T | null` (or `undefined`) and expose it through a custom hook that throws outside the provider.

```tsx
interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;                       // non-null for every consumer
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const value: AuthContextValue = { user, login: async () => {}, logout: () => setUser(null) };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

::: tip When to use
Auth, theme, feature flags, i18n and any provider. The custom hook removes `null` checks from every consumer and gives a clear error when the provider is missing.
:::

## Typing Custom Hooks <Badge type="tip" text="extra" />

> Custom hooks are just typed functions. Return tuples `as const`, or objects for more than two values; make them generic when they wrap data.

```tsx
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initial;
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(value)), [key, value]);
  return [value, setValue] as const;    // readonly [T, Dispatch<SetStateAction<T>>]
}

const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');

function useFetch<T>(url: string) {
  const [state, setState] = useState<RemoteData<T>>({ status: 'loading' });
  // ...
  return state;
}
```

::: tip When to use
Reusable stateful logic: storage, media queries, debounced values, data fetching. Without `as const`, a returned tuple is inferred as an array of a union and destructuring loses the types.
:::
