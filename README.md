# youtube-radar

お気に入りのYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様は[`docs/product-spec.md`](docs/product-spec.md)を参照する。

現在はPhase 1（固定チャンネル1件でのE2Eパイプライン、[Issue #1](https://github.com/uchi-stock/youtube-radar/issues/1)）を実装中。

## 構成

- `backend/`: パイプライン本体（Node.js）。フロントエンドは持たず、GitHub Actionsの定期実行（`.github/workflows/pipeline.yml`）のみで完結する
- `backend/src/config/channels.json`: 監視対象チャンネルの登録（管理画面は無し）
- `backend/data/processed-videos.json`: 処理済み動画IDの記録（pipeline実行のたびにコミットで更新）
- 要約結果はGitHub ActionsのJob Summaryへ常に出力される。LINE Messaging API（`LINE_CHANNEL_ACCESS_TOKEN`・`LINE_USER_ID`）は任意設定で、未設定の間はLINE通知のみスキップされる（Job Summaryでの確認は行われる）

## セットアップ

1. 監視したいYouTubeチャンネルのchannel ID（`https://www.youtube.com/channel/UCxxxxxxxx`のUCから始まる部分）を`backend/src/config/channels.json`に設定し、`enabled: true`にする
2. リポジトリのSettings → Secrets and variables → Actionsから以下を登録する（スマートフォンのブラウザから設定可能）
   - `YOUTUBE_API_KEY`: YouTube Data API v3のAPIキー（必須）
   - `GEMINI_API_KEY`: Gemini APIキー（必須）
   - `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_USER_ID`: LINE Messaging APIの通知先（任意。未設定でもパイプラインは動作し、要約結果はJob Summaryで確認できる）
3. Actionsタブから`YouTube Radar Pipeline`ワークフローを開き、`Run workflow`で手動実行する（以降は6時間ごとに自動実行）。実行完了後、そのワークフロー実行のJob Summaryに要約結果が表示される

## 開発

```sh
cd backend
npm ci
npm test
```
