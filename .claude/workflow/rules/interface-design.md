# Interface design

**Applies to all repos.** Anything a person looks at: a page, a dashboard, a chart, a terminal report.

## Show, don't tell

An interface shows state with a mark a person reads at a glance: a count, a fill, a position, a colour.
It does not explain state in a sentence.

- If a screen needs a sentence to be understood, change what is drawn.
- Words on screen are names: a label, a key entry, a number with its unit. A key names each mark once.
- A hover names what is under the pointer. It never carries information the screen lacks, and never an
  explanation.
- Two numbers that count different things never sit side by side unless each is labelled or drawn.
- Before shipping, read the screen as someone who has never seen the repo. If a number or mark can be
  read two ways, it will be.

## Minimal and simple

The user's standing direction (2026-10-22): minimal and simplistic, in every repo and every agent.

- A binary action is one control whose mark shows its state: one icon that flips, never a pair of buttons.
- Controls are icons; their words live in `aria-label` / `title`.
- No layer repeats its parent: a group with one child shows the child, and a header, legend or chip that restates what its position or column already says is removed.
- Before adding a mark, a control or a card, look for one to remove.
