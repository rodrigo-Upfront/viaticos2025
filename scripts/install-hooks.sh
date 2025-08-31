#!/usr/bin/env bash
set -euo pipefail

HOOKS_DIR=".git/hooks"
mkdir -p "$HOOKS_DIR"

cat > "$HOOKS_DIR/pre-commit" <<'HOOK'
#!/usr/bin/env bash
set -e

echo "Running frontend validation before commit..."
(cd frontend && npm run validate)
HOOK

chmod +x "$HOOKS_DIR/pre-commit"

# Pre-push hook to validate before pushing changes
cat > "$HOOKS_DIR/pre-push" <<'HOOK'
#!/usr/bin/env bash
set -e

echo "Running frontend validation before push..."
(cd frontend && npm run validate)
HOOK

chmod +x "$HOOKS_DIR/pre-push"

echo "Git hooks installed: pre-commit, pre-push."

