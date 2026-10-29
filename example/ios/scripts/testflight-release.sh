#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="$ROOT/build/MeheryEventSenderExample.xcarchive"
EXPORT_DIR="$ROOT/build/export"
EXPORT_OPTIONS="$ROOT/ExportOptionsUpload.plist"

echo "[testflight] Archiving Release build (1.1.3 / build from Xcode settings)…"
xcodebuild \
  -workspace "$ROOT/MeheryEventSenderExample.xcworkspace" \
  -scheme MeheryEventSenderExample \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  DEVELOPMENT_TEAM=6CRFUK7DVC \
  -allowProvisioningUpdates

echo "[testflight] Exporting and uploading to App Store Connect…"
rm -rf "$EXPORT_DIR"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates

echo "[testflight] Upload submitted. Check App Store Connect → TestFlight for processing."
