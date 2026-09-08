import { describe, expect, it, vi } from "vitest";
import { summarizeTranscript } from "../src/lib/summarize.js";

describe("summarizeTranscript", () => {
  it("Gemini APIへタイトル・概要欄・文字起こしを渡し、JSON応答から要約・重要度・視聴推奨度・タグを取り出す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: ["要点1", "要点2", "要点3"],
                    importance: 3,
                    recommendation: 4,
                    tags: ["ゲーム実況", "雑談"],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const result = await summarizeTranscript("タイトル", "概要欄本文", "文字起こし本文", "gemini-key", { fetchImpl });

    expect(result).toEqual({
      summary: ["要点1", "要点2", "要点3"],
      importance: 3,
      recommendation: 4,
      tags: ["ゲーム実況", "雑談"],
    });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("key=gemini-key");
    expect(JSON.parse(options.body).generationConfig).toEqual({ responseMimeType: "application/json" });
    expect(JSON.parse(options.body).contents[0].parts[0].text).toContain("概要欄本文");
  });

  it("応答にtagsが含まれない場合は空配列にする", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: JSON.stringify({ summary: ["要点1"], importance: 3, recommendation: 4 }) }] } },
        ],
      }),
    });

    const result = await summarizeTranscript("タイトル", "概要欄", "本文", "key", { fetchImpl });

    expect(result.tags).toEqual([]);
  });

  it("概要欄が空文字列でも動作する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: JSON.stringify({ summary: ["要点1"], importance: 3, recommendation: 4 }) }] } },
        ],
      }),
    });

    await summarizeTranscript("タイトル", "", "本文", "key", { fetchImpl });

    const [, options] = fetchImpl.mock.calls[0];
    expect(JSON.parse(options.body).contents[0].parts[0].text).toContain("(なし)");
  });

  it("APIエラー時は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(summarizeTranscript("タイトル", "概要欄", "本文", "key", { fetchImpl })).rejects.toThrow(
      "LLM summarize failed: 500",
    );
  });
});
