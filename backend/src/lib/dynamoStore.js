import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// 動画単位のTranscript処理状態。
export const VIDEO_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  TRANSCRIPT_NOT_FOUND: "TRANSCRIPT_NOT_FOUND",
  FAILED: "FAILED",
};

// 再試行しても結果が変わらない状態（＝もう処理済みとして扱ってよい状態）。
// statusが無い既存レコード（本Issue以前にmarkProcessedのみで書き込まれたもの）も
// 処理済みとして扱う後方互換のため、loadProcessedIdsではstatus未設定も含める。
const SKIP_STATUSES = new Set([VIDEO_STATUS.COMPLETED, VIDEO_STATUS.TRANSCRIPT_NOT_FOUND]);

// テーブルはvideoId単一キーのみ（GSI無し）。動画数が少量である前提のため、
// 状態によるフィルタはScan+FilterExpressionで十分と判断した。将来的に件数が
// 増え性能が問題になる場合はstatusのGSI追加を検討する。
export function createStore(tableName, { client = DynamoDBDocumentClient.from(new DynamoDBClient({})) } = {}) {
  async function setStatus(videoId, status, extra = {}) {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: { videoId, status, updatedAt: new Date().toISOString(), ...extra },
      }),
    );
  }

  return {
    async loadProcessedIds() {
      const ids = new Set();
      let ExclusiveStartKey;
      do {
        const { Items, LastEvaluatedKey } = await client.send(
          new ScanCommand({
            TableName: tableName,
            ProjectionExpression: "videoId, #s",
            ExpressionAttributeNames: { "#s": "status" },
            ExclusiveStartKey,
          }),
        );
        for (const item of Items ?? []) {
          if (!item.status || SKIP_STATUSES.has(item.status)) {
            ids.add(item.videoId);
          }
        }
        ExclusiveStartKey = LastEvaluatedKey;
      } while (ExclusiveStartKey);
      return ids;
    },

    // 後方互換のため維持。内部的にはCOMPLETED状態の書き込みに委譲する。
    async markProcessed(videoId) {
      await setStatus(videoId, VIDEO_STATUS.COMPLETED);
    },

    async setStatus(videoId, status, extra = {}) {
      await setStatus(videoId, status, extra);
    },

    async getStatus(videoId) {
      const { Item } = await client.send(new GetCommand({ TableName: tableName, Key: { videoId } }));
      return Item;
    },

    async loadByStatus(status) {
      const items = [];
      let ExclusiveStartKey;
      do {
        const { Items, LastEvaluatedKey } = await client.send(
          new ScanCommand({
            TableName: tableName,
            FilterExpression: "#s = :status",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":status": status },
            ExclusiveStartKey,
          }),
        );
        items.push(...(Items ?? []));
        ExclusiveStartKey = LastEvaluatedKey;
      } while (ExclusiveStartKey);
      return items;
    },
  };
}
