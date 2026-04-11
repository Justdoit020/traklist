#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="TrackList.app"
DIST_DIR="$PROJECT_DIR/dist"
TARGET_APP="$HOME/Applications/$APP_NAME"

cd "$PROJECT_DIR"

if [[ "${OSTYPE:-}" != darwin* ]]; then
  echo "Dit script werkt alleen op macOS."
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
  echo "Geen package.json gevonden in: $PROJECT_DIR"
  echo "Tip: clone eerst de repo opnieuw in een lege map en start daarna dit script."
  exit 1
fi

echo "[1/4] Dependencies controleren..."
npm install

echo "[2/4] macOS build starten..."
ARCH="$(uname -m)"
if [[ "$ARCH" == "arm64" ]]; then
  BUILD_ARCH="arm64"
else
  BUILD_ARCH="x64"
fi

echo "Bouwen voor architectuur: $BUILD_ARCH"
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac dmg zip --$BUILD_ARCH --publish never

echo "[3/4] Nieuwste .dmg zoeken..."
LATEST_DMG="$(ls -t "$DIST_DIR"/*.dmg 2>/dev/null | head -n 1 || true)"

if [[ -z "$LATEST_DMG" ]]; then
  echo "Geen .dmg gevonden in $DIST_DIR"
  exit 1
fi

echo "Gevonden: $LATEST_DMG"

echo "[4/4] App installeren in ~/Applications..."
MOUNT_DIR="$(mktemp -d)"
ATTACH_OUTPUT="$(hdiutil attach "$LATEST_DMG" -nobrowse -mountpoint "$MOUNT_DIR")"

cleanup() {
  hdiutil detach "$MOUNT_DIR" >/dev/null 2>&1 || true
  rm -rf "$MOUNT_DIR"
}
trap cleanup EXIT

if [[ ! -d "$MOUNT_DIR/$APP_NAME" ]]; then
  echo "Kon $APP_NAME niet vinden in gemounte DMG."
  exit 1
fi

mkdir -p "$HOME/Applications"
rm -rf "$TARGET_APP"
cp -R "$MOUNT_DIR/$APP_NAME" "$TARGET_APP"

echo "Klaar: $TARGET_APP"
open "$TARGET_APP"
