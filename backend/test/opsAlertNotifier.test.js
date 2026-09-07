import { describe, expect, it } from "vitest";
import { buildOpsAlertMessage, sendOpsAlert } from "../src/opsAlertNotifier.js";

describe("buildOpsAlertMessage", () => {
  it("アプリ名・アラーム名・状態・詳細を含む通知文を組み立てる", () => {
    const message = buildOpsAlertMessage({
      appName: "youtube-radar",
      alarmName: "youtube-radar-pipeline-dev-transcriptApi-no-invocations",
      newState: "ALARM",
      reason: "Threshold Crossed",
    });

    expect(message).toContain("アプリ: youtube-radar");
    expect(message).toContain("youtube-radar-pipeline-dev-transcriptApi-no-invocations");
    expect(message).toContain("状態: ALARM");
    expect(message).toContain("詳細: Threshold Crossed");
  });
});

describe("sendOpsAlert", () => {
  it("LINE Messaging APIのpushエンドポイントへメッセージを送信する", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200 };
    };

    await sendOpsAlert({ message: "テスト通知", channelAccessToken: "token", userId: "user1", fetchImpl });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.line.me/v2/bot/message/push");
  });

  it("LINE APIがエラーを返した場合は例外を投げる", async () => {
    const fetchImpl = async () => ({ ok: false, status: 500 });

    await expect(
      sendOpsAlert({ message: "テスト通知", channelAccessToken: "token", userId: "user1", fetchImpl }),
    ).rejects.toThrow("HTTP 500");
  });
});
