#!/bin/bash
# App Store Screenshot Automation Script
# Usage: ./scripts/take-screenshots.sh
#
# Prerequisites:
#   1. Run the app in iOS Simulator first: npx expo start --ios
#   2. Make sure the simulator is running with the correct device
#
# This script captures screenshots from the running iOS Simulator
# and saves them to the ./screenshots directory.

set -e

SCREENSHOT_DIR="./screenshots"
mkdir -p "$SCREENSHOT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=== FitTrack AI Screenshot Capture ==="
echo ""
echo "This script will capture a screenshot of the CURRENT simulator screen."
echo "Navigate to each screen manually, then run this script for each one."
echo ""
echo "Screens to capture (in dark mode):"
echo "  1. Onboarding - First slide"
echo "  2. Dashboard - With stats and streak"
echo "  3. Log Workout - Form with exercise selected"
echo "  4. AI Plan - Generated 7-day plan"
echo "  5. Progress - Charts with data"
echo "  6. Profile - User profile"
echo ""

# Get the booted simulator device
DEVICE_ID=$(xcrun simctl list devices booted -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    for d in devices:
        if d['state'] == 'Booted':
            print(d['udid'])
            sys.exit(0)
print('')
" 2>/dev/null)

if [ -z "$DEVICE_ID" ]; then
    echo "Error: No booted iOS Simulator found."
    echo "Start the simulator first: npx expo start --ios"
    exit 1
fi

echo "Found booted simulator: $DEVICE_ID"
echo ""

read -p "Enter screen name (e.g., dashboard, workout, ai-plan, progress, profile, onboarding): " SCREEN_NAME

if [ -z "$SCREEN_NAME" ]; then
    echo "No screen name provided. Exiting."
    exit 1
fi

FILENAME="${SCREENSHOT_DIR}/${SCREEN_NAME}_${TIMESTAMP}.png"
xcrun simctl io "$DEVICE_ID" screenshot "$FILENAME"

echo ""
echo "Screenshot saved to: $FILENAME"
echo ""
echo "After capturing all 6 screens, your screenshots will be in: $SCREENSHOT_DIR/"
echo ""
echo "For App Store submission, you need screenshots for:"
echo "  - iPhone 6.7\" (iPhone 15 Pro Max / 16 Pro Max)"
echo "  - iPhone 6.1\" (iPhone 15 Pro / 16 Pro)"
echo ""
echo "Tip: Run the simulator with different device sizes to get both sets."
