# KnowlyAI — brief

**Status: interviewed.** Four of the eight topics were answered directly by the
user; the rest are authored decisions, marked below, taken under the user's
instruction to recommend and proceed ("ask suggestion or recom so i can help u
with that", then a confirmed pick on the signature move).

---

## The eight

**1. Vibe, three to five words — AUTHORED.**
Dense, instrumented, evidential, unembellished. References: the margin
apparatus of a critical edition; an oscilloscope front panel; a library index
card with the call number corrected in pencil.

**2. The scroll journey — AUTHORED, from the product.**
The index is already there → a confident answer nobody can check → the document
comes apart into addressable passages → the question finds four of them → the
visitor takes hold of the evidence threshold and the machine refuses → a field
with a cursor in it.

**3. The energy curve — AUTHORED.**
Low and steady at the open, a hard dip of doubt at act two, rising through the
pan, flat and clinical through retrieval, then the peak is *quiet*: the loudest
thing on this page is the moment everything goes colourless and stops.

**4. Feeling, stage by stage, and the one moment.** See *The feeling curve* and
*The peak* below. Required artifacts, written before the acts.

**5. One thing no other site does — USER CONFIRMED.**
The confidence gate. A draggable similarity threshold across a live score rail.
The visitor tunes how much evidence the product demands and watches the answer
narrow, then break.

> User's own framing of the brief, verbatim: *"i need it alive like not normal
> static webpage i need everything like a production level one so make it
> animated and stuff"* and *"no i just need a frotnend thats all the my friend
> willwork on backend"*.

**6. Distance from premium-minimal — USER ANSWERED.** Dense instrument.
Information-forward, small type, high element count, real readouts, monospace
where there is genuinely data. Not premium-minimal, not brutalist.

**7. One unbroken world or distinct scenes — AUTHORED.** Neither, and that is
the point: the page is one *surface*, not one world and not a sequence of
scenes. See the grammar note below.

**8. Assets — USER ANSWERED.** None. Code-rendered: every visual on the page is
SVG, DOM and CSS. No generated imagery, no video, no API spend. Confirmed by
preflight: no `KIE_AI_API_KEY` and no ffmpeg on this machine, so the route was
chosen on purpose rather than worked around.

---

## Scope, as the user set it

**First pass: frontend only.** The user's friend owned the backend, so the page
ran entirely on labelled sample arrays.

**Second pass (2026-11-19): connected to the backend.** The user asked for "a
front end connecting to back end". The page now talks to the FastAPI service in
`api/` and always says which source it is showing:

- **Act 1 and the status bar** read `/api/health` and `/api/documents`: real
  documents, passage and page counts, model name, and an `api` readout
  (`live`, `no key`, `sample`).
- **Act 6** asks `/api/chat` and renders the server-sent-event stream:
  citations first, then the answer with every `[n]` turned into a link to that
  PDF page. A `no_match` from the server is shown as the product's refusal.
  "Add a PDF" uploads via `POST /api/documents`.
- **Acts 3 to 5 stay a demonstration over the sample.** The API has no
  endpoint that lists passages, and the gate needs sentences bound to passages.
  The strip note already labels them as the sample.
- **Fallback.** When no API answers, or it has no `GOOGLE_API_KEY`, the whole
  page runs on the sample as before and the log, bar and close say why.

The API location comes from `<meta name="knowly-api">` (default
`http://127.0.0.1:8000`), overridable per visit with `?api=`.

## Grammar: live surface

The page behaves like the product rather than advertising it. Chrome is app
chrome. Copy is labels, status lines, empty states and marginalia. The hero is
the surface already in a state, and the close is a field with a cursor in it.

Why the other seven lost:

- **Filmic one-shot** — carries a burden of proof and loses it immediately here:
  it wants a full-bleed scrub hero, and there is no footage and no budget for
  any. It is also the grammar four prior builds drifted into.
- **Chaptered editorial** — right for a method or a manifesto. KnowlyAI's pitch
  is not "read our thinking", it is "watch it refuse to make something up".
- **Continuous world** — requires worldflight and real geography. A retrieval
  index has no geography, and the grammar's own warning about expense and
  fragility applies with no footage to fly through.
- **Typographic poster** — the honest fallback when there are no assets, and it
  was the close second. It loses because the user asked for *alive*, and a
  poster's rhythm comes from scale, not from response.
- **Gallery / catalog** — there is one product, not a range.
- **Split stage** — genuinely strong for "chatbot vs grounded", and it survives
  as *one act* (act two) rather than as the page's whole structure. As a
  grammar it forces a symmetric argument across six acts, and the argument here
  is not symmetric: one side has sources and the other does not.
- **Rhythmic cutlist** — bans `pin` and `dwell`, which is the inverse of what a
  page about careful reading should feel like.

---

## The feeling curve

Written before the acts existed.

```
1  Recognition   the console is already loaded: their own pile, two PDFs, 214
                 passages, a question sitting in the field unanswered
2  Doubt         the same question answered with no documents behind it.
                 Fluent, specific, and every clause flagged unsourceable
3  Curiosity     the document comes apart sideways: 214 addressable passages,
                 each with a page number, travelling past under the hand
4  Clarity       the question runs. Sentences compose, and each one drags its
                 citation in behind it
5  Trust  PEAK   the gate. The visitor raises the evidence threshold with their
                 own hand, the answer narrows to near-quotes, and then the
                 colour drains out of the page and it refuses
6  Readiness     a real field, a real cursor, and it answers for real
```

No two adjacent acts carry the same feeling. Act 4 is deliberately the
*flattest* act on the page: clinical, resolved, no flourish, so that act 5 has
something to be a change from.

### Authored silence

**The first ~18% of act 5 is intentionally near-empty.** The rail is present as
an unlit ground, the answer panel holds a single empty-state line, and nothing
else is on screen. That is the silence in front of the peak, not dead scroll.
The verification pass should read it as authored.

---

## The peak

The sentence a visitor would say to a friend:

> you drag a line up through the evidence and the whole page goes grey and it
> just tells you it doesn't know

It lives in **act 5**, it has the largest span on the page by a wide margin
(4.2vh against 3.4 for the next largest), and it gets the silence above.

What makes it the peak is contrast with its own page: this is a dense,
saturated, readout-covered surface, so *stopping* and *going colourless* is the
loudest move available to it. The single accent is the page's entire colour
story, and the refusal state removes it.

---

## The tell-someone sentence

> It's the site where you raise the evidence threshold with your hand and watch
> the AI refuse to answer.

The signature move and this sentence are the same moment, as feel.md requires.

---

## The one thing the visitor must believe

An answer you cannot check is not an answer.

## The one action

Ask it something. The close is a working field, and the single CTA label used
everywhere on the page is **Open KnowlyAI**.


---

## The scroll score

| # | Beat | Feeling | Device | Span | Why this one |
|---|---|---|---|---|---|
| 1 | Index | Recognition | `pin` + `count` + `parallax` | 1.8 | The surface holds while its own telemetry fills. The three console planes drift at different rates, which is the only depth cue a code-rendered page gets. |
| 2 | Unsourced | Doubt | `flow` + `in` + marginal rules | ~0.9 | The one act that reads like a document. After a pinned opener, prose lands harder. |
| 3 | Passages | Curiosity | `pan` | 3.0 | Lateral travel reads as breadth. There are a lot of these and each one is addressable. |
| 4 | Retrieval | Clarity | `reveal` (three `clip-path` wipes) | ~0.9 | A wipe is a change of state, and this beat is one sentence being bound to one passage. Deliberately the flattest act on the page. |
| 5 | Threshold | Trust (**peak**) | `pin` + pointer drag | 4.6 | The page stops moving and starts answering to a hand. Largest span by a wide margin. |
| 6 | Ask | Readiness | `flow` + a live input | ~1.1 | Not pinned. The page releases and hands over a field. |

Six device families, no family twice in a row, no `scrub` (the grammar bans it
and there is no footage anyway). Two drift stops, which is the live-surface
ceiling. Total 11.3 viewport-heights.
