// Single source of truth for the site structure.
// Used by the sidebar (config.mts) and by the feature index loader (features.data.ts).

export interface Page {
  text: string
  link: string
}

export interface Section {
  text: string
  icon: string
  description: string
  items: Page[]
}

export const sections: Section[] = [
  {
    text: 'Fundamentals',
    icon: '🧱',
    description: 'How the type system thinks, the core types, unions, literals and aliases.',
    items: [
      { text: 'How the Type System Works', link: '/fundamentals/type-system' },
      { text: 'Core Types', link: '/fundamentals/core-types' },
      { text: 'Unions, Literals & Aliases', link: '/fundamentals/unions-literals' }
    ]
  },
  {
    text: 'Functions',
    icon: '⚙️',
    description: 'Parameter and return types, function types, callbacks, overloads and this.',
    items: [
      { text: 'Typing Functions', link: '/functions/typing-functions' },
      { text: 'Overloads & Higher-Order Functions', link: '/functions/overloads' }
    ]
  },
  {
    text: 'Objects & Interfaces',
    icon: '📦',
    description: 'Object types, optional and readonly members, index signatures, interfaces vs types.',
    items: [
      { text: 'Object Types', link: '/objects/object-types' },
      { text: 'Interfaces', link: '/objects/interfaces' }
    ]
  },
  {
    text: 'Narrowing & Type Safety',
    icon: '🔀',
    description: 'Type guards, discriminated unions, exhaustiveness, as, !, satisfies and as const.',
    items: [
      { text: 'Narrowing & Type Guards', link: '/narrowing/type-guards' },
      { text: 'Discriminated Unions', link: '/narrowing/discriminated-unions' },
      { text: 'Assertions, satisfies & as const', link: '/narrowing/assertions' }
    ]
  },
  {
    text: 'Classes',
    icon: '🧩',
    description: 'Access modifiers, parameter properties, abstract classes, implements and mixins.',
    items: [
      { text: 'Class Basics', link: '/classes/class-basics' },
      { text: 'Abstraction & Class Patterns', link: '/classes/abstraction' }
    ]
  },
  {
    text: 'Generics',
    icon: '🧬',
    description: 'Generic functions, types and classes, constraints, defaults and inference control.',
    items: [
      { text: 'Generic Basics', link: '/generics/generic-basics' },
      { text: 'Constraints & Inference', link: '/generics/constraints' }
    ]
  },
  {
    text: 'Type Manipulation',
    icon: '🔧',
    description: 'keyof, typeof, indexed access, conditional and mapped types, template literals, utilities.',
    items: [
      { text: 'Type Operators', link: '/type-manipulation/operators' },
      { text: 'Conditional & Mapped Types', link: '/type-manipulation/conditional-mapped' },
      { text: 'Utility Types', link: '/type-manipulation/utility-types' }
    ]
  },
  {
    text: 'Decorators',
    icon: '🎀',
    description: 'Standard decorators for classes, methods, fields and accessors, plus the legacy flavor.',
    items: [{ text: 'Decorators', link: '/decorators/decorators' }]
  },
  {
    text: 'Modules & Declarations',
    icon: '📚',
    description: 'Type-only imports, namespaces, .d.ts files, @types and module augmentation.',
    items: [
      { text: 'Modules', link: '/modules/modules' },
      { text: 'Declaration Files & Augmentation', link: '/modules/declarations' }
    ]
  },
  {
    text: 'Compiler & Configuration',
    icon: '🛠️',
    description: 'The tsconfig options that matter, strictness, emit vs type-check and gradual adoption.',
    items: [
      { text: 'tsconfig Essentials', link: '/compiler/tsconfig' },
      { text: 'Type-Checking Workflow', link: '/compiler/workflow' }
    ]
  },
  {
    text: 'Async & Runtime Safety',
    icon: '⏳',
    description: 'Typing promises and fetch, errors as unknown, Result types and validating data at the edges.',
    items: [
      { text: 'Promises, fetch & Errors', link: '/async/promises' },
      { text: 'Runtime Validation', link: '/async/runtime-validation' }
    ]
  },
  {
    text: 'TypeScript on the Web',
    icon: '🌐',
    description: 'Typing the DOM and events, React components and hooks, Node and Express.',
    items: [
      { text: 'DOM & Events', link: '/web/dom' },
      { text: 'React with TypeScript', link: '/web/react' },
      { text: 'Node & Express', link: '/web/node' }
    ]
  },
  {
    text: 'Patterns & Best Practices',
    icon: '🏛️',
    description: 'Branded types, typed events, state machines, builders and habits of clean TypeScript.',
    items: [
      { text: 'Type-Safe Patterns', link: '/patterns/type-safe-patterns' },
      { text: 'Best Practices', link: '/patterns/best-practices' }
    ]
  }
]
