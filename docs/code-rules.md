# Code rules

Carried in on 2026-11-03 ([ADR-0001](adr/0001-track-3-from-mira-with-a-memory-and-tatum-kit.md)).

Match these rules in new and changed code. Don't copy a violation because the file next door already does
it. When you touch a violating file, bring the lines you change into compliance. Don't rewrite the whole
file unless that is the task.

## TypeScript

- Strict mode stays on. Do not weaken `tsconfig` to make a change compile.
- No `any`. No `as any`. No `// @ts-ignore` and no `// @ts-expect-error` unless the line says why the types are wrong and a follow-up exists.
- Prefer `unknown` at a boundary, then narrow. A cast is a last resort, and only after a runtime check.
- External input is untrusted. Parse it with zod (request bodies, env, webhook payloads, tool arguments). Infer the type from the schema (`z.infer`) instead of declaring a parallel interface.
- Exported functions take and return explicit types when the inferred type would leak a library's internals or an anonymous object. Do not annotate what the compiler already knows.
- No non-null assertion (`!`) on a value that might be missing. Handle the missing case.
- Prefer a union and an exhaustive `switch` over boolean flags and stringly modes. `never` in the default branch.
- Do not use enums or parameter properties: Node's type stripping rejects both. Use a const object or a string union, and plain fields.
- Async functions do not swallow errors. Catch only to translate into a typed result or a user-facing sentence, then rethrow or return that result. No empty `catch`.
- No floating promises. `await` them, or pass them to something that handles rejection.
- Imports are type-only when they are types (`import type`). Packages keep the `.ts` extension on relative imports.
- A package's `index.ts` is its public API. No barrel `index.ts` inside an app; import the module that owns the symbol.
- No default exports, except a file a tool requires one from (Vite config).
- Do not add comments. Names and types carry the meaning. A comment is allowed only when the next reader would otherwise repeat a measured mistake (a relayer quirk, a security reason).

## Reuse

- A pure function with no I/O is the default unit of reuse. It takes data in and returns data out. No hidden `db`, `env`, or `fetch`.
- The second caller extracts. The first caller stays inline unless leaving it inline mixes two jobs in one file (HTTP plus domain, render plus request).
- Copy-paste of more than a few lines is a bug. Share the function.
- Do not invent a wrapper, a base class, or a generic "utils" bag for one call site. `packages/` holds code that already has two callers, or a boundary (env, crypto, HTTP client, Sui, Walrus Memory) that must not be reimplemented.
- Dependencies point inward. A UI file does not import a server module. A domain module does not import an HTTP framework.

## Frontend (`web/`)

- Components render. They do not `fetch`, parse an API payload, decide a business rule, or run a multi-step flow; a hook does, and returns data, status and callbacks (`web/src/chat/useMira.ts` is that hook today).
- A component may keep ephemeral UI state only: open or closed, focus, a draft that has not been submitted.

## Server and memory

- Validate every body, query and header you branch on, with zod, at the route.
- A sentence shown to a user names what failed and what they can do. It does not include a stack, a key, a token, or the upstream JSON.
- Do not log a private key, a session token, a delegate key, or memory text. Log an id, a status, and a reason code.
- Every Sui call goes through `@mira/chain`. Every Walrus Memory call goes through `@mira/memory`, and namespace strings are built there.
- Memories can't be deleted and the relayer sees plaintext: write only what the PRD allows, and run `redactCredentials` first.
- A write that tells the user it was saved must be recoverable if the process dies after that sentence.

## Tests

- A test sits next to the module it imports, and the file name matches that module.
- Test the pure function and the hook's rule. Do not snapshot a page to avoid naming the behavior.
- A test that needs Tatum or mainnet skips itself when the credential is absent. It does not fake a passing result.
- Do not delete or weaken an assertion to go green.

## Before you finish

`npm run typecheck`, `npm test`, `npm --prefix web run build` and `npm run docs:links` are green.
