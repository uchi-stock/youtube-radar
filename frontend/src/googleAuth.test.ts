import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAccessToken, revokeAccessToken } from "./googleAuth";

describe("requestAccessToken", () => {
  afterEach(() => {
    delete (window as { google?: unknown }).google;
  });

  it("アクセストークンを取得できたらresolveする", async () => {
    const requestAccessTokenMock = vi.fn();
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => {
            requestAccessTokenMock.mockImplementation(() => callback({ access_token: "token-123" }));
            return { requestAccessToken: requestAccessTokenMock };
          },
          revoke: vi.fn(),
        },
      },
    };

    const token = await requestAccessToken("client-id");

    expect(token).toBe("token-123");
    expect(requestAccessTokenMock).toHaveBeenCalledTimes(1);
  });

  it("エラーが返された場合はrejectする", async () => {
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => ({
            requestAccessToken: () => callback({ access_token: "", error: "access_denied" }),
          }),
          revoke: vi.fn(),
        },
      },
    };

    await expect(requestAccessToken("client-id")).rejects.toThrow("access_denied");
  });

  it("Google Identity Servicesが読み込まれていない場合はrejectする", async () => {
    await expect(requestAccessToken("client-id")).rejects.toThrow(
      "Google Identity Servicesの読み込みに失敗しました",
    );
  });

  it("silent:trueの場合はprompt: \"\"を渡してサイレント取得を試みる", async () => {
    const requestAccessTokenMock = vi.fn();
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }) => {
            requestAccessTokenMock.mockImplementation(() => callback({ access_token: "token-123" }));
            return { requestAccessToken: requestAccessTokenMock };
          },
          revoke: vi.fn(),
        },
      },
    };

    await requestAccessToken("client-id", { silent: true });

    expect(requestAccessTokenMock).toHaveBeenCalledWith({ prompt: "" });
  });

  it("initTokenClientにuse_fedcm_for_prompt: trueを渡す（iOS Safariでのアカウント選択二重表示対策）", async () => {
    const initTokenClientMock = vi.fn(({ callback }) => {
      const requestAccessTokenMock = vi.fn(() => callback({ access_token: "token-123" }));
      return { requestAccessToken: requestAccessTokenMock };
    });
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: initTokenClientMock,
          revoke: vi.fn(),
        },
      },
    };

    await requestAccessToken("client-id");

    expect(initTokenClientMock).toHaveBeenCalledWith(expect.objectContaining({ use_fedcm_for_prompt: true }));
  });
});

describe("revokeAccessToken", () => {
  afterEach(() => {
    delete (window as { google?: unknown }).google;
  });

  it("revokeを呼び出す", async () => {
    const revokeMock = vi.fn((_token: string, done: () => void) => done());
    window.google = { accounts: { oauth2: { initTokenClient: vi.fn(), revoke: revokeMock } } };

    await revokeAccessToken("token-123");

    expect(revokeMock).toHaveBeenCalledWith("token-123", expect.any(Function));
  });

  it("Google Identity Servicesが無くてもresolveする", async () => {
    await expect(revokeAccessToken("token-123")).resolves.toBeUndefined();
  });
});
