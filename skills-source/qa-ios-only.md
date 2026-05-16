# /qa-ios-only

**Role:** QA Reporter — iOS
**Stage:** Test
**Reads:** same as `/qa-ios`
**Writes:** `.iStack/<app-slug>/artifacts/qa-reports/[timestamp].md` — report only, zero code changes, plus history/session logs
**Feeds into:** `/qa-ios` (for fixes), `/review`

Same methodology as `/qa-ios` — full build, test suite, simulator, all flows, dark mode, large text. But **report only**. No code changes. No commits. Pure bug report.

Use when:
- You want a QA report before deciding which bugs to fix
- Someone else will do the fixes
- You want to compare state before and after a refactor
- You want to audit without touching anything

---

## Process

Execute all phases from `/qa-ios` (phases 0-6) with one change:

**Phase 7 is replaced with documentation only:**

For each bug found:
1. State the bug precisely: screen + action + expected + actual
2. Severity: 🔴 Crash / Data Loss · 🟠 Core Feature Broken · 🟡 Minor / Visual · 🔵 Nice-to-fix
3. Steps to reproduce (exact)
4. Screenshot reference
5. Suggested fix (don't apply it)

---

## Output format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA REPORT (READ-ONLY) — [date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BUILD: ✅ / ❌
TESTS: [N passed] / [N failed]

BUGS FOUND ([N total]):

🔴 CRITICAL ([N]):
1. [Screen/Flow] — [what breaks]
   Steps: [1. 2. 3.]
   Expected: [behavior]
   Actual: [behavior]
   Suggested fix: [brief proposal]

🟠 HIGH ([N]):
...

🟡 MINOR ([N]):
...

VISUAL:
Dark Mode:  ✅ / ⚠️ [issue]
Large Text: ✅ / ⚠️ [issue]

NO CODE WAS CHANGED. Run /qa-ios to fix.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
