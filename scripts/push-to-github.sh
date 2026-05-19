#!/usr/bin/env bash
# Run AFTER creating empty public repo vendor-resource-board on GitHub.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="https://github.com/chakn005/vendor-resource-board.git"

if git remote get-url origin &>/dev/null; then
  echo "Remote origin already set:"
  git remote -v
else
  git remote add origin "$REMOTE"
fi

git branch -M main
git push -u origin main

echo ""
echo "Done. Enable Pages: repo Settings → Pages → GitHub Actions"
echo "Leadership:  https://chakn005.github.io/vendor-resource-board/"
echo "Publisher:   https://chakn005.github.io/vendor-resource-board/?publish=1"
