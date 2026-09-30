import { expect, test } from "./coverageFixture.js"; // symlink
import { mockGoogleLogin, login } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// ServiceWorkerRegistration.jsx・UpdateNotifier.jsxはいずれもE2Eで未カバーだった
// （実際のService Worker登録・更新ライフサイクルはヘッドレスブラウザでは再現が困難なため）。
// navigator.serviceWorkerを最小限のスタブへ差し替え、(1)既存controller配下での
// controllerchangeイベントによる更新通知バナー表示、(2) visibilitychange時の
// registration.update()呼び出し、の2つのgolden pathを検証する。
// 「更新する」ボタンのwindow.location.reload()呼び出しは、ブラウザ組み込みの
// Locationオブジェクトが保護されておりテストダブルで差し替えられないため、
// クリック自体の到達性（ボタンが存在し操作できること）のみを確認する。
test("Service Worker更新検知時に更新通知バナーを表示する", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const listeners: Record<string, () => void> = {};
    // @ts-expect-error テスト用スタブのため実際のServiceWorkerContainer型とは合わせない
    window.__swListeners = listeners;
    // @ts-expect-error テスト用スタブのため実際のwindow型とは合わせない
    window.__swUpdateCalled = false;

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        controller: {},
        register: () =>
          Promise.resolve({
            update: () => {
              // @ts-expect-error テスト用スタブ
              window.__swUpdateCalled = true;
              return Promise.resolve();
            },
          }),
        addEventListener: (type: string, cb: () => void) => {
          listeners[type] = cb;
        },
        removeEventListener: (type: string) => {
          delete listeners[type];
        },
      },
      configurable: true,
    });
  });

  await mockGoogleLogin(page, [{ channelId: "UC_test_channel", title: "テストチャンネル" }]);
  await login(page);
  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();

  // ServiceWorkerRegistrationのregister().then()が解決するのを待ち、
  // visibilitychangeを発火してregistration.update()呼び出し分岐をカバーする
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __swUpdateCalled: boolean }).__swUpdateCalled))
    .toBe(true);

  // controllerchangeイベントで更新通知バナーを表示させる
  await page.evaluate(() =>
    (window as unknown as { __swListeners: Record<string, () => void> }).__swListeners.controllerchange(),
  );
  await expect(page.getByText("新しいバージョンがあります")).toBeVisible();
  await expect(page.getByRole("button", { name: "更新する" })).toBeVisible();
  await captureScreenshot(page, testInfo, "pwa-update-notification", "更新通知バナー");
});
