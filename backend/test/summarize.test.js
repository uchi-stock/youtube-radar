import { describe, expect, it, vi } from "vitest";
import { summarizeTranscript } from "../src/lib/summarize.js";

describe("summarizeTranscript", () => {
  it("Gemini APIへ文字起こしを渡し、JSON応答から要約・重要度・視聴推奨度を取り出す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: JSON.stringify({ summary: ["要点1", "要点2", "要点3"], importance: 3, recommendation: 4 }) },
              ],
            },
          },
        ],
      }),
    });

    const result = await summarizeTranscript("タイトル", "文字起こし本文", "gemini-key", { fetchImpl });

    expect(result).toEqual({ summary: ["要点1", "要点2", "要点3"], importance: 3, recommendation: 4 });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("key=gemini-key");
    expect(JSON.parse(options.body).generationConfig).toEqual({ responseMimeType: "application/json" });
  });

  it("APIエラー時は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(summarizeTranscript("タイトル", "本文", "key", { fetchImpl })).rejects.toThrow(
      "LLM summarize failed: 500",
    );
  });
});
