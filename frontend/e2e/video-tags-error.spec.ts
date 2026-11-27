import { expect, test } from "./coverageFixture.js"; // symlink
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// 動画タグ一括取得（GET /videos?ids=...）はベストエフォートで行われ、失敗しても
// 動画一覧自体は表示を継続する設計（App.tsx）。既存のE2Eはこのエンドポイントが
// 成功するケースのみを検証しており、videoTags.tsの「backendが200以外のステータス
// を返す」エラー分岐が未カバーだった。
const CHANNEL_ID = "UC_test_channel";
const VIDEO_ID = "test_video_tags_error";

test("動画タグの取得に失敗しても動画一覧の表示は継続する", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

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
              title: "タグ取得失敗動画",
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
  await page.route("**/videos?ids=*", (route) => route.fulfill({ status: 500 }));

  await login(page);
  await page.getByText("テストチャンネル").click();

  await expect(page.getByText("タグ取得失敗動画")).toBeVisible();
  await expect.poll(() => consoleErrors.some((m) => m.includes("動画タグの取得に失敗しました"))).toBe(true);
  await captureScreenshot(page, testInfo, "video-tags-error", "動画タグ取得失敗時も動画一覧は表示継続する");
});
