#!/usr/bin/env bash
# Проверяет git и пересобирает API, Windows-клиент и Android APK.
# На Linux: Windows — Docker-образ с Wine (NSIS .exe), APK — образ с Android SDK.
#
#   ./scripts/update-server.sh
#   ./scripts/update-server.sh --watch
#   ./scripts/update-server.sh --force
#   ./scripts/update-server.sh --no-client
#   ./scripts/update-server.sh --client
#   ./scripts/update-server.sh --apk
#   ./scripts/update-server.sh --no-apk
set -euo pipefail

INTERVAL="${INTERVAL:-60}"
WINE_IMAGE="${ELECTRON_BUILDER_IMAGE:-electronuserland/builder:wine}"
ANDROID_IMAGE="${ANDROID_BUILD_IMAGE:-reactnativecommunity/react-native-android}"
WATCH=0
FORCE=0
RESET=0
DO_CLIENT="${BUILD_CLIENT:-1}"
DO_APK="${BUILD_APK:-1}"
FORCE_CLIENT=0
FORCE_APK=0

for arg in "$@"; do
  case "$arg" in
    --watch) WATCH=1 ;;
    --force) FORCE=1 ;;
    --reset) RESET=1 ;;
    --no-client) DO_CLIENT=0 ;;
    --client) FORCE_CLIENT=1 ;;
    --no-apk) DO_APK=0 ;;
    --apk) FORCE_APK=1 ;;
    -h|--help)
      echo "Usage: $0 [--watch] [--force] [--reset] [--client] [--no-client] [--apk] [--no-apk]"
      echo "  --watch     каждые ${INTERVAL} с (INTERVAL=сек)"
      echo "  --force     пересобрать API и клиент даже без изменений"
      echo "  --client    пересобрать Windows и APK даже без изменений клиента"
      echo "  --no-client не трогать Windows и APK"
      echo "  --apk       пересобрать только APK даже без изменений"
      echo "  --no-apk    не собирать APK"
      echo "  --reset     git reset --hard к origin"
      echo "Windows: Docker ${WINE_IMAGE} (нужно ~4 ГБ RAM, первый раз долго)."
      echo "APK:     Docker ${ANDROID_IMAGE} (первый раз качает образ SDK)."
      echo "Отключить APK: BUILD_APK=0 или --no-apk."
      exit 0
      ;;
    *)
      echo "Неизвестный аргумент: $arg" >&2
      exit 1
      ;;
  esac
done

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOCK="$ROOT/.update.lock"
STAMP_API="$ROOT/.update-stamp"
STAMP_CLIENT="$ROOT/.update-stamp-client"
STAMP_APK="$ROOT/.update-stamp-apk"
LOG_PREFIX() { echo "[$(date -Iseconds)]"; }

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(LOG_PREFIX) уже выполняется, выход"
  exit 0
fi

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

hash_files() {
  sha256sum "$@" 2>/dev/null || true
}

fingerprint_api() {
  (
    cd "$ROOT"
    hash_files docker-compose.yml server/Dockerfile server/package.json
    find server/src server/prisma -type f \
      ! -path '*/node_modules/*' \
      ! -name '*.png' \
      2>/dev/null | sort | xargs -r sha256sum
  ) | sha256sum | awk '{print $1}'
}

fingerprint_client() {
  (
    cd "$ROOT"
    hash_files client/package.json client/package-lock.json client/tsconfig.json \
      client/vite.config.ts client/index.html client/scripts/pack-win.cjs
    find client/src client/electron -type f \
      ! -path '*/node_modules/*' \
      2>/dev/null | sort | xargs -r sha256sum
  ) | sha256sum | awk '{print $1}'
}

fingerprint_apk() {
  (
    cd "$ROOT"
    hash_files client/package.json client/package-lock.json client/tsconfig.json \
      client/vite.config.ts client/index.html client/scripts/pack-apk.cjs
    find client/src client/android -type f \
      ! -path '*/node_modules/*' \
      ! -path '*/build/*' \
      ! -path '*/.gradle/*' \
      ! -path '*/assets/*' \
      ! -name 'local.properties' \
      ! -name '*.keystore' \
      2>/dev/null | sort | xargs -r sha256sum
  ) | sha256sum | awk '{print $1}'
}

