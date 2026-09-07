@dev-standards/CLAUDE.md

# プロジェクト固有ルール（youtube-radar）

## 概要

お気に入りYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様・将来構想は`docs/product-spec.md`を参照する。

## 構成

- 対象パッケージ: `backend`（Node.js。定期巡回パイプライン本体）。加えて、自宅Raspberry Pi上で実行する字幕取得スクリプト`pi/`（字幕取得はヘッドレスブラウザ・Playwright/Chromiumで動画再生ページを開いて行う。素朴なサーバーサイドfetchでは家庭用IPでもYouTube側のCookieセッション・bot対策を経由できずHTTP 429が継続することが確認されたための方針転換で、以前の「依存パッケージ無し」方針（Issue #82）から転換した。Issue #118。CIでは`c8`経由の`node --test`を実行してカバレッジ計測する。実機セットアップにはRaspberry Pi 4/5・メモリ4GB以上を推奨する）と、Googleログイン→登録チャンネル一覧表示用の`frontend/`（React 19 + Vite + TypeScript + Bootstrap 5.3。バックエンドを介さない表示専用。将来的な「誰でもアカウント設定して使える」構想の入り口。Issue #44・#45）を持つ
- 実行基盤: AWS Lambda（EventBridge Schedule）。新着検知（`src/lambda.js`、6時間ごと）はAWS上で行うが、字幕取得はAWS/GitHub Actions等データセンターIPからは恒常的にHTTP 429でブロックされることが判明した（Issue #16・#24）ため、自宅Raspberry Pi（家庭用IP）に委ねる。AWS側は`src/transcriptApi.js`/`src/transcriptApiLambda.js`（API Gateway HTTP API、`GET /pending`・`POST /transcripts`）でRaspberry Piとの連携APIのみを提供し、字幕取得自体は一切行わない（Issue #35）。IaCはOSLS（`backend/serverless.yml`、`osls`パッケージ、dev-standards標準の`docs/nextjs-static-lambda-pattern.md`に準拠）で管理し、`.github/workflows/cd.yml`から`dev-standards`の`.github/actions/deploy-serverless`複合actionでデプロイする
- 動画単位のTranscript処理状態（`PENDING`/`PROCESSING`/`COMPLETED`/`TRANSCRIPT_NOT_FOUND`/`FAILED`）はDynamoDBで管理する（`backend/src/lib/dynamoStore.js`）
- CI: `.github/workflows/ci.yml`から`dev-standards/reusable-ci.yml`を`packages`入力（`backend`/`pi`/`frontend`の3要素）で呼び出す。reusable-ci.ymlの固定2パッケージモード（`frontend_dir`/`backend_dir`入力、`frontend-test`/`backend-test`ジョブ）はfrontend/backendの2つしか扱えず`pi`を追加できないため、`packages`入力によるmatrix構成（`package-test (backend)`等のジョブ名になる）を使っている。この結果、CI画面では`frontend-test`/`backend-test`固定ジョブが常にskipped表示になるが、これは仕様通りの挙動であり不具合ではない（実体のテストは`package-test (backend)`/`package-test (pi)`/`package-test (frontend, ...)`で実行される）
- チャンネル登録: 設定ファイルでの手動管理は行わない。frontendへのGoogleログインをトリガーに、そのアカウントのYouTubeチャンネル登録（サブスクライブ）一覧を取得し`POST /channels`（`backend/src/channelsApiLambda.js`）でDynamoDB（`backend/src/lib/channelsStore.js`。ユーザーのメールアドレスをパーティションキーとし、各ユーザーは自分の行にのみ書き込む）へ永続化する。`discover`Lambda（`backend/src/lambda.js`）はこのDynamoDBのチャンネル一覧を読んで新着検知を行うため、backend側は継続的なOAuthリフレッシュトークンを保持しない（Issue #93）
- 処理済み動画管理: DynamoDB（`backend/src/lib/dynamoStore.js`。テーブル定義は`backend/serverless.yml`）

## 秘匿情報

`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`（必須、デプロイ用）/ `YOUTUBE_API_KEY` / `GEMINI_API_KEY`（必須）/ `GOOGLE_OAUTH_CLIENT_ID`（必須、frontendのGoogleログインおよび`POST /channels`のアクセストークン検証に使用。クライアントシークレット・リフレッシュトークンはbackend側では不要）/ `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`（任意、未設定時はLINE通知のみスキップされる）/ `PI_API_KEY`（必須、自宅Raspberry PiからのAPI呼び出しを認証する共有シークレット。Raspberry Pi側にも同じ値を設定する）はGitHub Actions Secretsで管理し、コードに埋め込まない。
