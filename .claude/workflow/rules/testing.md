# Testing

**Applies to all repos.** Tests exist to catch a break that matters, at the lowest cost in agent time.
A test that cannot fail for an interesting reason is a cost with no return.

## Write a test for

- Branching logic and boundaries (the clamp's two ends, the empty input, the off-by-one).
- Parsing or validating external input (a file, an API response, a user's entry).
- A contract between repos or modules (an exported field another consumer reads).
- A bug that was just fixed — one test that fails without the fix.

## Do not write a test for

- A constant, a pass-through getter, or a one-line wrapper around a tested function.
- Static template text or a CSS class that no logic decides.
- What the framework or the language already guarantees.
- A case another test already proves — a second input on the same branch is not a second test.

## Shape

- One table-driven test per function over its meaningful cases, not one `it` / `def test_` per input.
- A brief names the tests to add. The engineer adds those and no others, and reports a gap it sees
  instead of filling it.
- When a change makes an existing test redundant or obsolete, delete it in the same diff.
- A bug-fix test names the branch the unfixed code takes for its input. Every assertion in it is one
  that branch breaks.

## Running

- While iterating, run only the affected spec or test file.
- Run the full suite once, before reporting.
