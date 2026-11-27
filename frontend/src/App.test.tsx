import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as googleAuth from "./googleAuth";
import * as googleUserInfo from "./googleUserInfo";
import { loadLoginPreference, saveLoginPreference } from "./loginPreference";
import * as syncChannelsModule from "./syncChannels";
import * as videoTagsModule from "./videoTags";
import * as youtubeApi from "./youtubeApi";

vi.mock("./googleAuth");
vi.mock("./googleUserInfo");
vi.mock("./youtubeApi");
vi.mock("./channelVideos");
vi.mock("./videoDetail");
vi.mock("./syncChannels");
vi.mock("./videoTags");

function mockUserInfo() {
  vi.mocked(googleUserInfo.fetchGoogleUserInfo).mockResolvedValue({
    name: "テストユーザー",
    picture: "https://example.com/icon.jpg",
  });
}

// ログイン・ログアウト・再訪問時のセッション復元に関するテスト。チャンネル一覧・
// 動画一覧・動画詳細に関するテストはApp.videoList.test.tsxへ分割している
// （max-linesルール対応、Issue #166）。
describe("App", () => {
  beforeEach(() => {
    vi.mocked(syncChannelsModule.syncChannels).mockResolvedValue(undefined);
    vi.mocked(videoTagsModule.fetchVideoTags).mockResolvedValue(new Map());
  });

  afterEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("タイトル横にアプリバージョンを表示する", () => {
    render(<App />);

    expect(screen.getByText(`v${__APP_VERSION__}`, { exact: false })).toBeInTheDocument();
  });

  it("ログイン前の画面にアプリ概要の説明を表示する", () => {
    render(<App />);

    expect(screen.getByText(/文字起こしを要約・重要度判定してLINEへ通知する/)).toBeInTheDocument();
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

  it("ログイン成功時に取得済みのチャンネル一覧をbackendへ同期する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    const channels = [{ channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" }];
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue(channels);
    mockUserInfo();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() =>
      expect(syncChannelsModule.syncChannels).toHaveBeenCalledWith(channels, "token-123", "https://api.example.com"),
    );
  });

  it("チャンネル一覧の同期に失敗してもログイン処理自体は成功する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    vi.mocked(syncChannelsModule.syncChannels).mockRejectedValue(new Error("HTTP 500"));
    mockUserInfo();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ログインユーザーのアイコンをタップするとプルダウンメニューにログアウト・アプリリンク共有が表示される", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());

    await user.click(screen.getByAltText("テストユーザー"));

    expect(screen.getByRole("button", { name: "ログアウト" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "アプリリンクを共有" })).toBeInTheDocument();
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

    await user.click(screen.getByAltText("テストユーザー"));
    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(googleAuth.revokeAccessToken).toHaveBeenCalledWith("token-123");
    expect(screen.queryByText("チャンネルA")).not.toBeInTheDocument();
    expect(screen.queryByAltText("テストユーザー")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
    expect(loadLoginPreference()).toBeNull();
  });

  it("再訪問時、サイレント再ログインに失敗した場合は「おかえりなさい」表示とログイン再開ボタンを出す", async () => {
    saveLoginPreference({ name: "テストユーザー", picture: "https://example.com/icon.jpg" });
    vi.mocked(googleAuth.requestAccessToken).mockRejectedValue(new Error("Googleセッションが切れている"));

    render(<App />);

    await waitFor(() => expect(screen.getByRole("button", { name: "ログインを再開" })).toBeInTheDocument());
    expect(screen.getByText("おかえりなさい、テストユーザーさん", { exact: false })).toBeInTheDocument();
    expect(screen.queryByText(/巡回し/)).not.toBeInTheDocument();
    // サイレント失敗はエラー表示をしない（無音でフォールバックする）
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("再訪問時、サイレント再ログインに成功した場合はボタン操作無しで登録チャンネル一覧が表示される", async () => {
    saveLoginPreference({ name: "テストユーザー", picture: "https://example.com/icon.jpg" });
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    mockUserInfo();

    render(<App />);

    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    expect(googleAuth.requestAccessToken).toHaveBeenCalledWith("test-client-id", { silent: true });
  });

  it("初回訪問（ログイン履歴が無い）場合はサイレント再ログインを試みない", () => {
    render(<App />);

    expect(googleAuth.requestAccessToken).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
  });

  it("ログアウト後に別のGoogleアカウントでログインすると、そのアカウントの情報に切り替わる", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValueOnce("token-a").mockResolvedValueOnce("token-b");
    vi.mocked(googleAuth.revokeAccessToken).mockResolvedValue(undefined);
    vi.mocked(youtubeApi.fetchSubscribedChannels)
      .mockResolvedValueOnce([{ channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" }])
      .mockResolvedValueOnce([{ channelId: "UC2", title: "チャンネルB", thumbnailUrl: "" }]);
    vi.mocked(googleUserInfo.fetchGoogleUserInfo)
      .mockResolvedValueOnce({ name: "ユーザーA", picture: "https://example.com/a.jpg" })
      .mockResolvedValueOnce({ name: "ユーザーB", picture: "https://example.com/b.jpg" });
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    expect(screen.getByAltText("ユーザーA")).toHaveAttribute("src", "https://example.com/a.jpg");

    await user.click(screen.getByAltText("ユーザーA"));
    await user.click(screen.getByRole("button", { name: "ログアウト" }));
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() => expect(screen.getByText("チャンネルB")).toBeInTheDocument());
    expect(screen.queryByText("チャンネルA")).not.toBeInTheDocument();
    expect(screen.getByAltText("ユーザーB")).toHaveAttribute("src", "https://example.com/b.jpg");
  });

  it("初回訪問時はアプリ概要とログインボタンのみ表示する", () => {
    render(<App />);

    expect(screen.queryByText(/おかえりなさい/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
  });
});
