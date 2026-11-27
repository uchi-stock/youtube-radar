import { expect, test } from "./coverageFixture.js"; // symlink
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// login.spec.ts・video-detail.spec.tsではカバーしていない「チャンネル一覧に戻る」・
// 「ユーザーメニューからログアウトする」golden pathを検証する。動画一覧自体の検証は
// video-detail.spec.tsが担うため、ここではplaylistItemsを空にしvideos.list呼び出し
// 自体を発生させない（channelVideos.tsはvideoIdsが空の場合videos.listを呼ばない）
// ことで、モックの重複を避けている。
test("チャンネル一覧に戻り、ユーザーメニューからログアウトできる", async ({ page }, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: "UC_test_channel", title: "テストチャンネル" }]);

  await page.route("https://www.googleapis.com/youtube/v3/channels**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ contentDetails: { relatedPlaylists: { uploads: "UU_test_uploads" } } }],
      }),
    }),
  );
  await page.route("https://www.googleapis.com/youtube/v3/playlistItems**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
  );

  await login(page);
  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();

  await page.getByText("テストチャンネル").click();
  await expect(page.getByText("テストチャンネルの最新動画")).toBeVisible();

  await page.getByRole("button", { name: "← チャンネル一覧に戻る" }).click();
  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();

  await page.getByRole("button", { name: "テストユーザー" }).click();
  const logoutButton = page.getByRole("button", { name: "ログアウト" });
  await expect(logoutButton).toBeVisible();
  await captureScreenshot(page, testInfo, "user-menu", "ユーザーメニュー");

  await logoutButton.click();
  await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();
});
