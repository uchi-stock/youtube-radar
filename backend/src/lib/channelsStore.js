import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

// 登録チャンネル一覧の永続化。テーブルはchannelId単一キー（GSI無し）。
// dynamoStore.jsと同様、件数が少量である前提でScanのみを使う構成にしている。
export function createChannelsStore(tableName, { client = DynamoDBDocumentClient.from(new DynamoDBClient({})) } = {}) {
  async function loadChannels() {
    const channels = [];
    let ExclusiveStartKey;
    do {
      const { Items, LastEvaluatedKey } = await client.send(
        new ScanCommand({ TableName: tableName, ExclusiveStartKey }),
      );
      channels.push(...(Items ?? []));
      ExclusiveStartKey = LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return channels;
  }

  return {
    loadChannels,

    // 渡されたチャンネル一覧で永続化内容を置き換える（一覧に無くなったチャンネルは削除する）。
    async saveChannels(channels) {
      const existing = await loadChannels();
      const newIds = new Set(channels.map((channel) => channel.channelId));

      for (const channel of channels) {
        await client.send(
          new PutCommand({
            TableName: tableName,
            Item: { ...channel, updatedAt: new Date().toISOString() },
          }),
        );
      }
      for (const channel of existing) {
        if (!newIds.has(channel.channelId)) {
          await client.send(new DeleteCommand({ TableName: tableName, Key: { channelId: channel.channelId } }));
        }
      }
    },
  };
}
