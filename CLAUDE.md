@dev-standards/CLAUDE.md

# プロジェクト固有ルール（youtube-radar）

## 概要

お気に入りYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様・将来構想は`docs/product-spec.md`を参照する。

## 構成

- 対象パッケージ: `backend`（Node.js、フロントエンドは持たない。MVPはLINE通知が受け取り口のため、Web UIを作らない設計）
- 実行基盤: AWS Lambda（EventBridge Schedule）。新着検知（`src/lambda.js`、6時間ごと）とTranscript取得（`src/transcriptWorker.js`/`src/transcriptWorkerLambda.js`、30分ごと）を別関数に分離している（Issue #24・#29）。IaCはOSLS（`backend/serverless.yml`、`osls`パッケージ、dev-standards標準の`docs/nextjs-static-lambda-pattern.md`に準拠）で管理し、`.github/workflows/cd.yml`から`dev-standards`の`.github/actions/deploy-serverless`複合actionでデプロイする。GitHub Actionsの共有IPからは非公式のYouTube字幕エンドポイントがHTTP 429でブロックされることが判明した（Issue #16）ため、当初のGitHub Actions定期実行案から変更した（Issue #19）が、AWS Lambda環境でも同様のHTTP 429が発生することが判明したため、429を「アクセス制限による一時保留」として扱いDynamoDBで動画単位の状態管理・リトライ制御を行うアーキテクチャに変更した（Issue #24）
- CI: `.github/workflows/ci.yml`から`dev-standards/reusable-ci.yml`を`packages`入力（`backend`のみ）で呼び出す。フロントエンドが無いため`frontend-test`固定ジョブは使わない
- チャンネル登録: 設定ファイルでの手動管理は行わず、YouTube上のチャンネル登録（サブスクライブ）一覧をOAuth経由で`backend/src/lib/subscriptions.js`が自動取得する
- 処理済み動画管理: DynamoDB（`backend/src/lib/dynamoStore.js`。テーブル定義は`backend/serverless.yml`）

## 秘匿情報

`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`（必須、デプロイ用）/ `YOUTUBE_API_KEY` / `GEMINI_API_KEY`（必須）/ `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REFRESH_TOKEN`（必須、チャンネル登録一覧取得用）/ `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`（任意、未設定時はLINE通知のみスキップされる）はGitHub Actions Secretsで管理し、コードに埋め込まない。
