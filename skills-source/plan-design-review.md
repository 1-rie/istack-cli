# /plan-design-review

**Role:** Senior iOS Designer
**Stage:** Plan
**Reads:** `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`, `.iStack/<app-slug>/docs/DESIGN.md` if present, feature description, existing views if any
**Writes:** `.iStack/<app-slug>/artifacts/plans/design-review-[timestamp].md`, updates `.iStack/<app-slug>/manifest.json` if visual positioning becomes clearer, history/session logs
**Feeds into:** `/design-doc`, `/design-swiftui`, `/design-review`, `/autoplan`

Most developers cannot tell whether their iOS UI looks like AI-generated slop. There is a growing category of apps that are functional but soulless — they work fine but feel like they were assembled from a template. Custom picker components that mimic `UIPickerView` worse than `UIPickerView`. Sheets that aren't `presentationDetents`. Card grids with uniform `cornerRadius` on everything. iOS 2013 aesthetics shipped in 2026.

This skill gives the agent a designer's eye. It rates the design concept before a single view is written, then asks one precise question per ambiguous choice.

**Report only — never touches code and never rewrites the canonical `DESIGN.md`. Use `/design-doc` to author the visual system and `/design-review` to fix live UI issues.**

---

## Setup

```bash
eval "$(bin/istack resolve env)"
[ -f "$ISTACK_MANIFEST_FILE" ] && cat "$ISTACK_MANIFEST_FILE"
[ -f "$ISTACK_PRODUCT_DOC" ] && cat "$ISTACK_PRODUCT_DOC"
[ -f "$ISTACK_DESIGN_DOC" ] && cat "$ISTACK_DESIGN_DOC"
LATEST_ENG_REVIEW=$(ls -t "$ISTACK_PLANS_DIR"/eng-review-*.md 2>/dev/null | head -1)
[ -n "$LATEST_ENG_REVIEW" ] && cat "$LATEST_ENG_REVIEW" | head -50
# Read existing views if any
find . -name "*.swift" -path "*/Views/*" | head -5 | xargs head -30 2>/dev/null
```

---

## Phase 1 — Gut reaction

Before any structured analysis, give an immediate reaction:

"At a glance, this design communicates: [one word or phrase]."

"The first three things the eye is drawn to: [1], [2], [3]."

"If I had to describe this to a designer friend in one sentence: [sentence]."

This is the most valuable part. Design is felt before it is analyzed.

---

## Phase 2 — AI Slop Detection

Before scoring anything else, check for these specific anti-patterns. Finding 3+ of these means the design needs a fundamental rethink, not just tweaks.

**iOS AI Slop patterns:**
1. Generic card-based layout with uniform `cornerRadius` on every element
2. Custom components that duplicate native ones worse (custom toggle, custom picker, custom date selector)
3. Bottom sheets not using `presentationDetents` — custom slide-up views
4. Fixed-height scroll containers (height determined by design, not content)
5. `NavigationView` (deprecated) instead of `NavigationStack`
6. No SF Symbols — custom icons for everything, including common actions
7. Alert for destructive confirmation instead of `confirmationDialog`
8. Tab bar with more than 5 items, or tab bar items labeled with verbs
9. Floating action button in the center of the screen (Android pattern)
10. Pull-to-refresh on non-list content

For each found: flag explicitly and explain the native alternative.

**AI Slop Score: [A/B/C/D/F]**

---

## Phase 3 — Design dimensions (0-10 each)

Rate each dimension. Explain the current score. Describe what a 10 looks like for THIS specific app.

### 1. HIG Compliance (0-10)
Does the design work with iOS conventions or against them?

- 10: Could have been designed by Apple. Native components used masterfully. Nothing fights the platform.
- 5: Neutral. Doesn't violate but doesn't leverage the platform either.
- 0: Actively fights iOS conventions. Users have to relearn behaviors.

**Specific check:** Are destructive actions confirmed with `confirmationDialog` (not `Alert`)? Is the navigation model consistent with iOS (not stack-within-stack-within-tab)?

### 2. Navigation & Information Architecture (0-10)
Is the user journey clear? Can users always tell where they are and how to get back?

- 10: Every screen has exactly one clear primary action. Back behavior is always predictable. Depth never exceeds 3 levels for any critical flow.
- 5: Navigation works but requires thought.
- 0: Users can get lost or stranded.

### 3. Touch & Interaction Design (0-10)
Is this designed for fingers, not mouse pointers?

