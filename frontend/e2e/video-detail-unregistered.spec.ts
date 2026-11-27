import { expect, test } from "./coverageFixture.js"; // symlink
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// 既存のvideo-detail.spec.tsはGET /videos/{videoId}が200（PENDING）を返すケースのみを
// 検証しており、videoDetail.tsの404分岐（新着検知バッチがまだ拾っていない、バックエンド
// 未登録の動画）・VideoList.tsxの「未処理（まだ巡回対象に登録されていません）」表示分岐が
// 未カバーだった。
const CHANNEL_ID = "UC_test_channel";
const VIDEO_ID = "test_video_unregistered";

test("バックエンド未登録の動画は「未処理」と表示する", async ({ page }, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: CHANNEL_ID, title: "テストチャンネル" }]);

  await page.route("https://www.googleapis.com/youtube/v3/channels**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [{ contentDetails: { relatedPlaylists: { uploads: "UU_test_uploads" } } }] }),
    }),
  );
  await page.route("https://www.googleapis.com/youtube/v3/playlistItems**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            snippet: {
              resourceId: { videoId: VIDEO_ID },
              title: "未登録の動画",
              publishedAt: "2026-09-01T00:00:00Z",
              thumbnails: { default: { url: "" } },
            },
          },
        ],
      }),
    }),
  );
  await page.route("https://www.googleapis.com/youtube/v3/videos**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            id: VIDEO_ID,
            snippet: { description: "" },
            contentDetails: { duration: "PT1M0S", caption: "false" },
            statistics: { viewCount: "1", likeCount: "0", commentCount: "0" },
          },
        ],
      }),
    }),
  );
  await page.route("**/videos?ids=*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ videos: [] }) }),
  );
  await page.route(`**/videos/${VIDEO_ID}`, (route) => route.fulfill({ status: 404 }));

  await login(page);
  await page.getByText("テストチャンネル").click();
  await expect(page.getByText("未登録の動画")).toBeVisible();

  await page.getByText("未登録の動画").click();
  await expect(page.getByText("未処理（まだ巡回対象に登録されていません）")).toBeVisible();
  await captureScreenshot(page, testInfo, "video-detail-unregistered", "未登録動画の詳細表示");
});
