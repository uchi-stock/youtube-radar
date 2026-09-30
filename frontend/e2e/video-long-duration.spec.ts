import { expect, test } from "./coverageFixture.js"; // symlink
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// 既存のE2Eはいずれも1時間未満の動画（"PT5M9S"等）・高画質サムネイル無しの
// レスポンスのみを検証しており、channelVideos.tsの「1時間以上の動画の時刻表示
// （H:MM:SS形式）」「サムネイルURLの優先順位（high優先）」分岐が未カバーだった。
const CHANNEL_ID = "UC_test_channel";
const VIDEO_ID = "test_video_long";

test("1時間を超える動画は時:分:秒形式で長さを表示し、高画質サムネイルを優先する", async ({
  page,
}, testInfo) => {
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
              title: "長尺動画",
              publishedAt: "2026-09-01T00:00:00Z",
              thumbnails: {
                default: { url: "https://example.com/default.jpg" },
                medium: { url: "https://example.com/medium.jpg" },
                high: { url: "https://example.com/high.jpg" },
              },
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
            contentDetails: { duration: "PT1H2M3S", caption: "false" },
            statistics: { viewCount: "100", likeCount: "1", commentCount: "1" },
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

  await expect(page.getByText("100回視聴・1:02:03")).toBeVisible();
  await expect(page.locator(`img[src="https://example.com/high.jpg"]`)).toHaveCount(1);
  await captureScreenshot(page, testInfo, "video-long-duration", "1時間超の動画の長さ表示");
});
