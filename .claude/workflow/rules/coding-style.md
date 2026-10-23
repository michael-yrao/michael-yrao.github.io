# Coding Style

## Immutability (CRITICAL)

Create new objects; never mutate existing ones. Return a new copy with the change
rather than modifying the original in place. Immutable data prevents hidden side
effects and makes debugging easier.

## Core Principles

- **KISS** — simplest solution that works; clarity over cleverness; no premature optimization.
- **DRY** — extract real repetition into shared helpers; don't abstract speculatively.
- **YAGNI** — build what's needed now, not what might be needed later.

## Naming

- Variables / functions: `camelCase`, descriptive.
- Booleans: `is` / `has` / `should` / `can` prefix.
- Types / interfaces / components: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Custom hooks: `use` prefix.

## Organization

- Prefer many small, focused files over few large ones (200–400 lines typical, 800 max).
- Organize by feature/domain, not by type.
- Keep functions small (<50 lines) and nesting shallow (prefer early returns over stacked conditionals).

## Error Handling & Validation

- Handle errors explicitly at every level; never silently swallow them.
- User-friendly messages in UI code; detailed context in server logs.
- Validate all external input (user input, API responses, file content) at the boundary; fail fast with clear messages.

## Avoid

- Magic numbers — use named constants for thresholds, delays, and limits.
- Mutation, deep nesting (>4 levels), and long functions.
