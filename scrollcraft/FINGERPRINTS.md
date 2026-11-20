# Fingerprints

Every site you build with **scroll-craft** gets one row here, appended after it
ships. The registry exists so your next build can prove it is a different page
rather than a re-skin of one you already made.

This file is **yours**. It starts empty on purpose: the gate is about not
repeating *yourself*, so it has nothing to say until you have built something.

The rules and the gate live in the skill's
`references/uniqueness.md`. Short version:

**A new build must differ from EVERY row below on at least 4 of the 6
dimensions.** Four against each row individually, not four on average across the
table. If a planned build fails, change the plan. Never edit a row to make room
for it.

The six dimensions are: **grammar**, **nav treatment**, **hero device**,
**act-sequence shape**, **close pattern**, **signature move**.

Dimension 6 is free, because a signature move is unique by definition. So the
gate really asks for three more out of the remaining five, and a build that
changes only grammar and world will fail it.

---

## The registry

| Build | Grammar | Nav treatment | Hero device | Act-sequence shape | Close pattern | Signature move | World | Port |
|---|---|---|---|---|---|---|---|---|
| knowlyai-grounded | Live surface | Fixed bottom status bar, no top bar; named segments are the only navigation and the right-hand readouts are live | Pinned console already in a state (sources, query, telemetry, activity log), no title card | pin > flow > pan > reveal > pin > flow; 6 acts, 11.3vh | Not a button island: a working query field over the page's own index, with the CTA as a text link beside it | The confidence gate: a draggable similarity threshold that recomputes the ranking, the answer, the citation numbering and the chrome, and drives the product into refusing | Code-rendered dense instrument, amber on near-black, no imagery | 4512 |

| knowlyai-redacted | Typographic poster (landing); the console behind it is knowlyai-grounded restyled, not a new structure | None. The wordmark is a black block set inside the hero composition | Pinned type planes: an outlined page number grows and recedes behind a condensed 2-line headline, a tape strip crosses in front | pin > flow+kinetic > flow+cue > pin > reveal x3 > flow over one continuous blended ground; 6 acts, 10.0vh | Inverted: smallest type on the site, one underlined link, a live API readout, on black | The redaction: scroll draws black bars across every unsourced sentence of an answer, highlights the cited ones with page tags, then slams a NOT IN YOUR DOCUMENTS stamp that files itself in the corner; bars lift on tap or keyboard | Brutalist-maximalist: paper ground flowing into wine, berry and plum, amber highlights; Archivo variable width, IBM Plex Mono; no imagery | 4512 |

---

## What is taken

Add a bullet here whenever a build claims something a later build should avoid
reusing: a grammar, a nav treatment, a close pattern, a signature move, an
act-count-and-length band. The shared columns are what the next build inherits
as a constraint, so writing them down is the whole point.

Nothing is taken yet.

---

## Appending a row

After shipping, add one line to the table and one bullet to **What is taken** if
the build claimed something new. Fill every column. Say what the build shares
with existing rows.

Rows are append-only. A build that has been superseded stays in the table,
because the space it occupies is still occupied.

---

## Worked example

The skill's author kept a registry of twelve builds across eight page grammars.
If you want to see what a filled-in table looks like, and which shapes tend to
collide, read `EXAMPLES.md` in the scroll-craft repository. Treat it as
illustration only: those rows are somebody else's builds and they do **not**
constrain yours.

- **Live surface** as a grammar, with app chrome replacing the marketing bar.
- **A fixed bottom status bar as the entire navigation.** No top bar anywhere.
- **A pinned console hero** that is the product in a state rather than a title.
- **Closing on a working input** rather than a magnetic CTA.
- **The confidence gate.** Scroll performs it until a hand takes it over, so the
  peak lands on touch, on a keyboard and under reduced motion.
- **Every displayed number derived from the page's own arrays at runtime**, so
  there is no invented statistic anywhere.
- **Typographic poster** as a grammar, with no persistent nav and an inverted close.
- **The redaction**: scroll-driven black bars over unsourced sentences, plus a stamp.
- **A page-driven continuous ground**: per-act `data-ground` colours blended across seams in page JS, with ink flipping by measured contrast.
- Shared with knowlyai-grounded: a 6-act count, pinned first act, and the KnowlyAI subject.
