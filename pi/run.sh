#!/bin/sh
# 自宅Raspberry Pi用cron実行スクリプト。実行のたびにリポジトリを最新化してから
# fetch-transcripts.jsを実行する（コード更新の自動反映）。crontabにはこのスクリプトの
# パスのみを登録し、秘密情報はpi/.env（.gitignore済み）に置く。
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_DIR"

# デプロイ専用チェックアウトである前提のため、ローカル変更とのマージが必要になる
# 状況（fast-forwardできない）は失敗として扱い、警告を出しつつ既存のコードで実行を続行する。
# ネットワーク不通等でgit pull自体に失敗した場合も同様に扱う（更新できないことを理由に
# 定期実行を止めない）。
if ! git pull --ff-only 2>/tmp/youtube-radar-pi-git-pull.log; then
  echo "警告: git pull --ff-onlyに失敗しました。既存のコードで実行を続行します" >&2
  cat /tmp/youtube-radar-pi-git-pull.log >&2
fi

if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$SCRIPT_DIR/.env"
  set +a
fi

exec node "$SCRIPT_DIR/fetch-transcripts.js"
