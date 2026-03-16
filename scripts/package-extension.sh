#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$ROOT_DIR/extension"
RELEASE_DIR="$ROOT_DIR/releases"
VERSION="$(awk -F '"' '/"version"/ { print $4; exit }' "$EXT_DIR/manifest.json")"
OUT_ZIP="$RELEASE_DIR/threadsweeper-extension-v${VERSION}.zip"
STAGE_DIR="$RELEASE_DIR/threadsweeper-extension"

rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
cp "$EXT_DIR"/* "$STAGE_DIR"/

rm -f "$OUT_ZIP"
(
  cd "$RELEASE_DIR"
  zip -r "$(basename "$OUT_ZIP")" "threadsweeper-extension" -x '*.DS_Store'
)

echo "Created: $OUT_ZIP"
