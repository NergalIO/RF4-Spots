#!/usr/bin/env bash
# Проверяет git и пересобирает API / Windows-клиент.
# Клиент на Linux собирается через Docker-образ с Wine (NSIS .exe).
#
#   ./scripts/update-server.sh
#   ./scripts/update-server.sh --watch
#   ./scripts/update-server.sh --force
#   ./scripts/update-server.sh --no-client
#   ./scripts/update-server.sh --client
set -euo pipefail

INTERVAL="${INTERVAL:-60}"
WINE_IMAGE="${ELECTRON_BUILDER_IMAGE:-electronuserland/builder:wine}"
WATCH=0
FORCE=0
RESET=0
DO_CLIENT="${BUILD_CLIENT:-1}"
FORCE_CLIENT=0

for arg in "$@"; do
  case "$arg" in
    --watch) WATCH=1 ;;
    --force) FORCE=1 ;;
    --reset) RESET=1 ;;
    --no-client) DO_CLIENT=0 ;;
    --client) FORCE_CLIENT=1 ;;
    -h|--help)
      echo "Usage: $0 [--watch] [--force] [--reset] [--client] [--no-client]"
      echo "  --watch     каждые ${INTERVAL} с (INTERVAL=сек)"
      echo "  --force     пересобрать API даже без изменений"
      echo "  --client    пересобрать Windows-exe даже без изменений клиента"
      echo "  --no-client не трогать клиент"
      echo "  --reset     git reset --hard к origin"
      echo "Сборка клиента: Docker-образ ${WINE_IMAGE} (нужно ~4 ГБ RAM, первый раз долго)."
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
  done
  if [[ -d "$ROOT/client/release/win-unpacked" ]]; then
    rm -rf "$ROOT/client/release/win-unpacked"
    echo "$(LOG_PREFIX) удалена client/release/win-unpacked"
  fi
}

pack_client() {
  echo "$(LOG_PREFIX) клиент: сборка Windows-установщика через ${WINE_IMAGE}"
  if ! docker info >/dev/null 2>&1; then
    echo "$(LOG_PREFIX) docker недоступен, клиент пропущен" >&2
    return 1
  fi
  local vite_url="${VITE_SERVER_URL:-}"
  if [[ -z "$vite_url" && -f "$ROOT/.env" ]]; then
    local domain
    domain="$(grep -E '^DOMAIN=' "$ROOT/.env" | tail -1 | cut -d= -f2- | tr -d '\"' | tr -d "'" | tr -d ' ')"
    if [[ -n "$domain" && "$domain" != "localhost" ]]; then
      vite_url="https://${domain}"
    fi
  fi
  docker run --rm \
    -e CSC_IDENTITY_AUTO_DISCOVERY=false \
    -e PACK_ON_SERVER=1 \
    -e "VITE_SERVER_URL=${vite_url}" \
    -v "$ROOT":/project \
    -v rf4spots-electron-cache:/root/.cache/electron \
    -v rf4spots-electron-builder-cache:/root/.cache/electron-builder \
    -w /project/client \
    "$WINE_IMAGE" \
    bash -lc 'npm ci && node scripts/pack-win.cjs'
  cleanup_old_installers
  echo "$(LOG_PREFIX) клиент: файлы в server/updates (отдаются как /updates)"
}

once() {
  git_update || true

  local api_now client_now
  api_now="$(fingerprint_api)"
  client_now="$(fingerprint_client)"

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
    if pack_client; then
      echo "$client_now" >"$STAMP_CLIENT"
    else
      echo "$(LOG_PREFIX) сборка клиента не удалась, повтор при следующем запуске" >&2
      return 1
    fi
  else
    echo "$(LOG_PREFIX) клиент без изменений"
  fi
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
