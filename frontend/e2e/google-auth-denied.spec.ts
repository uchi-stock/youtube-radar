import { expect, test } from "./coverageFixture.js"; // symlink
import { captureScreenshot } from "./screenshot.js"; // symlink

// 既存のE2E（login-error.spec.ts）はアクセストークン取得自体は成功し、その後の
// userinfo API呼び出しが失敗するケースを検証している。本テストは、Googleの同意画面を
// 閉じる等でOAuth認可自体が失敗するケース（GISのcallbackがaccess_tokenを返さず
// errorを返す）を検証する。googleAuth.tsのrequestAccessToken内、
// response.error || !response.access_tokenの分岐が未カバーだった。
test("Googleの同意画面でアクセスを拒否した場合はログイン画面にエラーメッセージを表示する", async ({
  page,
}, testInfo) => {
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );
  await page.addInitScript(() => {
    // @ts-expect-error テスト用スタブのためgoogleAuth.tsの型定義とは合わせない
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config: { callback: (response: { error: string }) => void }) => ({
            requestAccessToken: () => config.callback({ error: "access_denied" }),
          }),
          revoke: (_accessToken: string, done: () => void) => done(),
        },
      },
    };
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Googleでログイン" }).click();

  await expect(page.getByRole("alert")).toContainText("access_denied");
  await captureScreenshot(page, testInfo, "google-auth-denied", "Google認可拒否時のエラー");
});
