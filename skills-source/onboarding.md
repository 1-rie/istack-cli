# /onboarding

**Role:** Onboarding Strategist / Conversion Narrative Designer  
**Stage:** Think → Plan  
**Reads:** `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/docs/PRODUCT.md`, optional `.iStack/<app-slug>/docs/DESIGN.md`, optional existing `.iStack/<app-slug>/docs/ONBOARDING.md`, recent plan artifacts, screenshots or reference flows the user provides  
**Writes:** `.iStack/<app-slug>/docs/ONBOARDING.md`, `.iStack/<app-slug>/artifacts/plans/onboarding-[timestamp].md`, history/session logs  
**Feeds into:** `/design-doc`, `/plan-design-review`, `/design-swiftui`, `/review`

This skill designs the conversion funnel before SwiftUI exists.

The output is not a bag of screen ideas and not a copywriting prompt dump. It is the canonical onboarding blueprint: a durable, implementation-ready `ONBOARDING.md` that tells downstream agents what each screen must do, why it exists, what it says, what it shows, what it measures, and how it earns the next step.

Use this when the user already knows the app and now needs the onboarding, quiz, narrative, personalization, paywall, and permission timing to feel coherent and convert.

If the product itself is still vague, stop and send them to `/office-hours`.

---

## Setup

```bash
eval "$(bin/istack resolve env)"

[ -f "$ISTACK_MANIFEST_FILE" ] && cat "$ISTACK_MANIFEST_FILE"
[ -f "$ISTACK_PRODUCT_DOC" ] && cat "$ISTACK_PRODUCT_DOC"
[ -f "$ISTACK_DESIGN_DOC" ] && cat "$ISTACK_DESIGN_DOC"
[ -f "$ISTACK_ONBOARDING_DOC" ] && cat "$ISTACK_ONBOARDING_DOC"
[ -d "$ISTACK_PLANS_DIR" ] && ls -t "$ISTACK_PLANS_DIR" | head -10
```

Before asking questions:
- Read `manifest.json` for the stable app facts
- Read `PRODUCT.md` for problem, target, and value props
- Read `DESIGN.md` only for tone, surfaces, imagery, and component feel
- Read `ONBOARDING.md` if it exists so you can explicitly replace, refine, or rebuild

If `PRODUCT.md` does not exist, or it exists but still reads like a placeholder, stop and tell the user to run `/office-hours` first.

If `ONBOARDING.md` already exists, ask one decision first:
- Replace the whole flow
- Refine the current flow
- Rebuild one phase only

---

## What this skill is optimizing

The onboarding must do four jobs in sequence:

1. Make the user feel seen
2. Make the problem feel specific and urgent
3. Make the app feel credible and personal
4. Make the paywall feel like the natural next step, not an interruption

If a screen does not earn one of those jobs, remove it.

The user is always the hero.
The app is always the mentor.
The antagonist must be named.
The day-1 win must be visible before the paywall ask lands.
The week-3 or week-4 compounding outcome must justify subscription.

---

## Discovery interview

Ask these one at a time. Wait for the answer before asking the next. Do not bundle them.

### Product-fit questions

**Question 1 — Day-1 win**
"What concrete win should the user feel before the end of their first session? Name the exact before/after in one sentence."

**Question 2 — Daily driver**
"After onboarding is over, what is the one screen or action that earns repeat opens? Not settings. Not the paywall. The real daily driver."

**Question 3 — Conversion risk**
"If users complete onboarding but do not subscribe, what is the most likely reason?"

**Question 4 — Differentiation**
"What does this app know, do, or personalize that the workaround cannot?"

**Question 5 — Personalization inputs**
"What information can we ask during onboarding that makes the first plan, result, or recommendation meaningfully better?"

**Question 6 — Proof**
"What proof can we honestly use? Real outcomes, internal data, published studies, expert framing, customer reviews, or none yet?"

**Question 7 — Permission dependency**
"Which permissions matter to the real product value: notifications, HealthKit, location, camera, microphone, photos, motion, none, or something else?"

**Question 8 — Monetization**
"What is the subscription ask: monthly, yearly, trial, immediate paywall, delayed paywall, or something more specific?"

### Storytelling-fit questions

**Question 9 — Protagonist**
"Who exactly is the hero in this onboarding? Describe one specific person, not a broad category."

**Question 10 — Antagonist**
"What is the real enemy here? A habit, confusion, lack of time, inconsistency, shame, noise, overwhelm, or something else?"

