# youtube-radar

お気に入りのYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様は[`docs/product-spec.md`](docs/product-spec.md)を参照する。

現在はPhase 1（YouTubeのチャンネル登録一覧を対象にしたE2Eパイプライン、[Issue #1](https://github.com/uchi-stock/youtube-radar/issues/1)）を実装中。

## 構成

- `backend/`: パイプライン本体（Node.js）
- `pi/`: 自宅Raspberry Pi上で実行する字幕取得スクリプト（依存パッケージ無し）。セットアップ手順は[`pi/README.md`](pi/README.md)を参照
- `frontend/`: Googleアカウントでログインし、そのアカウントの登録チャンネル一覧を表示するWebアプリ（React 19 + Vite + TypeScript + Bootstrap 5.3）。バックエンドを介さず、ブラウザから直接Google Identity Services・YouTube Data APIを呼び出す表示専用アプリで、ログアウトすると一覧は消える（定期巡回への組み込みは対象外）
  - ローカルでの動作確認: `cd frontend && npm ci && npm run dev`。Google Cloud Consoleで発行済みのOAuthクライアント（`GOOGLE_OAUTH_CLIENT_ID`）の「承認済みのJavaScript生成元」に`http://localhost:5173`を追加した上で、`frontend/.env.local`に`VITE_GOOGLE_CLIENT_ID=<クライアントID>`を設定する（Client IDは秘密情報ではない）
  - ホスティング: S3 + CloudFront（`frontend/serverless.yml`、OSLS）。`.github/workflows/cd.yml`の`deploy-frontend` jobがビルド・S3同期・CloudFrontキャッシュ無効化まで行う。デプロイ後のURL確認手順は「4. 実行結果の確認」参照
- 実行基盤: AWS Lambda（EventBridge Schedule）。GitHub Actions（`.github/workflows/cd.yml`）からOSLS（`osls`パッケージ、`backend/serverless.yml`）でデプロイする。GitHub Actions・AWS LambdaいずれのデータセンターIPからも、YouTubeの非公式字幕取得エンドポイントがHTTP 429で恒常的にブロックされることが判明した（Issue #16・#19・#24）ため、字幕取得自体は自宅Raspberry Pi（家庭用IP）に委ねる構成にした（Issue #35）
  - `discover`関数（`src/lambda.js`、6時間ごと）: YouTube Data APIで新着動画を検知し、DynamoDBに`PENDING`として登録するのみ
  - `transcriptApi`関数（`src/transcriptApiLambda.js`、API Gateway HTTP API）: 自宅Raspberry Piからの`GET /pending`（未処理動画一覧取得）・`POST /transcripts`（字幕取得結果の送信）を受け付け、字幕を受け取ったら要約〜LINE通知〜DynamoDBの状態更新まで行う。HTTP 429等で取得できなかった場合は`RETRY_WAIT`として次回のRaspberry Piからのポーリングに持ち越す
- 監視対象チャンネル: 設定ファイルでの手動登録は行わない。frontendにGoogleアカウントでログインすると、そのアカウントのYouTubeチャンネル登録（サブスクライブ）一覧を取得し、`POST /channels`（`backend/src/channelsApiLambda.js`）経由でDynamoDBへ永続化する。`discover`関数はこのDynamoDBのチャンネル一覧（`backend/src/lib/channelsStore.js`）から新着検知を行うため、デプロイ後は一度frontendにログインしてチャンネル一覧を同期させる必要がある（「5. フロントエンド」参照）
- 処理済み動画IDの記録: DynamoDB（`backend/src/lib/dynamoStore.js`。テーブルは`serverless.yml`でコード管理）
- LINE Messaging API（`LINE_CHANNEL_ACCESS_TOKEN`・`LINE_USER_ID`）は任意設定。未設定の間はLINE通知のみスキップされる（実行結果はCloudWatch Logsで確認する）

## セットアップ

### 1. AWS IAMユーザーの作成（スマートフォンのブラウザで完結）

1. https://console.aws.amazon.com/iam/home#/users を開き、「ユーザーを作成」
2. ユーザー名は任意（例: `youtube-radar-deploy`）。「AWSマネジメントコンソールへのアクセスを提供する」はオフのままでよい（プログラムによるアクセスのみ使用）
3. 権限は「ポリシーを直接アタッチする」から、最低限`AWSLambda_FullAccess`・`AmazonDynamoDBFullAccess`・`CloudWatchLogsFullAccess`・`AmazonEventBridgeFullAccess`・`IAMFullAccess`（Lambda実行ロール作成のため）・`AWSCloudFormationFullAccess`（OSLSがCloudFormation経由でリソースを作成するため）・`AmazonS3FullAccess`・`CloudFrontFullAccess`（フロントエンドのS3+CloudFrontホスティング用）を付与する
4. 作成後、そのユーザーの詳細画面→「セキュリティ認証情報」タブ→「アクセスキーを作成」→ユースケースは「その他」を選択→表示された「アクセスキー」「シークレットアクセスキー」を控える（シークレットアクセスキーはこの画面でしか表示されない）

### 2. GitHub Secretsの登録

リポジトリのSettings → Secrets and variables → Actionsから以下を登録する（スマートフォンのブラウザから設定可能）。

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: 上記IAMユーザーのアクセスキー（必須。デプロイに使用）
- `YOUTUBE_API_KEY`: YouTube Data API v3のAPIキー（必須。新着動画確認に使用）
- `GEMINI_API_KEY`: Gemini APIキー（必須）
- `GOOGLE_OAUTH_CLIENT_ID`: frontendのGoogleログイン、および`POST /channels`のアクセストークン検証で使うOAuthクライアントID（必須。取得手順は下記）
- `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`: LINE Messaging APIの通知先（任意）
- `PI_API_KEY`: 自宅Raspberry PiからのAPI呼び出しを認証する共有シークレット（必須。任意の文字列を生成しGitHub Secretsへ登録した上で、Raspberry Pi側にも同じ値を設定する）

### 3. デプロイ

mainブランチへのpush（PRマージ）のたびに`.github/workflows/cd.yml`が自動でLambda関数をデプロイする。初回はSecrets登録後、何らかのPRをマージすることでデプロイが走る。

### 4. 実行結果の確認（スマートフォンのブラウザで完結）

1. https://console.aws.amazon.com/lambda/home を開き、`youtube-radar-pipeline-dev-discover`（新着検知）または`youtube-radar-pipeline-dev-transcriptApi`（Raspberry Pi連携API、リージョン: `ap-northeast-1`）関数を開く
2. 「テスト」タブから空のテストイベントで手動実行するか、`discover`の自動実行（6時間ごと）・Raspberry Piからの呼び出しを待つ
3. 「モニタリング」タブ→「CloudWatch Logsを表示」でログを確認する

### 5. フロントエンド（登録チャンネル一覧表示）へのアクセスURL確認（スマートフォンのブラウザで完結）

1. https://console.aws.amazon.com/cloudfront/v3/home を開き、対象のディストリビューション（コメント欄や作成日時等でCloudFormationスタック`youtube-radar-frontend-dev`のものと判別する）を開く
2. 「ドメイン名」（`https://xxxxxxxxxxxxx.cloudfront.net`形式）がアクセスURL
3. 初回アクセス時、OAuthクライアントの「承認済みのJavaScript生成元」（https://console.cloud.google.com/apis/credentials ）にこのCloudFrontドメインを追加していないと、Googleログインボタンがエラーになる点に注意
4. **初回デプロイ後は、上記URLにGoogleアカウントでログインする。** ログインに成功すると、そのアカウントのチャンネル登録一覧が`POST /channels`経由でDynamoDBへ同期され、以降`discover`関数（新着検知）がその一覧を対象に動作するようになる

### OAuthクライアントIDの取得手順（スマートフォンのブラウザで完結）

frontendのGoogleログイン、および`POST /channels`のアクセストークン検証にOAuthクライアントIDを使用する（クライアントシークレット・リフレッシュトークンは不要）。

1. https://console.cloud.google.com/apis/credentials にアクセス
2. 「認証情報を作成」→「OAuthクライアントID」→アプリケーションの種類は**「ウェブ アプリケーション」**を選択
3. 「承認済みのJavaScript生成元」に、frontendのCloudFrontドメイン（デプロイ後に判明するため、初回はいったん空のまま作成し、後述の手順5で追記してもよい）を追加して作成
4. 表示された「クライアントID」を控える
5. 初回は「OAuth同意画面」の設定を求められる場合がある。User Type は「外部」を選び、スコープに`.../auth/userinfo.email`・`.../auth/youtube.readonly`を追加、テストユーザーに自分のGoogleアカウントを追加する
6. **GitHub Secretsへ登録**: `GOOGLE_OAUTH_CLIENT_ID`（クライアントID）として登録する

## 開発

```sh
cd backend
npm ci
npm test
```

## バージョニング

Conventional Commits形式のコミット履歴（`fix:`→patch、`feat:`→minor等）をもとに、`main`へのマージのたびに`.github/workflows/cd.yml`（`dev-standards/reusable-cd.yml`）がsemantic-releaseを実行し、バージョンタグ・GitHub Release・`CHANGELOG.md`を自動更新する。手動でのバージョン管理・タグ付けは不要。
