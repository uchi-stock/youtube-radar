@dev-standards/CLAUDE.md

# プロジェクト固有ルール（youtube-radar）

## 概要

お気に入りYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様・将来構想は`docs/product-spec.md`を参照する。

## 構成

- 対象パッケージ: `backend`（Node.js、フロントエンドは持たない。MVPはLINE通知が受け取り口のため、Web UIを作らない設計）
- 定期実行: GitHub Actions（`.github/workflows/pipeline.yml`）のscheduleトリガー。EventBridge/Lambda等の常設AWSインフラはMVPでは採用しない（開発環境がスマートフォンのみのため、追加のクラウド運用・手動確認を増やす構成を避ける）
- CI: `.github/workflows/ci.yml`から`dev-standards/reusable-ci.yml`を`packages`入力（`backend`のみ）で呼び出す。フロントエンドが無いため`frontend-test`固定ジョブは使わない
- チャンネル登録: `backend/src/config/channels.json`（MVPでは管理画面を作らずファイルで管理）
- 処理済み動画管理: `backend/data/processed-videos.json`。pipelineワークフローが実行後に差分をリポジトリへコミットする

## 秘匿情報

`YOUTUBE_API_KEY` / `ANTHROPIC_API_KEY` / `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`はGitHub Actions Secretsで管理し、コードに埋め込まない。
