#!/usr/bin/env bash
# iStack CLI installer
# Usage: curl -fsSL https://istack.dev/install | bash
set -euo pipefail

RELEASES_URL="https://github.com/1-rie/istack-cli/releases"
BIN_DIR="${ISTACK_BIN_DIR:-/usr/local/bin}"
VERSION="${ISTACK_VERSION:-latest}"

# ── Colors ───────────────────────────────────────────────────────────────────
CYAN='\033[0;36m' BOLD='\033[1m' DIM='\033[2m' RED='\033[0;31m' GREEN='\033[0;32m' NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}  ╔═══════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}  ║  iStack CLI — Installer           ║${NC}"
echo -e "${CYAN}${BOLD}  ╚═══════════════════════════════════╝${NC}"
echo ""

# ── Detect platform ───────────────────────────────────────────────────────────
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64)          ARCH_SLUG="x64" ;;
  arm64|aarch64)   ARCH_SLUG="arm64" ;;
  *) echo -e "${RED}  Unsupported architecture: $ARCH${NC}" && exit 1 ;;
esac

case "$OS" in
  darwin)  PLATFORM="macos-$ARCH_SLUG" ;;
  linux)   PLATFORM="linux-$ARCH_SLUG" ;;
  *) echo -e "${RED}  Unsupported OS: $OS${NC}" && exit 1 ;;
esac

echo -e "${DIM}  Platform: $PLATFORM${NC}"

# ── Resolve version ───────────────────────────────────────────────────────────
if [ "$VERSION" = "latest" ]; then
  echo -e "${DIM}  Resolving latest version...${NC}"
  VERSION=$(curl -fsSL "https://api.github.com/repos/1-rie/istack-cli/releases/latest" \
    | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/' || echo "")
  if [ -z "$VERSION" ]; then
    echo -e "${RED}  Could not resolve latest version${NC}" && exit 1
  fi
fi

echo -e "${DIM}  Version: v$VERSION${NC}"
echo ""

# ── Download ──────────────────────────────────────────────────────────────────
BINARY_NAME="istack-$PLATFORM"
DOWNLOAD_URL="$RELEASES_URL/download/v$VERSION/$BINARY_NAME"
CHECKSUM_URL="$RELEASES_URL/download/v$VERSION/$BINARY_NAME.sha256"

TMP_FILE=$(mktemp)
TMP_CHECKSUM=$(mktemp)

echo -e "${DIM}  Downloading iStack CLI...${NC}"

if command -v curl &>/dev/null; then
  curl -fL --progress-bar "$DOWNLOAD_URL" -o "$TMP_FILE"
  curl -fsSL "$CHECKSUM_URL" -o "$TMP_CHECKSUM" 2>/dev/null || true
elif command -v wget &>/dev/null; then
  wget --show-progress -q "$DOWNLOAD_URL" -O "$TMP_FILE"
  wget -q "$CHECKSUM_URL" -O "$TMP_CHECKSUM" 2>/dev/null || true
else
  echo -e "${RED}  curl or wget required${NC}" && exit 1
fi

# ── Verify checksum ───────────────────────────────────────────────────────────
if [ -s "$TMP_CHECKSUM" ]; then
  EXPECTED=$(awk '{print $1}' "$TMP_CHECKSUM")
  if command -v sha256sum &>/dev/null; then
    ACTUAL=$(sha256sum "$TMP_FILE" | awk '{print $1}')
  else
    ACTUAL=$(shasum -a 256 "$TMP_FILE" | awk '{print $1}')
  fi

  if [ "$EXPECTED" != "$ACTUAL" ]; then
    echo -e "${RED}  Checksum mismatch — download may be corrupted${NC}"
    rm -f "$TMP_FILE" "$TMP_CHECKSUM"
    exit 1
  fi
  echo -e "${GREEN}  ✓ Checksum verified${NC}"
else
  echo -e "${DIM}  (checksum not available — skipping verification)${NC}"
fi

rm -f "$TMP_CHECKSUM"

# ── Install ───────────────────────────────────────────────────────────────────
chmod +x "$TMP_FILE"

if [ -w "$BIN_DIR" ]; then
  mv "$TMP_FILE" "$BIN_DIR/istack"
else
  echo -e "${DIM}  Installing to $BIN_DIR (sudo required)...${NC}"
  sudo mv "$TMP_FILE" "$BIN_DIR/istack"
fi

# ── iStack skills PATH setup ──────────────────────────────────────────────────
SKILLS_DIR="$HOME/.claude/skills/istack"

case "$(basename "${SHELL:-bash}")" in
  zsh)  SHELL_PROFILE="$HOME/.zshrc" ;;
  bash) [ "$(uname -s)" = "Darwin" ] && SHELL_PROFILE="$HOME/.bash_profile" || SHELL_PROFILE="$HOME/.bashrc" ;;
  *)    SHELL_PROFILE="$HOME/.profile" ;;
esac

PATH_LINE='export PATH="$HOME/.claude/skills/istack/bin:$PATH"'

if [ -d "$SKILLS_DIR" ]; then
  if ! grep -q 'istack/bin' "$SHELL_PROFILE" 2>/dev/null; then
    printf '\n# iStack skills bin (shared by CLI + Claude Code)\n%s\n' "$PATH_LINE" >> "$SHELL_PROFILE"
    echo -e "${GREEN}  ✓ iStack skills detected — added bin to PATH in $(basename "$SHELL_PROFILE")${NC}"
    echo -e "${DIM}    Run: source $SHELL_PROFILE${NC}"
  else
    echo -e "${GREEN}  ✓ iStack skills bin already in PATH${NC}"
  fi
else
  echo -e "${DIM}  Tip: clone the skills for Claude Code standalone mode:${NC}"
  echo -e "    ${CYAN}git clone https://github.com/1-rie/istack.git ~/.claude/skills/istack${NC}"
  echo -e "  ${DIM}Then add to $SHELL_PROFILE:${NC}"
  echo -e "    ${CYAN}$PATH_LINE${NC}"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  ✓ iStack CLI v$VERSION installed${NC}"
echo ""
echo -e "${DIM}  To get started:${NC}"
echo -e "    ${CYAN}istack login${NC}      — configure your API key + license"
echo -e "    ${CYAN}istack${NC}            — start the interactive REPL"
echo -e "    ${CYAN}istack run review${NC} — run a skill non-interactively"
echo ""
echo -e "${DIM}  Docs: https://istack.dev/docs${NC}"
echo ""
