# /autoplan

**Role:** Review Pipeline Orchestrator
**Stage:** Plan (full)
**Reads:** `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`, `.iStack/<app-slug>/docs/DESIGN.md` if present, feature description, codebase
**Writes:** complete plan to `.iStack/<app-slug>/artifacts/plans/autoplan-[timestamp].md`, updates `.iStack/<app-slug>/docs/FEATURES.md` when the feature set is clear, updates `.iStack/<app-slug>/manifest.json`, history/session logs
**Feeds into:** implementation

One command. Full plan. CEO → design → engineering. Automatic.

`/autoplan` runs the complete planning pipeline and surfaces only the decisions that require human taste — things where there is genuinely no objectively correct answer. Everything else is decided automatically.

---

## Pipeline

Run these in order. Do not skip. Do not wait between steps unless a taste decision arises.

### Step 1 — CEO Review

Apply the full `/plan-ceo-review` methodology:

- What is the 10-star version of this?
- What is the right scope mode? (Expansion / Selective / Hold / Reduction)
- 10-section review: problem clarity, user specificity, metric, platform fit, competition, build vs native, reversibility, sequencing, delight moment, App Store narrative
- What scope decision does this lead to?

**Auto-decide:** if scope is clearly correct → HOLD and continue.
**Surface as taste decision:** if scope could reasonably be expand OR reduce.

### Step 2 — Design Review

Apply the full `/plan-design-review` methodology:

- Gut reaction
- AI Slop check
- 8 dimensions scored (HIG, Navigation, Touch, States, Typography, Color, Accessibility, iOS feel)
- What are the design decisions?

**Auto-decide:** anything with a clear HIG answer → decide and document.
**Surface as taste decision:** navigation pattern choice, visual style, delight moment.

### Step 3 — Engineering Review

Apply the full `/plan-eng-review` methodology:

- Architecture recommendation (MVVM / TCA / Simple) with justification
- Data flow diagram
- State machine
- Navigation architecture
- Apple framework integration
- Error & edge case map
- Test plan
- iOS compliance checklist
- Dependencies

**Auto-decide:** anything with a clear technical answer.
**Surface as taste decision:** architecture when genuinely either-or, data sync strategy.

---

## Taste decisions

Collect ALL taste decisions from all 3 steps. Surface them all at once as a numbered list. Do not ask one at a time — show all of them, let the user answer in one pass.

Format each:
```
DECISION [N]: [Precise question]
Context: [Why this matters — one sentence]

  A) [Option A] — [what it optimizes for]
  B) [Option B] — [what it optimizes for]

Recommendation: [A/B] because [one sentence specific to this app]
```

**Rule:** only surface decisions where:
1. Both options are genuinely reasonable
2. The choice changes the implementation significantly
3. It depends on product priorities, not technical correctness

Do NOT surface: decisions with a clear right answer, style preferences without real tradeoffs, micro-decisions that don't affect architecture.

Target: 3-6 taste decisions per autoplan. If you have more than 8, you're surfacing things that should be auto-decided.

---

## After decisions are made

Write the complete execution plan:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTOPLAN — [Feature / App]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCOPE: [what we're building, precisely]
NOT BUILDING (yet): [explicit exclusions]

ARCHITECTURE:     [pattern + one-line rationale]
DATA LAYER:       [choice]
NAVIGATION:       [pattern]
MIN iOS:          [version]
DEPENDENCIES:     [list or "none — all native"]

DESIGN PRINCIPLES:
  · [3-5 specific principles for this feature]

IMPLEMENTATION ORDER:
  1. [Data model / SwiftData schema]
  2. [Service layer]
  3. [ViewModel(s)]
  4. [Views — in order: root → child → modals]
  5. [Unit tests]
  6. [XCUITests for critical path]
  7. [Edge cases and empty/error states]

TEST PLAN:
  Unit:   [what to test, target coverage]
  UITest: [critical flows]

ESTIMATE:
  Optimistic: [hours/days]
  Realistic:  [hours/days]
  Risk factors: [what could make it take longer]

SUCCESS CRITERIA:
  □ /review passes (no blocking issues)
  □ /qa-ios green (all flows tested)
  □ /appstore-review green (no rejection risks)
  □ [Feature-specific criterion 1]
  □ [Feature-specific criterion 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Ask for approval: "Plan ready. Proceed with implementation? (yes / adjust [what])"

Save full plan with the resolver:

```bash
eval "$(bin/istack resolve env)"
mkdir -p "$ISTACK_PLANS_DIR" "$ISTACK_DOCS_DIR"
PLAN_FILE="$ISTACK_PLANS_DIR/autoplan-$(date +%s).md"
cat > "$PLAN_FILE" << 'PLAN'
[full autoplan output]
PLAN

[ -f "$ISTACK_FEATURES_DOC" ] || cat > "$ISTACK_FEATURES_DOC" << 'FEATURES'
# Features

## Planned feature set
[feature inventory produced by /autoplan]
FEATURES

bin/istack manifest merge \
  --one-liner "[one-liner]" \
  --problem "[problem]" \
  --target "[target]" \
  --goal "[goal]" \
  --non-goal "[non-goal]" \
  --value-prop "[value prop]" \
  --feature "[feature]" \
  --marketing-axis "[marketing axis]" \
  --primary-metric "[metric]" \
  --core-loop "[trigger -> action -> reward]" \
  --positioning "[positioning sentence if clarified]" \
  --brand-keyword "[brand keyword if clarified]"

bin/istack log \
  --skill autoplan \
  --summary "Generated the full planning pipeline, feature registry, and refreshed the manifest." \
  --file "$PLAN_FILE" \
  --file "$ISTACK_MANIFEST_FILE" \
  --file "$ISTACK_FEATURES_DOC"
```

The plan-to-QA link: `/qa-ios` will automatically read `$ISTACK_PLANS_DIR/autoplan-*.md` for the test plan when it runs.
