import { expect, test } from "./coverageFixture.js"; // symlink
import { mockGoogleLogin, login } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// 既存のE2Eはいずれもチャンネルにアップロード動画プレイリストが存在するケースのみを
// 検証しており、channelVideos.tsの「アップロード動画プレイリストが存在しない場合は
// 空配列を返す」分岐（YouTube Data APIのchannels.listレスポンスに
// contentDetails.relatedPlaylists.uploadsが含まれないケース）が未カバーだった。
test("アップロード動画プレイリストが無いチャンネルを選択すると空の動画一覧を表示する", async ({
  page,
}, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: "UC_no_uploads", title: "動画無しチャンネル" }]);

  await page.route("https://www.googleapis.com/youtube/v3/channels**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [{ contentDetails: {} }] }),
    }),
  );

  await login(page);
  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();

  await page.getByText("動画無しチャンネル").click();

  await expect(page.getByText("動画無しチャンネルの最新動画")).toBeVisible();
  await expect(page.locator(".list-group-item")).toHaveCount(0);
  await captureScreenshot(page, testInfo, "channel-no-uploads", "アップロード動画が無いチャンネル");

  await page.getByRole("button", { name: "← チャンネル一覧に戻る" }).click();
  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();
});
