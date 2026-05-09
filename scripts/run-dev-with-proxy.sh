#!/usr/bin/env sh
set -e
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
. "$ROOT/scripts/load-cursor-api-key-from-keychain.sh"
exec concurrently -n vite,proxy -c cyan,magenta "vite" "node scripts/brain-dump-proxy.mjs"
