import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./screenshot.js"; // symlink

// Google Identity Servicesの実スクリプトは対話的な同意画面を伴い自動操作できないため、
// 読み込み自体をブロックし、window.googleを固定のダミーアクセストークンを返すテスト用
// スタブへ差し替える。その先のYouTube Data API・userinfo APIも実際のAPIへは直結させず
// page.route()でレスポンス自体をモックする。実際のGoogleアカウント・OAuth認証情報が
// 無くても実行できるようにするための判断で、検証対象はあくまで「ログイン操作をきっかけに
// 取得結果がUIへ反映されること」に絞る（実際のGoogle API疎通そのものはgoogleAuth.ts等の
// ユニットテスト、および本番環境での動作で担保する）。
const FAKE_ACCESS_TOKEN = "e2e-fake-access-token";

test("ログイン後、登録チャンネル一覧が表示される", async ({ page }, testInfo) => {
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );
  await page.addInitScript((token) => {
    // @ts-expect-error テスト用スタブのためgoogleAuth.tsの型定義とは合わせない
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config: { callback: (response: { access_token: string }) => void }) => ({
            requestAccessToken: () => config.callback({ access_token: token }),
          }),
          revoke: (_accessToken: string, done: () => void) => done(),
        },
      },
    };
  }, FAKE_ACCESS_TOKEN);

  await page.route("https://www.googleapis.com/youtube/v3/subscriptions**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            snippet: {
              resourceId: { channelId: "UC_test_channel" },
              title: "テストチャンネル",
              thumbnails: { default: { url: "" } },
            },
          },
        ],
      }),
    }),
  );
  await page.route("https://www.googleapis.com/oauth2/v3/userinfo", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ name: "テストユーザー", picture: "https://example.com/avatar.png" }),
    }),
  );

  await page.goto("/");
  await page.getByRole("button", { name: "Googleでログイン" }).click();

  await expect(page.getByText("登録チャンネル: 1件")).toBeVisible();
  await expect(page.getByText("テストチャンネル")).toBeVisible();

  await captureScreenshot(page, testInfo, "channel-list", "登録チャンネル一覧");
});
