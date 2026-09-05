# youtube-radar frontend

Googleアカウントでログインし、そのアカウントの登録チャンネル一覧を表示する表示専用のWebアプリ。React 19 + Vite + TypeScript + Bootstrap 5.3。

バックエンドを介さず、ブラウザ内でGoogle Identity Services（GIS）によるアクセストークン取得とYouTube Data API（`subscriptions.list`）の呼び出しを完結させる。ログアウトすると一覧は消え、サーバー側には何も保存しない。

## セットアップ・動作確認

ルート[README.md](../README.md)の「構成」セクションを参照。

## テスト

```sh
npm ci
npm test
npm run lint
npx tsc -b
```
