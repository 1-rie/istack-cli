# /design-review

**Role:** Designer Who Codes
**Stage:** Review
**Reads:** all SwiftUI view files, `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`, `.iStack/<app-slug>/docs/DESIGN.md`, `.iStack/<app-slug>/artifacts/plans/design-review-*.md`
**Writes:** fixes committed atomically, `.iStack/<app-slug>/artifacts/design-reports/[timestamp].md`, updates `.iStack/<app-slug>/manifest.json` if visual positioning becomes clearer, history/session logs
**Feeds into:** `/qa-ios`, `/ship-ios`

Same audit as `/plan-design-review` — but on live code. And then it fixes what it finds.

One commit per fix. Fully bisectable. Before/after screenshots when the simulator is available.

---

## Setup

```bash
eval "$(bin/istack resolve env)"

# Find all view files
VIEWS=$(find . -name "*.swift" -path "*/View*" -o -name "*View.swift" -o -name "*Screen.swift" | grep -v Tests | grep -v Preview)
echo "Views found: $(echo "$VIEWS" | wc -l)"

# Read design spec if exists
LATEST_DESIGN_PLAN=$(ls -t "$ISTACK_PLANS_DIR"/design-review-*.md 2>/dev/null | head -1)
[ -n "$LATEST_DESIGN_PLAN" ] && cat "$LATEST_DESIGN_PLAN"

# Boot simulator for screenshots if possible
DEVICE_ID=$(xcrun simctl list devices booted | grep -o '[A-F0-9-]\{36\}' | head -1)
[ -n "$DEVICE_ID" ] && echo "Simulator available for screenshots" || echo "No booted simulator — visual review only"
```

---

## Phase 1 — Automated scan

Run these checks across all view files:

```bash
# Hardcoded font sizes
grep -rn "\.system(size:" --include="*.swift" . | grep -v "Tests\|// DESIGN:" | head -20

# Hardcoded colors
grep -rn "\.black\|\.white\|Color(red:\|Color(#" --include="*.swift" . | \
  grep -v "shadow\|border\|Tests\|// DESIGN:" | head -20

# Force unwraps in view code
grep -rn "!\." --include="*.swift" . | grep -v "Tests\|IBOutlet\|@" | head -10

# Missing accessibility labels on images
grep -rn "Image(" --include="*.swift" . | grep -v "Tests\|systemName\|accessibilityLabel\|accessibilityHidden" | head -10

# UIWebView (rejected by App Store)
grep -rn "UIWebView" --include="*.swift" . && echo "❌ UIWebView found"

# Deprecated NavigationView
grep -rn "NavigationView {" --include="*.swift" . | head -5

# Fixed heights that won't adapt
grep -rn "\.frame(height: [0-9]" --include="*.swift" . | grep -v "minHeight\|maxHeight\|Tests" | head -10

# Alert for destructive actions (should be confirmationDialog)
grep -rn "\.alert(" --include="*.swift" . | head -10

# DispatchQueue.main on UI updates
grep -rn "DispatchQueue.main" --include="*.swift" . | head -10
```

---

## Phase 2 — Deep visual audit

For each view file, audit against the same 8 dimensions as `/plan-design-review`:

1. HIG Compliance
2. Navigation & IA
3. Touch & Interaction (tap targets)
4. States & Feedback (all 4 states present?)
5. Typography (Dynamic Type)
6. Color & Dark Mode (semantic colors)
7. Accessibility (labels, traits, focus order)
8. iOS-Native Feel (AI slop check)

---

## Phase 3 — Fix loop

**Self-regulation rules (adapted from gstack):**
- Pure SwiftUI modifier changes (color, font, spacing, padding) → free pass, fix automatically
- View structure changes (new `if/else`, new `ViewBuilder` sections) → count against budget
- New ViewModel logic → always ask
- Hard cap: 25 fixes per run
- Risk score: if structural changes exceed 40% of fixes → stop and ask

For each fix:

1. State the issue: `[File:Line] — [Issue] — [HIG reference or principle]`
2. Apply minimum change
3. Take screenshot if simulator available
4. Commit: `style(design): [specific issue] — [file]`

**Auto-fix (silent):**
- `NavigationView` → `NavigationStack`
- `.foregroundColor(` → `.foregroundStyle(`
- `DispatchQueue.main.async` → `await MainActor.run` (in async context)
- Hardcoded `.black`/`.white` on text → `.primary`/`.background`
- Missing `.accessibilityHidden(true)` on decorative images
- `Alert` for destructive actions → `confirmationDialog`
- `.frame(height: N)` on text containers → `.frame(minHeight: N)`

**Ask before fixing:**
- Any change requiring new ViewModel state
- Navigation architecture changes
- Changes that affect multiple files
- Anything that could change user-visible behavior

---

## Phase 4 — Screenshot comparison

If simulator is booted:

```bash
# Before screenshot
xcrun simctl io "$DEVICE_ID" screenshot /tmp/istack-design-before.png

# [Apply fixes]

# After screenshot
xcrun simctl io "$DEVICE_ID" screenshot /tmp/istack-design-after.png

# Dark mode check
xcrun simctl ui "$DEVICE_ID" appearance dark
sleep 1
xcrun simctl io "$DEVICE_ID" screenshot /tmp/istack-design-dark.png
xcrun simctl ui "$DEVICE_ID" appearance light
```

Save to `$ISTACK_DESIGN_REPORTS_DIR/[timestamp]/`.

---

## Save report

```bash
mkdir -p "$ISTACK_DESIGN_REPORTS_DIR/$(date +%Y%m%d-%H%M%S)"
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN REVIEW — [N views audited]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI SLOP SCORE: [before] → [after]
DESIGN SCORE:  [before]/10 → [after]/10

FIXED ([N] commits):
  · style(design): [description] — [file]
  · ...

SURFACED FOR YOUR DECISION ([N]):
  · [Issue] — [why it needs your call]

WHAT A 10 LOOKS LIKE FOR THIS APP:
[2-3 specific sentences about the north star for this product's design]

Report saved: $ISTACK_DESIGN_REPORTS_DIR/[timestamp]/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready for: /qa-ios
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
