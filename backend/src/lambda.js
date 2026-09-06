import { runDiscovery } from "./discovery.js";
import { createStore } from "./lib/dynamoStore.js";
import { createChannelsStore } from "./lib/channelsStore.js";

// 新着検知用Lambda。YouTube Data APIで新着動画を確認し、DynamoDBにPENDINGとして登録するのみ。
// Transcript取得・要約・LINE通知はtranscriptWorkerLambda.jsが別Lambdaとして行う。
export async function handler() {
  const channelsStore = createChannelsStore(process.env.CHANNELS_TABLE);
  const channels = await channelsStore.loadAllChannels();
  console.log(`チャンネル一覧を${channels.length}件読み込みました`);

  const store = createStore(process.env.PROCESSED_VIDEOS_TABLE);
  const results = await runDiscovery({ channels, store, env: process.env });

  console.log(`新着検知結果: PENDING登録${results.length}件`);
  return { pending: results.length };
}
