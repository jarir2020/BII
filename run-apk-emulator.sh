#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_HOME

SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
AVDMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager"
EMULATOR="$ANDROID_HOME/emulator/emulator"
ADB="$ANDROID_HOME/platform-tools/adb"
APK="$SCRIPT_DIR/zip-repl-1zip/Frontend/android/app/build/outputs/apk/debug/app-debug.apk"

# ── preflight ──────────────────────────────────────────────────────────
if [[ ! -x "$SDKMANAGER" ]]; then
  echo "sdkmanager not found at $SDKMANAGER" >&2; exit 1
fi

if [[ ! -f "$APK" ]]; then
  echo "APK not found at $APK" >&2
  echo "Build it first: bash build-android-debug.sh" >&2; exit 1
fi

# ── KVM group ──────────────────────────────────────────────────────────
if ! id -nG 2>/dev/null | tr ' ' '\n' | grep -qx kvm; then
  echo "You are not in the 'kvm' group. Run this once with sudo:" >&2
  echo "  sudo usermod -aG kvm $USER" >&2
  echo "Then log out and back in, and re-run this script." >&2
  exit 1
fi

# ── accept licenses ────────────────────────────────────────────────────
yes | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true

# ── install emulator + system image (if missing) ──────────────────────
if [[ ! -x "$EMULATOR" ]]; then
  echo "Installing Android Emulator..."
  "$SDKMANAGER" "emulator"
fi

SYSIMG="system-images;android-35;google_apis;x86_64"
if [[ ! -d "$ANDROID_HOME/system-images/android-35/google_apis/x86_64" ]]; then
  echo "Installing system image (~1 GB download)..."
  "$SDKMANAGER" "$SYSIMG"
fi

# ── create AVD if missing ─────────────────────────────────────────────
AVD_NAME="bengali-test"
if ! "$AVDMANAGER" list avd 2>/dev/null | grep -q "^Name: $AVD_NAME$"; then
  echo "Creating AVD '$AVD_NAME'..."
  echo "no" | "$AVDMANAGER" create avd --force \
    --name "$AVD_NAME" \
    --package "$SYSIMG" \
    --device "pixel_2"
fi

# ── launch emulator ───────────────────────────────────────────────────
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

if ! "$ADB" get-state >/dev/null 2>&1; then
  echo "Starting emulator (low-RAM mode)..."
  nohup "$EMULATOR" \
    -avd "$AVD_NAME" \
    -no-audio \
    -no-snapshot \
    -no-boot-anim \
    -no-window \
    -gpu swiftshader_indirect \
    -memory 1024 \
    -partition-size 2048 \
    >/tmp/emulator.log 2>&1 &
  echo "Waiting for emulator to boot..."
fi

"$ADB" wait-for-device
echo -n "Booting"
until [[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; do
  echo -n "."
  sleep 3
done
echo " ready."

# ── install APK ────────────────────────────────────────────────────────
echo "Installing APK..."
"$ADB" install -r "$APK"

# ── launch app ─────────────────────────────────────────────────────────
echo "Launching Bengali Islamic Institute..."
"$ADB" shell monkey -p com.bengaliislamic.institute 1 >/dev/null

echo
echo "Done! The app is running in the emulator."
echo "Emulator log: /tmp/emulator.log"
echo "To stop:  $ADB emu kill"
