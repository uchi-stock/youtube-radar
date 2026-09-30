import { expect, test } from "./coverageFixture.js"; // symlink
import { mockGoogleLogin, login } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// 既存のE2Eはいずれも登録チャンネル一覧取得（subscriptions API）が1ページで
// 完結するケースのみを検証しており、youtubeApi.tsのページネーション分岐
// （nextPageTokenがある間、複数回リクエストして結果をマージする処理）が
// 未カバーだった。2ページにまたがる登録チャンネル一覧を取得するgolden pathを検証する。
test("登録チャンネル一覧が複数ページにまたがる場合も全件取得して表示する", async ({ page }, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: "UC_page1", title: "1ページ目チャンネル" }]);

  await page.route("https://www.googleapis.com/youtube/v3/subscriptions**", (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("pageToken") === "page2") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [
            {
              snippet: {
                resourceId: { channelId: "UC_page2" },
                title: "2ページ目チャンネル",
                thumbnails: { default: { url: "https://example.com/thumbnail2.jpg" } },
              },
            },
          ],
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            snippet: {
              resourceId: { channelId: "UC_page1" },
              title: "1ページ目チャンネル",
              thumbnails: { default: { url: "https://example.com/thumbnail1.jpg" } },
            },
          },
        ],
        nextPageToken: "page2",
      }),
    });
  });

  await login(page);

  await expect(page.getByText("登録チャンネル: 2件")).toBeVisible();
  await expect(page.getByText("1ページ目チャンネル")).toBeVisible();
  await expect(page.getByText("2ページ目チャンネル")).toBeVisible();
  await captureScreenshot(page, testInfo, "channel-pagination", "複数ページの登録チャンネル一覧");
});
