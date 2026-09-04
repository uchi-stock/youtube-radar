// enable_shared_release_config: trueにより、CD実行時（release job内）に
// dev-standardsのrelease-config.cjsがこのリポジトリのルートへコピーされる。
// 本リポジトリはfrontendを持たないため、CHANGELOG.md→JSON変換（既定の
// changelogPrepareCmd）は不要でno-opにする（dev-standards自身の.releaserc.cjsと同様）。
const { buildReleaseConfig } = require("./release-config.cjs");

module.exports = buildReleaseConfig({
  repositoryUrl: "https://github.com/uchi-stock/youtube-radar.git",
  gitAssets: ["CHANGELOG.md", "package.json", "package-lock.json"],
  changelogPrepareCmd: "true",
});
