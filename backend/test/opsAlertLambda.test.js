import { describe, expect, it, vi } from "vitest";
import { handler } from "../src/opsAlertLambda.js";

function snsEvent(alarm) {
  return { Records: [{ Sns: { Message: JSON.stringify(alarm) } }] };
}

describe("opsAlertLambda handler", () => {
  it("CloudWatch AlarmのSNS通知内容からメッセージを組み立てて送信する", async () => {
    const sendOpsAlertImpl = vi.fn().mockResolvedValue(undefined);
    const event = snsEvent({
      AlarmName: "youtube-radar-dev-transcriptApi-no-invocations",
      NewStateValue: "ALARM",
      NewStateReason: "Threshold Crossed",
    });

    await handler(event, {
      env: { OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN: "token", OPS_ALERT_LINE_USER_ID: "user1" },
      sendOpsAlertImpl,
    });

    expect(sendOpsAlertImpl).toHaveBeenCalledTimes(1);
    const call = sendOpsAlertImpl.mock.calls[0][0];
    expect(call.channelAccessToken).toBe("token");
    expect(call.userId).toBe("user1");
    expect(call.message).toContain("アプリ: youtube-radar");
    expect(call.message).toContain("youtube-radar-dev-transcriptApi-no-invocations");
    expect(call.message).toContain("状態: ALARM");
    expect(call.message).toContain("詳細: Threshold Crossed");
  });

  it("複数レコードが来た場合は全件処理する", async () => {
    const sendOpsAlertImpl = vi.fn().mockResolvedValue(undefined);
    const event = {
      Records: [
        { Sns: { Message: JSON.stringify({ AlarmName: "alarm1", NewStateValue: "ALARM" }) } },
        { Sns: { Message: JSON.stringify({ AlarmName: "alarm2", NewStateValue: "OK" }) } },
      ],
    };

    await handler(event, { env: {}, sendOpsAlertImpl });

    expect(sendOpsAlertImpl).toHaveBeenCalledTimes(2);
  });

  it("Recordsが無い場合は何もしない", async () => {
    const sendOpsAlertImpl = vi.fn();

    await handler({}, { env: {}, sendOpsAlertImpl });

    expect(sendOpsAlertImpl).not.toHaveBeenCalled();
  });
});
