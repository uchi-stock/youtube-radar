import { expect, test } from "./coverageFixture.js"; // symlink
import { mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// login.spec.ts・channel-navigation.spec.tsはいずれも初回訪問（ログイン履歴無し）からの
// 操作を検証しているため、再訪問時のサイレント再ログイン（Issue #109）というgolden path
// がE2Eで未カバーだった。localStorageへ事前にログイン履歴を仕込んだ状態でページを開き、
// ログインボタン操作無しで登録チャンネル一覧が表示されることを検証する。
// あわせてチャンネル一覧同期API（POST /channels）の成功レスポンスもここで初めてモックし、
// 常にネットワークエラーとして失敗していた（＝処理成功時の分岐が一度も通っていなかった）
// syncChannels.tsのカバレッジも補う。
const STORAGE_KEY = "youtube-radar:lastLoggedInUser";

test("再訪問時、サイレント再ログインでログイン操作無しに登録チャンネル一覧が表示される", async ({
  page,
}, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: "UC_test_channel", title: "テストチャンネル" }]);

  await page.addInitScript(
    (key) => {
      localStorage.setItem(
        key,
        JSON.stringify({ name: "テストユーザー", picture: "https://example.com/icon.jpg" }),
      );
    },
    STORAGE_KEY,
  );

  await page.route("**/channels", (route) => route.fulfill({ status: 200, body: "" }));

  await page.goto("/");

  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();
  await expect(page.getByText("テストチャンネル")).toBeVisible();
  await expect(page.getByRole("button", { name: "Googleでログイン" })).not.toBeVisible();

  await captureScreenshot(page, testInfo, "returning-user", "再訪問時のサイレント再ログイン");
});
