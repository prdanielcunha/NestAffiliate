#!/usr/bin/env bash
# Run only on disposable GitHub Ubuntu runners before Playwright dependencies.
# Keep Ubuntu's signing keys, suites, components and verification unchanged.
set -euo pipefail
for source in /etc/apt/sources.list /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list; do
  if [ -f "$source" ]; then
    sudo sed -i -E 's#https?://azure\.archive\.ubuntu\.com/ubuntu#https://archive.ubuntu.com/ubuntu#g' "$source"
  fi
done
printf '%s\n' 'Acquire::Retries "2";' 'Acquire::http::Timeout "30";' 'Acquire::https::Timeout "30";' |
  sudo tee /etc/apt/apt.conf.d/80nestaffiliate-network >/dev/null
