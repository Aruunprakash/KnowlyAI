# KnowlyAI, redacted: brief

**Status: interviewed by proposal.** The user's request, verbatim:
*"makke it maximisam, brutalist, and also need a landing page too for it"*.
Scope, chosen by the user from three options: **restyle the current page**
(the live console) brutalist, and **add a simpler landing page in front of it**.
Imagery, chosen by the user: **type and code only**. For the eight design
questions I proposed an answer to each, and the user replied verbatim:
*"Yes, use yours"*. So every answer below is my proposal, accepted as written.

Two pages, one build:

- `index.html`: the new landing page. A typographic poster.
- `console.html`: the existing live console (build `knowlyai-grounded`),
  restyled in this build's system. Same structure, same live API wiring. The
  original folder stays untouched as the earlier build.

---

## The eight (accepted proposals)

**1. Vibe.** Loud, raw, accusatory, honest. References: a Swiss protest poster,
a photocopied punk zine, an evidence sticker on a court exhibit.

**2. Journey.** Landing: giant claim, then the problem (AI makes things up),
then how KnowlyAI cites the page, then "try it" into the console. The console
keeps its six sections (index, unsourced, passages, retrieval, threshold, ask),
restyled.

**3. Energy.** Loud open. Louder through the "AI made this up" part. Near
silence just before the peak. A loud peak. A firm, still close.

**4. Feeling and the one moment.** The console keeps its peak (drag the
evidence line up and it refuses). On the landing page the moment is a huge
**NOT IN YOUR DOCUMENTS** stamp slamming over a made-up answer.

**5. One thing no site does.** The redaction: as you scroll, every sentence
without a source is struck through with a black bar, and only cited sentences
survive.

