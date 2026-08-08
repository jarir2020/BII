#!/usr/bin/env bash
# Run once with sudo, then log out and back in.
set -Eeuo pipefail
if [[ "${EUID}" -ne 0 ]]; then
  echo "Usage: sudo bash fix-kvm-group.sh"; exit 1
fi
usermod -aG kvm "${SUDO_USER:-$USER}"
echo "Done. Log out and back in, then run: bash run-apk-emulator.sh"
