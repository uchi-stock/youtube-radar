import { createStore } from "./lib/dynamoStore.js";
import { getPendingVideos, submitTranscriptResult } from "./transcriptApi.js";

function jsonResponse(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

// Raspberry Piからのリクエストのみ受け付ける。APIキー（共有シークレット）はx-api-keyヘッダーで
// 検証する。APIキー自体はログへ出力しない。
function isAuthorized(event) {
  const headers = event.headers ?? {};
  const apiKey = headers["x-api-key"] ?? headers["X-Api-Key"];
  return Boolean(process.env.PI_API_KEY) && apiKey === process.env.PI_API_KEY;
}

export async function handler(event) {
  if (!isAuthorized(event)) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  const store = createStore(process.env.PROCESSED_VIDEOS_TABLE);
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  if (method === "GET" && path === "/pending") {
    const videos = await getPendingVideos({
      store,
      maxVideosPerRun: Number(process.env.TRANSCRIPT_BATCH_SIZE ?? 5),
    });
    return jsonResponse(200, { videos });
  }

  if (method === "POST" && path === "/transcripts") {
    let body;
    try {
      body = JSON.parse(event.body ?? "{}");
    } catch {
      return jsonResponse(400, { error: "invalid JSON body" });
    }
    const result = await submitTranscriptResult({
      store,
      env: process.env,
      videoId: body.videoId,
      transcript: body.transcript,
      status: body.status,
    });
    if (result.status === "not_registered") {
      return jsonResponse(404, result);
    }
    return jsonResponse(result.status === "failed" ? 500 : 200, result);
  }

  return jsonResponse(404, { error: "not found" });
}
