# DOM & Events

Typing element queries, events, forms, custom events and browser storage without sprinkling `as` everywhere.

## Querying Elements

> `querySelector` infers the element type from **tag selectors**. For class/ID selectors it returns `Element | null`, so pass a type argument or check with `instanceof`.

```ts
const form = document.querySelector('form');            // HTMLFormElement | null
const links = document.querySelectorAll('a');           // NodeListOf<HTMLAnchorElement>
const thing = document.querySelector('.search');        // Element | null

// Generic type argument (no runtime check)
const search = document.querySelector<HTMLInputElement>('#search');   // HTMLInputElement | null

// instanceof: checked at runtime and narrowed
const el = document.getElementById('price');
if (!(el instanceof HTMLOutputElement)) throw new Error('#price missing');
el.value = '€19.99';
```

::: tip When to use
Tag selectors when possible, `querySelector<T>()` when you control the HTML, and `instanceof` for markup that may change (CMS content, third-party widgets) so a mismatch fails loudly at the query, not later.
:::

## A Typed Query Helper <Badge type="tip" text="extra" />

> A tiny helper that queries, checks the element class at runtime and throws a clear error.

```ts
function $<T extends Element>(selector: string, type: new () => T, root: ParentNode = document): T {
  const el = root.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`Expected ${type.name} for "${selector}"`);
  return el;
}

const email = $('#email', HTMLInputElement);       // HTMLInputElement, never null
const dialog = $('#confirm', HTMLDialogElement);
dialog.showModal();
```

::: tip When to use
Vanilla TS pages, Web Components and progressive enhancement scripts where you query many elements and want one consistent failure mode.
:::

## Event Types

> Each event has its own interface: `MouseEvent`, `KeyboardEvent`, `InputEvent`, `SubmitEvent`, `PointerEvent`, `DragEvent`... `addEventListener` infers them from the event name.

```ts
window.addEventListener('keydown', (e) => {            // KeyboardEvent (inferred)
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) openSearch();
});

form.addEventListener('submit', (e) => {               // SubmitEvent
  e.preventDefault();
  const button = e.submitter as HTMLButtonElement | null;   // which submit button
});

// Handlers declared separately need explicit types
function onPointerMove(e: PointerEvent) { tooltip.style.translate = `${e.clientX}px ${e.clientY}px`; }
canvas.addEventListener('pointermove', onPointerMove);

// Map of event names → types, useful in your own helpers
type ClickEvt = HTMLElementEventMap['click'];          // MouseEvent
```

::: tip When to use
Write inline arrow handlers to get inference for free. For separate handler functions, annotate the parameter with the specific event type to get `e.key`, `e.clientX`, `e.submitter`, etc.
:::

## event.target vs currentTarget

> `e.target` is typed as `EventTarget | null` because it can be any descendant. Narrow it with `instanceof`, or use `currentTarget` for the element the listener is on.

```ts
input.addEventListener('input', (e) => {
  e.target.value;                                // ❌ EventTarget has no value
  (e.currentTarget as HTMLInputElement).value;   // the element we attached to
});

// Event delegation: target is what was clicked
list.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;
  const row = e.target.closest<HTMLLIElement>('li[data-id]');
  if (!row) return;
  removeItem(row.dataset.id!);                   // dataset values are string | undefined
});
```

::: tip When to use
Delegation on lists and tables (`instanceof Element` + `closest`), and reading values from the element that owns the listener (`currentTarget`).
:::

## Forms and FormData

> Form controls have specific types (`HTMLInputElement`, `HTMLSelectElement`); `FormData` values are `FormDataEntryValue` (`string | File`).

```ts
const form = document.querySelector<HTMLFormElement>('#checkout')!;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);

  const email = data.get('email');             // FormDataEntryValue | null
  if (typeof email !== 'string') return;

  const avatar = data.get('avatar');
  if (avatar instanceof File && avatar.size > 0) upload(avatar);

  // Named controls via form.elements
  const qty = form.elements.namedItem('qty') as HTMLInputElement;
  qty.valueAsNumber;                           // number (NaN if empty)
});
```

::: tip When to use
Vanilla forms and Server Actions (which receive `FormData`). Turn `FormData` into a typed object with a schema (see [Runtime Validation](/async/runtime-validation)) rather than many manual checks.
:::

## Custom Events

> `CustomEvent<T>` carries a typed `detail`. Augment `HTMLElementEventMap` / `WindowEventMap` to type `addEventListener` for your events.

```ts
interface CartUpdatedDetail { count: number; total: number }

declare global {
  interface WindowEventMap {
    'cart:updated': CustomEvent<CartUpdatedDetail>;
  }
}

// Dispatch
window.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: 3, total: 89.7 } }));

// Listen: e.detail is typed thanks to the augmentation
window.addEventListener('cart:updated', (e) => {
  badge.textContent = String(e.detail.count);
});
```

::: tip When to use
Communication between independent widgets or micro-frontends on the same page, and events emitted by Web Components (`this.dispatchEvent(new CustomEvent('change', ...))`).
:::

## Typed Storage Wrapper <Badge type="tip" text="extra" />

> `localStorage` only stores strings and returns `string | null`. A typed wrapper with a key map gives autocomplete and safe parsing.

```ts
interface StorageSchema {
  theme: 'light' | 'dark';
  recentSearches: string[];
  cart: { productId: string; qty: number }[];
}

export const storage = {
  get<K extends keyof StorageSchema>(key: K): StorageSchema[K] | null {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as StorageSchema[K]);
    } catch {
      return null;
    }
  },
  set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

storage.set('theme', 'dark');          // ✅
storage.set('theme', 'blue');          // ❌
const recent = storage.get('recentSearches') ?? [];   // string[]
```

::: tip When to use
Persisted preferences, carts and drafts. For data that may outlive app versions, validate on read with a schema instead of the `as` cast.
:::

## Web Components <Badge type="tip" text="extra" />

> Custom elements are classes extending `HTMLElement`. Register them in `HTMLElementTagNameMap` so `querySelector` and `createElement` know their type.

```ts
class RatingStars extends HTMLElement {
  static observedAttributes = ['value'];
  get value() { return Number(this.getAttribute('value') ?? 0); }
  set value(v: number) { this.setAttribute('value', String(v)); }
  attributeChangedCallback() { this.render(); }
  private render() { this.textContent = '★'.repeat(this.value).padEnd(5, '☆'); }
}
customElements.define('rating-stars', RatingStars);

declare global {
  interface HTMLElementTagNameMap { 'rating-stars': RatingStars }
}

const stars = document.querySelector('rating-stars');   // RatingStars | null
const fresh = document.createElement('rating-stars');   // RatingStars
fresh.value = 4;
```

::: tip When to use
Design system components shared across frameworks, embeddable widgets, and progressive enhancement on server-rendered pages.
:::
