#!/usr/bin/env bash
set -euo pipefail

echo "==> Glowmint setup for Linux Mint"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Please run with sudo: sudo ./scripts/setup-mint.sh"
  exit 1
fi

apt-get update
apt-get install -y liquidctl ckb-next curl ca-certificates
if ! command -v openrgb >/dev/null 2>&1; then
  if apt-cache show openrgb >/dev/null 2>&1; then
    apt-get install -y openrgb || true
  fi
fi
if ! command -v openrgb >/dev/null 2>&1; then
  DEB="/tmp/glowmint-openrgb.deb"
  curl -fsSL -o "$DEB" "https://codeberg.org/OpenRGB/OpenRGB/releases/download/release_candidate_1.0rc2/openrgb_1.0rc2_amd64_bookworm_0fca93e.deb"
  dpkg -i "$DEB" || apt-get install -f -y
  rm -f "$DEB"
fi
apt-get install -y libhidapi-dev pkg-config

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

install -m 0644 "${REPO_ROOT}/src-tauri/udev/99-glowmint-corsair.rules" \
  /etc/udev/rules.d/99-glowmint-corsair.rules
udevadm control --reload-rules
udevadm trigger

REAL_USER="${SUDO_USER:-$USER}"
USER_HOME="$(getent passwd "$REAL_USER" | cut -d: -f6)"

mkdir -p "${USER_HOME}/.config/systemd/user"
cat > "${USER_HOME}/.config/systemd/user/glowmint.service" <<EOF
[Unit]
Description=Glowmint Corsair control
After=graphical-session.target

[Service]
ExecStart=${REPO_ROOT}/src-tauri/target/release/glowmint
Restart=on-failure

[Install]
WantedBy=default.target
EOF

chown -R "${REAL_USER}:${REAL_USER}" "${USER_HOME}/.config/systemd/user/glowmint.service"

sudo -u "${REAL_USER}" systemctl --user daemon-reload || true

echo "==> Done"
echo "Enable autostart (optional): systemctl --user enable glowmint.service"
echo "Start OpenRGB SDK server: openrgb --startminimized --server"
echo "Enable ckb-next: sudo systemctl enable --now ckb-next-daemon"
