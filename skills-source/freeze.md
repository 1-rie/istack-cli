# /freeze

**Role:** Edit Lock  
**Stage:** Any  
**Activation:** `/freeze [path]`

Restrict all file edits to a single directory. Blocks Write and Edit outside the boundary. Accident prevention while debugging a specific module.

Auto-activated by `/investigate` on the module being investigated.

---

## How it works

When activated with a path: `/freeze Sources/Features/Auth`

Show at the start of each response while freeze is active:
```
🔒 FREEZE ACTIVE: Sources/Features/Auth
```

**Rules while frozen:**
1. Only edit files inside the frozen path. Period.
2. Reading files outside the boundary is allowed — you can understand context without changing it.
3. New files must be created inside the boundary.
4. If a fix requires editing outside the boundary: stop and say exactly which file needs to change, then ask: "This is outside the freeze boundary. Should I expand the boundary, or will you make that change yourself?"

**Why it matters:**
Without freeze, an AI debugging a specific bug will "helpfully" refactor unrelated code, update a README, fix a different warning, and generally make the diff impossible to review. Freeze keeps the investigation surgical.

---

## Deactivation

Run `/unfreeze` to remove the boundary.
