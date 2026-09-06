import { afterEach, describe, expect, it, vi } from "vitest";
import { handler } from "../src/channelsApiLambda.js";
import * as channelsApi from "../src/channelsApi.js";

function makeEvent({ method = "POST", path = "/channels", authorization, body } = {}) {
  return {
    requestContext: { http: { method } },
    rawPath: path,
    headers: authorization ? { authorization } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}

describe("channelsApiLambda", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /channels以外は404を返す", async () => {
    const res = await handler(makeEvent({ method: "GET", path: "/channels" }));
    expect(res.statusCode).toBe(404);
  });

  it("不正なJSONボディの場合は400を返す", async () => {
    const event = makeEvent({ authorization: "Bearer token" });
    event.body = "{invalid";

    const res = await handler(event);

    expect(res.statusCode).toBe(400);
  });

  it("submitChannelsがunauthorizedを返した場合は401を返す", async () => {
    vi.spyOn(channelsApi, "submitChannels").mockResolvedValue({ status: "unauthorized" });

    const res = await handler(makeEvent({ authorization: "Bearer token", body: { channels: [] } }));

    expect(res.statusCode).toBe(401);
  });

  it("submitChannelsがsavedを返した場合は200と件数を返す", async () => {
    vi.spyOn(channelsApi, "submitChannels").mockResolvedValue({ status: "saved", count: 2 });

    const res = await handler(makeEvent({ authorization: "Bearer token", body: { channels: [{}, {}] } }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ saved: 2 });
  });
});
