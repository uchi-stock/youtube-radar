import { useState } from "react";
import { requestAccessToken, revokeAccessToken } from "./googleAuth";
import { fetchGoogleUserInfo, type GoogleUserInfo } from "./googleUserInfo";
import formatBuildTime from "./formatBuildTime"; // symlink
import { fetchSubscribedChannels, type SubscribedChannel } from "./youtubeApi";

type Status = "idle" | "loading" | "loaded" | "error";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin() {
    if (!GOOGLE_CLIENT_ID) {
      setStatus("error");
      setErrorMessage("Google Client IDが設定されていません（VITE_GOOGLE_CLIENT_ID）");
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    try {
      const token = await requestAccessToken(GOOGLE_CLIENT_ID);
      setAccessToken(token);
      const [channelsResult, userInfoResult] = await Promise.all([
        fetchSubscribedChannels(token),
        fetchGoogleUserInfo(token),
      ]);
      setChannels(channelsResult);
      setUserInfo(userInfoResult);
      setStatus("loaded");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleLogout() {
    if (accessToken) {
      await revokeAccessToken(accessToken);
    }
    setAccessToken(null);
    setChannels([]);
    setUserInfo(null);
    setStatus("idle");
    setErrorMessage(null);
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <h1 className="h3 mb-0">
          youtube-radar{" "}
          <small className="text-muted fs-6">
            v{__APP_VERSION__}（{formatBuildTime(__APP_BUILD_TIME__)}）
          </small>
        </h1>
        {userInfo?.picture && (
          <img
            src={userInfo.picture}
            alt={userInfo.name}
            title={userInfo.name}
            width={40}
            height={40}
            className="rounded-circle"
          />
        )}
      </div>

      {status !== "loaded" && (
        <button type="button" className="btn btn-primary" onClick={handleLogin} disabled={status === "loading"}>
          {status === "loading" ? "読み込み中..." : "Googleでログイン"}
        </button>
      )}

      {status === "error" && errorMessage && (
        <p className="text-danger mt-3" role="alert">
          {errorMessage}
        </p>
      )}

      {status === "loaded" && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <p className="mb-0">登録チャンネル: {channels.length}件</p>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
          <ul className="list-group">
            {channels.map((channel) => (
              <li key={channel.channelId} className="list-group-item d-flex align-items-center gap-2">
                {channel.thumbnailUrl && (
                  <img
                    src={channel.thumbnailUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-circle"
                  />
                )}
                <span>{channel.title}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
