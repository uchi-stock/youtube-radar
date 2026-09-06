import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./screenshot.js"; // symlink

test("ログイン前画面にアプリ概要説明とログインボタンを表示する", async ({ page }, testInfo) => {
  await page.goto("/");

  await expect(page.getByText(/文字起こしを要約・重要度判定してLINEへ通知する/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Googleでログイン" })).toBeVisible();

  await captureScreenshot(page, testInfo, "pre-login", "ログイン前画面");
});
