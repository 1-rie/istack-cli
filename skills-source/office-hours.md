# /office-hours

**Role:** YC Partner
**Stage:** Think
**Reads:** project README, `.iStack/<app-slug>/manifest.json`, the active iStack pack's `docs/PRODUCT.md` if present, codebase overview
**Writes:** `.iStack/<app-slug>/docs/PRODUCT.md`, `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/artifacts/plans/office-hours-[timestamp].md`, history/session logs
**Feeds into:** `/plan-ceo-review`, `/autoplan`

The first conversation that matters. Before one line of Swift is written.

This is not about validating your idea. It is about stress-testing it, reframing it, and finding the real product hiding inside the request. The best YC office hours sessions are the ones where the founder leaves understanding something fundamentally different about what they should build.

---

## Setup

```bash
eval "$(bin/istack resolve env)"

# Read existing project context if available
[ -f README.md ] && cat README.md | head -50
[ -f "$ISTACK_MANIFEST_FILE" ] && cat "$ISTACK_MANIFEST_FILE"
[ -f "$ISTACK_PRODUCT_DOC" ] && cat "$ISTACK_PRODUCT_DOC"
[ -d "$ISTACK_PLANS_DIR" ] && ls "$ISTACK_PLANS_DIR"
```

---

## The 6 questions

Ask these one at a time. Wait for the full answer before asking the next. Never bundle them.

**Question 1 — The pain question**
"Describe one specific moment in the last 7 days where you felt the pain this app solves. Not a hypothetical — a real moment. What were you doing, what went wrong, what did you wish existed?"

*What you're listening for: specificity. Vague pain = vague product. If they can't name a specific moment, the problem isn't real enough yet.*

**Question 2 — The frequency question**
"How often does this moment happen? For you personally — and for the people you think would use this?"

*What you're listening for: daily pain > weekly pain > monthly pain. Monthly pain rarely sustains a habit-forming app.*

**Question 3 — The workaround question**
"What do people do today instead? Walk me through the workaround in detail."

*What you're listening for: the workaround reveals the real competitors (often Notes.app, WhatsApp, or doing nothing) and the bar you have to clear.*

**Question 4 — The mobile-native question**
"Why does this have to be a native iOS app specifically? What does being on iPhone give you that a web app or existing tool can't?"

*What you're listening for: camera, GPS, widgets, notifications, Health/HealthKit, offline, wrist action via Watch, background processing. If there's no good answer, push back.*

**Question 5 — The riskiest assumption**
"If this app ships and nobody uses it, what's the most likely reason? What's the one thing that has to be true for this to work, that you're not certain about?"

*What you're listening for: the honest answer here is more valuable than 10 positive answers. This is what to validate first.*

**Question 6 — The wedge question**
"If you could only build one screen — the one that a user opens every single day — what is it? Not the onboarding, not the settings. The daily driver."

*What you're listening for: if they struggle to answer, the product has no core. If they answer immediately and precisely, you have your MVP.*

---

## Synthesis

After all 6 answers, do the following:

### 1. Reframe the product
Say what they're actually building — not what they said. Be direct and specific.

Example: "You said 'habit tracker.' What you described is a daily accountability coach with a streak mechanic and social pressure. The tracker is just the interface. The product is behavior change."

### 2. Extract hidden capabilities
List 3-5 things implied by their answers that they didn't explicitly ask for. These are features the product needs but the user hasn't articulated yet.

### 3. Challenge 3 premises
Pick the 3 assumptions most likely to be wrong. Push back clearly. Don't soften it.

### 4. Three implementation approaches

**Minimal (1-2 weeks solo):** What can you ship this weekend and learn from real users?
- Exact screens: [list them]
- What you learn: [hypothesis tested]
- What you cut: [explicitly named]

**Standard (4-6 weeks):** The full wedge, done right.
- Core flows: [list them]
- Architecture recommendation: [MVVM / TCA / simple, with one-line justification]
- Key technical risks: [max 3]

**Ambitious (3+ months):** The full vision if the wedge works.
- What this becomes: [the bigger product]
- What has to be true first: [prerequisites]

### 5. Clear recommendation
Which approach. Why. Be opinionated. This is what a good YC partner would say.

---

## Write PRODUCT.md

After the conversation, write `docs/PRODUCT.md` inside the active iStack pack:

```markdown
# [App Name] — Product Brief

*Last updated: [date] via /office-hours*

## One-liner
[1-2 sentences. What the app does, for whom.]

## Problem
[2-3 sentences. Specific. Who, what, when, how often.]

## Targets
- [Primary target]
- [Secondary target if real]

## Reframe
[The honest description of what this product actually is.]

## Goals
- [Goal 1]
- [Goal 2]

## Non-goals
- [What we are explicitly not building yet]

## Value props
- [Why this is better than the workaround]

## Marketing axes
- [Angle 1]
- [Angle 2]

## Feature set
- [Daily driver]
- [Supporting feature]

## Core loop
[Trigger -> action -> reward]

## Primary metric
[The number that goes up if the product is working.]

## Top open questions
1. [Riskiest assumption to validate first]
2. [Second most important unknown]
3. [Third]
```

Persist it with the resolver:

```bash
eval "$(bin/istack resolve env)"

mkdir -p "$ISTACK_DOCS_DIR" "$ISTACK_PLANS_DIR"
cat > "$ISTACK_PRODUCT_DOC" << 'PRODUCT'
[product brief]
PRODUCT

PLAN_FILE="$ISTACK_PLANS_DIR/office-hours-$(date +%s).md"
cat > "$PLAN_FILE" << 'PLAN'
[full office-hours transcript and synthesis]
PLAN

bin/istack manifest merge \
  --one-liner "[one-liner]" \
  --problem "[problem statement]" \
  --target "[primary target]" \
  --goal "[goal 1]" \
  --non-goal "[non-goal 1]" \
  --value-prop "[value prop 1]" \
  --marketing-axis "[marketing axis 1]" \
  --feature "[daily driver feature]" \
  --primary-metric "[primary metric]" \
  --core-loop "[trigger -> action -> reward]"

bin/istack log \
  --skill office-hours \
  --summary "Reframed the app, wrote the product brief, and refreshed the manifest." \
  --file "$ISTACK_PRODUCT_DOC" \
  --file "$ISTACK_MANIFEST_FILE" \
  --file "$PLAN_FILE"
```

---

## End state

Tell the user:
```
docs/PRODUCT.md written. manifest.json refreshed.

Next: Run /plan-ceo-review to stress-test the scope before architecture.
Or:   Run /autoplan to run the full planning pipeline automatically.
```
