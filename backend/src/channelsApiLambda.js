import { createChannelsStore } from "./lib/channelsStore.js";
import { submitChannels } from "./channelsApi.js";

function jsonResponse(statusCode, body) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

export async function handler(event) {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;

  if (method !== "POST" || path !== "/channels") {
    return jsonResponse(404, { error: "not found" });
  }

  const headers = event.headers ?? {};
  const authHeader = headers.authorization ?? headers.Authorization ?? "";
  const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  let body;
  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return jsonResponse(400, { error: "invalid JSON body" });
  }

  const store = createChannelsStore(process.env.CHANNELS_TABLE);
  const result = await submitChannels({
    store,
    accessToken,
    channels: body.channels,
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  });

  if (result.status === "unauthorized") {
    return jsonResponse(401, { error: "unauthorized" });
  }
  if (result.status === "invalid_body") {
    return jsonResponse(400, { error: "channels must be an array" });
  }
  return jsonResponse(200, { saved: result.count });
}
