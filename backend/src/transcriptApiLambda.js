import { createStore } from "./lib/dynamoStore.js";
import { getPendingVideos, getVideoDetail, submitTranscriptResult } from "./transcriptApi.js";

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

// GET /videos/{videoId}は、frontendがブラウザから直接呼ぶ読み取り専用の公開エンドポイント
// （処理状態・要約のみを返す非秘匿データのため）。他のパスはRaspberry Pi専用のため認証が必須。
function isPublicPath(method, path) {
  return method === "GET" && path.startsWith("/videos/");
}

export async function handler(event) {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  if (!isPublicPath(method, path) && !isAuthorized(event)) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  const store = createStore(process.env.PROCESSED_VIDEOS_TABLE);

  if (method === "GET" && path.startsWith("/videos/")) {
    const videoId = event.pathParameters?.videoId;
    const detail = await getVideoDetail({ store, videoId });
    if (!detail) {
      return jsonResponse(404, { error: "not_registered" });
    }
    return jsonResponse(200, detail);
  }

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
