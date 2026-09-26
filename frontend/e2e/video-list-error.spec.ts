import { expect, test } from "./coverageFixture.js"; // symlink
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// 既存のvideo-detail.spec.ts・tag-filter.spec.tsはいずれも動画一覧取得が成功する
// ケースのみを検証しており、channelVideos.tsのエラー分岐（HTTPエラー時にthrowする箇所）が
// E2Eで未カバーだった。チャンネル選択後の動画一覧取得（channels.list）が失敗した場合に
// エラーメッセージが表示されるgolden pathを検証する。
test("動画一覧の取得に失敗した場合はエラーメッセージを表示する", async ({ page }, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: "UC_test_channel", title: "テストチャンネル" }]);

  await page.route("https://www.googleapis.com/youtube/v3/channels**", (route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "forbidden" }) }),
  );

  await login(page);
  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();

  await page.getByRole("button", { name: "テストチャンネル" }).click();

  await expect(page.getByRole("alert")).toContainText("HTTP 403");
  await captureScreenshot(page, testInfo, "video-list-error", "動画一覧取得エラー");
});
