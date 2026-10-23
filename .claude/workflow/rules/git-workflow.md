# Git Workflow

## Commit Messages

```
<type>: <description>

<optional body>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.

Keep the subject imperative and concise. Commit or push only when asked.

## Pull Requests

- Base the summary on the full commit history, not just the latest commit
  (`git diff <base>...HEAD` to see all changes).
- Write a clear summary and a short test plan.
- Push a new branch with `-u`.