changed() {
  local now="$1" stamp="$2"
  local old=""
  if [[ -f "$stamp" ]]; then
    old="$(cat "$stamp")"
  fi
  [[ "$now" != "$old" ]]
}

git_update() {
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "$(LOG_PREFIX) не git-репозиторий, пропускаю pull"
    return 1
  fi
  git fetch --quiet origin || {
    echo "$(LOG_PREFIX) git fetch не удался" >&2
    return 1
  }
  local branch remote local_rev remote_rev
  branch="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$branch" == "HEAD" ]]; then
    branch="main"
  fi
  remote="origin/$branch"
  if ! git rev-parse --verify "$remote" >/dev/null 2>&1; then
    remote="origin/main"
  fi
  local_rev="$(git rev-parse HEAD)"
  remote_rev="$(git rev-parse "$remote")"
  if [[ "$local_rev" == "$remote_rev" ]]; then
    return 1
  fi
  echo "$(LOG_PREFIX) git: $local_rev → $remote_rev"
  if [[ "$RESET" == 1 ]]; then
    git reset --hard "$remote"
  else
    git merge --ff-only "$remote"
  fi
}

rebuild_api() {
  echo "$(LOG_PREFIX) docker: сборка и перезапуск api"
  compose up -d db
  compose build api
  compose up -d --force-recreate --no-deps api
  echo "$(LOG_PREFIX) api готово"
}

client_vite_url() {
  local vite_url="${VITE_SERVER_URL:-}"
  if [[ -z "$vite_url" && -f "$ROOT/.env" ]]; then
    local domain
    domain="$(grep -E '^DOMAIN=' "$ROOT/.env" | tail -1 | cut -d= -f2- | tr -d '\"' | tr -d "'" | tr -d ' ')"
    if [[ -n "$domain" && "$domain" != "localhost" ]]; then
      vite_url="https://${domain}"
    fi
  fi
  printf '%s' "$vite_url"
}

cleanup_old_installers() {
  local version dir f base
  local -a artifacts
  version="$(cd "$ROOT/client" && node -p "require('./package.json').version" 2>/dev/null || true)"
  if [[ -z "$version" ]]; then
    echo "$(LOG_PREFIX) не удалось прочитать версию клиента, старые установщики не чищу" >&2
    return 0
  fi
  for dir in "$ROOT/server/updates" "$ROOT/client/release"; do
    [[ -d "$dir" ]] || continue
    artifacts=()
    shopt -s nullglob
    artifacts=("$dir"/RF4Spots-Setup-*)
    shopt -u nullglob
    for f in "${artifacts[@]}"; do
      base="$(basename "$f")"
      if [[ "$base" == "RF4Spots-Setup-${version}.exe" || "$base" == "RF4Spots-Setup-${version}.exe.blockmap" ]]; then
        continue
      fi
      rm -f "$f"
      echo "$(LOG_PREFIX) удалено ${f#"$ROOT/"}"
    done
    artifacts=()
    shopt -s nullglob
    artifacts=("$dir"/RF4Spots-*.apk)
    shopt -u nullglob
    for f in "${artifacts[@]}"; do
      base="$(basename "$f")"
      if [[ "$base" == "RF4Spots-${version}.apk" ]]; then
        continue
      fi
      rm -f "$f"
      echo "$(LOG_PREFIX) удалено ${f#"$ROOT/"}"
    done
  done
  if [[ -d "$ROOT/client/release/win-unpacked" ]]; then
    rm -rf "$ROOT/client/release/win-unpacked"
    echo "$(LOG_PREFIX) удалена client/release/win-unpacked"
  fi
}

pack_win() {
  echo "$(LOG_PREFIX) клиент: сборка Windows-установщика через ${WINE_IMAGE}"
  if ! docker info >/dev/null 2>&1; then
    echo "$(LOG_PREFIX) docker недоступен, Windows-клиент пропущен" >&2
    return 1
  fi
  local vite_url
  vite_url="$(client_vite_url)"
  docker run --rm \
    -e CSC_IDENTITY_AUTO_DISCOVERY=false \
    -e PACK_ON_SERVER=1 \
    -e "VITE_SERVER_URL=${vite_url}" \
    -e VITE_ALLOWED_SERVERS="${VITE_ALLOWED_SERVERS:-}" \
    -v "$ROOT":/project \
    -v rf4spots-electron-cache:/root/.cache/electron \
    -v rf4spots-electron-builder-cache:/root/.cache/electron-builder \
    -w /project/client \
    "$WINE_IMAGE" \
    bash -lc 'npm ci && node scripts/pack-win.cjs' || return 1
  local version
  version="$(cd "$ROOT/client" && node -p "require('./package.json').version" 2>/dev/null || true)"
  if [[ -n "$version" && ! -f "$ROOT/server/updates/RF4Spots-Setup-${version}.exe" ]]; then
    echo "$(LOG_PREFIX) Windows-установщик не появился в server/updates" >&2
    return 1
  fi
  cleanup_old_installers
  echo "$(LOG_PREFIX) Windows: файлы в server/updates (отдаются как /updates/installer)"
}

