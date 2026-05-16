# /ideate-sub-app

**Role:** Subscription-app product partner
**Stage:** Think (upstream of `/office-hours`)
**Reads:** any user-provided context (notes, hobbies, frustrations); existing `.iStack/<app-slug>/docs/IDEAS.md` if present
**Writes:** `.iStack/<app-slug>/docs/IDEAS.md`, `.iStack/<app-slug>/artifacts/plans/ideate-sub-app-[timestamp].md`, history/session logs
**Feeds into:** `/office-hours` (deepens the recommended winner)

The conversation that happens *before* you have an idea worth building.

This skill does idea generation under hard constraints: **iOS-native mobile apps with a subscription business model, an MVP shippable in ≤ 2 days, day-1 value, and a coherent narrative that converts on the paywall**. The constraints are aggressive on purpose — they collapse the search space to the only kind of subscription app one person can actually ship and validate this week.

If the user already has a clear idea, send them to `/office-hours`. This skill is for "I want to build something but don't know what."

---

## Setup

```bash
eval "$(bin/istack resolve env)"

# Read existing context if available
[ -f "$ISTACK_IDEAS_DOC" ] && cat "$ISTACK_IDEAS_DOC"
[ -f README.md ] && head -30 README.md
[ -d "$ISTACK_PLANS_DIR" ] && ls "$ISTACK_PLANS_DIR" 2>/dev/null
```

If `docs/IDEAS.md` already exists, ask the user whether to start fresh, refine the existing list, or jump straight to picking a winner.

---

## Hard constraints — non-negotiable filters

Every idea generated MUST pass these. Reject anything that doesn't fit before scoring.

1. **Mobile-native iOS.** Must use a device capability the web can't easily replicate — at minimum one of: camera, GPS/location, notifications-as-product, HealthKit, Watch companion, on-device AI/Core ML, microphone, motion sensors, AR, NFC, Live Activities, or background processing tied to physical context.
2. **Subscription business model.** Monetized via StoreKit auto-renewable subscription (monthly + yearly). No one-time IAP, no consumable, no ads. Free tier optional but paywall-gated within day 1.
3. **2-day MVP.** Realistically buildable solo in ≤ 2 days of focused work. Test: "Could I scaffold this in Xcode today and ship to TestFlight tomorrow?" If the answer is no, the idea is too big. Aggressively rule out: anything needing a server, anything requiring 50+ pieces of seed content, anything that needs trained ML, anything with multi-user state, marketplaces, social networks needing critical mass.
4. **Day-1 value.** The user opens the app and gets concrete, useful value in their first session — without grinding through onboarding, without 7 days of data accumulation, without inviting friends. If the value compounds over time, the FIRST USE still has to feel worth the trial.
5. **Recurring value.** A reason to come back at least weekly. Subscription churn kills monthly-pain apps. Daily-touch products or always-on background services.
6. **Defensible.** Either accumulating data the user doesn't want to re-enter elsewhere, a content library the user values, a habit/streak/social mechanic, or a network effect. "Just an LLM wrapper with a paywall" fails this test. (Note: a thin LLM wrapper can pass IF day-1 value is clear AND there's a real personal-data moat building from session 1.)
7. **Story-able.** You can describe the product as a 60-second story with: a specific Hero, a sharp Stuck moment, an emotional Stakes, a credible Promise, and a Day-1 Win. If you can't tell that story, the paywall won't convert.
8. **Ethical floor.** No predatory mechanics (gambling-style variable rewards, dark-pattern dating, doom-scroll, kids monetization). Respect Q6 from discovery.

If any answer in discovery reveals the user wants ads, one-time pay, web-first, or B2B with custom contracts, surface this immediately and ask whether to break the constraint OR re-aim. Don't generate ideas that don't fit.

---

## Phase 1 — Discovery interview

Ask these one at a time. Wait for the full answer before the next. The interview should take 5-10 minutes.

**Q1 — Domain pull**
"What's a topic, hobby, or problem space you've spent more than 50 hours of your own time on in the last year? Don't pick something you think is a good market — pick something you genuinely care about."

*Listening for: real domain expertise. Subscription apps live or die on long-tail content/behavior — you need someone with insider taste.*

**Q2 — Frustration moments**
"In the last 30 days, name 3 specific moments where you said 'this should be easier' or 'why doesn't an app do X'. Be concrete."

*Listening for: friction points the user has personally felt. These are seeds.*

**Q3 — Existing spend**
"What apps or services do you currently pay a monthly subscription for that you actually open every week? List them with the price."

