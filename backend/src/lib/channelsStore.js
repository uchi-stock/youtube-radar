import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// 登録チャンネル一覧の永続化。テーブルはuserEmail（パーティションキー）＋channelId（ソートキー）の複合キー。
// ユーザーは自分自身の行にしか書き込まない設計にしているため、書き込み時に他ユーザーとの照合は不要。
// discover Lambda（新着検知）は全ユーザー分をScanし、channelIdで重複排除した和集合を対象にする。
export function createChannelsStore(tableName, { client = DynamoDBDocumentClient.from(new DynamoDBClient({})) } = {}) {
  async function loadChannelsForUser(userEmail) {
    const channels = [];
    let ExclusiveStartKey;
    do {
      const { Items, LastEvaluatedKey } = await client.send(
        new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: "userEmail = :userEmail",
          ExpressionAttributeValues: { ":userEmail": userEmail },
          ExclusiveStartKey,
        }),
      );
      channels.push(...(Items ?? []));
      ExclusiveStartKey = LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return channels;
  }

  async function loadAllChannels() {
    const items = [];
    let ExclusiveStartKey;
    do {
      const { Items, LastEvaluatedKey } = await client.send(
        new ScanCommand({ TableName: tableName, ExclusiveStartKey }),
      );
      items.push(...(Items ?? []));
      ExclusiveStartKey = LastEvaluatedKey;
    } while (ExclusiveStartKey);

    const byChannelId = new Map();
    for (const item of items) {
      byChannelId.set(item.channelId, item);
    }
    return [...byChannelId.values()];
  }

  return {
    loadAllChannels,

    // 渡されたチャンネル一覧でuserEmailの永続化内容を置き換える（一覧に無くなったチャンネルは削除する）。
    async saveChannels(userEmail, channels) {
      const existing = await loadChannelsForUser(userEmail);
      const newIds = new Set(channels.map((channel) => channel.channelId));

      for (const channel of channels) {
        await client.send(
          new PutCommand({
            TableName: tableName,
            Item: { ...channel, userEmail, updatedAt: new Date().toISOString() },
          }),
        );
      }
      for (const channel of existing) {
        if (!newIds.has(channel.channelId)) {
          await client.send(
            new DeleteCommand({ TableName: tableName, Key: { userEmail, channelId: channel.channelId } }),
          );
        }
      }
    },
  };
}
