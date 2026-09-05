# youtube-radar Raspberry Pi連携スクリプト

AWS（GitHub Actions・AWS Lambda等のデータセンターIP）からのYouTube字幕取得は、非公式timedtextエンドポイントがHTTP 429で恒常的にブロックされることが確認されている（Issue #16・#24）。そのため、自宅のRaspberry Pi（家庭用回線のIP）から字幕を取得し、結果をAWSへ送信する構成にしている。

## 動作

`fetch-transcripts.js`を実行すると、以下を1回行う。

1. AWSの`GET /pending`から未処理動画一覧を取得する
2. 各動画についてYouTubeのtimedtextエンドポイントへ直接アクセスし、字幕を取得する
3. 取得結果（字幕本文、または「字幕なし」）をAWSの`POST /transcripts`へ送信する

1件の動画で失敗（ネットワークエラー等）しても他の動画の処理は継続し、失敗した動画は結果を送信しないため次回実行時に再度候補になる。

## セットアップ（Raspberry Pi上で1回だけ実行する）

Node.js 18以降が必要（グローバルの`fetch`を使用するため）。依存パッケージは無い。

1. このリポジトリをRaspberry Piへclone、またはこの`pi`ディレクトリのみをコピーする
2. AWSのAPI Gateway URL（`API_BASE_URL`）を確認する
   - AWSコンソール（https://console.aws.amazon.com/apigateway ）→ 対象API（`youtube-radar-pipeline-dev-*`関連）→「ステージ」→ 呼び出しURLを控える
   - または https://console.aws.amazon.com/cloudformation でスタック`youtube-radar-pipeline-dev`の「出力」タブから`HttpApiUrl`を確認する
3. `PI_API_KEY`（GitHub Secretsに登録した値と同じもの）を確認する
4. 動作確認のため一度手動実行する

   ```sh
   API_BASE_URL="https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com" \
   PI_API_KEY="（GitHub Secretsと同じ値）" \
   node fetch-transcripts.js
   ```

5. cronで定期実行するよう設定する（`crontab -e`、10分ごとの例）

   ```cron
   */10 * * * * API_BASE_URL="https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com" PI_API_KEY="（GitHub Secretsと同じ値）" /usr/bin/node /home/pi/youtube-radar/pi/fetch-transcripts.js >> /home/pi/youtube-radar-pi.log 2>&1
   ```

   - `/usr/bin/node`のパスは`which node`で確認する
   - ログファイル（例の`youtube-radar-pi.log`）は肥大化するため、必要に応じて`logrotate`等でローテーションする

## テスト

```sh
cd pi
node --test
```
