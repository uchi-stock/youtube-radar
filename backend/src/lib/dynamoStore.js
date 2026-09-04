import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

export function createStore(tableName, { client = DynamoDBDocumentClient.from(new DynamoDBClient({})) } = {}) {
  return {
    async loadProcessedIds() {
      const ids = new Set();
      let ExclusiveStartKey;
      do {
        const { Items, LastEvaluatedKey } = await client.send(
          new ScanCommand({ TableName: tableName, ProjectionExpression: "videoId", ExclusiveStartKey }),
        );
        for (const item of Items ?? []) {
          ids.add(item.videoId);
        }
        ExclusiveStartKey = LastEvaluatedKey;
      } while (ExclusiveStartKey);
      return ids;
    },

    async markProcessed(videoId) {
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: { videoId, processedAt: new Date().toISOString() },
        }),
      );
    },
  };
}