**Question 11 — Trigger moment**
"What moment makes this user decide 'I need help with this now'?"

**Question 12 — Failed workaround**
"What have they already tried that did not truly solve the problem?"

**Question 13 — Emotional anchor**
"What should the onboarding leave them feeling most strongly: relief, confidence, momentum, hope, pride, calm, belonging, or rebellion?"

**Question 14 — Theme**
"What is the deeper worldview of the app: empowerment, discipline, calm, recovery, belonging, mastery, rebellion, or another clear theme?"

**Question 15 — Tone boundary**
"What tone would immediately feel wrong for this product?"

**Question 16 — After-state**
"If this app works for 3 weeks, what is now true in the user's life that was not true before?"

If the user cannot answer Day-1 win or Antagonist clearly, say so directly before drafting:
"The funnel is not ready yet. We do not have a visible first-session win and we do not have a real enemy. Without those two pieces the onboarding will read like polished filler."

---

## Funnel architecture

Default phases:

1. Welcome / world entry
2. Diagnosis / quiz
3. Results / identity mirror
4. Credibility / proof
5. Plan-building
6. Social proof
7. Pre-paywall "your plan is ready"
8. Paywall
9. Permission timing / post-paywall setup

Do not hardcode exact counts. The right number of screens depends on the product, the emotional weight of the problem, and how much explanation the user truly needs.

Treat the user's example families as default building blocks, not rigid quotas:
- Welcome carousel
- Diagnosis questions
- Result screen
- Scientific or expert proof
- Plan-building questions
- User reviews
- Pre-paywall plan reveal

For each phase, explicitly state:
- Why it exists psychologically
- What belief it creates
- What risk it reduces
- What transition earns the next screen

Good psychological jobs:
- Trust
- Self-recognition
- Productive tension
- Credibility
- Commitment
- Earned anticipation
- Urgency
- Activation

Bad reasons:
- "Most apps do this"
- "We needed another screen"
- "The design looked empty"

---

## Screen contract format

Every screen in `ONBOARDING.md` must use a structured contract. Keep it Markdown, but make it easy to parse and implement.

Use this shape:

```text
### Screen NN — [internal name]

screen_id: [stable identifier]
phase: [welcome | diagnosis | results | proof | plan-building | social-proof | pre-paywall | paywall | permissions]
goal: [what this screen must accomplish]
why_this_screen_exists: [psychological job]
user_state_before: [belief, emotion, context]
user_state_after: [belief, emotion, readiness]
story_role: [scene-setting | antagonist naming | self-recognition | climax | resolution | CTA]
copy_status: [final | directional | placeholder-needs-research]
title: [headline or heading]
subtitle: [supporting line]
supporting_copy: [body or helper copy]
input_type: [none | single-select | multi-select | freeform | permission request]
answer_options: [only when relevant]
visual_direction: [layout intent, hierarchy, surface treatment]
image_direction: [what to show, not generic “nice illustration”]
motion_direction: [if any]
personalization_inputs: [what data this screen collects or uses]
proof_inputs: [what claims or assets this screen depends on]
cta_primary: [label + action]
cta_secondary: [label + action or null]
skip_policy: [allowed | discouraged | not allowed]
events_to_track: [analytics events]
edge_cases: [long copy, missing proof, denied permission, empty personalization]
implementation_notes: [SwiftUI, state, conditional logic, accessibility notes]
```

Do not output machine JSON as the main deliverable.

---

## Author `ONBOARDING.md`

Write the canonical doc inside the active pack:

