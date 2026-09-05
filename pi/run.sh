#!/bin/sh
# 自宅Raspberry Pi用cron実行スクリプト。実行のたびにリポジトリを最新化してから
# fetch-transcripts.jsを実行する（コード更新の自動反映）。crontabにはこのスクリプトの
# パスのみを登録し、秘密情報はpi/.env（.gitignore済み）に置く。
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_DIR"

# リポジトリの既定ブランチ設定やローカルのチェックアウト状態（ブランチ名・追跡設定）に
# 依存せず、常にorigin/mainを明示的に対象としてfetch・fast-forwardする。デプロイ専用
# チェックアウトである前提のため、ローカル変更とのマージが必要になる状況
# （fast-forwardできない）は失敗として扱い、警告を出しつつ既存のコードで実行を続行する。
# ネットワーク不通等でgit fetch自体に失敗した場合も同様に扱う（更新できないことを理由に
# 定期実行を止めない）。
if ! { git fetch origin main && git merge --ff-only origin/main; } >/tmp/youtube-radar-pi-git-pull.log 2>&1; then
  echo "警告: origin/mainへの更新（fetch/merge --ff-only）に失敗しました。既存のコードで実行を続行します" >&2
  cat /tmp/youtube-radar-pi-git-pull.log >&2
fi

if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$SCRIPT_DIR/.env"
  set +a
fi

exec node "$SCRIPT_DIR/fetch-transcripts.js"