**6. Range.** Maximalist and brutalist (the user's own words).

**7. One world or scenes.** Separate, hard-cut scenes. Each act lands on its
own ground: paper, black, paper, orange, black. No interpolated drift.

**8. Assets.** None. Type and code only: giant type, hard blocks, black bars,
rules, stamps. No generated imagery, no video, no spend.

**Colour.** Raw paper white `#F0F0EC`, black `#0B0B0B`, one harsh signal
colour: safety orange `#FF4D00`. Orange is a fill under black text. Where it
has to be text on paper it darkens to `#C23A00` so small type keeps 4.5:1.

---

## Grammar (landing): typographic poster

Type is the imagery, scale contrast does the work photography would, the
wordmark is part of the composition, and the close inverts into the smallest
type on the site.

Why the other seven lost:

- **Live surface**: taken by the console, which this build keeps. Two
  live-surface pages in front of each other would be one idea twice.
- **Filmic one-shot**: needs footage and hides its cuts. The brief wants cuts.
- **Chaptered editorial**: right ground shifts, wrong temperature. A folio and
  a colophon are calm, and the brief says loud and accusatory.
- **Continuous world**: there is no geography, and the brief chose hard cuts.
- **Gallery / catalog**: one product, no range.
- **Split stage**: chatbot against KnowlyAI would work for one act, but the
  redaction already makes that argument inside one column.
- **Rhythmic cutlist**: the closest second. It bans `pin`, and the peak needs
  a hold long enough to read what got blacked out.

## Signature move: the redaction

A model's answer set in large type. Scroll walks through it sentence by
sentence: a sentence with no source gets a black bar drawn across it, and a
sentence with one gets an orange highlight plus its page tag. A tally in the
header counts both from the page's own array. When the last bar lands, a
**NOT IN YOUR DOCUMENTS** stamp slams across the blacked-out text. Tap or focus
any bar and it lifts to show the sentence and why it was struck.

## Fingerprint gate against `knowlyai-grounded`

| Dimension | knowlyai-grounded | knowlyai-redacted (landing) | Differs |
|---|---|---|---|
| Grammar | Live surface | Typographic poster | yes |
| Nav | Fixed bottom status bar | None. Wordmark is set in the hero composition | yes |
| Hero device | Pinned console already in a state | Pinned type planes at three scale rates, with an outlined page number behind and a tape strip in front | yes |
| Act shape | pin > flow > pan > reveal > pin > flow, 6 acts, 11.3vh | pin > flow+kinetic > flow+cue > pin > reveal > flow, 6 acts, about 9.8vh | yes (shares the act count) |
| Close | Working query field | Inverted: smallest type on the site, one underlined link, live index readout | yes |
| Signature | Confidence gate | The redaction | yes |

6 of 6. Passes.

---

## The feeling curve (written before the acts)

```
1  Confrontation  a two-word demand at 18vw: SOURCE OR SILENCE. Planes pull
                  apart under the first scroll
2  Irritation     a wall of confident AI claims at every size, each stickered
                  NO SOURCE. Too much on purpose
3  Hush           a black screen and one small line. Nothing else
4  Vindication    PEAK. The answer gets redacted line by line, the sourced
                  lines light up, then the stamp lands
5  Clarity        three words at full width (SPLIT, RETRIEVE, CITE), each
                  wiped in, each with one plain sentence
6  Resolve        the quietest screen on the site: one link, one live line
```

No two adjacent acts share a feeling. Act 3 is the quiet before the peak.

### Authored silence

**All of act 3 is intentionally near-empty**: a black ground and one 17px line.
That is the silence before the peak, not dead scroll. The first ~12% of act 4
also shows the answer unredacted, so the visitor reads it before it is taken
apart.

## The peak

> you scroll and it literally blacks out every line the AI made up, then
> stamps NOT IN YOUR DOCUMENTS across it

Act 4. Largest span on the page (3.6vh against 1.5 for the hero).

## The tell-someone sentence

> It's the site where the AI's answer gets redacted in front of you, line by
> line, until only what it can prove is left.

## The one action

**Ask your documents.** One label, used everywhere. It opens the console.

---

## The scroll score (landing)

| # | Beat | Feeling | Device | Span | Why |
|---|---|---|---|---|---|
| 1 | Demand | Confrontation | `pin` + bespoke scale planes | 1.5 | Depth from three type planes at different scale and travel rates. Grammar allows pin with scale from `--sc-p` and bans parallax on text, so the planes use page CSS, not the kit's parallax |
| 2 | Lies | Irritation | `flow` + `kinetic` + `in` | ~1.6 | Maximalist collage. The one kinetic headline on the page |
| 3 | Hush | Hush | `flow` + `cue`, hard cut to black | ~1.0 | Authored silence. One line, nothing else |
| 4 | Redaction | Vindication (peak) | `pin` + the redaction | 3.6 | The page stops and takes the answer apart |
| 5 | Method | Clarity | `reveal` x3 | ~1.6 | A wipe across letterforms: three state changes |
| 6 | Ask | Resolve | `flow`, inverted | ~0.9 | Poster grammar closes small |

Five device families, none twice in a row (the two pins are separated by two
flow acts). No `scrub`. About 9.8vh in total across 6 acts, well outside the
13.6 to 13.8 band.

## The console restyle

Same six acts and live wiring as `knowlyai-grounded`, in this build's system:
paper ground, 2px black rules, square corners, hard offset shadows, condensed
900-weight display type, orange as a fill. The confidence gate's refusal still
removes the orange. The bar's wordmark links back to the landing page.

---

## Verification and feel check (2026-11-20)

Harness (Edge headless, the skill's shoot.mjs): landing desktop, landing 390px,
landing reduced motion, console desktop and console 390px. All five: no dead
scroll, every cue clears 4.5:1 at its worst frame. No horizontal overflow at
1440 or 390.

Felt curve, scrolled cold: confronted, overloaded, held breath, vindicated,
clear, settled. Matches the intended curve.

Changed after the first shoot:
- The stamp covered the cited sentences that are supposed to survive, which
  contradicted the act's own footnote. It now slams, holds a beat, then files
  itself in the document's bottom-right corner, so the final hold shows what
  can be checked.
- The hero's back plane was too faint to read as depth. Stroke and travel
  increased so it visibly grows and recedes behind the headline.
- The act 2 headline overflowed at 390px. It narrows and shrinks on phones.

Not verifiable here: a real phone (touch scrolling, iOS rendering), and a real
Gemini answer (no GOOGLE_API_KEY on this machine; the console's live path was
exercised against the real FastAPI app with stubbed retrieval and generation).

---

## Revision 2 (2026-11-20): palette, continuity, method layout

The user, verbatim: *"overlapping issue in \" split. retrieve cite \" and i need
change the color code F5AD18 9E1C60 811844 561530"* and *"i prefer continous its
chapter rn right ? i need it continous"*.

**Topic 7 is now: one continuous page.** This replaces the hard-cut answer
above. With type and code only there is no footage for a worldflight, so
continuity comes from the ground: no act paints its own background, every
act names a `data-ground` colour, and `redact.js` blends the page ground
across each seam over 0.42 viewport-heights either side. Text on the ground
follows `--x-fg`, which flips between plum and paper by measured contrast.
No section rules or edges remain. The engine's drift is unused because it
snaps between consecutive flow acts.

**Palette** (user's four, roles assigned by me): plum `#561530` replaces black
(ink, bars, panels, shadows); amber `#F5AD18` replaces orange (highlights,
cited sentences, tape, buttons); berry `#9E1C60` is the stamp, the method
ground and small accent text on paper (amber is too light for small text);
wine `#811844` is the silent act's ground and two wall tiles. Paper
`#F0F0EC` stays as the reading ground. Ground flow: paper, paper, wine,
paper, berry, plum.

**Method act:** each word now owns a full line with its sentence underneath
(lead, trail, lead). The old two-column row let RETRIEVE run over its copy.
Measured at 1440, 1024 and 390: every word fits its row, none touches its
copy, no horizontal overflow.

Re-verified: landing desktop, 390px and reduced motion, console desktop. No
dead scroll, all cues clear 4.5:1 at their worst frame.

---

## Revision 3 (2026-11-20): the app joins the set

The user, verbatim: *"yes restyle the app to match and make it in 1st set with
the landing and console"*.

- The React app (`web/`) now uses this build's system: the four colours on
  paper, square corners, hard offset shadows, Archivo (with its width axis)
  and IBM Plex Mono, condensed 900 display type, amber slabs for questions and
  citation numbers. Dark theme is the plum version; light is the default.
- It ships into this folder at `app/` (`npm run build:set`), so the landing
  page, console and app are one set on one static server.
- **The one action now opens the app.** "Ask your documents" on the landing
  page and "Open KnowlyAI" in the console go to `app/`; the landing close keeps
  a quiet text link to the console for people who want to see it refuse first.
- Backend status is gone from the app too: no "Degraded", no API key, no
  "start the API" hint. The sidebar footer now holds Home, Console and the
  theme toggle.

Verified headless: empty and live states, a streamed answer with citations,
the evidence panel and its PDF link, dark theme, 390px phone with the drawer,
and every link between the three pages (all 200). Measured text contrast:
lowest 4.85:1 light, 8.07:1 dark. Typecheck and lint clean.
