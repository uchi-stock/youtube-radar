import { appendFile } from "node:fs/promises";

// LINE等の通知先が未設定でも、GitHub ActionsのJob Summaryへ常に要約結果を出力する。
// GITHUB_STEP_SUMMARY未定義（ローカル実行・テスト）の場合は何もしない。
export async function reportToJobSummary(text, { summaryPath = process.env.GITHUB_STEP_SUMMARY } = {}) {
  if (!summaryPath) {
    return;
  }
  await appendFile(summaryPath, `${text}\n\n---\n\n`);
}
