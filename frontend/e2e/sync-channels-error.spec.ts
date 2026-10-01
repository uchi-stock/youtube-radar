import { expect, test } from "./coverageFixture.js"; // symlink
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// チャンネル一覧のbackendへの同期（POST /channels）はベストエフォートで行われ、
// 失敗してもログイン自体は失敗させない設計（syncChannels.ts）。既存のE2Eは
// このエンドポイントへの到達自体が常に失敗する（ネットワークエラー）か、
// returning-user.spec.tsで成功するケースのみを検証しており、
// 「backendが200以外のステータスを返す」syncChannels.tsのエラー分岐が未カバーだった。
test("チャンネル一覧の同期に失敗してもログイン自体は成功する", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await mockGoogleLogin(page, [{ channelId: "UC_test_channel", title: "テストチャンネル" }]);
  await page.route("**/channels", (route) => route.fulfill({ status: 500 }));

  await login(page);

  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();
  await expect(page.getByText("テストチャンネル")).toBeVisible();
  await expect.poll(() => consoleErrors.some((m) => m.includes("チャンネル一覧の同期に失敗しました"))).toBe(true);
  await captureScreenshot(page, testInfo, "sync-channels-error", "チャンネル同期失敗時もログインは成功する");
});
