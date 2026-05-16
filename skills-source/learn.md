# /learn

**Role:** Memory
**Stage:** Any
**Reads:** `.iStack/<app-slug>/knowledge/learnings.md`
**Writes:** `.iStack/<app-slug>/knowledge/learnings.md`, history/session logs
**Feeds into:** every session

istack learns your codebase. Learnings compound — each session starts smarter than the last.

---

## Session start behavior

At the start of every Claude Code session, if `bin/istack resolve env` returns a canonical pack and `knowledge/learnings.md` exists, read it silently and internalize the context.

Print:
```
📚 [N] istack learnings loaded for [project name].
Type /learn to review or add.
```

If no learnings exist yet: don't mention it. First run is silent.

---

## Commands

### `/learn` — Review current learnings
Show all learnings, grouped by category. Ask: "Anything to add, update, or remove from this session?"

### `/learn add [insight]` — Add a specific learning
```bash
eval "$(bin/istack resolve env)"
mkdir -p "$ISTACK_KNOWLEDGE_DIR"
CATEGORY="[infer category from insight]"
DATE=$(date +%Y-%m-%d)
echo "" >> "$ISTACK_LEARNINGS_FILE"
echo "## [$DATE] $CATEGORY" >> "$ISTACK_LEARNINGS_FILE"
echo "[insight]" >> "$ISTACK_LEARNINGS_FILE"
bin/istack log \
  --skill learn \
  --summary "Captured a new persistent learning for the project." \
  --file "$ISTACK_LEARNINGS_FILE"
git add "$ISTACK_LEARNINGS_FILE"
git commit -m "chore(learn): add learning — [short description]"
```

### `/learn list` — Show all learnings
```bash
eval "$(bin/istack resolve env)"
cat "$ISTACK_LEARNINGS_FILE" 2>/dev/null || echo "No learnings yet. They'll accumulate as you use istack."
```

### `/learn prune` — Remove outdated learnings
Show each learning and ask: "Still accurate? (yes / no / update: [new text])"
Remove or update stale learnings. Commit the cleaned file.

---

## Learning categories

### Architecture decisions
Why a specific pattern was chosen. Trade-offs considered and rejected. Constraints that shaped the architecture.

Example: "We use MVVM not TCA because the team is 1 person and TCA boilerplate slows down iteration. Revisit if team grows past 3."

### Recurring bugs / pitfalls
Patterns that keep causing bugs in this specific codebase.

Example: "CoreData context is always accessed from background — `viewContext` used directly causes crashes. Always use `performBackgroundTask`."

Example: "The `ItemService` has a race condition when `refresh()` is called twice fast. Add `guard !isRefreshing` at entry."

### Codebase conventions
Patterns beyond standard Swift style that are specific to this project.

Example: "All network errors are wrapped in `AppError` before reaching ViewModels — never expose raw URLError."

Example: "Dates are always stored as UTC in CoreData and converted to local timezone only in the ViewModel."

### Performance notes
What's slow, what the budget is, what's been profiled.

Example: "Loading the main list with >200 items causes frame drops. LazyVStack fixed it — never switch back to VStack for this list."

### App Store / Deployment notes
Anything learned about the submission process for this specific app.

Example: "Build times on CI are 12 minutes — don't wait for CI to catch typos, run tests locally first."

Example: "This app got rejected once for NSLocalNetworkUsageDescription — even though we don't use it, the Multipeer Connectivity framework triggers it. Always include the key."

### Domain knowledge
Business rules not obvious from code. UX decisions and why they were made. User research findings.

Example: "Users open the app to log immediately after a run — the log screen needs to be reachable in <2 taps from launch."

---

## Automatic learning triggers

After certain skills complete, offer to add a learning if something non-obvious was found:

After `/investigate`: "Should I add a learning about [root cause pattern]?"

After `/review` finds the same issue 2+ times: "This is the second time I've found [issue type] in this codebase. Should I add a learning so we catch it automatically?"

After `/qa-ios` finds the same category of bug twice: "Should I add a learning about [bug pattern] to prevent recurrence?"

After `/appstore-review` finds a non-obvious issue: "Should I add a learning about [requirement] so we check it automatically?"

---

## knowledge/learnings.md format

```markdown
# istack Learnings — [Project Name]

*Last updated: [date]*

## [YYYY-MM-DD] Architecture decisions
[learning]

## [YYYY-MM-DD] Recurring bugs
[learning]

## [YYYY-MM-DD] Codebase conventions
[learning]
```
