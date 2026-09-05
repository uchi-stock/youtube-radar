import { useState } from "react";
import { fetchChannelVideos, type ChannelVideo } from "./channelVideos";
import { requestAccessToken, revokeAccessToken } from "./googleAuth";
import { fetchGoogleUserInfo, type GoogleUserInfo } from "./googleUserInfo";
import formatBuildTime from "./formatBuildTime"; // symlink
import { fetchSubscribedChannels, type SubscribedChannel } from "./youtubeApi";

type Status = "idle" | "loading" | "loaded" | "error";
type VideosStatus = "idle" | "loading" | "loaded" | "error";

function formatViewCount(viewCount: number): string {
  return `${viewCount.toLocaleString("ja-JP")}回視聴`;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<SubscribedChannel | null>(null);
  const [videos, setVideos] = useState<ChannelVideo[]>([]);
  const [videosStatus, setVideosStatus] = useState<VideosStatus>("idle");
  const [videosErrorMessage, setVideosErrorMessage] = useState<string | null>(null);

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
    setSelectedChannel(null);
    setVideos([]);
    setVideosStatus("idle");
    setVideosErrorMessage(null);
  }

  async function handleSelectChannel(channel: SubscribedChannel) {
    setSelectedChannel(channel);
    setVideosStatus("loading");
    setVideosErrorMessage(null);
    try {
      const result = await fetchChannelVideos(channel.channelId, accessToken as string);
      setVideos(result);
      setVideosStatus("loaded");
    } catch (error) {
      setVideosStatus("error");
      setVideosErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function handleBackToChannels() {
    setSelectedChannel(null);
    setVideos([]);
    setVideosStatus("idle");
    setVideosErrorMessage(null);
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

      {status === "loaded" && !selectedChannel && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <p className="mb-0">登録チャンネル: {channels.length}件</p>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
          <ul className="list-group">
            {channels.map((channel) => (
              <li key={channel.channelId} className="list-group-item">
                <button
                  type="button"
                  className="btn btn-link p-0 text-decoration-none text-reset d-flex align-items-center gap-2 w-100 text-start"
                  onClick={() => handleSelectChannel(channel)}
                >
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
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {status === "loaded" && selectedChannel && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleBackToChannels}>
              ← チャンネル一覧に戻る
            </button>
          </div>
          <h2 className="h5 mb-3">{selectedChannel.title}の最新動画</h2>

          {videosStatus === "loading" && <p>読み込み中...</p>}

          {videosStatus === "error" && videosErrorMessage && (
            <p className="text-danger" role="alert">
              {videosErrorMessage}
            </p>
          )}

          {videosStatus === "loaded" && (
            <ul className="list-group">
              {videos.map((video) => (
                <li key={video.videoId} className="list-group-item d-flex align-items-center gap-2">
                  {video.thumbnailUrl && (
                    <img src={video.thumbnailUrl} alt="" width={64} height={48} />
                  )}
                  <div>
                    <div>{video.title}</div>
                    <small className="text-muted">{formatViewCount(video.viewCount)}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
