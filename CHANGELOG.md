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