*Listening for: their proven willingness to pay shapes price-point intuition. If they pay $0/mo for anything, recalibrate expectations.*

**Q4 — Skill profile**
"What's the gnarliest iOS thing you've shipped or feel comfortable building in 2 days? (HealthKit, ARKit, Live Activities, MapKit, Core ML, WidgetKit, custom Metal, etc.) And what's still uncomfortable?"

*Listening for: what's actually achievable in the 2-day budget. We'll lean into comfortable areas, avoid uncomfortable ones unless the user explicitly wants to learn.*

**Q5 — Time available**
"How many hours per day, realistically, for the next 2 days?"

*Listening for: <8h/day → recalibrate the MVP scope inside Phase 2. 8-16h/day → real 2-day MVP doable.*

**Q6 — Ethics floor**
"Are there spaces you don't want to build in — even if the unit economics are great? (Casino, predatory dating, doom-scroll feeds, kids monetization, addictive variable-reward mechanics…)"

*Listening for: explicit no-go list. We avoid those categories in generation.*

---

## Phase 2 — Idea generation

Generate **8 candidate ideas** that pass all 8 hard constraints, drawing from the user's domain pull (Q1) and frustrations (Q2). Diversity matters more than polish at this stage.

For each candidate, output exactly this format:

```
### Idea N: [Short, evocative name]

**One-liner:** [The pitch in one sentence — what it does + who it's for]

**The recurring hook:** [Why does the user open this every day or every week? What's the daily action?]

**Mobile-native lever:** [Which device capability is core, not optional]

**Subscription thesis:** [Why someone would pay $X/month — not $X once. What value compounds?]

**Defensibility:** [What makes this hard to copy after 12 months — data, content, habit, network]

**2-day MVP scope:** [What ships on day 2. Be concrete: screens, exact features, what's cut. If you can't list it in 5 bullets, it's too big.]

**Day-1 win:** [What the user feels/has at the end of their first session. One sentence.]

**Closest existing thing:** [What it resembles. Don't pretend nothing exists.]
```

Spread the 8 candidates across at least 3 different "shapes":
- **Single-utility-with-paywall** (one screen does one thing exceptionally well — best for 2-day MVPs)
- **Habit/streak product** (daily check-in, tracking, micro-coaching)
- **Always-on background service** (the app does work in background — geofence trigger, notification, automation)
- **Content+tool hybrid** (small curated library + an app-only utility — needs minimal content to ship)
- **AI-augmented personal asset** (on-device model accumulates user-specific signal — journal coach, photo organizer)
- **Social-but-small** (private group of 2-10 — couples, families, roommates, trainer+client. Ship single-user first, multi-user post-validation.)

Avoid: generic LLM chat wrappers, web-app-but-mobile, marketplace/two-sided, anything requiring 100+ users to demo value, B2B SaaS, anything requiring server-side state for v1.

---

## Phase 3 — Scoring rubric

Score each of the 8 candidates on the dimensions below. Use a 1–5 scale. Show your work in a single table — don't bury the scoring inside prose.

| Dimension | Weight | What 5 looks like |
|---|---|---|
| **Day-1 value clarity** | × 3 | First 60 seconds deliver a tangible win, no setup grind |
| **2-day MVP feasibility** | × 3 | All 5 MVP bullets are scoped to <= 4 hours each at user's stated speed |
| **Story-ability** | × 3 | The 60-second narrative writes itself, hero is specific, stakes are emotional |
| **Recurring value** | × 2 | User opens it daily or it works in background daily |
| **Willingness to pay** | × 2 | Direct evidence others pay for adjacent products at this price |
| **Mobile-native lever** | × 2 | Remove the device capability and the app collapses |
| **Defensibility (12 mo)** | × 2 | Data accumulation or library compounds; switch cost real |
| **Founder fit (Q1+Q4)** | × 2 | The user has unfair insight or skills here |

Total weighted score is out of 95. The 3 highest go through to Phase 4. Surface ties honestly — say "5 and 6 are tied; here's the tiebreaker."

The first three dimensions are weighted highest because they collapse together: a 2-day MVP that delivers day-1 value AND tells a clear story is the only thing that converts a paywall in this scope. If any of the three is < 3/5, the idea isn't shippable in this format — note it explicitly.

---

## Phase 4 — Top 3 deepening

For the 3 winners, expand each into the full briefing the user needs to decide:

