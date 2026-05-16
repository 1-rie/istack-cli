# /design-doc

**Role:** Visual Systems Designer
**Stage:** Plan
**Reads:** `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`, existing `.iStack/<app-slug>/docs/DESIGN.md` if present, recent design review plans, optional reference `DESIGN.md` files, screenshots, brand assets, or product examples the user provides
**Writes:** `.iStack/<app-slug>/docs/DESIGN.md`, optional `.iStack/<app-slug>/artifacts/design-previews/[timestamp]/index.html`, updates `.iStack/<app-slug>/manifest.json` if visual positioning becomes clearer, history/session logs
**Feeds into:** `/plan-design-review`, `/design-swiftui`, `/design-review`

This skill owns the canonical visual system document.

`DESIGN.md` is not a product brief, scope note, or review report. It is the visual bible: color tokens, typography, density, surfaces, components, imagery, motion, and prompt-ready implementation guidance.

If another skill wants to critique or refine the look, it should write a report or plan artifact. It should not silently rewrite `DESIGN.md`.

Use the reference template at `references/design-md-template.md` when authoring or restructuring the file. Use the bundled renderer at `scripts/render_design_preview.py` when the user asks for a preview or when a major visual rewrite would benefit from a fast visual check.

---

## Setup

```bash
eval "$(bin/istack resolve env)"
[ -f "$ISTACK_MANIFEST_FILE" ] && cat "$ISTACK_MANIFEST_FILE"
[ -f "$ISTACK_PRODUCT_DOC" ] && cat "$ISTACK_PRODUCT_DOC"
[ -f "$ISTACK_DESIGN_DOC" ] && cat "$ISTACK_DESIGN_DOC"
LATEST_DESIGN_REVIEW=$(ls -t "$ISTACK_PLANS_DIR"/design-review-*.md 2>/dev/null | head -1)
[ -n "$LATEST_DESIGN_REVIEW" ] && cat "$LATEST_DESIGN_REVIEW" | head -120
```

If the user attached or referenced visual examples, read them before asking questions. Distill them into three buckets:

- Borrow
- Avoid
- Translate for this app

If `manifest.json` or `PRODUCT.md` is missing, stop and get the minimum context first. Use `/office-hours` if the product is still vague.

---

## Phase 1 — Design brief synthesis

Before asking visual questions, restate the product constraints in 3 bullets:

- Who this app is for
- What feeling the app should create
- What must remain native to iOS

Then define a preliminary direction in one sentence:

`VISUAL THESIS: [short sentence]`

If that thesis is too weak or generic, fix it before writing any tokens.

---

## Phase 2 — Ask only the questions that matter

Ask at most 6 design questions, one at a time. Skip any question already answered by the product brief or reference docs.

High-value categories:

1. Brand temperature: clinical, calm, premium, playful, athletic, rebellious
2. Density: airy vs compact
3. Typography character: invisible system feel vs distinctive branded feel
4. Color stance: restrained neutrals vs one loud accent vs multi-color system
5. Mascot / illustration role: none, occasional accent, core brand asset
6. Motion stance: calm / confident / energetic

Format every question like this:

```text
DESIGN QUESTION [N] — [topic]

Option A: [approach]
  → What it communicates: [effect]
  → Trade-off: [cost]

Option B: [approach]
  → What it communicates: [effect]
  → Trade-off: [cost]

My recommendation: Option [X] because [specific reason for this app].
```

Do not ask broad taste questions like "what style do you want?" Ask constrained tradeoffs.

---

## Phase 3 — Author the canonical `DESIGN.md`

Write or update `$ISTACK_DESIGN_DOC` using the structure from `references/design-md-template.md`.

Non-negotiable rules:

- Keep it visual-only. Product strategy belongs in `PRODUCT.md` and `manifest.json`.
- Use explicit tokens, not vague adjectives alone.
- Prefer real hex values, explicit type sizes, real spacing values, and named component behaviors.
- Include semantic surfaces and dark-mode intent when relevant.
- Include a prompt-friendly section so downstream agents can implement the style without rereading the full doc.
- Include a SwiftUI-oriented quick start, not just web CSS.
- If the user gave example docs, be inspired by their structure and useful moves, but do not copy their prose.

Minimum sections to preserve:

- Theme / opening thesis
- `Tokens — Colors`
- `Tokens — Typography`
- `Tokens — Spacing & Shapes`
- `Components`
- `Do's and Don'ts`
- `Surfaces` or `Elevation`
- `Imagery`
- `Layout`
- `Agent Prompt Guide`
- `Quick Start`

If an older `DESIGN.md` exists, merge carefully:

- Preserve stable tokens the product already relies on unless the user wants a reset
- Upgrade weak sections instead of rewriting blindly
- Keep the tone coherent across the whole file

---

## Phase 4 — Preview mode

When the user asks for a preview, or when a major rewrite would benefit from one, generate a local HTML preview artifact:

```bash
STAMP=$(date +%Y%m%d-%H%M%S)
OUT_DIR="$ISTACK_DESIGN_PREVIEWS_DIR/$STAMP-design-doc"
python3 "$ISTACK_STACK_ROOT/design-doc/scripts/render_design_preview.py" \
  --design-doc "$ISTACK_DESIGN_DOC" \
  --manifest "$ISTACK_MANIFEST_FILE" \
  --output-dir "$OUT_DIR"
```

The preview is not production UI. It is a fast visual proof of the design language:

- palette swatches
- type voice
- spacing / radius vocabulary
- sample cards and CTA treatments
- manifest-aware context chips

If the renderer succeeds, report the `index.html` path and summarize what the preview proves and what it still cannot prove.

---

## Phase 5 — Manifest discipline and logging

If the visual work clarified stable brand facts, update the manifest:

```bash
bin/istack manifest merge \
  --positioning "[visual positioning sentence]" \
  --brand-keyword "[keyword 1]" \
  --brand-keyword "[keyword 2]" \
  --marketing-axis "[axis only if the visual identity sharpened the message]"
```

Only merge facts that should survive this session.

Then log the run:

```bash
bin/istack log \
  --skill design-doc \
  --summary "Authored or refreshed the canonical visual system document" \
  --file "$ISTACK_DESIGN_DOC" \
  --file "$ISTACK_MANIFEST_FILE"
```

If preview mode ran, also include the preview `index.html` file in the log.

---

## Output

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN DOC — [App Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISUAL THESIS:
[one sentence]

LOCKED THIS RUN:
  · Palette: [summary]
  · Type system: [summary]
  · Component feel: [summary]

UPDATED:
  · docs/DESIGN.md
  · manifest.json [only if changed]
  · artifacts/design-previews/... [only if preview mode ran]

READY FOR:
  /plan-design-review  or  /design-swiftui
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
