import { expect, test } from "./coverageFixture.js"; // symlink
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// video-detail.spec.tsでは1動画のみを扱いタグ表示のみを検証しているため、ここでは
// タグの異なる2動画を用意し、フィルターチップによる絞り込み（Issue #126）を検証する。
const CHANNEL_ID = "UC_test_channel";
const VIDEO_ID_NEWS = "test_video_news";
const VIDEO_ID_GAME = "test_video_game";
const TAG_NEWS = "ニュース解説";
const TAG_GAME = "ゲーム実況";

test("タグフィルターチップで動画一覧を絞り込める", async ({ page }, testInfo) => {
  await mockGoogleLogin(page, [{ channelId: CHANNEL_ID, title: "テストチャンネル" }]);

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
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            snippet: {
              resourceId: { videoId: VIDEO_ID_NEWS },
              title: "ニュース解説動画",
              publishedAt: "2026-09-01T00:00:00Z",
              thumbnails: { default: { url: "" } },
            },
          },
          {
            snippet: {
              resourceId: { videoId: VIDEO_ID_GAME },
              title: "ゲーム実況動画",
              publishedAt: "2026-09-02T00:00:00Z",
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
            id: VIDEO_ID_NEWS,
            snippet: { description: "" },
            contentDetails: { duration: "PT3M0S", caption: "true" },
            statistics: { viewCount: "100", likeCount: "1", commentCount: "0" },
          },
          {
            id: VIDEO_ID_GAME,
            snippet: { description: "" },
            contentDetails: { duration: "PT4M0S", caption: "true" },
            statistics: { viewCount: "200", likeCount: "2", commentCount: "0" },
          },
        ],
      }),
    }),
  );
  await page.route("**/videos?ids=*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        videos: [
          { videoId: VIDEO_ID_NEWS, tags: [TAG_NEWS] },
          { videoId: VIDEO_ID_GAME, tags: [TAG_GAME] },
        ],
      }),
    }),
  );

  await login(page);
  await page.getByText("テストチャンネル").click();

  await expect(page.getByText("ニュース解説動画")).toBeVisible();
  await expect(page.getByText("ゲーム実況動画")).toBeVisible();

  const tagChip = page.getByRole("button", { name: TAG_NEWS, exact: true });
  await tagChip.click();

  await expect(page.getByText("ニュース解説動画")).toBeVisible();
  await expect(page.getByText("ゲーム実況動画")).not.toBeVisible();
  await captureScreenshot(page, testInfo, "tag-filter", "タグ絞り込み");

  // 再度クリックして選択解除すると、絞り込みが解除され両方表示される
  await tagChip.click();
  await expect(page.getByText("ゲーム実況動画")).toBeVisible();
});
