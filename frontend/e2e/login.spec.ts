import { expect, test } from "@playwright/test";
import { getTestAccessToken, loadGoogleTestCredentials } from "./googleTestAuth.js";
import { captureScreenshot } from "./screenshot.js"; // symlink

test("ログイン後、登録チャンネル一覧が表示される", async ({ page }, testInfo) => {
  const credentials = loadGoogleTestCredentials();
  test.skip(!credentials, "Google OAuth用のsecretsが無い環境ではスキップする（ローカル実行時等）");

  const accessToken = await getTestAccessToken(credentials!);

  // Google Identity Servicesの実スクリプトは対話的な同意画面を伴い自動操作できないため、
  // 読み込み自体をブロックし、window.googleを実アクセストークンを返すテスト用スタブへ
  // 差し替える。トークン自体はbackendが保持するリフレッシュトークンから実際に交換した
  // ものであり、以降のYouTube Data API・userinfo API呼び出しは本物のAPIへ直結する。
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
  }, accessToken);

  await page.goto("/");
  await page.getByRole("button", { name: "Googleでログイン" }).click();

  await expect(page.getByText(/登録チャンネル: \d+件/)).toBeVisible();

  await captureScreenshot(page, testInfo, "channel-list", "登録チャンネル一覧");
});