pack_apk() {
  echo "$(LOG_PREFIX) клиент: сборка APK через ${ANDROID_IMAGE}"
  if ! docker info >/dev/null 2>&1; then
    echo "$(LOG_PREFIX) docker недоступен, APK пропущен" >&2
    return 1
  fi
  local vite_url
  vite_url="$(client_vite_url)"
  docker run --rm \
    -e PACK_ON_SERVER=1 \
    -e "VITE_SERVER_URL=${vite_url}" \
    -e VITE_ALLOWED_SERVERS="${VITE_ALLOWED_SERVERS:-}" \
    -e TMPDIR=/root/.gradle/tmp \
    -v "$ROOT":/project \
    -v rf4spots-gradle-cache:/root/.gradle \
    -w /project/client \
    "$ANDROID_IMAGE" \
    bash -lc 'mkdir -p /root/.gradle/tmp; yes | sdkmanager --licenses >/dev/null 2>&1 || true; npm ci && node scripts/pack-apk.cjs' || return 1
  local version
  version="$(cd "$ROOT/client" && node -p "require('./package.json').version" 2>/dev/null || true)"
  if [[ -z "$version" || ! -f "$ROOT/server/updates/RF4Spots-${version}.apk" ]]; then
    echo "$(LOG_PREFIX) APK не появился в server/updates" >&2
    return 1
  fi
  cleanup_old_installers
  echo "$(LOG_PREFIX) APK: файл в server/updates (отдаётся как /updates/apk)"
}

once() {
  git_update || true

  local api_now client_now apk_now failed=0
  api_now="$(fingerprint_api)"
  client_now="$(fingerprint_client)"
  apk_now="$(fingerprint_apk)"

  if [[ "$FORCE" == 1 ]] || changed "$api_now" "$STAMP_API"; then
    rebuild_api
    echo "$api_now" >"$STAMP_API"
  else
    echo "$(LOG_PREFIX) api без изменений"
  fi

  if [[ "$DO_CLIENT" != 1 ]]; then
    echo "$(LOG_PREFIX) сборка клиента отключена"
    return 0
  fi

  if [[ "$FORCE" == 1 || "$FORCE_CLIENT" == 1 ]] || changed "$client_now" "$STAMP_CLIENT"; then
    if pack_win; then
      echo "$client_now" >"$STAMP_CLIENT"
    else
      echo "$(LOG_PREFIX) сборка Windows-клиента не удалась, повтор при следующем запуске" >&2
      failed=1
    fi
  else
    echo "$(LOG_PREFIX) Windows-клиент без изменений"
  fi

  if [[ "$DO_APK" != 1 ]]; then
    echo "$(LOG_PREFIX) сборка APK отключена"
  elif [[ "$FORCE" == 1 || "$FORCE_CLIENT" == 1 || "$FORCE_APK" == 1 ]] || changed "$apk_now" "$STAMP_APK"; then
    if pack_apk; then
      echo "$apk_now" >"$STAMP_APK"
    else
      echo "$(LOG_PREFIX) сборка APK не удалась, повтор при следующем запуске" >&2
      failed=1
    fi
  else
    echo "$(LOG_PREFIX) APK без изменений"
  fi

  return "$failed"
}

if [[ "$WATCH" == 1 ]]; then
  echo "$(LOG_PREFIX) слежение каждые ${INTERVAL} с  ($ROOT)"
  while true; do
    once || echo "$(LOG_PREFIX) ошибка обновления, повтор через ${INTERVAL} с" >&2
    sleep "$INTERVAL"
  done
else
  once
fi
