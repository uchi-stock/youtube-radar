import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as googleAuth from "./googleAuth";
import * as youtubeApi from "./youtubeApi";

vi.mock("./googleAuth");
vi.mock("./youtubeApi");

describe("App", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("ログインボタンを表示し、クリックすると登録チャンネル一覧を表示する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
      { channelId: "UC2", title: "チャンネルB", thumbnailUrl: "" },
    ]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());
    expect(screen.getByText("チャンネルB")).toBeInTheDocument();
    expect(screen.getByText("登録チャンネル: 2件")).toBeInTheDocument();
    expect(youtubeApi.fetchSubscribedChannels).toHaveBeenCalledWith("token-123");
  });

  it("ログインに失敗した場合はエラーメッセージを表示する", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockRejectedValue(new Error("access_denied"));
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("access_denied"));
  });

  it("ログアウトすると一覧が消えログインボタンが再表示される", async () => {
    vi.mocked(googleAuth.requestAccessToken).mockResolvedValue("token-123");
    vi.mocked(googleAuth.revokeAccessToken).mockResolvedValue(undefined);
    vi.mocked(youtubeApi.fetchSubscribedChannels).mockResolvedValue([
      { channelId: "UC1", title: "チャンネルA", thumbnailUrl: "" },
    ]);
    const user = userEvent.setup();

    render(<App />);
    await user.click(screen.getByRole("button", { name: "Googleでログイン" }));
    await waitFor(() => expect(screen.getByText("チャンネルA")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(googleAuth.revokeAccessToken).toHaveBeenCalledWith("token-123");
    expect(screen.queryByText("チャンネルA")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Googleでログイン" })).toBeInTheDocument();
  });
});