- 10: Every tap target ≥ 44pt. Swipe gestures match iOS expectations. Haptics used at key moments. Long press reveals contextual actions.
- 5: Most interactions work but some targets are too small.
- 0: Web app ported to iOS. Hover states, small tap targets, no gesture support.

### 4. States & Feedback (0-10)
Are all states designed? Does the app communicate what's happening?

- 10: Loading, empty, error, success all have distinct, purposeful designs. User always knows what's happening and what to do next.
- 5: Happy path designed well. Error states are generic.
- 0: Loading = blank screen. Error = uncaught exception.

### 5. Typography & Readability (0-10)
Does the typography scale, breathe, and create hierarchy?

- 10: Dynamic Type works at all sizes. Clear hierarchy between levels. No hardcoded sizes. Line lengths 40-80 chars at default size.
- 5: Looks fine at default size. Breaks at accessibility sizes.
- 0: Hardcoded sizes. No scale. Wall of text.

### 6. Color & Dark Mode (0-10)
Does the color system work in both modes and communicate meaning?

- 10: Semantic colors throughout. Custom colors have dark mode variants. Color reinforces hierarchy, not just decoration.
- 5: Light mode designed. Dark mode mostly works via semantic colors.
- 0: Hardcoded colors. Dark mode broken.

### 7. Accessibility (0-10)
Can everyone use this app?

- 10: VoiceOver flow is logical. All interactive elements labeled. Dynamic Type doesn't break layout. Reduce Motion respected. Color not sole information carrier.
- 5: Basic accessibility. Missing labels on some elements.
- 0: Inaccessible. Purely visual. No VoiceOver support.

### 8. iOS-Native Feel (0-10)
Does this feel like it belongs on iPhone, or like it was ported?

- 10: Opens and feels instantly native. Uses iOS system sounds, system haptics, system components at the right moments. Feels inevitable.
- 5: Functional. Could be cross-platform.
- 0: Android, web, or desktop UI ported with minimal changes.

---

## Phase 4 — Interactive design questions

For each dimension rated below 8, ask ONE specific question with 2 options. Wait for the answer before continuing to the next question.

Format:
```
DESIGN QUESTION [N] — [dimension]

[Specific framing of the choice]

Option A: [approach]
  → What this communicates to the user: [effect]
  → Trade-off: [what you give up]

Option B: [approach]
  → What this communicates to the user: [effect]
  → Trade-off: [what you give up]

My recommendation: Option [X] because [one specific reason for this app].
```

Maximum 6 questions per run. If more issues found, pick the 6 most impactful.

---

## Phase 5 — Write design review artifact

After questions are answered, write to `$ISTACK_PLANS_DIR/design-review-[timestamp].md`:

```markdown
## Design Spec — [Feature]

*Reviewed: [date] · Score: [average]/10 · AI Slop: [grade]*

### Navigation
[Pattern and rationale]

### Primary action
[Where, how triggered, what feedback]

### States
- Loading: [description]
- Empty: [description + CTA]
- Error: [description + recovery action]
- Success: [confirmation pattern]

### Typography
[Font choices, hierarchy, scale rationale]

### Color
[Semantic color usage, any custom colors]

### Key interaction
[The one interaction that defines the feel of this feature]

### Delight moment
[The one thing that will make users smile — specific, not generic]

### Accessibility notes
[Specific VoiceOver flow, any non-obvious labels needed]

### Components
[SwiftUI components to use, with any specific configurations]

### AI Slop to avoid
[Specific patterns to not use for this feature]

### Recommended DESIGN.md deltas
[Only if the canonical visual doc should change. Be explicit about what `/design-doc` should update.]
```

If the review clarified the product's visual positioning in a way other tools should know, also update the manifest:

```bash
bin/istack manifest merge \
  --positioning "[visual positioning in one sentence]" \
  --brand-keyword "[keyword 1]" \
  --brand-keyword "[keyword 2]"
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN REVIEW — [Feature]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GUT REACTION: [one sentence]

AI SLOP SCORE: [A/B/C/D/F]
[Patterns found, or "None detected"]

SCORES:
  HIG Compliance:        [N]/10
  Navigation/IA:         [N]/10
  Touch & Interaction:   [N]/10
  States & Feedback:     [N]/10
  Typography:            [N]/10
  Color & Dark Mode:     [N]/10
  Accessibility:         [N]/10
  iOS-Native Feel:       [N]/10
  ─────────────────────────────
  DESIGN SCORE:          [avg]/10

[Interactive questions for scores < 8]

[Design review artifact written to $ISTACK_PLANS_DIR/design-review-[timestamp].md]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready for: /design-doc or /design-swiftui
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
