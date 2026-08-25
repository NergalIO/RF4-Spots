#!/usr/bin/env bash
# Run on the VPS as root after SSH is key-only.
# Leaves 22/80/443 open; does not publish Postgres or the API port.
set -euo pipefail

if ! command -v ufw >/dev/null 2>&1; then
  echo "Install ufw first (apt install ufw)" >&2
  exit 1
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo
echo "SSH: use a key, disable PasswordAuthentication in /etc/ssh/sshd_config, then restart ssh."
echo "Optional: ufw allow from YOUR.IP to any port 22"
