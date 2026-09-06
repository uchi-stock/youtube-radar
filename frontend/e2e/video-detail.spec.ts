import { expect, test } from "@playwright/test";
import { login, mockGoogleLogin } from "./mockGoogleLogin.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

// login.spec.tsと同様、YouTube Data APIへのレスポンスをpage.route()でモックする
// （理由はmockGoogleLogin.tsのコメント参照）。ここではチャンネル選択後に呼ばれる
// channels.list（アップロード用プレイリストID取得）・playlistItems.list（動画一覧）・
// videos.list（統計・概要欄等）もモック対象に含める。
const CHANNEL_ID = "UC_test_channel";
const VIDEO_ID = "test_video_1";
const VIDEO_DESCRIPTION = "概要欄のテキストです。 https://example.com/detail も参照。";

test("チャンネル選択後、動画一覧・動画詳細が表示される", async ({ page }, testInfo) => {
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
              resourceId: { videoId: VIDEO_ID },
              title: "テスト動画のタイトル",
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
            snippet: { description: VIDEO_DESCRIPTION },
            contentDetails: { duration: "PT5M9S", caption: "true" },
            statistics: { viewCount: "12345", likeCount: "555", commentCount: "77" },
          },
        ],
      }),
    }),
  );

  await login(page);
  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();

  await page.getByText("テストチャンネル").click();

  await expect(page.getByText("テストチャンネルの最新動画")).toBeVisible();
  await expect(page.getByText("テスト動画のタイトル")).toBeVisible();
  await expect(page.getByText("12,345回視聴・5:09")).toBeVisible();
  await captureScreenshot(page, testInfo, "video-list", "動画一覧");

  await page.getByText("テスト動画のタイトル").click();

  await expect(page.getByRole("link", { name: "YouTubeで視聴" })).toHaveAttribute(
    "href",
    `https://www.youtube.com/watch?v=${VIDEO_ID}`,
  );
  await expect(page.getByText("555")).toBeVisible();
  await expect(page.getByText("77")).toBeVisible();
  await expect(page.getByText("あり")).toBeVisible();
  await expect(page.getByRole("link", { name: "https://example.com/detail" })).toBeVisible();
  // VITE_TRANSCRIPT_API_BASE_URLがE2Eビルドでは未設定のため、要約表示は代替の
  // 案内文で確認する（backendの実データに依存する要約表示自体は対象外とする）。
  await expect(page.getByText("文字起こしAPIが設定されていません")).toBeVisible();
  await captureScreenshot(page, testInfo, "video-detail", "動画詳細");
});
