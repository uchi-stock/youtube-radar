# [1.27.0](https://github.com/uchi-stock/youtube-radar/compare/v1.26.0...v1.27.0) (2026-09-06)


### Features

* **frontend:** PWAでの更新反映のためService Worker・更新通知バナーを導入する ([#108](https://github.com/uchi-stock/youtube-radar/issues/108)) ([5a1f91b](https://github.com/uchi-stock/youtube-radar/commit/5a1f91bad35cd1bb81ca039305dfa944dab702d6))

# [1.26.0](https://github.com/uchi-stock/youtube-radar/compare/v1.25.0...v1.26.0) (2026-09-06)


### Features

* **frontend:** チャンネル選択〜動画一覧〜動画詳細表示のE2Eテストを追加する ([#105](https://github.com/uchi-stock/youtube-radar/issues/105)) ([476925a](https://github.com/uchi-stock/youtube-radar/commit/476925adcf4d9d9bdd769c94c835d436dde6f616))

# [1.25.0](https://github.com/uchi-stock/youtube-radar/compare/v1.24.0...v1.25.0) (2026-09-06)


### Features

* **frontend:** ログイン〜登録チャンネル一覧表示のE2Eテストを追加する ([#92](https://github.com/uchi-stock/youtube-radar/issues/92)) ([d73947b](https://github.com/uchi-stock/youtube-radar/commit/d73947be44b0d661d078a33ace6928ec5748b003))

# [1.24.0](https://github.com/uchi-stock/youtube-radar/compare/v1.23.0...v1.24.0) (2026-09-06)


### Features

* **frontend:** ログイン成功時にチャンネル一覧をbackendへ同期する ([#104](https://github.com/uchi-stock/youtube-radar/issues/104)) ([12fbda3](https://github.com/uchi-stock/youtube-radar/commit/12fbda394d713a8cdb854528207f9d82359edce7))

# [1.23.0](https://github.com/uchi-stock/youtube-radar/compare/v1.22.2...v1.23.0) (2026-09-06)


### Features

* **backend:** 新着検知LambdaをDynamoDBのチャンネル一覧から処理するように変更する ([#103](https://github.com/uchi-stock/youtube-radar/issues/103)) ([4737706](https://github.com/uchi-stock/youtube-radar/commit/47377066d740080fca70de4740e1cb981a13d1fe))

## [1.22.2](https://github.com/uchi-stock/youtube-radar/compare/v1.22.1...v1.22.2) (2026-09-06)


### Bug Fixes

* **backend:** ChannelsTableのキースキーマ変更に伴うテーブル名衝突を解消する ([#102](https://github.com/uchi-stock/youtube-radar/issues/102)) ([62258e6](https://github.com/uchi-stock/youtube-radar/commit/62258e6d0bc7afac1b225f7fda54a18666dc0bde))

## [1.22.1](https://github.com/uchi-stock/youtube-radar/compare/v1.22.0...v1.22.1) (2026-09-06)


### Bug Fixes

* **backend:** POST /channelsの認可をユーザー自身へのスコープ書き込みに変更する ([#101](https://github.com/uchi-stock/youtube-radar/issues/101)) ([51be58d](https://github.com/uchi-stock/youtube-radar/commit/51be58da0ec4558df5b7634b7c03d7087a557ca3))

# [1.22.0](https://github.com/uchi-stock/youtube-radar/compare/v1.21.0...v1.22.0) (2026-09-06)


### Features

* **backend:** frontendから登録チャンネル一覧を受け取るAPI（認可付き）を追加する ([#99](https://github.com/uchi-stock/youtube-radar/issues/99)) ([fb2cd02](https://github.com/uchi-stock/youtube-radar/commit/fb2cd02d695e216525496c581c72ba09f32ac92e))

# [1.21.0](https://github.com/uchi-stock/youtube-radar/compare/v1.20.0...v1.21.0) (2026-09-06)


### Features

* **backend:** チャンネル一覧永続化用DynamoDBテーブルとストアを追加する ([#98](https://github.com/uchi-stock/youtube-radar/issues/98)) ([f39e1c8](https://github.com/uchi-stock/youtube-radar/commit/f39e1c841972d03d79edbcb9a07520b88c2c3b48))

# [1.20.0](https://github.com/uchi-stock/youtube-radar/compare/v1.19.0...v1.20.0) (2026-09-06)


### Features

* **ci:** reusable-ci.ymlのenable_e2e_testを有効化しfrontend-e2e-testジョブを追加する ([#91](https://github.com/uchi-stock/youtube-radar/issues/91)) ([6d018e8](https://github.com/uchi-stock/youtube-radar/commit/6d018e8b62b1d4fdde24cb4acc4c90152eb29139))

# [1.19.0](https://github.com/uchi-stock/youtube-radar/compare/v1.18.0...v1.19.0) (2026-09-06)


### Features

* **frontend:** Playwright基盤を導入しログイン前画面のE2Eテストを追加する ([#90](https://github.com/uchi-stock/youtube-radar/issues/90)) ([ce1e47b](https://github.com/uchi-stock/youtube-radar/commit/ce1e47b3e6ba70cfd39199214e9491a7b253cf87))

# [1.18.0](https://github.com/uchi-stock/youtube-radar/compare/v1.17.0...v1.18.0) (2026-09-06)


### Features

* **ci:** piパッケージにc8によるカバレッジ計測・閾値チェックを試験導入する ([#84](https://github.com/uchi-stock/youtube-radar/issues/84)) ([fd40be2](https://github.com/uchi-stock/youtube-radar/commit/fd40be2f3ef0e78652c42e65f39463e1fabae9f0))

# [1.17.0](https://github.com/uchi-stock/youtube-radar/compare/v1.16.0...v1.17.0) (2026-09-06)


### Features

* **frontend:** 動画詳細の概要欄URLをリンク化し、YouTube視聴リンクを追加する ([#79](https://github.com/uchi-stock/youtube-radar/issues/79)) ([42c3160](https://github.com/uchi-stock/youtube-radar/commit/42c316082a5779343fcf21b42c1a4453bed763db))

# [1.16.0](https://github.com/uchi-stock/youtube-radar/compare/v1.15.1...v1.16.0) (2026-09-05)


### Features

* **frontend:** 再訪問時にログイン導線をパーソナライズする ([#74](https://github.com/uchi-stock/youtube-radar/issues/74)) ([4c5e2ae](https://github.com/uchi-stock/youtube-radar/commit/4c5e2ae90928ab4cbfb99fbffee56a40db586f3b))

## [1.15.1](https://github.com/uchi-stock/youtube-radar/compare/v1.15.0...v1.15.1) (2026-09-05)


### Bug Fixes

* **frontend:** ユーザーアイコンのプルダウンメニューが画面右にはみ出す問題を修正する ([#73](https://github.com/uchi-stock/youtube-radar/issues/73)) ([9c862ba](https://github.com/uchi-stock/youtube-radar/commit/9c862ba8ad193bff92d74084458e68841124bf15))

# [1.15.0](https://github.com/uchi-stock/youtube-radar/compare/v1.14.1...v1.15.0) (2026-09-05)


### Features

* **frontend:** ユーザーアイコンのプルダウンにログアウト・共有機能を、未ログイン画面にアプリ概要を追加する ([#71](https://github.com/uchi-stock/youtube-radar/issues/71)) ([2a497c6](https://github.com/uchi-stock/youtube-radar/commit/2a497c691c19989f091202f6842542036bc7d96b))


### Reverts

* **frontend:** FedCM有効化を元に戻す ([#68](https://github.com/uchi-stock/youtube-radar/issues/68)) ([546cd4e](https://github.com/uchi-stock/youtube-radar/commit/546cd4e33cabc26849d4c271ce19e697d2dc26d0))

## [1.14.1](https://github.com/uchi-stock/youtube-radar/compare/v1.14.0...v1.14.1) (2026-09-05)


### Bug Fixes

* **frontend:** ログイン時のアカウント選択二重表示をFedCM有効化で解消する ([#67](https://github.com/uchi-stock/youtube-radar/issues/67)) ([238f615](https://github.com/uchi-stock/youtube-radar/commit/238f61511f8fd45159e43f01d0fe5bd3e89c26df))

# [1.14.0](https://github.com/uchi-stock/youtube-radar/compare/v1.13.0...v1.14.0) (2026-09-05)


### Features

* **frontend:** 動画一覧のサムネイルを大きくしタイトルを下に小さく表示する ([#65](https://github.com/uchi-stock/youtube-radar/issues/65)) ([4c1e2d7](https://github.com/uchi-stock/youtube-radar/commit/4c1e2d7eabe2e62fe82dd6f3937264bc5573ca64))

# [1.13.0](https://github.com/uchi-stock/youtube-radar/compare/v1.12.0...v1.13.0) (2026-09-05)


### Features

* **frontend:** 動画タップ時に概要・動画の長さ・高評価数・コメント数・字幕有無を表示する ([#63](https://github.com/uchi-stock/youtube-radar/issues/63)) ([a23cbee](https://github.com/uchi-stock/youtube-radar/commit/a23cbee20c8259a65bd2f0a4dd2e35058334904c))

# [1.12.0](https://github.com/uchi-stock/youtube-radar/compare/v1.11.0...v1.12.0) (2026-09-05)


### Features

* 動画タップでメタ情報と文字起こし済み要約を表示する ([#60](https://github.com/uchi-stock/youtube-radar/issues/60)) ([daefe51](https://github.com/uchi-stock/youtube-radar/commit/daefe51ddcb1aadd8536011452eafff98535109f))

# [1.11.0](https://github.com/uchi-stock/youtube-radar/compare/v1.10.1...v1.11.0) (2026-09-05)


### Features

* **frontend:** チャンネルタップで最新動画一覧と再生回数を表示する ([#58](https://github.com/uchi-stock/youtube-radar/issues/58)) ([271e9c5](https://github.com/uchi-stock/youtube-radar/commit/271e9c5ca12d01cc95ec8327cabf6b82264e1573))

## [1.10.1](https://github.com/uchi-stock/youtube-radar/compare/v1.10.0...v1.10.1) (2026-09-05)


### Bug Fixes

* **cd:** deploy-frontendのcheckoutでdev-standardsサブモジュールを取得する ([#55](https://github.com/uchi-stock/youtube-radar/issues/55)) ([0ed1b0c](https://github.com/uchi-stock/youtube-radar/commit/0ed1b0c6ccac773e3623c419e0c4259ade736230))

# [1.10.0](https://github.com/uchi-stock/youtube-radar/compare/v1.9.1...v1.10.0) (2026-09-05)


### Features

* **frontend:** アプリバージョン表示・ユーザーアイコン・共通CSSを追加 ([#53](https://github.com/uchi-stock/youtube-radar/issues/53)) ([676364b](https://github.com/uchi-stock/youtube-radar/commit/676364bfb51d4f7f8a8587e8b5a5f456657e1f96))

## [1.9.1](https://github.com/uchi-stock/youtube-radar/compare/v1.9.0...v1.9.1) (2026-09-05)


### Bug Fixes

* **frontend:** oslsを導入しdeploy-frontendのCLI解決を修正する ([#49](https://github.com/uchi-stock/youtube-radar/issues/49)) ([f65cc44](https://github.com/uchi-stock/youtube-radar/commit/f65cc44aca2d05d63288929f861fccb0f4909980))

# [1.9.0](https://github.com/uchi-stock/youtube-radar/compare/v1.8.0...v1.9.0) (2026-09-05)


### Features

* **frontend:** S3+CloudFrontでフロントエンドをホスティングする ([#47](https://github.com/uchi-stock/youtube-radar/issues/47)) ([7ca4210](https://github.com/uchi-stock/youtube-radar/commit/7ca421068657aa4637eddfb41e2b269e93989466))

# [1.8.0](https://github.com/uchi-stock/youtube-radar/compare/v1.7.1...v1.8.0) (2026-09-05)


### Features

* **frontend:** Googleログイン→登録チャンネル一覧表示のWebアプリを追加 ([#46](https://github.com/uchi-stock/youtube-radar/issues/46)) ([9d25813](https://github.com/uchi-stock/youtube-radar/commit/9d25813bf6b95829b0c1a500b1eec1fc927603a1))

## [1.7.1](https://github.com/uchi-stock/youtube-radar/compare/v1.7.0...v1.7.1) (2026-09-05)


### Bug Fixes

* **pi:** run.shの自動更新をorigin/mainに固定する ([#43](https://github.com/uchi-stock/youtube-radar/issues/43)) ([f32df35](https://github.com/uchi-stock/youtube-radar/commit/f32df351bd0bddce5efeaa9ae4a2ed85ee6365e9))

# [1.7.0](https://github.com/uchi-stock/youtube-radar/compare/v1.6.1...v1.7.0) (2026-09-05)


### Features

* **pi:** cron実行時にgit pullしてコードを自動更新する ([#41](https://github.com/uchi-stock/youtube-radar/issues/41)) ([309ff8c](https://github.com/uchi-stock/youtube-radar/commit/309ff8cfe638fcfe49ec221f2bda3df798104b63))

## [1.6.1](https://github.com/uchi-stock/youtube-radar/compare/v1.6.0...v1.6.1) (2026-09-05)


### Bug Fixes

* **serverless:** discover関数のタイムアウトを300秒に戻す ([#39](https://github.com/uchi-stock/youtube-radar/issues/39)) ([d854434](https://github.com/uchi-stock/youtube-radar/commit/d8544340b9e9fde2bbe3f62f7a36d161c5a10ab0))

# [1.6.0](https://github.com/uchi-stock/youtube-radar/compare/v1.5.0...v1.6.0) (2026-09-05)


### Features

* **pi:** 自宅ラズパイ用の字幕取得スクリプトを追加する ([#37](https://github.com/uchi-stock/youtube-radar/issues/37)) ([8bab80c](https://github.com/uchi-stock/youtube-radar/commit/8bab80c5f9631469849615c0dee4c825aaf5a53c))

# [1.5.0](https://github.com/uchi-stock/youtube-radar/compare/v1.4.0...v1.5.0) (2026-09-05)


### Features

* **transcriptApi:** 字幕取得を自宅ラズパイ経由に切り替えるAWS側APIを追加 ([#36](https://github.com/uchi-stock/youtube-radar/issues/36)) ([c74fc2f](https://github.com/uchi-stock/youtube-radar/commit/c74fc2f3b44d40460d518d82344aac6019334ffd))

# [1.4.0](https://github.com/uchi-stock/youtube-radar/compare/v1.3.0...v1.4.0) (2026-09-05)


### Features

* **pipeline:** 新着検知とTranscript取得をジョブ分離する ([#34](https://github.com/uchi-stock/youtube-radar/issues/34)) ([2194c16](https://github.com/uchi-stock/youtube-radar/commit/2194c16b8ef83465a40648ec91e94ecf8fa57516))

# [1.3.0](https://github.com/uchi-stock/youtube-radar/compare/v1.2.5...v1.3.0) (2026-09-05)


### Features

* **dynamoStore:** 動画単位のTranscript処理状態を管理する ([#33](https://github.com/uchi-stock/youtube-radar/issues/33)) ([c9d08cb](https://github.com/uchi-stock/youtube-radar/commit/c9d08cb645755408022f88a883d73a413628d032))

## [1.2.5](https://github.com/uchi-stock/youtube-radar/compare/v1.2.4...v1.2.5) (2026-09-05)


### Bug Fixes

* **pipeline:** 1回の実行あたりのTranscript処理件数を制限する ([#32](https://github.com/uchi-stock/youtube-radar/issues/32)) ([fa00c53](https://github.com/uchi-stock/youtube-radar/commit/fa00c53be1c07bd152bc94b8137166a84f0d92d7))

## [1.2.4](https://github.com/uchi-stock/youtube-radar/compare/v1.2.3...v1.2.4) (2026-09-05)


### Bug Fixes

* **transcript:** 429時にバックオフでリトライし無制限リトライを避ける ([#31](https://github.com/uchi-stock/youtube-radar/issues/31)) ([7bcf901](https://github.com/uchi-stock/youtube-radar/commit/7bcf9015120355dff2e9d34f2962ec21853eebe8))

## [1.2.3](https://github.com/uchi-stock/youtube-radar/compare/v1.2.2...v1.2.3) (2026-09-05)


### Bug Fixes

* **transcript:** 字幕取得の429を字幕なしと区別し詳細をログに出す ([#30](https://github.com/uchi-stock/youtube-radar/issues/30)) ([fa42891](https://github.com/uchi-stock/youtube-radar/commit/fa428918e7d5966414dae2b061ac9b94461b9352))

## [1.2.2](https://github.com/uchi-stock/youtube-radar/compare/v1.2.1...v1.2.2) (2026-09-05)


### Bug Fixes

* Lambda呼び出し確認で全量のCloudWatch Logsを取得する ([#23](https://github.com/uchi-stock/youtube-radar/issues/23)) ([9b689bf](https://github.com/uchi-stock/youtube-radar/commit/9b689bf78aa5cd12ae5c34f2d77b73b34ebff496))

## [1.2.1](https://github.com/uchi-stock/youtube-radar/compare/v1.2.0...v1.2.1) (2026-09-04)


### Bug Fixes

* Lambda呼び出し結果をジョブログにも出力する ([#22](https://github.com/uchi-stock/youtube-radar/issues/22)) ([9340b40](https://github.com/uchi-stock/youtube-radar/commit/9340b40daec6d375a0811fd2db928fb9447ffb13))

# [1.2.0](https://github.com/uchi-stock/youtube-radar/compare/v1.1.0...v1.2.0) (2026-09-04)


### Features

* Lambdaパイプラインを手動実行し結果をJob Summaryへ出力するワークフローを追加する ([#21](https://github.com/uchi-stock/youtube-radar/issues/21)) ([bead47d](https://github.com/uchi-stock/youtube-radar/commit/bead47d3aab2f8e35562d2b096902f4e5b4c920d))

# [1.1.0](https://github.com/uchi-stock/youtube-radar/compare/v1.0.1...v1.1.0) (2026-09-04)


### Features

* パイプライン実行基盤をAWS Lambda（OSLS）へ移行する ([#20](https://github.com/uchi-stock/youtube-radar/issues/20)) ([dc30b66](https://github.com/uchi-stock/youtube-radar/commit/dc30b66d66b793ca430ce99e421e517e08606ddd))

## [1.0.1](https://github.com/uchi-stock/youtube-radar/compare/v1.0.0...v1.0.1) (2026-09-04)


### Bug Fixes

* 字幕トラック一覧から動的に選択して文字起こしを取得する ([#15](https://github.com/uchi-stock/youtube-radar/issues/15)) ([2f79db2](https://github.com/uchi-stock/youtube-radar/commit/2f79db2cdfc422a81f1257f8b0b50ac699035832))

# 1.0.0 (2026-09-04)


### Bug Fixes

* ルートpackage.jsonにsemantic-release関連の依存関係を追加する ([#11](https://github.com/uchi-stock/youtube-radar/issues/11)) ([a7fbf65](https://github.com/uchi-stock/youtube-radar/commit/a7fbf65a2f64c4ac480963b4cd4650eb89c84569))


### Features

* LLM要約をGemini APIへ切り替え、LINE未設定時はJob Summaryで確認可能にする ([#5](https://github.com/uchi-stock/youtube-radar/issues/5)) ([01e8dfc](https://github.com/uchi-stock/youtube-radar/commit/01e8dfc4de292a05f3bfa2504f0938d1d03ab51b))
* Phase 1 PoCパイプラインとdev-standards共通ルールの初期構築 ([#2](https://github.com/uchi-stock/youtube-radar/issues/2)) ([f9ee20f](https://github.com/uchi-stock/youtube-radar/commit/f9ee20fe450ac1165aceca2d75808181c58e8ee1))
* semantic-releaseによるバージョニング（CD）を有効化する ([#9](https://github.com/uchi-stock/youtube-radar/issues/9)) ([a846a27](https://github.com/uchi-stock/youtube-radar/commit/a846a2774f24ca00ab5d96298f36db357c1321ac))
* 監視対象チャンネルをYouTubeのチャンネル登録一覧から自動取得する ([#7](https://github.com/uchi-stock/youtube-radar/issues/7)) ([efc1fec](https://github.com/uchi-stock/youtube-radar/commit/efc1fecdb3dfdaf41dbec9aa15f0446a0d4edf53))
