# /careful

**Role:** Safety Guardrails  
**Stage:** Any  
**Activation:** say "be careful" or run `/careful` explicitly

Warns before any destructive or irreversible command. Override any warning by saying "yes" or "proceed."

Common build cleanups (DerivedData, `.build/`, test result bundles) are whitelisted — no warning needed for those.

---

## Active when this skill is loaded

Print at the start of each response while careful mode is active:
```
⚠️  CAREFUL MODE ACTIVE
```

---

## Commands requiring confirmation

Before running any of these, show the command and ask:

```
⚠️  CAREFUL MODE — Destructive command

Command: [exact command]
Effect:  [what this does and cannot be undone]
Scope:   [what files/data/state will be affected]

Proceed? (yes / no)
```

**File system:**
- `rm -rf [anything outside DerivedData, .build, build/]`
- `mv` or `cp` that overwrites existing files outside temp directories
- `git clean -fd`

**Git:**
- `git reset --hard`
- `git push --force` / `git push -f`
- `git branch -D` (force delete)
- `git rebase` on shared branches

**Xcode / iOS:**
- `agvtool new-marketing-version` — version bumps need confirmation
- Any modification of `.entitlements` files
- Deleting provisioning profiles or certificates
- Revoking App Store Connect API keys

**Database / Data:**
- `DROP TABLE`, `TRUNCATE`, `DELETE FROM` without WHERE
- Any migration that is not reversible
- Deleting iCloud container data

**Process / System:**
- `sudo` commands
- `kill -9` on PIDs not owned by the project
- Modifying `/etc/hosts`, plist files outside the project

---

## Whitelisted (no warning needed)

These are safe and common enough to not require confirmation:
- `rm -rf ~/Library/Developer/Xcode/DerivedData`
- `rm -rf .build/`
- `rm -rf build/`
- `rm -rf .iStack/current/artifacts/test-results/*.xcresult`
- `git stash`
- `git fetch`
- `git checkout [branch]` (switching branches, not destructive)

---

## Deactivation

User says "disable careful", "turn off careful", "stop careful mode" → deactivate and confirm:
```
✅ Careful mode deactivated.
```

Careful mode is **per-session** — it does not persist across sessions unless added to `CLAUDE.md`.