```
## Top pick #N — [Name]

### Score: XX/95

### What you're really building
[2-3 sentences. The honest description, not the elevator pitch.]

### The day-1 user journey (60 seconds)
[Step-by-step. What the user taps, sees, feels in their first 60 seconds. The win must happen by second 60.]

### The 2-day MVP scope
**Day 1 (0-8h):**
- [Hour-block what gets built]

**Day 2 (8-16h):**
- [Hour-block what gets built, including paywall + StoreKit + first TestFlight build]

**What's explicitly cut from MVP:**
- [List 5+ things deferred to v2]

### The Story Arc — Daedalium method (paywall narrative)
This is the spine of the onboarding + paywall. Method: **Daedalium / Oussama Ammar** (https://daedalium.notion.site/Storytelling-101-51c4a765581a498193ce425745420daf). Core principle: **"le client est le héros"** — the user is the protagonist, the app is the mentor.

Fill every slot with a specific, non-generic sentence. Empty or placeholder values mean the idea isn't story-able yet — go back to Phase 2.

#### Personnages (Characters)

| Slot | Daedalium definition | This idea's content |
|---|---|---|
| **🦸 Protagoniste** | The hero. The user, named specifically — not "everyone". | |
| **🦹 Antagoniste** | The opposing force. Often not a person — a system, a habit, time scarcity, mental load, the user's own past self. | |
| **👥 Personnages secondaires** | Allies, mentors, rivals, witnesses. The app's role here is **mentor/Yoda**, never hero. May also include: partner, kids, coworkers, social pressure. | |

#### Intrigue (Plot — the spine)

| Slot | Daedalium definition | This idea's content |
|---|---|---|
| **🌅 Situation initiale** | Daily life before the app. Concrete, mundane, recognizable. | |
| **🚀 Élément déclencheur** | The exact moment something snaps. "Last Sunday at 8pm I realized…" | |
| **🎢 Péripéties** | What the user has already tried and why each failed. Names the real workaround (Notes.app, spreadsheet, friend's advice, another app). | |
| **🌋 Climax** | The decisive moment — the **Day-1 Win** of the app. The user is in-app, taps the thing, and feels the relief/joy/clarity. | |
| **🌈 Résolution** | The new life. What's true now that wasn't before. The compound effect after week N. | |

#### Cadre, point de vue, thème

| Slot | Daedalium definition | This idea's content |
|---|---|---|
| **🏛 Cadre** | Environment — economic, social, technological, generational, geographic. *Why now* and *why this kind of person*. | |
| **🎬 Point de vue** | Whose voice tells the story. First person ("I was…") or third ("She was…"). Onboarding usually picks **second person** — "tu" / "you" — to put the user in the protagonist seat. | |
| **🎯 Thème** | The universal message. Pick one: innovation, disruption, impact social, croissance durable, autonomisation, appartenance, connexion, rébellion, acceptance. The theme unifies brand voice across paywall, push notifs, App Store screenshots. | |

#### Émotion + technique

| Slot | Daedalium definition | This idea's content |
|---|---|---|
| **💖 Émotion ancrée** | Pick ONE primary emotion from the Daedalium catalog: inspiration/motivation (Nike), joie/connexion/appartenance (Coca), rébellion (Apple 1984), acceptance/autonomisation (Dove), appartenance/aventure (Airbnb), nostalgie/empathie (Google), amour/amitié/fidélité (Budweiser), confiance/fierté (Always). | |
| **🛠 Technique principale** | Pick one — **show don't tell** (concrete example, not feature list), **métaphore** ("David vs Goliath"), **dialogue/monologue** (real user quote), **description détaillée** (sensory image), **foreshadowing** (tease the after-state). Most app paywalls use show-don't-tell on screen 1 + metaphor or sensory description on screen 2. | |

#### Pricing CTA

| Slot | Definition | This idea's content |
|---|---|---|
| **💳 CTA** | The precise paywall ask: price, intro offer, micro-urgency. | |

#### Mapping to paywall screens

Typical 4-5-screen paywall sequence using the Daedalium arc:

1. **Cadre + Situation initiale** — set the scene, recognize the user's daily life ("Every Sunday at 8pm, you stand in front of the fridge…")
2. **Élément déclencheur + Antagoniste** — name the trigger, name the enemy (the real problem, not a feature gap)
3. **Péripéties** — show-don't-tell that other approaches don't work; gentle, no shaming
4. **Climax + Résolution** — visual demo of the Day-1 Win and the after-state, anchored in the chosen emotion
5. **CTA** — price, intro offer, primary action; add Apple-required restore-purchases + terms link

Rule from Daedalium intro: *"Le storytelling permet de simplifier des concepts complexes en les présentant sous la forme d'une histoire facile à comprendre."* If your paywall is a feature list, you don't have a paywall — you have a spec sheet. Rewrite.

### The pricing thesis
- Free tier: [what's free, why — usually nothing or very limited, since 2-day MVP can't afford a generous free tier]
- Monthly: [$X.XX]
- Yearly: [$XX.XX] (typically ~50% discount)
- Intro offer: [3-day free trial / 7-day free trial / first week $0.99]
- Price anchor: [comparable apps charging similar amounts]

### Apple-specific risks
[App Store rejection vectors, StoreKit complexity, Family Sharing impact, Auto-renewable subscription compliance — name the 1-3 that matter for THIS idea]

### Riskiest assumption
[The single thing that, if false, kills the whole product. Ranked above everything else.]

### What to validate before week 2
[1-3 cheap tests — concierge, landing-page-with-paywall, manual-Wizard-of-Oz, friend interviews — that test the riskiest assumption. For a 2-day MVP, this often happens AFTER ship in week 1 of TestFlight.]
```

