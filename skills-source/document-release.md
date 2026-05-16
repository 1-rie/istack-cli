# /document-release

**Role:** Technical Writer  
**Stage:** Ship (post-build)  
**Reads:** every documentation file, `git diff` since last tag  
**Writes:** README.md, ARCHITECTURE.md, CLAUDE.md, CHANGELOG.md, CONTRIBUTING.md, TODOS.md  
**Feeds into:** PR merge

After `/ship-ios` creates the build, this skill reads every documentation file and cross-references it against the diff. Stale docs are the silent technical debt that makes onboarding painful and makes your own future self confused.

Auto-invoked by `/ship-ios`. Can also be run standalone.

---

## Phase 1 — Find all documentation

```bash
# Find all doc files
DOC_FILES=$(find . -maxdepth 4 \( -name "*.md" -o -name "*.txt" -o -name "CLAUDE.md" \) \
  | grep -v ".git\|node_modules\|Pods\|build\|DerivedData\|.iStack/current/artifacts/qa-reports" \
  | sort)
echo "Documentation files found:"
echo "$DOC_FILES"
echo "Total: $(echo "$DOC_FILES" | wc -l)"
```

---

## Phase 2 — Read the diff

```bash
# What changed since last tag?
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")
CHANGED=$(git diff $LAST_TAG --name-only)
echo "Changed files since $LAST_TAG:"
echo "$CHANGED"

# Get commit messages for context
git log $LAST_TAG..HEAD --oneline
```

---

## Phase 3 — Audit each doc file

For each documentation file, check for staleness:

**README.md:**
- [ ] Feature list matches what was added/removed
- [ ] Installation instructions still valid (dependency versions, min iOS)
- [ ] Screenshots reference current UI (flag if views changed)
- [ ] API/usage examples still compile
- [ ] Skill/command list up to date

**ARCHITECTURE.md (if present):**
- [ ] Architecture diagram matches actual structure
- [ ] Data flow description matches new models/services
- [ ] New modules/features documented
- [ ] Removed modules/features purged

**CLAUDE.md:**
- [ ] Available skills list is current
- [ ] Project-specific context still accurate
- [ ] Min iOS target correct
- [ ] Architecture recommendation updated if changed

**CONTRIBUTING.md (if present):**
- [ ] Setup instructions still work
- [ ] Test commands current
- [ ] Build process accurate

**CHANGELOG.md:**
- [ ] Latest release has proper entry
- [ ] Version number matches `Info.plist`
- [ ] All user-facing changes captured
- [ ] Polish: consistent past tense, clear language

**TODOS.md (if present):**
- [ ] Completed TODOs marked as done
- [ ] New TODOs from commit messages added
- [ ] Priority still valid

---

## Phase 4 — Apply safe updates automatically

Apply these without asking (commit as `docs(release): update for v[version]`):

- File paths that moved (detect from diff, update all references)
- Version numbers (match `Info.plist` exactly)
- Skill lists in CLAUDE.md (add any new skills, remove deleted ones)
- "Last updated" timestamps
- Completed TODO items

---

## Phase 5 — Surface risky/subjective changes

For anything that requires judgment, ask before changing:

```
DOC QUESTION [N]:
File: [filename]
Section: [heading]
Current: "[current text]"
Suggested: "[proposed update]"
Why: [reason for change]
Change? (yes/no/skip)
```

Maximum 5 questions per run. If more, pick the 5 most important.

---

## Phase 6 — Version bump check

```bash
# Compare version in README vs Info.plist
PLIST_VERSION=$(agvtool what-marketing-version 2>/dev/null | grep -o '[0-9]*\.[0-9]*\.[0-9]*' | head -1)
README_VERSION=$(grep -o '[0-9]*\.[0-9]*\.[0-9]*' README.md | head -1)
echo "Info.plist: $PLIST_VERSION"
echo "README: $README_VERSION"
[ "$PLIST_VERSION" = "$README_VERSION" ] || echo "⚠️  Version mismatch — update README"
```

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENT RELEASE — v[VERSION]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files audited: [N]

AUTO-UPDATED:
✅ README.md — [what changed]
✅ CLAUDE.md — [what changed]
✅ CHANGELOG.md — [what changed]
⏭  CONTRIBUTING.md — no changes needed
⏭  ARCHITECTURE.md — no changes needed

QUESTIONS SURFACED: [N answered]

COMMITTED: docs(release): update for v[VERSION]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
