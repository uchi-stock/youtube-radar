import { buildOpsAlertMessage, sendOpsAlert } from "./opsAlertNotifier.js";

// CloudWatch Alarmの状態変化がSNS Topic（backend/serverless.yml参照）経由でこのLambdaを
// 起動する。1回の呼び出しで複数レコードが来ることは通常無いが、SNSの仕様上複数件になり
// うるため、念のためRecordsをループする（Issue #122）。
export async function handler(event, { env = process.env, sendOpsAlertImpl = sendOpsAlert } = {}) {
  for (const record of event.Records ?? []) {
    const alarm = JSON.parse(record.Sns.Message);
    const message = buildOpsAlertMessage({
      appName: "youtube-radar",
      alarmName: alarm.AlarmName,
      newState: alarm.NewStateValue,
      reason: alarm.NewStateReason,
    });
    await sendOpsAlertImpl({
      message,
      channelAccessToken: env.OPS_ALERT_LINE_CHANNEL_ACCESS_TOKEN,
      userId: env.OPS_ALERT_LINE_USER_ID,
    });
  }
}
