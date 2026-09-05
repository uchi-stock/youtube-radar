# youtube-radar

お気に入りのYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様は[`docs/product-spec.md`](docs/product-spec.md)を参照する。

現在はPhase 1（YouTubeのチャンネル登録一覧を対象にしたE2Eパイプライン、[Issue #1](https://github.com/uchi-stock/youtube-radar/issues/1)）を実装中。

## 構成

- `backend/`: パイプライン本体（Node.js）。フロントエンドは持たない
- `pi/`: 自宅Raspberry Pi上で実行する字幕取得スクリプト（依存パッケージ無し）。セットアップ手順は[`pi/README.md`](pi/README.md)を参照
- 実行基盤: AWS Lambda（EventBridge Schedule）。GitHub Actions（`.github/workflows/cd.yml`）からOSLS（`osls`パッケージ、`backend/serverless.yml`）でデプロイする。GitHub Actions・AWS LambdaいずれのデータセンターIPからも、YouTubeの非公式字幕取得エンドポイントがHTTP 429で恒常的にブロックされることが判明した（Issue #16・#19・#24）ため、字幕取得自体は自宅Raspberry Pi（家庭用IP）に委ねる構成にした（Issue #35）
  - `discover`関数（`src/lambda.js`、6時間ごと）: YouTube Data APIで新着動画を検知し、DynamoDBに`PENDING`として登録するのみ
  - `transcriptApi`関数（`src/transcriptApiLambda.js`、API Gateway HTTP API）: 自宅Raspberry Piからの`GET /pending`（未処理動画一覧取得）・`POST /transcripts`（字幕取得結果の送信）を受け付け、字幕を受け取ったら要約〜LINE通知〜DynamoDBの状態更新まで行う。HTTP 429等で取得できなかった場合は`RETRY_WAIT`として次回のRaspberry Piからのポーリングに持ち越す
- 監視対象チャンネル: 設定ファイルでの手動登録は行わず、YouTube上でチャンネル登録（サブスクライブ）しているチャンネル一覧をOAuth経由で自動取得する（`backend/src/lib/subscriptions.js`）
- 処理済み動画IDの記録: DynamoDB（`backend/src/lib/dynamoStore.js`。テーブルは`serverless.yml`でコード管理）
- LINE Messaging API（`LINE_CHANNEL_ACCESS_TOKEN`・`LINE_USER_ID`）は任意設定。未設定の間はLINE通知のみスキップされる（実行結果はCloudWatch Logsで確認する）

## セットアップ

### 1. AWS IAMユーザーの作成（スマートフォンのブラウザで完結）

1. https://console.aws.amazon.com/iam/home#/users を開き、「ユーザーを作成」
2. ユーザー名は任意（例: `youtube-radar-deploy`）。「AWSマネジメントコンソールへのアクセスを提供する」はオフのままでよい（プログラムによるアクセスのみ使用）
3. 権限は「ポリシーを直接アタッチする」から、最低限`AWSLambda_FullAccess`・`AmazonDynamoDBFullAccess`・`CloudWatchLogsFullAccess`・`AmazonEventBridgeFullAccess`・`IAMFullAccess`（Lambda実行ロール作成のため）・`AWSCloudFormationFullAccess`（OSLSがCloudFormation経由でリソースを作成するため）を付与する
4. 作成後、そのユーザーの詳細画面→「セキュリティ認証情報」タブ→「アクセスキーを作成」→ユースケースは「その他」を選択→表示された「アクセスキー」「シークレットアクセスキー」を控える（シークレットアクセスキーはこの画面でしか表示されない）

### 2. GitHub Secretsの登録

リポジトリのSettings → Secrets and variables → Actionsから以下を登録する（スマートフォンのブラウザから設定可能）。

- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: 上記IAMユーザーのアクセスキー（必須。デプロイに使用）
- `YOUTUBE_API_KEY`: YouTube Data API v3のAPIキー（必須。新着動画確認に使用）
- `GEMINI_API_KEY`: Gemini APIキー（必須）
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REFRESH_TOKEN`: チャンネル登録一覧取得用のOAuth認証情報（必須。取得手順は下記）
- `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`: LINE Messaging APIの通知先（任意）
- `PI_API_KEY`: 自宅Raspberry PiからのAPI呼び出しを認証する共有シークレット（必須。任意の文字列を生成しGitHub Secretsへ登録した上で、Raspberry Pi側にも同じ値を設定する）

### 3. デプロイ

mainブランチへのpush（PRマージ）のたびに`.github/workflows/cd.yml`が自動でLambda関数をデプロイする。初回はSecrets登録後、何らかのPRをマージすることでデプロイが走る。

### 4. 実行結果の確認（スマートフォンのブラウザで完結）

1. https://console.aws.amazon.com/lambda/home を開き、`youtube-radar-pipeline-dev-discover`（新着検知）または`youtube-radar-pipeline-dev-transcriptApi`（Raspberry Pi連携API、リージョン: `ap-northeast-1`）関数を開く
2. 「テスト」タブから空のテストイベントで手動実行するか、`discover`の自動実行（6時間ごと）・Raspberry Piからの呼び出しを待つ
3. 「モニタリング」タブ→「CloudWatch Logsを表示」でログを確認する

### OAuth認証情報の取得手順（スマートフォンのブラウザで完結）

`subscriptions.list`（チャンネル登録一覧の取得）はAPIキーではなくOAuth 2.0によるユーザー本人の認可が必要。

1. **OAuthクライアントの作成**
   - https://console.cloud.google.com/apis/credentials にアクセス
   - 「認証情報を作成」→「OAuthクライアントID」→アプリケーションの種類は**「ウェブ アプリケーション」**を選択（「デスクトップアプリ」を選ぶとOAuth Playgroundでリダイレクト先を登録できず、後続手順で`redirect_uri_mismatch`エラーになる）
   - 「承認済みのリダイレクトURI」に `https://developers.google.com/oauthplayground` を追加して作成
   - 表示された「クライアントID」「クライアントシークレット」を控える
   - 初回は「OAuth同意画面」の設定を求められる場合がある。User Type は「外部」を選び、スコープは後述の`youtube.readonly`を追加、テストユーザーに自分のGoogleアカウントを追加する
2. **リフレッシュトークンの取得**（[Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground)を利用）
   - 画面右上の歯車アイコン（OAuth 2.0 Configuration）を開き、「Use your own OAuth credentials」にチェックし、手順1のクライアントID・クライアントシークレットを入力
   - 左側のScope入力欄に `https://www.googleapis.com/auth/youtube.readonly` を入力し「Authorize APIs」をタップ
   - 自分のGoogleアカウントでログイン・同意
   - 「Exchange authorization code for tokens」をタップすると`Refresh token`が表示されるので控える
3. **GitHub Secretsへ登録**: `GOOGLE_OAUTH_CLIENT_ID`（クライアントID）・`GOOGLE_OAUTH_CLIENT_SECRET`（クライアントシークレット）・`GOOGLE_OAUTH_REFRESH_TOKEN`（リフレッシュトークン）としてそれぞれ登録する

## 開発

```sh
cd backend
npm ci
npm test
```

## バージョニング

Conventional Commits形式のコミット履歴（`fix:`→patch、`feat:`→minor等）をもとに、`main`へのマージのたびに`.github/workflows/cd.yml`（`dev-standards/reusable-cd.yml`）がsemantic-releaseを実行し、バージョンタグ・GitHub Release・`CHANGELOG.md`を自動更新する。手動でのバージョン管理・タグ付けは不要。
