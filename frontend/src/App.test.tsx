import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as channelVideos from "./channelVideos";
import * as googleAuth from "./googleAuth";
import * as googleUserInfo from "./googleUserInfo";
import * as videoDetail from "./videoDetail";
import * as youtubeApi from "./youtubeApi";

vi.mock("./googleAuth");
vi.mock("./googleUserInfo");
vi.mock("./youtubeApi");
vi.mock("./channelVideos");
vi.mock("./videoDetail");

function mockUserInfo() {
  vi.mocked(googleUserInfo.fetchGoogleUserInfo).mockResolvedValue({
    name: "テストユーザー",
    picture: "https://example.com/icon.jpg",
  });
}

describe("App", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("タイトル横にアプリバージョンを表示する", () => {
    render(<App />);

    expect(screen.getByText(`v${__APP_VERSION__}`, { exact: false })).toBeInTheDocument();
  });

  it("ログインボタンを表示し、クリックすると登録チャンネル一覧・ログインユーザーのアイコンを表示する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
      { channelId: "UC2", title: "チャンネルB", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    expect(screen.getByText("チャンネルB")).toBeInTheDocument();
    expect(screen.getByText("登録チャンネル: 2件")).toBeInTheDocument();
    expect(youtubeApi.fetchSubscribedChannels).toHaveBeenCalledWith("token-123");
    expect(screen.getByAltText("テストユーザー")).toHaveAttribute("src", "https://example.com/icon.jpg");
  });

  it("ログインに失敗した場合はエラーメッセージを表示する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockRejectedValue(new Error("access_denied"));
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("access_denied"));
  });

  it("ログアウトすると一覧・アイコンが消えログインボタンが再表示される", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(googleAuth.revokeAccessToken).mockResolvedValue(undefined);
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(googleAuth.revokeAccessToken).toHaveBeenCalledWith("token-123");
    expect(screen.queryByText("チャンネルA")).not.toBeInTheDocument();
    expect(screen.queryByAltText("テストユーザー")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
  });

  it("チャンネルをタップすると最新動画一覧を再生回数付きで表示する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    vi.mocked(channelVideos.fetchChannelVideos).mockResolvedValue([
      { videoId: "v1", title: "動画1", thumbnailUrl: "", publishedAt: "2026-09-01T00:00:00Z", viewCount: 1234 },
    ]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "チャンネルA" }));

    await waitFor(() => expect(screen.getByText("動画1")).toBeInTheDocument());
    expect(screen.getByText("1,234回視聴")).toBeInTheDocument();
    expect(channelVideos.fetchChannelVideos).toHaveBeenCalledWith("UC1", "token-123");
    expect(screen.queryByText("チャンネルA")).not.toBeInTheDocument();
  });

  it("動画一覧画面で「チャンネル一覧に戻る」を押すとチャンネル一覧に戻る", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    vi.mocked(channelVideos.fetchChannelVideos).mockResolvedValue([
      { videoId: "v1", title: "動画1", thumbnailUrl: "", publishedAt: "2026-09-01T00:00:00Z", viewCount: 1234 },
    ]);
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
    vi.mocked(channelVideos.fetchChannelVideos).mockResolvedValue([
      { videoId: "v1", title: "動画1", thumbnailUrl: "", publishedAt: "2026-09-01T00:00:00Z", viewCount: 1234 },
    ]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "チャンネルA" }));
    await waitFor(() => expect(screen.getByText("動画1")).toBeInTheDocument());

    return user;
  }

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
});
