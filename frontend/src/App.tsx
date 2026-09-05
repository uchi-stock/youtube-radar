import { useState } from "react";
import { fetchChannelVideos, type ChannelVideo } from "./channelVideos";
import { requestAccessToken, revokeAccessToken } from "./googleAuth";
import { fetchGoogleUserInfo, type GoogleUserInfo } from "./googleUserInfo";
import formatBuildTime from "./formatBuildTime"; // symlink
import { fetchVideoDetail, type VideoDetail } from "./videoDetail";
import { fetchSubscribedChannels, type SubscribedChannel } from "./youtubeApi";

type Status = "idle" | "loading" | "loaded" | "error";
type VideosStatus = "idle" | "loading" | "loaded" | "error";

interface VideoDetailEntry {
  state: "loading" | "loaded" | "error";
  detail?: VideoDetail | null;
  errorMessage?: string;
}

const PROCESSING_STATUS_LABEL: Record<string, string> = {
  PENDING: "文字起こし処理待ちです",
  PROCESSING: "文字起こし処理中です",
  RETRY_WAIT: "文字起こし処理待ちです",
  TRANSCRIPT_NOT_FOUND: "字幕が見つかりませんでした",
  FAILED: "要約に失敗しました",
};

function formatViewCount(viewCount: number): string {
  return `${viewCount.toLocaleString("ja-JP")}回視聴`;
}

function formatCount(count: number): string {
  return count.toLocaleString("ja-JP");
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const TRANSCRIPT_API_BASE_URL = import.meta.env.VITE_TRANSCRIPT_API_BASE_URL as string | undefined;

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
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);
  const [videoDetails, setVideoDetails] = useState<Record<string, VideoDetailEntry>>({});

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
    setExpandedVideoId(null);
    setVideoDetails({});
  }

  async function handleToggleVideo(videoId: string) {
    if (expandedVideoId === videoId) {
      setExpandedVideoId(null);
      return;
    }
    setExpandedVideoId(videoId);

    if (!TRANSCRIPT_API_BASE_URL || videoDetails[videoId]) {
      return;
    }
    setVideoDetails((prev) => ({ ...prev, [videoId]: { state: "loading" } }));
    try {
      const detail = await fetchVideoDetail(videoId, TRANSCRIPT_API_BASE_URL);
      setVideoDetails((prev) => ({ ...prev, [videoId]: { state: "loaded", detail } }));
    } catch (error) {
      setVideoDetails((prev) => ({
        ...prev,
        [videoId]: { state: "error", errorMessage: error instanceof Error ? error.message : String(error) },
      }));
    }
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
              {videos.map((video) => {
                const detailEntry = videoDetails[video.videoId];
                return (
                  <li key={video.videoId} className="list-group-item">
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-reset d-flex flex-column align-items-start w-100 text-start"
                      onClick={() => handleToggleVideo(video.videoId)}
                    >
                      {video.thumbnailUrl && (
                        <img src={video.thumbnailUrl} alt="" className="w-100 rounded" />
                      )}
                      <small className="mt-1">{video.title}</small>
                      <small className="text-muted">
                        {formatViewCount(video.viewCount)}
                        {video.duration && `・${video.duration}`}
                      </small>
                    </button>

                    {expandedVideoId === video.videoId && (
                      <div className="mt-2 ps-2 border-start">
                        <dl className="row small mb-2">
                          <dt className="col-4 col-sm-3">高評価数</dt>
                          <dd className="col-8 col-sm-9">{formatCount(video.likeCount)}</dd>
                          <dt className="col-4 col-sm-3">コメント数</dt>
                          <dd className="col-8 col-sm-9">{formatCount(video.commentCount)}</dd>
                          <dt className="col-4 col-sm-3">字幕</dt>
                          <dd className="col-8 col-sm-9">{video.captionAvailable ? "あり" : "なし"}</dd>
                        </dl>
                        {video.description && (
                          <p className="small" style={{ whiteSpace: "pre-wrap" }}>
                            {video.description}
                          </p>
                        )}

                        {!TRANSCRIPT_API_BASE_URL && (
                          <small className="text-muted">文字起こしAPIが設定されていません</small>
                        )}

                        {detailEntry?.state === "loading" && <small className="text-muted">処理状況を確認中...</small>}

                        {detailEntry?.state === "error" && detailEntry.errorMessage && (
                          <small className="text-danger" role="alert">
                            {detailEntry.errorMessage}
                          </small>
                        )}

                        {detailEntry?.state === "loaded" && detailEntry.detail === null && (
                          <small className="text-muted">未処理（まだ巡回対象に登録されていません）</small>
                        )}

                        {detailEntry?.state === "loaded" &&
                          detailEntry.detail &&
                          (detailEntry.detail.status === "COMPLETED" && detailEntry.detail.summary ? (
                            <ul className="mb-0 ps-3">
                              {detailEntry.detail.summary.summary.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          ) : (
                            <small className="text-muted">
                              {PROCESSING_STATUS_LABEL[detailEntry.detail.status] ?? detailEntry.detail.status}
                            </small>
                          ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