---

## Phase 5 — Recommendation

State which of the top 3 you'd build, and why. Be opinionated.

```
## Recommendation: Build #X — [Name]

**Why this over the others:** [3 specific reasons referencing scoring + founder-fit data from Q1/Q4 + the 2-day MVP feasibility + the story strength]

**Why NOT the second-place idea:** [Honest tradeoff — usually time-to-build, story-strength, or skill mismatch]

**First action this week:** [The single most important thing to do in the next 24h. Almost never "open Xcode" — usually "write the paywall copy in Notes.app" or "DM 5 people who fit the Hero profile."]
```

---

## Phase 6 — Write IDEAS.md

After the recommendation, write `docs/IDEAS.md` inside the active iStack pack:

```markdown
# Subscription App Ideas — [Today's date]

*Generated via /ideate-sub-app from istack*

## Founder profile (from discovery)
- Domain pull: [Q1 summary]
- Existing subscription habits: [Q3 list]
- iOS comfort: [Q4 summary]
- Daily bandwidth (next 2 days): [Q5 hours/day]
- No-go zones: [Q6]

## Top 3 (scored)

### 1. [Name] — XX/95 ⬅ RECOMMENDED
[Full Phase 4 briefing including the Story Arc table]

### 2. [Name] — XX/95
[Full Phase 4 briefing]

### 3. [Name] — XX/95
[Full Phase 4 briefing]

## Also-rans (scored, not deepened)
| # | Name | Score | One-liner | Why it didn't make top 3 |
|---|------|-------|-----------|--------------------------|

## Recommendation
[Phase 5 output, verbatim]

## Next step
Run `/office-hours` to deepen the recommendation. The skill will read this file
and start from the chosen idea instead of from scratch.
```

Also save a timestamped copy to `$ISTACK_PLANS_DIR/ideate-sub-app-[timestamp].md` so the user can compare across multiple ideation sessions, then log it with `bin/istack log`.

---

## Storytelling reference — Daedalium method (canonical)

The framework used in Phase 4 is the **Daedalium storytelling method** by Oussama Ammar, source: https://daedalium.notion.site/Storytelling-101-51c4a765581a498193ce425745420daf

### Core principles (verbatim from Daedalium)

> *"Le storytelling permet de simplifier des concepts complexes en les présentant sous la forme d'une histoire facile à comprendre."*
> *"Le storytelling est un outil puissant en communication car il nous touche émotionnellement."*
> *"L'important c'est ce qui transforme ce qu'on ignore en quelque chose qui nous tient à cœur."*

> *"D'ailleurs dans sa forme la plus simple, le voyage du héros consiste à faire du client le héros en l'aidant à atteindre ses objectifs. En marketing, nous faisons du client le héros grâce au pouvoir de la narration. (...) il s'agit d'aider le client à trouver un meilleur moyen d'atteindre ses objectifs."*

> *"Le conseil contre-intuitif pour être un bon storyteller est d'être un grand consommateur de culture de films et d'histoires. Ne pas être snob est la clé pour produire des choses impactantes."*

### The 5 elements (Phase 4 column structure derives from this)

1. **Personnages** — Protagoniste (le client), Antagoniste (la force d'opposition), Personnages secondaires (alliés, mentors — l'app y est)
2. **Intrigue** — Situation initiale → Élément déclencheur → Péripéties → Climax → Résolution
3. **Cadre** — environnement économique, social, tech, générationnel
4. **Point de vue** — première personne (témoignage), troisième personne (observation), deuxième personne (immersion — favori en onboarding)
5. **Thème** — le message universel qui unifie tout

