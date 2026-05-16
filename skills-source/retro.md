# /retro

**Role:** Engineering Manager
**Stage:** Reflect
**Reads:** git history, test suite, `.iStack/<app-slug>/artifacts/retros/` for trend data
**Writes:** `.iStack/<app-slug>/artifacts/retros/[date].json`, `.iStack/<app-slug>/artifacts/retros/[date].md`, history/session logs
**Feeds into:** next sprint planning

At the end of the week, what actually happened? Not vibes — data. Commit velocity, test health, shipping streaks, where time went, what slowed things down.

---

## Phase 1 — Data collection

```bash
# Date range
SINCE="7 days ago"
AUTHOR=$(git config user.email)

echo "━━ COMMIT ACTIVITY ━━"
git log --oneline --since="$SINCE" --author="$AUTHOR"

echo ""
echo "━━ STATS ━━"
git log --since="$SINCE" --author="$AUTHOR" --stat | grep -E "files? changed|insertions|deletions" | \
  awk '{files+=$1; ins+=$4; del+=$6} END {print files" files changed, +"ins" insertions, -"del" deletions"}'

echo ""
echo "━━ COMMITS BY DAY ━━"
git log --since="$SINCE" --author="$AUTHOR" --format="%cd" --date=format:"%A" | sort | uniq -c

echo ""
echo "━━ FILES MOST CHANGED ━━"
git log --since="$SINCE" --author="$AUTHOR" --name-only --format="" | sort | uniq -c | sort -rn | head -10

echo ""
echo "━━ TEST COUNT ━━"
# Current test count
find . -name "*Tests*.swift" | xargs grep "func test" 2>/dev/null | wc -l | xargs echo "Current tests:"

echo ""
echo "━━ SHIPPING STREAK ━━"
# Count consecutive days with commits
git log --format="%cd" --date=format:"%Y-%m-%d" | sort -u | tail -30
```

```bash
# Load previous retro for trend comparison
eval "$(bin/istack resolve env)"
PREV_RETRO=$(ls -t "$ISTACK_RETROS_DIR"/*.json 2>/dev/null | head -1)
[ -f "$PREV_RETRO" ] && cat "$PREV_RETRO" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Previous: {d[\"commits\"]} commits, {d[\"tests\"]} tests')"
```

---

## Phase 2 — Analysis

From the data, compute:

**Velocity:**
- Commits this week: N
- Lines: +N added / -N removed / N net
- Files touched: N
- Active coding days: N / 7
- Shipping streak: N consecutive days

**Code health:**
- Test count trend: prev → current (delta)
- TODO/FIXME count: `grep -rn "TODO\|FIXME\|HACK" --include="*.swift" . | wc -l`
- Build warnings: `xcodebuild ... 2>&1 | grep "warning:" | wc -l`

**What shipped:**
Parse commit messages and rewrite as user-facing features/fixes (not git messages):
- `feat(auth): add biometric login` → "Added Face ID / Touch ID login"
- `fix(qa): crash on empty state` → "Fixed crash when no items present"

**In flight:**
```bash
git branch --list | grep -v "main\|master\|\*" | head -5
```

---

## Phase 3 — Honest assessment

**Momentum signal:**
- 🟢 Accelerating: more commits than last week, test ratio maintained or improved, no major blockers
- 🟡 Steady: similar pace to last week, minor friction
- 🔴 Slowing: significantly fewer commits, or test ratio dropped, or technical debt accumulating

**Rules for the honest assessment:**
- Don't sugarcoat low velocity weeks. Name what happened.
- Distinguish signal from noise: 1 commit that ships a hard architecture decision beats 20 trivial commits.
- Name the debt. If shortcuts were taken, log them here so they get paid back.
- Celebrate specific wins, not generic praise.

---

## Phase 4 — istack skills usage

Track which skills were used this week:

```bash
# Check git commits for skill traces
git log --since="$SINCE" --format="%s" | grep -E "fix\(review\)|fix\(qa\)|chore\(release\)|style\(design\)" | head -10
```

Log: which skills ran, which found real issues, which found nothing. This helps calibrate istack over time.

---

## Phase 5 — Save snapshot

```bash
mkdir -p "$ISTACK_RETROS_DIR"

# Save JSON for trend tracking
cat > "$ISTACK_RETROS_DIR/$(date +%Y-%m-%d).json" << JSON
{
  "date": "$(date +%Y-%m-%d)",
  "week_of": "$(date -v-Mon +%Y-%m-%d 2>/dev/null || date -d 'last monday' +%Y-%m-%d 2>/dev/null || date +%Y-%m-%d)",
  "commits": [COUNT],
  "lines_added": [COUNT],
  "lines_removed": [COUNT],
  "active_days": [COUNT],
  "tests": [COUNT],
  "warnings": [COUNT],
  "momentum": "[green/yellow/red]"
}
JSON

bin/istack log \
  --skill retro \
  --summary "Recorded the weekly project retrospective and momentum snapshot." \
  --file "$ISTACK_RETROS_DIR/$(date +%Y-%m-%d).json"
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 ISTACK RETRO — Week of [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VELOCITY
  Commits:      [N] (vs [N] last week: [+/-N])
  Code:         +[N] added / -[N] removed / [N] net LOC
  Active days:  [N]/7
  🔥 Streak:    [N] consecutive days

CODE HEALTH
  Tests:        [prev] → [now] ([delta])
  Warnings:     [N] (goal: 0)
  TODO/FIXME:   [N] items

WHAT SHIPPED
  · [Feature rewritten as user-facing]
  · [Fix rewritten as user-facing]
  · ...

IN FLIGHT
  · [branch name] — [brief description]

ISTACK SKILLS USED
  · /review: [N times — found N blocking issues]
  · /qa-ios: [N times — found N bugs]
  · /appstore-review: [N times]
  · ...

DEBT ADDED THIS WEEK
  · [Shortcut taken and why — be honest]
  · [Test that wasn't written — be honest]

MOMENTUM: 🟢/🟡/🔴 [one honest sentence]

FOCUS NEXT WEEK
  1. [Most important]
  2. [Second]
  3. [Third if needed]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
