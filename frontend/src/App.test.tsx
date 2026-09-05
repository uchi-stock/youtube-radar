import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as channelVideos from "./channelVideos";
import * as googleAuth from "./googleAuth";
import * as googleUserInfo from "./googleUserInfo";
import * as youtubeApi from "./youtubeApi";

vi.mock("./googleAuth");
vi.mock("./googleUserInfo");
vi.mock("./youtubeApi");
vi.mock("./channelVideos");

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
});