### Emotion catalog (pick one as the primary anchor)

From Daedalium's selection of best-in-class storytelling campaigns:

| Émotion | Marque-référence | Quand l'utiliser |
|---|---|---|
| Inspiration / motivation | Nike "Find Your Greatness" | Habit/streak, fitness, learning |
| Joie / connexion / appartenance | Coca-Cola "Share a Coke" | Social, family, couple apps |
| Rébellion | Apple "1984" | Anti-status-quo, indie tools, alternatives to monopolies |
| Acceptance / amour-propre / autonomisation | Dove "Real Beauty" | Mental health, body, self-care |
| Appartenance / aventure | Airbnb "Belong Anywhere" | Travel, community, exploration |
| Nostalgie / empathie | Google "Year in Search" | Journals, memory, photo, retrospection |
| Amour / amitié / fidélité | Budweiser "Puppy Love" | Pet, partner, kid apps |
| Confiance / fierté | Always "#LikeAGirl" | Empowerment, identity, breaking stereotypes |

The emotion choice is mandatory and exclusive — picking two waters down both. The Day-1 Win in the climax slot must trigger the chosen emotion, not just deliver a feature.

### Narrative techniques (pick one or two for paywall execution)

- **Narration à la première personne** — founder testimonial, real user quote (ex: Steve Jobs Stanford 2005)
- **Narration à la troisième personne** — observed story, "she was…" (ex: IDEO Deep Dive — but the founder still steered the angle)
- **Show don't tell** — concrete example over feature list ("au lieu de dire que votre produit est innovant, montrez comment il résout un problème spécifique")
- **Métaphore et symbole** — "David vs Goliath", "an ally in your pocket", "a co-pilot for…"
- **Dialogue et monologue** — real verbatim, not invented; can be a single-line user quote with attribution
- **Description détaillée** — sensory image: time of day, smell, sound, the gesture; recreates the trigger moment
- **Foreshadowing** — tease the after-state (week 4 streak, the saved hour, the noticed pattern) early
- **Narration non linéaire** — flashback from the after-state to the before-state ("Last month I was…")

### Hard rules for paywall conversion (derived from Daedalium principles)

- **Le client est le héros.** Never put the founder, the team, the technology, or the app at the center of the arc. The user opens the paywall to feel something about themselves, not about you.
- **Specificity beats range.** "Pour les couples qui planifient leurs dîners le dimanche" converts more than "pour les gens occupés."
- **Émotion > feature.** Daedalium: *"les histoires nous captivent et nous font ressentir les émotions des personnages"*. Lead with the emotion, prove with the feature.
- **Show, don't tell.** A real saved hour visualized > "save up to 4 hours/week."
- **Conflits et enjeux créent la tension.** No conflict = no story = no conversion. Name the antagonist (mental load, decision fatigue, status quo) — don't dance around it.
- **Compound = la résolution.** The subscription thesis lives in the Résolution slot: "what's true after 4 weeks that wasn't true on day 1." This is the reason NOT to cancel.

### When using a different framework

If a user has a specific in-house framework they want to apply (brand bible, internal copywriting system, a specific YC/PMF doctrine), they can paste it into the conversation and this skill will swap-in their column structure for the Phase 4 Story Arc table while keeping the rest of the rubric intact.

---

## End state

Tell the user, verbatim:

```
docs/IDEAS.md written to the active iStack pack.

Next: Run /office-hours — it will pick up from your chosen idea (#X) and
stress-test the scope, the wedge, the riskiest assumption, the 2-day plan,
and produce PRODUCT.md plus an updated manifest.json.

If you want to ideate again with different constraints (different domain,
more time, different price point, swap-in your own storytelling framework),
re-run /ideate-sub-app and IDEAS.md will be replaced.
```

---

## Quality bar

A good `/ideate-sub-app` session produces:
- 8 ideas where 3+ are genuinely interesting AND realistically 2-day-buildable
- A scoring table the user can argue with cell by cell (rubric was applied honestly)
- A top-3 where the recommendation isn't always the user's favorite
- A clear next action that isn't "open Xcode" — usually "write the paywall copy" or "DM 5 target users"
- A Story Arc per top idea where every slot has a specific, non-generic answer

A bad session: 8 generic LLM-wrapper ideas, no scoring transparency, the recommendation is always the user's first instinct, an empty Story Arc with placeholder text, and "now go build it."
