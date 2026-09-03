# youtube-radar

お気に入りのYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしをLLMで要約・重要度判定してLINEへ通知するアプリ。詳細な仕様は[`docs/product-spec.md`](docs/product-spec.md)を参照する。

現在はPhase 1（固定チャンネル1件でのE2Eパイプライン、[Issue #1](https://github.com/uchi-stock/youtube-radar/issues/1)）を実装中。

## 構成

- `backend/`: パイプライン本体（Node.js）。フロントエンドは持たず、GitHub Actionsの定期実行（`.github/workflows/pipeline.yml`）とLINE通知のみで完結する
- `backend/src/config/channels.json`: 監視対象チャンネルの登録（管理画面は無し）
- `backend/data/processed-videos.json`: 通知済み動画IDの記録（pipeline実行のたびにコミットで更新）

## セットアップ

1. 監視したいYouTubeチャンネルのchannel ID（`https://www.youtube.com/channel/UCxxxxxxxx`のUCから始まる部分）を`backend/src/config/channels.json`に設定し、`enabled: true`にする
2. リポジトリのSettings → Secrets and variables → Actionsから以下を登録する（スマートフォンのブラウザから設定可能）
   - `YOUTUBE_API_KEY`: YouTube Data API v3のAPIキー
   - `ANTHROPIC_API_KEY`: Claude APIキー
   - `LINE_CHANNEL_ACCESS_TOKEN`: LINE Messaging APIのチャネルアクセストークン
   - `LINE_USER_ID`: 通知先のLINEユーザーID
3. Actionsタブから`YouTube Radar Pipeline`ワークフローを開き、`Run workflow`で手動実行して動作確認する（以降は6時間ごとに自動実行）

## 開発

```sh
cd backend
npm ci
npm test
```
