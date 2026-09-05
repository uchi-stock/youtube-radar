import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAccessToken, revokeAccessToken } from "./googleAuth";

describe("requestAccessToken", () => {
  afterEach(() => {
    delete (window as { google?: unknown }).google;
  });

  it("アクセストークンを取得できたらresolveする", async () => {
    const requestAccessTokenMock = vi.fn();
    const initTokenClientMock = vi.fn(({ callback }) => {
      requestAccessTokenMock.mockImplementation(() => callback({ access_token: "token-123" }));
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

    const token = await requestAccessToken("client-id");

    expect(token).toBe("token-123");
    expect(requestAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(initTokenClientMock).toHaveBeenCalledWith(expect.objectContaining({ use_fedcm_for_prompt: true }));
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
