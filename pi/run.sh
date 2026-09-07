#!/bin/sh
# 自宅Raspberry Pi用cron実行スクリプト。実行のたびにリポジトリを最新化してから
# fetch-transcripts.jsを実行する（コード更新の自動反映）。crontabにはこのスクリプトの
# パスのみを登録し、秘密情報はpi/.env（.gitignore済み）に置く。
set -eu

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$REPO_DIR"

# リポジトリの既定ブランチ設定やローカルのチェックアウト状態（ブランチ名・追跡設定）に
# 依存せず、常にorigin/mainを明示的に対象としてfetch・checkoutする。デプロイ専用
# チェックアウトであり、ローカルの変更を保持する必要は無いため、merge --ff-onlyでは
# なくcheckout -B main origin/mainで常にorigin/mainへ強制的に合わせる（ローカルの
# mainがorigin/mainと分岐している場合、あるいはそもそも別ブランチがチェックアウト
# されている場合でも取りこぼさず更新できる）。ネットワーク不通等でgit fetch自体に
# 失敗した場合は、更新できないことを理由に定期実行を止めず、警告を出して既存の
# コードで実行を続行する。
if ! { git fetch origin main && git checkout -B main origin/main; } >/tmp/youtube-radar-pi-git-pull.log 2>&1; then
  echo "警告: origin/mainへの更新（fetch/checkout -B）に失敗しました。既存のコードで実行を続行します" >&2
  cat /tmp/youtube-radar-pi-git-pull.log >&2
fi

if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$SCRIPT_DIR/.env"
  set +a
fi

exec node "$SCRIPT_DIR/fetch-transcripts.js"
