import { expect, test } from "@playwright/test";
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

test("ログイン後、登録チャンネル一覧が表示される", async ({ page }, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: "UC_test_channel", title: "テストチャンネル" }]);

  await login(page);

  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();
  await expect(page.getByText("テストチャンネル")).toBeVisible();

  await captureScreenshot(page, testInfo, "channel-list", "登録チャンネル一覧");
});