```markdown
# [App Name] — Onboarding Blueprint

*Last updated: [date] via /onboarding*

## Onboarding thesis
[2-4 sentences. What this funnel must make the user feel, believe, and do.]

## Funnel summary
- Activation objective: [...]
- Conversion objective: [...]
- Target persona: [...]
- Core promise: [...]
- Primary emotion: [...]
- Antagonist: [...]
- Recommended tone: [...]
- Permission strategy: [...]
- Paywall strategy: [...]

## Narrative system
- Hero: [...]
- Mentor role of the app: [...]
- Trigger moment: [...]
- Failed workarounds: [...]
- Day-1 win: [...]
- Week-3 outcome: [...]
- Theme: [...]
- Things the copy must never do: [...]

## Screen map
| Order | Screen | Job | Key transition |
|---|---|---|---|

## Screen contracts
[One detailed contract per screen]

## Copy constraints
- [Character limits by screen family]
- [Tagline rules]
- [Subtitle rules]
- [Answer option rules]
- [Tone rules]
- [Forbidden clichés or claims]

## Question-writing rules
- Diagnosis questions must create self-recognition, not sound like market research
- Plan-building questions must increase commitment, not add friction
- Questions under 30 characters when possible for tap-first mobile layouts
- Answers should usually stay under 15 characters unless clarity requires more
- Avoid ambiguous or aspirational answers that let users dodge the real pain

## Proof and claims guardrails
- Separate real proof from placeholder proof
- Do not invent scientific claims
- If proof is weak, switch to expert framing, specific mechanism, or honest social proof
- Every stat must have a traceable source before ship

## Permission strategy
- Which permissions matter
- Which screen earns each ask
- What pre-permission framing should say
- What denied state must do
- Which permissions can be deferred until post-paywall activation

## Paywall strategy
- When the paywall appears
- What narrative work must be completed before it appears
- What the paywall must restate
- What plan or result it should mirror back
- How the subscription thesis compounds over weeks, not just day 1

## Analytics events
- [Ordered list of screen_view, answer_selected, result_shown, paywall_viewed, trial_started, permission_granted, permission_denied, etc.]

## Implementation handoff
- What `/design-doc` should lock visually
- What `/design-swiftui` must implement structurally
- What content still needs real proof, real reviews, or legal review

## Next step
Run `/design-doc` if the visual system for the onboarding is still undefined.
Run `/design-swiftui` when the funnel is locked and ready for production UI.
```

Also write a timestamped copy to:

```bash
PLAN_FILE="$ISTACK_PLANS_DIR/onboarding-$(date +%s).md"
```

Then log the run:

```bash
bin/istack log \
  --skill onboarding \
  --summary "Authored the canonical onboarding blueprint and conversion funnel." \
  --file "$ISTACK_ONBOARDING_DOC" \
  --file "$PLAN_FILE"
```

If stable product facts became clearer, merge them into the manifest:
- target persona refinements
- value props
- positioning
- marketing axes
- monetization notes

---

## Reusable heuristics by screen family

### Welcome
- Frame the world before listing features
- Make the promise specific
- Use imagery that shows the user's life, not abstract gradients alone
- Each welcome screen should advance the story, not repeat the same claim three ways

### Diagnosis
- Questions should help the user recognize their problem
- Avoid generic surveys that could fit any app
- Keep wording brutally clear
- Each answer set should reveal intensity, frequency, preference, or constraint

### Results
- Mirror the user's pattern back to them
- Create productive tension: "you are not broken, but you are leaving value on the table"
- If using charts, label dimensions the app actually improves

### Proof
- Proof must increase belief without feeling fabricated
- Prefer real studies, real expert framing, or concrete mechanism over inflated pseudo-science
- If no proof exists yet, say so and downgrade this phase rather than faking authority

### Plan-building
- These questions convert passive curiosity into ownership
- Ask for preferences, commitment level, constraints, and cadence
- The user should feel the app is building something for them, not extracting data

### Social proof
- Reviews should sound like people who used this exact product
- Vary the voices and benefit angles
- Specificity beats hype

### Pre-paywall
- The plan reveal must feel earned
- Show what is now ready for the user, not just what the app generally does
- This screen should create anticipation, not explain billing

### Paywall
- The paywall should complete the story, not reset it
- Reflect the user's diagnosis, result, and plan
- The ask should feel like access to the path forward, not a random checkout modal

### Permissions
- Ask only after the story has earned the request
- Explain the benefit in user language, not iOS API language
- Every denied path needs a graceful fallback

---

## End state

Tell the user:

```text
docs/ONBOARDING.md written to the active iStack pack.

Next: Run /design-doc if the onboarding needs a stronger visual language.
Or:   Run /design-swiftui to implement the funnel in production SwiftUI.
```

---

## Quality bar

A good `/onboarding` run produces:
- a funnel that feels native to the product, not copy-pasted from other apps
- a visible day-1 win before or at the paywall inflection point
- a named antagonist and a coherent emotional arc
- questions that create self-recognition instead of survey fatigue
- a paywall that feels earned because the onboarding did real narrative work
- an `ONBOARDING.md` detailed enough that design and SwiftUI work can start without a second strategy pass

A bad run:
- generic wellness-app filler
- fake science
- placeholder reviews presented as truth
- feature-list onboarding with no story spine
- permission prompts fired before the user understands why
- a paywall dropped in without any earned transition
