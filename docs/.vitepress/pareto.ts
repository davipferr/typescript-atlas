// The 80/20 path: the ~20% of the atlas that gives a full-stack developer with zero
// TypeScript knowledge ~80% of what they use every day. Assumes working JavaScript.
//
// Every `features` entry is the exact title of a `## ` heading on that page.
// ParetoPath.vue resolves them against features.data.ts, so links and summaries stay
// in sync with the content (a title that no longer exists is flagged on the page).

export interface ParetoRead {
  page: string // page link, e.g. '/fundamentals/type-system'
  features: string[] // feature titles on that page, in reading order
}

export interface ParetoStep {
  title: string
  goal: string // "Be able to…"
  why: string // why this is in the 20%
  reads: ParetoRead[]
}

export interface ParetoLater {
  page: string
  why: string
}

export const paretoSteps: ParetoStep[] = [
  {
    title: 'How TypeScript thinks',
    goal: 'Explain what TypeScript checks, what it never checks, and why your editor already knows most types.',
    why: 'Every later page assumes this mental model. Inference and structural typing explain most compiler errors you will meet.',
    reads: [
      {
        page: '/fundamentals/type-system',
        features: [
          'Static Types, Erased at Runtime',
          'Type Annotations',
          'Type Inference',
          'Structural Typing',
          'any vs unknown'
        ]
      }
    ]
  },
  {
    title: 'Run the checker',
    goal: 'Start a project with strict mode on and know which tool type-checks and which one only strips types.',
    why: 'Without strict mode TypeScript catches far less. Knowing that Vite, esbuild and tsx do not type-check avoids "it ran, so it is correct".',
    reads: [
      { page: '/compiler/workflow', features: ['Transpiling vs Type Checking'] },
      { page: '/compiler/tsconfig', features: ['The strict Flag Family'] }
    ]
  },
  {
    title: 'The everyday vocabulary',
    goal: 'Type values, arrays and possibly-missing data, and describe a value that can be one of several things.',
    why: 'Primitives, arrays, null/undefined and unions show up in almost every line you annotate.',
    reads: [
      { page: '/fundamentals/core-types', features: ['Primitive Types', 'Arrays', 'null and undefined'] },
      { page: '/fundamentals/unions-literals', features: ['Union Types', 'Literal Types', 'Type Aliases'] }
    ]
  },
  {
    title: 'Shape your data',
    goal: 'Model API payloads, DB rows and component props as object types or interfaces, and choose between the two.',
    why: 'Full-stack code is mostly objects moving between layers. This is where you will write most of your own types.',
    reads: [
      {
        page: '/objects/object-types',
        features: ['Object Type Literals', 'Optional Properties']
      },
      { page: '/objects/interfaces', features: ['Interfaces', 'Interface vs Type Alias'] }
    ]
  },
  {
    title: 'Type your functions',
    goal: 'Type parameters, return values and options objects.',
    why: 'Functions are the boundaries the checker protects. Typed parameters are where inference starts for everything inside.',
    reads: [
      {
        page: '/functions/typing-functions',
        features: [
          'Parameter and Return Types',
          'Options Objects with Destructuring'
        ]
      }
    ]
  },
  {
    title: 'Narrowing: from "maybe" to "sure"',
    goal: 'Turn a union into a specific type with if-checks, and model loading/success/error states that cannot be mixed up.',
    why: 'Most TypeScript errors are "this might be undefined" or "this might be the other member". Narrowing is how you fix them, and discriminated unions are the pattern you will use most.',
    reads: [
      {
        page: '/narrowing/type-guards',
        features: [
          'Control Flow Analysis',
          'typeof Guards'
        ]
      },
      {
        page: '/narrowing/discriminated-unions',
        features: ['Discriminated Unions', 'Modeling Async State', 'Exhaustiveness Checking with never']
      }
    ]
  },
  {
    title: 'When you know better than the compiler',
    goal: 'Use as and ! on purpose, and know the risk each one carries.',
    why: 'You will see these in every codebase and in DOM and React code. Knowing when they are lies keeps them rare.',
    reads: [
      {
        page: '/narrowing/assertions',
        features: ['Type Assertions (as)', 'Non-Null Assertion (!)']
      }
    ]
  },
  {
    title: 'Generics you will actually use',
    goal: 'Read and write simple generic functions and types like ApiResponse<T>, and limit them with extends.',
    why: 'Every library you use (fetch helpers, React hooks, ORMs, Zod) is generic. Reading generics comes before writing advanced ones.',
    reads: [
      {
        page: '/generics/generic-basics',
        features: ['Generic Functions', 'Generic Types and Interfaces']
      },
      { page: '/generics/constraints', features: ['Generic Constraints (extends)'] }
    ]
  },
  {
    title: 'Derive types instead of repeating them',
    goal: 'Build update/patch and public variants of a model with Partial, Pick and Omit, and get types from values with keyof and typeof.',
    why: 'This is what keeps client, server and DB types in sync without copy-paste. It covers most real type manipulation.',
    reads: [
      { page: '/type-manipulation/utility-types', features: ['Partial and Required', 'Pick and Omit'] },
      { page: '/type-manipulation/operators', features: ['keyof', 'typeof (Type Query)'] }
    ]
  },
  {
    title: 'Modules and other people\'s code',
    goal: 'Import types between files, and install or find types for any npm package.',
    why: 'Every real project is split into modules and depends on third-party packages.',
    reads: [
      { page: '/modules/modules', features: ['Type-Only Imports and Exports'] },
      { page: '/modules/declarations', features: ['@types and DefinitelyTyped'] }
    ]
  },
  {
    title: 'Async code and the trust boundary',
    goal: 'Type promises and fetch calls, handle caught errors safely, and validate any data that comes from outside.',
    why: 'Types disappear at runtime. API responses, form data and request bodies are where full-stack bugs come from, and validating them is what makes your types true.',
    reads: [
      {
        page: '/async/promises',
        features: ['Promise Types', 'Typing fetch Responses', 'Errors Are unknown']
      },
      { page: '/async/runtime-validation', features: ['Schema Validation with Zod'] }
    ]
  },
  {
    title: 'Front end and back end',
    goal: 'Type React components, state and events, type Express handlers, and share one set of types between client and server.',
    why: 'This is the job itself. Everything above is applied here.',
    reads: [
      {
        page: '/web/react',
        features: ['Typing Props', 'useState', 'Event Handlers']
      },
      { page: '/web/node', features: ['Typing Express Handlers'] },
      { page: '/async/runtime-validation', features: ['Sharing Types Across Client and Server'] }
    ]
  },
  {
    title: 'Habits that keep it clean',
    goal: 'Review your own code: few annotations, no any.',
    why: 'Two habits that prevent most of the mess beginners create.',
    reads: [
      {
        page: '/patterns/best-practices',
        features: ['Let Inference Work', 'Avoid any; Use unknown at the Edges']
      }
    ]
  }
]

// The remaining ~80% of the atlas, grouped by page: read it when a real need shows up.
export const paretoLater: ParetoLater[] = [
  { page: '/functions/overloads', why: 'Overloads and higher-order typing matter mostly to library authors.' },
  { page: '/classes/class-basics', why: 'Modern React and Express code is mostly functions and objects. Read it when a codebase or framework (NestJS, Angular) uses classes.' },
  { page: '/classes/abstraction', why: 'Abstract classes, mixins and singletons are niche in day-to-day full-stack work.' },
  { page: '/type-manipulation/conditional-mapped', why: 'Conditional and mapped types power library types. You can use them long before you need to write them.' },
  { page: '/decorators/decorators', why: 'Only needed for decorator frameworks such as NestJS, Angular or TypeORM.' },
  { page: '/patterns/type-safe-patterns', why: 'Branded types, builders and typed emitters pay off once the basics are automatic.' },
  { page: '/web/dom', why: 'React handles most DOM typing for you. Read it for vanilla DOM work.' },
  { page: '/compiler/tsconfig', why: 'Beyond strict, the defaults of your framework template are fine until you build or publish a library.' }
]
