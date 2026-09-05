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

1. このリポジトリの**`main`ブランチを明示的に指定して**git cloneでRaspberry Piへ配置する（`run.sh`が起動時に`origin/main`から`git fetch`・`merge --ff-only`でリポジトリを最新化するため、cloneした状態を維持する必要がある。zip配布等でのコピーは不可。このリポジトリのGitHub既定ブランチはClaude Codeの作業用ブランチになっており頻繁に書き換わるため、`-b main`を省略して素朴に`git clone`すると意図しないブランチがチェックアウトされる点に注意）

   ```sh
   git clone -b main https://github.com/uchi-stock/youtube-radar.git
   ```

2. AWSのAPI Gateway URL（`API_BASE_URL`）を確認する
   - AWSコンソール（https://console.aws.amazon.com/apigateway ）→ 対象API（`youtube-radar-pipeline-dev-*`関連）→「ステージ」→ 呼び出しURLを控える
   - または https://console.aws.amazon.com/cloudformation でスタック`youtube-radar-pipeline-dev`の「出力」タブから`HttpApiUrl`を確認する
3. `PI_API_KEY`（GitHub Secretsに登録した値と同じもの）を確認する
4. `pi/.env.example`を`pi/.env`としてコピーし、`API_BASE_URL`・`PI_API_KEY`を設定する（`pi/.env`は`.gitignore`済みでコミットされない）

   ```sh
   cd youtube-radar/pi
   cp .env.example .env
   # .envを編集してAPI_BASE_URL・PI_API_KEYを設定する
   ```

5. 動作確認のため一度手動実行する

   ```sh
   ./run.sh
   ```

6. cronで定期実行するよう設定する（`crontab -e`、10分ごとの例）

   ```cron
   */10 * * * * /home/pi/youtube-radar/pi/run.sh >> /home/pi/youtube-radar-pi.log 2>&1
   ```

   - `run.sh`は実行のたびに`git pull --ff-only`でリポジトリを最新化してから本体スクリプトを実行する（コード更新の自動反映）。ローカルに変更がある等でfast-forwardできない場合や、ネットワーク不通でpullに失敗した場合は警告を出しつつ既存のコードで実行を継続する
   - crontabのエントリ自体には秘密情報を含めない（`pi/.env`から読み込まれる）
   - ログファイル（例の`youtube-radar-pi.log`）は肥大化するため、必要に応じて`logrotate`等でローテーションする

## 更新

コードの更新は`run.sh`が実行のたびに自動で反映する（手動での`git pull`は不要）。

## テスト

```sh
cd pi
node --test
```
