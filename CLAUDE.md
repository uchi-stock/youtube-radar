@dev-standards/CLAUDE.md

# プロジェクト固有ルール（youtube-radar）

## 概要

お気に入りYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様・将来構想は`docs/product-spec.md`を参照する。

## 構成

- 対象パッケージ: `backend`（Node.js、フロントエンドは持たない。MVPはLINE通知が受け取り口のため、Web UIを作らない設計）
- 定期実行: GitHub Actions（`.github/workflows/pipeline.yml`）のscheduleトリガー。EventBridge/Lambda等の常設AWSインフラはMVPでは採用しない（開発環境がスマートフォンのみのため、追加のクラウド運用・手動確認を増やす構成を避ける）
- CI: `.github/workflows/ci.yml`から`dev-standards/reusable-ci.yml`を`packages`入力（`backend`のみ）で呼び出す。フロントエンドが無いため`frontend-test`固定ジョブは使わない
- チャンネル登録: 設定ファイルでの手動管理は行わず、YouTube上のチャンネル登録（サブスクライブ）一覧をOAuth経由で`backend/src/lib/subscriptions.js`が自動取得する
- 処理済み動画管理: `backend/data/processed-videos.json`。pipelineワークフローが実行後に差分をリポジトリへコミットする

## 秘匿情報

`YOUTUBE_API_KEY` / `GEMINI_API_KEY`（必須）/ `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REFRESH_TOKEN`（必須、チャンネル登録一覧取得用）/ `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`（任意、未設定時はLINE通知のみスキップされる）はGitHub Actions Secretsで管理し、コードに埋め込まない。
