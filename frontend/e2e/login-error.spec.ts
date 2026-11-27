import { expect, test } from "./coverageFixture.js"; // symlink
import { mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// 既存のE2Eはログイン自体は常に成功するケースのみを検証しており、
// googleUserInfo.tsのエラー分岐（HTTPエラー時にthrowする箇所）・LoginScreen.tsxの
// エラーメッセージ表示分岐が未カバーだった。ユーザー情報取得（userinfo API）が
// 失敗した場合にログイン画面へエラーメッセージが表示されるgolden pathを検証する。
test("ユーザー情報の取得に失敗した場合はログイン画面にエラーメッセージを表示する", async ({
  page,
}, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: "UC_test_channel", title: "テストチャンネル" }]);

  await page.route("https://www.googleapis.com/oauth2/v3/userinfo", (route) =>
    route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "forbidden" }) }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Googleでログイン" }).click();

  await expect(page.getByRole("alert")).toContainText("HTTP 403");
  await captureScreenshot(page, testInfo, "login-error", "ログインエラー");
});
