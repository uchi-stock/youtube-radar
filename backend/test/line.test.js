import { describe, expect, it } from "vitest";
import { buildNotificationText } from "../src/lib/line.js";

describe("buildNotificationText", () => {
  it("チャンネル名・タイトル・要約・重要度・視聴推奨度・URLを含む通知文を組み立てる", () => {
    const text = buildNotificationText(
      "テストチャンネル",
      { videoId: "v1", title: "動画タイトル" },
      { summary: ["要点1", "要点2", "要点3"], importance: 4, recommendation: 5 },
    );

    expect(text).toContain("テストチャンネルが新しい動画を公開しました。");
    expect(text).toContain("「動画タイトル」");
    expect(text).toContain("・要点1");
    expect(text).toContain("⭐ 重要度：★★★★☆");
    expect(text).toContain("👀 視聴推奨：★★★★★");
    expect(text).toContain("https://www.youtube.com/watch?v=v1");
  });
});
