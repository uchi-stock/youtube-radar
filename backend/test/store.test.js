import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadProcessedVideoIds, saveProcessedVideoIds } from "../src/lib/store.js";

describe("store", () => {
  let dir;
  let filePath;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "youtube-radar-"));
    filePath = path.join(dir, "processed-videos.json");
    await saveProcessedVideoIds(filePath, new Set());
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("保存したIDを読み込める", async () => {
    await saveProcessedVideoIds(filePath, new Set(["v2", "v1"]));

    const ids = await loadProcessedVideoIds(filePath);

    expect([...ids].sort()).toEqual(["v1", "v2"]);
  });
});
