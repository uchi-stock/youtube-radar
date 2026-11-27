import { expect, test } from "./coverageFixture.js"; // symlink
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// channel-navigation.spec.tsはユーザーメニューからのログアウトのみを検証しており、
// 同じメニューにある「アプリリンクを共有」（ShareButton.jsx）golden pathがE2Eで
// 未カバーだった。クリップボードコピー機能を含むため、実行前にclipboard-write権限を
// 明示的に付与する。
test("ユーザーメニューからアプリリンクをQRコード共有できる", async ({ page, context }, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:4173" });

  await mockGoogleLogin(page, [{ channelId: "UC_test_channel", title: "テストチャンネル" }]);

  await login(page);
  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();

  await page.getByRole("button", { name: "テストユーザー" }).click();
  await page.getByRole("button", { name: "アプリリンクを共有" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("http://localhost:4173/")).toBeVisible();
  await captureScreenshot(page, testInfo, "share-button", "アプリリンク共有モーダル");

  await page.getByRole("button", { name: "URLをコピー" }).click();
  await expect(page.getByRole("button", { name: "コピーしました" })).toBeVisible();

  const copiedUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedUrl).toBe("http://localhost:4173/");

  await page.locator(".modal-footer").getByRole("button", { name: "閉じる" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
