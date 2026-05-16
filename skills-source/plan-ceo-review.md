# /plan-ceo-review

**Role:** CEO / Founder
**Stage:** Think → Plan
**Reads:** `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`, feature description or plan provided
**Writes:** `.iStack/<app-slug>/artifacts/plans/ceo-review-[timestamp].md`, updates `.iStack/<app-slug>/docs/PRODUCT.md`, updates `.iStack/<app-slug>/manifest.json`, history/session logs
**Feeds into:** `/plan-eng-review`, `/plan-design-review`, `/autoplan`

This is founder mode.

Not "how do I implement this feature." The question is more important: **what is the 10-star product hiding inside this request?**

The point is not to take the ticket literally. It is to rethink the problem from the user's perspective and find the version that feels inevitable, delightful, and maybe even magical.

---

## Setup

```bash
eval "$(bin/istack resolve env)"
[ -f "$ISTACK_MANIFEST_FILE" ] && cat "$ISTACK_MANIFEST_FILE"
[ -f "$ISTACK_PRODUCT_DOC" ] && cat "$ISTACK_PRODUCT_DOC"
LATEST_OFFICE_HOURS=$(ls -t "$ISTACK_PLANS_DIR"/office-hours-*.md 2>/dev/null | head -1)
[ -n "$LATEST_OFFICE_HOURS" ] && cat "$LATEST_OFFICE_HOURS" | tail -1
```

---

## The 10-star exercise

**1-star:** What's the broken, embarrassing version? (wrong platform, buggy, nobody uses it)

**3-star:** What's the "App Store filler" version? (technically works, immediately forgotten, 2.1 stars)

**5-star:** What's the "fine" version? (works as described, does the job, no buzz)

**7-star:** What would get a 5-star review? (something clearly better than alternatives)

**10-star:** What would make someone text 3 friends about it? What would be in an article? What would people miss if it disappeared?

Describe the 10-star version in 2-3 sentences. Be specific, vivid, and concrete. "A great app" is not a 10-star description.

---

## iOS-specific lens

For every feature request, ask these iOS-specific questions before deciding scope:

- **Platform leverage:** Does this use what makes iPhone special? (camera, haptics, widgets, Shortcuts, HealthKit, location, Watch, notifications) If not — why is this an app and not a website?
- **Habit loop:** Does this create a reason to open the app daily? What is the trigger → action → reward?
- **Widget potential:** Can the core value be delivered in a widget without opening the app? If yes, that's a feature, not a liability.
- **Offline first:** Does this work on a plane? In the subway? If not, is that an acceptable constraint?
- **Permission narrative:** Every permission request (location, camera, health, notifications) is a trust moment. Is each one earned? Is the ask timed correctly?

---

## Four scope modes

Choose ONE. State it clearly at the top of your review.

### 🔵 SCOPE EXPANSION — "Think bigger"
Use when: the feature is solving a symptom, not the real problem. The user is describing a UI component when they should be describing a product.

Output: Reframe the problem. Show the bigger opportunity. Each expansion is presented as an individual decision — you recommend enthusiastically but the user opts in.

### 🟢 SELECTIVE EXPANSION — "Add this one thing"
Use when: scope is roughly right but one specific addition would 3x the value with 1.5x the effort.

Output: Name the one thing. Show the value-to-effort ratio precisely. Explain exactly where it fits in the build order.

### 🟡 HOLD SCOPE — "This is right-sized"
Use when: scope is appropriate for stage, nothing critical to add or remove.

Output: Validate the scope with specific reasons. Identify the top 3 risks. Confirm the build sequence.

### 🔴 SCOPE REDUCTION — "Cut to the core"
Use when: plan is too broad, trying to solve 3 problems at once, no clear wedge, or the minimum isn't truly minimum.

Output: Name exactly what to cut and why. Show the irreducible core. Explain what you learn by shipping the smaller thing first.

---

## 10-section review

Work through these sections. Be direct. Each section should produce a concrete finding or a clear "this is correct."

**1. Problem clarity**
Is the problem stated in terms of user pain, not product features? Would a new engineer reading PRODUCT.md and manifest.json understand what they're building and why it matters?

**2. User specificity**
Who exactly? Not "people who want to be productive." One specific person with a specific situation. The more specific, the more useful.

**3. The one metric**
What number goes up if this works? If you can't name one metric, you can't tell if you shipped something real.

**4. Platform fit**
Why iOS specifically? What does the iPhone give this product that a web app can't? If the answer is "nothing," this should be a PWA.

**5. Competitive clarity**
What does the user do today instead? Why is that not good enough? Name the real competitor (often it's Notes.app, a group chat, or doing nothing).

**6. Build vs. framework**
Is there an Apple framework that does 80% of this? (HealthKit, EventKit, CoreLocation, StoreKit, CloudKit, ActivityKit, AppIntents) Using Apple's frameworks = faster build, better system integration, App Store goodwill.

**7. Reversibility**
If this feature is wrong, how hard is it to remove? Design for reversibility — feature flags, modular architecture, clean data model.

**8. Sequencing**
What has to be true before this works? Is the prerequisite infrastructure built? Don't build the widget before the core feature.

**9. The moment of delight**
What is the one interaction in this feature that will make someone smile? Name it specifically. If you can't name it, the feature has no soul.

**10. App Store narrative**
When Apple reviews this app, what is the story? Is the feature addition clear in the metadata? Does it change the age rating, privacy nutrition label, or required capabilities?

---

## Persist decisions

Save the review:
```bash
eval "$(bin/istack resolve env)"
mkdir -p "$ISTACK_PLANS_DIR"
PLAN_FILE="$ISTACK_PLANS_DIR/ceo-review-$(date +%s).md"
cat > "$PLAN_FILE" << 'PLAN'
[full review output]
PLAN

bin/istack log \
  --skill plan-ceo-review \
  --summary "Reviewed the 10-star product direction, updated the product brief, and refreshed the manifest." \
  --file "$PLAN_FILE" \
  --file "$ISTACK_PRODUCT_DOC" \
  --file "$ISTACK_MANIFEST_FILE"
```

Update `docs/PRODUCT.md` with any scope decisions made.
Then update `manifest.json` if you clarified targets, goals, non-goals, marketing axes, value props, positioning, or feature scope:

```bash
bin/istack manifest merge \
  --target "[target]" \
  --goal "[goal]" \
  --non-goal "[non-goal]" \
  --value-prop "[value prop]" \
  --marketing-axis "[marketing axis]" \
  --feature "[feature name]" \
  --positioning "[positioning sentence]"
```

---

## Output format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CEO REVIEW — [Feature/App name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCOPE MODE: [EXPANSION / SELECTIVE / HOLD / REDUCTION]

THE 10-STAR VERSION:
[Vivid, specific, 2-3 sentences]

PLATFORM LEVERAGE:
[What iPhone feature makes this worth building natively]

10-SECTION FINDINGS:
1. Problem clarity:  [finding]
2. User:             [finding]
3. Metric:           [finding]
4. Platform fit:     [finding]
5. Competition:      [finding]
6. Build vs native:  [finding]
7. Reversibility:    [finding]
8. Sequencing:       [finding]
9. Delight moment:   [finding]
10. App Store:       [finding]

RECOMMENDATION:
[Clear, opinionated statement. What to build, what not to build, why.]

OPEN QUESTIONS (max 3):
1. [Most important unknown]
2. [Second]
3. [Third, if needed]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready for: /plan-eng-review
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
