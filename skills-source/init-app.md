# /init-app

> Compatibility alias. Prefer `/init` for new projects.

**Role:** Project Bootstrapper  
**Stage:** Think → Plan  
**Reads:** current project root, optional imported iStack pack, existing `CLAUDE.md`  
**Writes:** `.iStack/<app-slug>/manifest.json`, `.iStack/<app-slug>/state/secrets.env`, local knowledge pack structure, optional `.iStack/<app-slug>/docs/PRODUCT.md`, project-local `CLAUDE.md` block  
**Feeds into:** `/office-hours`, `/autoplan`, every other iStack skill

Bootstrap a project-local iStack pack without touching global project memory or global simulator preferences.

This is the first skill to run on a brand-new repo, or when attaching iStack to an existing app. It creates the canonical pack at `.iStack/<app-slug>/`, keeps the stack reusable, and keeps app knowledge strictly local to this repository.

---

## Welcome

Before asking any questions, print this exact welcome block:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            .-=========-.
          .'   .----.    '.
         /    / .--. \     \
        |     | |  | |      |
        |      \ '--' /     |
        |        |  |       |
        |        |  |       |
         \       |__|      /
          '.             .'
            '-._______.-'

              ISTACK
      Made in l'imprimerie
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then say, in one short sentence, that you need three quick inputs to initialize the local app pack.

---

## Setup

```bash
pwd
git rev-parse --show-toplevel 2>/dev/null || pwd
[ -f CLAUDE.md ] && sed -n '1,120p' CLAUDE.md
[ -d .iStack ] && find .iStack -maxdepth 2 -type f | sort
[ -d .istack ] && find .istack -maxdepth 2 -type f | sort
bin/istack resolve json 2>/dev/null || true
```

If a canonical pack already exists, stop and report the current app slug plus the pack root. Do not create a second pack unless the user explicitly asks for one.

---

## Questions

Ask these in order. Keep them short.

### 1. App name
Required. This becomes the pack slug and manifest identity.

### 2. Product intent
Ask for a 1-2 sentence explanation of what the app is trying to do.

### 3. Import or fresh start
Ask whether to:
- start fresh
- import a pack from another project

If importing, ask for the source path.

---

## Decision rule for docs

- If the user only gives a name, initialize the pack and stop there.
- If the user gives a clear but still thin purpose statement, initialize the pack and direct them to `/office-hours`.
- Only seed `docs/PRODUCT.md` during init if the user has already provided enough concrete product context that the initial document would be truthful rather than placeholder-heavy.
- Do not create `docs/DESIGN.md` from product or strategy conversations. `DESIGN.md` is reserved for final visual identity: color system, typography, brand language, and component look-and-feel.

When in doubt: **do not create any doc yet**.

---

## Create the pack

The CLI bootstrap already renders the branded terminal splash. Do not suppress it unless the user explicitly asks for a quiet init.

Fresh start:

```bash
bin/istack init \
  --app-name "[App Name]" \
  --purpose "[Short product intent]"
```

Import an existing pack by copy:

```bash
bin/istack init \
  --app-name "[App Name]" \
  --purpose "[Short product intent]" \
  --import "[/absolute/path/to/existing/pack]"
```

If the user clearly provided enough product context, add `--create-product-doc`.

---

## Verify

```bash
eval "$(bin/istack resolve env)"

echo "Pack root: $ISTACK_PACK_ROOT"
find "$ISTACK_PACK_ROOT" -maxdepth 3 -type f | sort
cat "$ISTACK_MANIFEST_FILE"
cat "$ISTACK_CONFIG_FILE"
cat "$ISTACK_REPO_CONTEXT_FILE"
[ -f "$ISTACK_SECRETS_ENV_FILE" ] && cat "$ISTACK_SECRETS_ENV_FILE"
```

Confirm:
- nothing was created in `~/.istack`
- `CLAUDE.md` now contains the managed iStack block for this repo
- `history/actions.jsonl` exists
- `state/generated-files.json` exists
- `state/secrets.env` exists and is also reachable at project-root `.env.istack`
- `manifest.json` contains the app bible fields (`features`, `targets`, `marketing_axes`, etc.)
- `manifest.json` also contains the credential inventory fields (`integrations`, `required_env_vars`, `credential_policy`)

---

## Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INIT — [App Name]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PACK ROOT: [path]
APP SLUG:  [slug]
MODE:      [fresh / imported]

CREATED:
  · manifest.json
  · state/secrets.env
  · state/config.json
  · state/review-status.json
  · history/actions.jsonl
  · project-local CLAUDE.md block

PRODUCT DOC:
  · Seeded at [path]
  or
  · Not created yet — needs /office-hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ready for: /office-hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
