// sw.js（symlink、dev-standards/shared/pwa/sw.js）が読み込むプロダクト固有設定。
// 詳細はdev-standards/docs/service-worker-update-pattern.mdを参照。
//
// apiHostnamesは空にしている。YouTube Data API・userinfo APIはユーザーの
// アカウントごとに内容が変わる（かつCache StorageのキーはCookie等を考慮しない）ため、
// Service Workerでのキャッシュ対象には含めない（PWAの更新反映問題の解消に範囲を絞る）。
self.SW_CONFIG = {
  cacheVersion: "v1",
  precacheUrls: ["/"],
  apiHostnames: [],
};
