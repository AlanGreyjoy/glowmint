#!/usr/bin/env bash
set -euo pipefail

echo "==> Glowmint setup for Linux Mint"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Please run with sudo: sudo ./scripts/setup-mint.sh"
  exit 1
fi

apt-get update
apt-get install -y openrgb liquidctl ckb-next libhidapi-dev pkg-config

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
