# youtube-radar Raspberry Pi連携スクリプト

AWS（GitHub Actions・AWS Lambda等のデータセンターIP）からのYouTube字幕取得は、非公式timedtextエンドポイントがHTTP 429で恒常的にブロックされることが確認されている（Issue #16・#24）。そのため、自宅のRaspberry Pi（家庭用回線のIP）から字幕を取得し、結果をAWSへ送信する構成にしている。

字幕取得自体は、素朴なHTTPリクエストではなくヘッドレスブラウザ（Playwright/Chromium）で実際に動画再生ページを開いて行う（Issue #118）。サーバーサイドの単純なfetchでは、家庭用IPであってもYouTube側のCookieセッション・bot対策を経由できずHTTP 429が継続的に発生することが確認されたため。

## 動作

`fetch-transcripts.js`を実行すると、以下を1回行う。

1. AWSの`GET /pending`から未処理動画一覧を取得する
2. 各動画についてヘッドレスブラウザで動画再生ページを開き、字幕を取得する
3. 取得結果（字幕本文、または「字幕なし」）をAWSの`POST /transcripts`へ送信する

1件の動画で失敗（ネットワークエラー等）しても他の動画の処理は継続し、失敗した動画は結果を送信しないため次回実行時に再度候補になる。

動画ごとの処理の間には既定で3秒の間隔を空ける（`PI_REQUEST_DELAY_MS`環境変数でミリ秒単位に変更可能）。複数動画を連続リクエストするとYouTube側のレート制限（HTTP 429）に掛かることが確認されている。

## セットアップ（Raspberry Pi上で1回だけ実行する）

Node.js 18以降が必要（グローバルの`fetch`を使用するため）。字幕取得にヘッドレスブラウザ（Playwright/Chromium）を使うため、`npm install`とChromium本体のインストールが必要（Issue #118。以前は依存パッケージ無しだったが、YouTube側のbot対策を経由するために方針転換した）。ヘッドレスChromiumの実行にはある程度のメモリ・CPU性能が必要なため、Raspberry Pi 4/5（メモリ4GB以上）を推奨する。

1. このリポジトリの**`main`ブランチを明示的に指定して**git cloneでRaspberry Piへ配置する（`run.sh`が起動時に`origin/main`から`git fetch`・`checkout -B main origin/main`でリポジトリを最新化するため、cloneした状態を維持する必要がある。zip配布等でのコピーは不可。このリポジトリのGitHub既定ブランチはClaude Codeの作業用ブランチになっており頻繁に書き換わるため、`-b main`を省略して素朴に`git clone`すると意図しないブランチがチェックアウトされる点に注意）

   ```sh
   git clone -b main https://github.com/uchi-stock/youtube-radar.git
   ```

2. 依存パッケージとヘッドレスブラウザ本体をインストールする

   ```sh
   cd youtube-radar/pi
   npm install
   npx playwright install --with-deps chromium
   ```

   - `run.sh`は、`pi/package-lock.json`が更新によって変化した場合（`playwright`のバージョン変更等）のみ自動で依存パッケージ・ブラウザ本体を更新する（次項「OS依存ライブラリ込みの自動更新（任意）」参照）。オプトイン設定をしていない場合、OS側の共有ライブラリ更新（`--with-deps`部分）は自動化されないため、Playwrightのブラウザ起動自体に失敗する場合はこの手順（`npx playwright install --with-deps chromium`）を再度手動で実行する

   ### OS依存ライブラリ込みの自動更新（任意、Issue #131）

   `--with-deps`によるOS側の共有ライブラリ更新はsudoが必要で、cronでの非対話実行では通常パスワードプロンプトで止まってしまう。`run.sh`は依存パッケージ更新時、まず`sudo -n npx playwright install --with-deps chromium`（非対話モード）を試し、passwordless sudoが未設定であれば即座に失敗してブラウザ本体のみの更新（sudo不要）へ安全にフォールバックする。

   OS依存ライブラリ更新まで完全に自動化したい場合は、以下のコマンド（実体のパスに限定したエントリ）に限定したpasswordless sudoを一度だけ設定する。`playwright`を実行するOSユーザー（`whoami`で確認）で実行すること。

   ```sh
   echo "$(whoami) ALL=(root) NOPASSWD: $(command -v npx) playwright install --with-deps chromium" | sudo tee /etc/sudoers.d/youtube-radar-playwright
   sudo chmod 440 /etc/sudoers.d/youtube-radar-playwright
   sudo visudo -c
   ```

   設定しない場合でも、ブラウザ本体の自動更新（sudo不要な範囲）は引き続き有効に動作する。

3. AWSのAPI Gateway URL（`API_BASE_URL`）を確認する
   - AWSコンソール（https://console.aws.amazon.com/apigateway ）→ 対象API（`youtube-radar-pipeline-dev-*`関連）→「ステージ」→ 呼び出しURLを控える
   - または https://console.aws.amazon.com/cloudformation でスタック`youtube-radar-pipeline-dev`の「出力」タブから`HttpApiUrl`を確認する
4. `PI_API_KEY`（GitHub Secretsに登録した値と同じもの）を確認する
5. `pi/.env.example`を`pi/.env`としてコピーし、`API_BASE_URL`・`PI_API_KEY`を設定する（`pi/.env`は`.gitignore`済みでコミットされない）

   ```sh
   cp .env.example .env
   # .envを編集してAPI_BASE_URL・PI_API_KEYを設定する
   ```

6. 動作確認のため一度手動実行する

   ```sh
   ./run.sh
   ```

7. cronで定期実行するよう設定する（`crontab -e`、10分ごとの例）

   ```cron
   */10 * * * * /home/pi/youtube-radar/pi/run.sh >> /home/pi/youtube-radar-pi.log 2>&1
   ```

   - `run.sh`は実行のたびに`git fetch`・`checkout -B main origin/main`でリポジトリを常にorigin/mainへ強制的に合わせてから本体スクリプトを実行する（コード更新の自動反映）。`pi/package-lock.json`が変化していれば依存パッケージ・Playwrightのブラウザ本体も自動更新する。ネットワーク不通等で取得に失敗した場合は警告を出しつつ既存のコードで実行を継続する
   - crontabのエントリ自体には秘密情報を含めない（`pi/.env`から読み込まれる）
   - ログファイル（例の`youtube-radar-pi.log`）は肥大化するため、必要に応じて`logrotate`等でローテーションする

## 更新

コードの更新・依存パッケージの更新（`pi/package-lock.json`の変化を検知した場合）は`run.sh`が実行のたびに自動で反映する（手動での`git pull`・`npm install`は不要）。OS側の共有ライブラリ更新（`playwright install --with-deps`部分）は、「セットアップ」手順2の「OS依存ライブラリ込みの自動更新（任意）」でpasswordless sudoを設定していれば自動反映される。設定していない場合はこの部分のみ自動化されないため、Playwrightのブラウザ起動に失敗する場合は「セットアップ」の手順2を手動で再実行する。

## テスト

```sh
cd pi
node --test
```
