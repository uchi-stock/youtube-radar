# youtube-radar

お気に入りのYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様は[`docs/product-spec.md`](docs/product-spec.md)を参照する。

現在はPhase 1（YouTubeのチャンネル登録一覧を対象にしたE2Eパイプライン、[Issue #1](https://github.com/uchi-stock/youtube-radar/issues/1)）を実装中。

## 構成

- `backend/`: パイプライン本体（Node.js）。フロントエンドは持たず、GitHub Actionsの定期実行（`.github/workflows/pipeline.yml`）のみで完結する
- 監視対象チャンネル: 設定ファイルでの手動登録は行わず、YouTube上でチャンネル登録（サブスクライブ）しているチャンネル一覧をOAuth経由で自動取得する（`backend/src/lib/subscriptions.js`）
- `backend/data/processed-videos.json`: 処理済み動画IDの記録（pipeline実行のたびにコミットで更新）
- 要約結果はGitHub ActionsのJob Summaryへ常に出力される。LINE Messaging API（`LINE_CHANNEL_ACCESS_TOKEN`・`LINE_USER_ID`）は任意設定で、未設定の間はLINE通知のみスキップされる（Job Summaryでの確認は行われる）

## セットアップ

1. リポジトリのSettings → Secrets and variables → Actionsから以下を登録する（スマートフォンのブラウザから設定可能）
   - `YOUTUBE_API_KEY`: YouTube Data API v3のAPIキー（必須。新着動画確認に使用）
   - `GEMINI_API_KEY`: Gemini APIキー（必須）
   - `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REFRESH_TOKEN`: チャンネル登録一覧取得用のOAuth認証情報（必須。取得手順は下記）
   - `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`: LINE Messaging APIの通知先（任意。未設定でもパイプラインは動作し、要約結果はJob Summaryで確認できる）
2. Actionsタブから`YouTube Radar Pipeline`ワークフローを開き、`Run workflow`で手動実行する（以降は6時間ごとに自動実行）。実行完了後、そのワークフロー実行のJob Summaryに要約結果が表示される

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
