import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as channelVideos from "./channelVideos";
import * as googleAuth from "./googleAuth";
import * as googleUserInfo from "./googleUserInfo";
import * as syncChannelsModule from "./syncChannels";
import * as videoDetail from "./videoDetail";
import * as videoTagsModule from "./videoTags";
import * as youtubeApi from "./youtubeApi";

vi.mock("./googleAuth");
vi.mock("./googleUserInfo");
vi.mock("./youtubeApi");
vi.mock("./channelVideos");
vi.mock("./videoDetail");
vi.mock("./syncChannels");
vi.mock("./videoTags");

const MOCK_VIDEO = {
  videoId: "v1",
  title: "動画1",
  thumbnailUrl: "",
  publishedAt: "2026-09-01T00:00:00Z",
  viewCount: 1234,
  likeCount: 56,
  commentCount: 7,
  description: "概要文",
  duration: "5:09",
  captionAvailable: true,
};

function mockUserInfo() {
  vi.mocked(googleUserInfo.fetchGoogleUserInfo).mockResolvedValue({
    name: "テストユーザー",
    picture: "https://example.com/icon.jpg",
  });
}

// チャンネル選択後の動画一覧・動画詳細・タグ絞り込みに関するテスト。ログイン・
// ログアウト・再訪問時のセッション復元に関するテストはApp.test.tsxを参照
// （max-linesルール対応、Issue #166）。
describe("App videoList", () => {
  beforeEach(() => {
    vi.mocked(syncChannelsModule.syncChannels).mockResolvedValue(undefined);
    vi.mocked(videoTagsModule.fetchVideoTags).mockResolvedValue(new Map());
  });

  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("チャンネルをタップすると最新動画一覧を再生回数付きで表示する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    vi.mocked(channelVideos.fetchChannelVideos).mockResolvedValue([MOCK_VIDEO]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "チャンネルA" }));

    await waitFor(() => expect(screen.getByText("動画1")).toBeInTheDocument());
    expect(screen.getByText("1,234回視聴・5:09")).toBeInTheDocument();
    expect(channelVideos.fetchChannelVideos).toHaveBeenCalledWith("UC1", "token-123");
    expect(screen.queryByText("チャンネルA")).not.toBeInTheDocument();
  });

  it("動画一覧画面で「チャンネル一覧に戻る」を押すとチャンネル一覧に戻る", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    vi.mocked(channelVideos.fetchChannelVideos).mockResolvedValue([MOCK_VIDEO]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "チャンネルA" }));
    await waitFor(() => expect(screen.getByText("動画1")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "← チャンネル一覧に戻る" }));

    expect(screen.getByText("チャンネルA")).toBeInTheDocument();
    expect(screen.queryByText("動画1")).not.toBeInTheDocument();
  });

  it("動画一覧の取得に失敗した場合はエラーメッセージを表示する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    vi.mocked(channelVideos.fetchChannelVideos).mockRejectedValue(new Error("HTTP 403"));
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "チャンネルA" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("HTTP 403"));
  });

  async function renderWithOneVideo() {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    vi.mocked(channelVideos.fetchChannelVideos).mockResolvedValue([MOCK_VIDEO]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "チャンネルA" }));
    await waitFor(() => expect(screen.getByText("動画1")).toBeInTheDocument());

    return user;
  }

  it("動画をタップすると動画の長さ・概要・高評価数・コメント数・字幕有無を表示する", async () => {
    vi.mocked(videoDetail.fetchVideoDetail).mockResolvedValue(null);
    const user = await renderWithOneVideo();

    expect(screen.getByText("1,234回視聴・5:09")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /動画1/ }));

    await waitFor(() => expect(screen.getByText("概要文")).toBeInTheDocument());
    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("あり")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "YouTubeで視聴" })).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=v1",
    );
  });

  it("概要欄中のURLをクリック可能なリンクとして表示する", async () => {
    vi.mocked(videoDetail.fetchVideoDetail).mockResolvedValue(null);
    vi.mocked(channelVideos.fetchChannelVideos).mockResolvedValue([
      { ...MOCK_VIDEO, description: "配信者のXはこちら https://x.com/example です" },
    ]);
    const user = userEvent.setup();
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "チャンネルA" }));
    await waitFor(() => expect(screen.getByText("動画1")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /動画1/ }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: "https://x.com/example" })).toHaveAttribute(
        "href",
        "https://x.com/example",
      ),
    );
  });

  it("処理済みの動画をタップすると要約を表示する", async () => {
    vi.mocked(videoDetail.fetchVideoDetail).mockResolvedValue({
      videoId: "v1",
      status: "COMPLETED",
      summary: { summary: ["要点1", "要点2", "要点3"], importance: 4, recommendation: 5 },
    });
    const user = await renderWithOneVideo();

    await user.click(screen.getByRole("button", { name: /動画1/ }));

    await waitFor(() => expect(screen.getByText("要点1")).toBeInTheDocument());
    expect(screen.getByText("要点2")).toBeInTheDocument();
    expect(screen.getByText("要点3")).toBeInTheDocument();
    expect(videoDetail.fetchVideoDetail).toHaveBeenCalledWith("v1", "https://api.example.com");
  });

  it("未処理の動画をタップするとその旨を表示する", async () => {
    vi.mocked(videoDetail.fetchVideoDetail).mockResolvedValue(null);
    const user = await renderWithOneVideo();

    await user.click(screen.getByRole("button", { name: /動画1/ }));

    await waitFor(() => expect(screen.getByText("未処理（まだ巡回対象に登録されていません）")).toBeInTheDocument());
  });

  it("処理中の動画をタップすると処理中である旨を表示する", async () => {
    vi.mocked(videoDetail.fetchVideoDetail).mockResolvedValue({ videoId: "v1", status: "PENDING", summary: null });
    const user = await renderWithOneVideo();

    await user.click(screen.getByRole("button", { name: /動画1/ }));

    await waitFor(() => expect(screen.getByText("文字起こし処理待ちです")).toBeInTheDocument());
  });

  it("もう一度タップすると詳細が閉じる", async () => {
    vi.mocked(videoDetail.fetchVideoDetail).mockResolvedValue({ videoId: "v1", status: "PENDING", summary: null });
    const user = await renderWithOneVideo();

    await user.click(screen.getByRole("button", { name: /動画1/ }));
    await waitFor(() => expect(screen.getByText("文字起こし処理待ちです")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /動画1/ }));

    expect(screen.queryByText("文字起こし処理待ちです")).not.toBeInTheDocument();
  });

  it("タグが取得できた場合、絞り込みチップを表示しタップで一致する動画のみに絞り込む", async () => {
    vi.mocked(channelVideos.fetchChannelVideos).mockResolvedValue([
      MOCK_VIDEO,
      { ...MOCK_VIDEO, videoId: "v2", title: "動画2" },
    ]);
    vi.mocked(videoTagsModule.fetchVideoTags).mockResolvedValue(
      new Map([
        ["v1", ["ゲーム実況"]],
        ["v2", ["雑談"]],
      ]),
    );
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "チャンネルA" }));
    await waitFor(() => expect(screen.getByText("動画1")).toBeInTheDocument());
    expect(screen.getByText("動画2")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("button", { name: "ゲーム実況" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "雑談" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ゲーム実況" }));

    expect(screen.getByText("動画1")).toBeInTheDocument();
    expect(screen.queryByText("動画2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "ゲーム実況" }));

    expect(screen.getByText("動画2")).toBeInTheDocument();
  });

  it("タグの取得に失敗しても動画一覧の表示は継続する", async () => {
    vi.mocked(videoTagsModule.fetchVideoTags).mockRejectedValue(new Error("HTTP 500"));
    const user = await renderWithOneVideo();

    expect(screen.getByText("動画1")).toBeInTheDocument();
    expect(user).toBeDefined();
  });

  it("チャンネル一覧に戻ると絞り込みチップ・選択状態がリセットされる", async () => {
    vi.mocked(videoTagsModule.fetchVideoTags).mockResolvedValue(new Map([["v1", ["ゲーム実況"]]]));
    const user = await renderWithOneVideo();
    await waitFor(() => expect(screen.getByRole("button", { name: "ゲーム実況" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "← チャンネル一覧に戻る" }));

    expect(screen.queryByRole("button", { name: "ゲーム実況" })).not.toBeInTheDocument();
  });
});
