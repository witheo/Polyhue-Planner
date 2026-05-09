# Dot-source from other scripts. On macOS, fills CURSOR_API_KEY from Keychain when unset
# and AI is enabled. Override with POLYHUE_CURSOR_KEYCHAIN_SERVICE / POLYHUE_KEYCHAIN_ACCOUNT.
if [ "$(uname -s)" = "Darwin" ] && [ -z "${CURSOR_API_KEY:-}" ] && [ "${BRAIN_DUMP_AI:-}" != "0" ]; then
  _polyhue_kcs="${POLYHUE_CURSOR_KEYCHAIN_SERVICE:-PolyhuePlanner-CURSOR_API_KEY}"
  _polyhue_kca="${POLYHUE_KEYCHAIN_ACCOUNT:-$USER}"
  _polyhue_k="$(security find-generic-password -a "$_polyhue_kca" -s "$_polyhue_kcs" -w 2>/dev/null)" &&
    export CURSOR_API_KEY="$_polyhue_k"
  unset _polyhue_kcs _polyhue_kca _polyhue_k
fi
