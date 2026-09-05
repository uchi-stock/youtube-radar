import { runDiscovery } from "./discovery.js";
import { createStore } from "./lib/dynamoStore.js";
import { getAccessToken } from "./lib/googleAuth.js";
import { fetchSubscribedChannels } from "./lib/subscriptions.js";

// 新着検知用Lambda。YouTube Data APIで新着動画を確認し、DynamoDBにPENDINGとして登録するのみ。
// Transcript取得・要約・LINE通知はtranscriptWorkerLambda.jsが別Lambdaとして行う。
export async function handler() {
  const accessToken = await getAccessToken({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });
  const channels = await fetchSubscribedChannels(accessToken);
  console.log(`チャンネル登録一覧を${channels.length}件取得しました`);

  const store = createStore(process.env.PROCESSED_VIDEOS_TABLE);
  const results = await runDiscovery({ channels, store, env: process.env });

  console.log(`新着検知結果: PENDING登録${results.length}件`);
  return { pending: results.length };
}
