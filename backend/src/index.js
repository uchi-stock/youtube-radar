import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "./pipeline.js";
import { loadProcessedVideoIds, saveProcessedVideoIds } from "./lib/store.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const CHANNELS_PATH = path.join(dirname, "config/channels.json");
const PROCESSED_PATH = path.join(dirname, "../data/processed-videos.json");

async function main() {
  const channels = JSON.parse(await readFile(CHANNELS_PATH, "utf-8"));
  const processedIds = await loadProcessedVideoIds(PROCESSED_PATH);

  const results = await runPipeline({
    channels,
    processedIds,
    env: process.env,
  });

  await saveProcessedVideoIds(PROCESSED_PATH, processedIds);

  const failed = results.filter((r) => r.status === "failed");
  console.log(`処理結果: 通知${results.length - failed.length}件 / 失敗${failed.length}件`);
  // 個別動画の失敗はプロセス全体の異常終了とは扱わない（次回実行でリトライする）。
}

main().catch((error) => {
  console.error("パイプライン実行中に予期しないエラーが発生しました:", error);
  process.exitCode = 1;
});
