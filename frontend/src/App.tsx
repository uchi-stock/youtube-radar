import { useEffect, useState } from "react";
import { fetchChannelVideos, type ChannelVideo } from "./channelVideos";
import { requestAccessToken, revokeAccessToken } from "./googleAuth";
import { fetchGoogleUserInfo, type GoogleUserInfo } from "./googleUserInfo";
import ChannelList from "./ChannelList";
import formatBuildTime from "./formatBuildTime"; // symlink
import LoginScreen from "./LoginScreen";
import { clearLoginPreference, loadLoginPreference, saveLoginPreference } from "./loginPreference";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration"; // symlink
import { syncChannels } from "./syncChannels";
import UpdateNotifier from "./UpdateNotifier"; // symlink
import UserMenu from "./UserMenu";
import VideoList, { type VideoDetailEntry } from "./VideoList";
import { fetchVideoDetail } from "./videoDetail";
import { fetchVideoTags } from "./videoTags";
import { fetchSubscribedChannels, type SubscribedChannel } from "./youtubeApi";

type Status = "idle" | "loading" | "loaded" | "error";
type VideosStatus = "idle" | "loading" | "loaded" | "error";

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
  const [videoTags, setVideoTags] = useState<Record<string, string[]>>({});
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [returningUser, setReturningUser] = useState(() => loadLoginPreference());

  // silent: trueの場合、GISの`prompt: ""`によるサイレント再ログイン（再訪問時、
  // Googleのログインセッションが有効であればポップアップを出さずにトークンを再取得する）。
  // 失敗しても無音でフォールバックし、通常のログイン前画面を表示する（エラー表示はしない）。
  async function attemptLogin(silent: boolean) {
    if (!GOOGLE_CLIENT_ID) {
      if (silent) return;
      setStatus("error");
      setErrorMessage("Google Client IDが設定されていません（VITE_GOOGLE_CLIENT_ID）");
      return;
    }
    setStatus("loading");
    if (!silent) {
      setErrorMessage(null);
    }
    try {
      const token = await requestAccessToken(GOOGLE_CLIENT_ID, { silent });
      setAccessToken(token);
      const [channelsResult, userInfoResult] = await Promise.all([
        fetchSubscribedChannels(token),
        fetchGoogleUserInfo(token),
      ]);
      setChannels(channelsResult);
      setUserInfo(userInfoResult);
      if (userInfoResult.picture) {
        saveLoginPreference({ name: userInfoResult.name, picture: userInfoResult.picture });
        setReturningUser({ name: userInfoResult.name, picture: userInfoResult.picture });
      }
      setStatus("loaded");

      // チャンネル一覧のbackendへの同期はベストエフォート。失敗してもログイン自体は成功させる。
      if (TRANSCRIPT_API_BASE_URL) {
        syncChannels(channelsResult, token, TRANSCRIPT_API_BASE_URL).catch((error) => {
          console.error("チャンネル一覧の同期に失敗しました", error);
        });
      }
    } catch (error) {
      if (silent) {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  // 再訪問時（以前ログイン済みの記録がある場合）、マウント時に一度だけサイレント
  // 再ログインを試みる。Googleセッションが有効な間はログインボタンを押す操作を省略できる。
  useEffect(() => {
    if (returningUser) {
      attemptLogin(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin() {
    await attemptLogin(false);
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
    setUserMenuOpen(false);
    clearLoginPreference();
    setReturningUser(null);
  }

  async function handleSelectChannel(channel: SubscribedChannel) {
    setSelectedChannel(channel);
    setVideosStatus("loading");
    setVideosErrorMessage(null);
    setVideoTags({});
    setSelectedTags(new Set());
    try {
      const result = await fetchChannelVideos(channel.channelId, accessToken as string);
      setVideos(result);
      setVideosStatus("loaded");

      // タグの取得はベストエフォート。失敗しても動画一覧自体は表示する（絞り込みチップが
      // 出ないだけで、一覧の閲覧自体は継続できるようにするため）。
      if (TRANSCRIPT_API_BASE_URL) {
        fetchVideoTags(
          result.map((v) => v.videoId),
          TRANSCRIPT_API_BASE_URL,
        )
          .then((tagsMap) => {
            setVideoTags(Object.fromEntries(tagsMap));
          })
          .catch((error) => {
            console.error("動画タグの取得に失敗しました", error);
          });
      }
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
    setVideoTags({});
    setSelectedTags(new Set());
  }

  function handleToggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
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
      <ServiceWorkerRegistration />
      <UpdateNotifier />
      <div className="d-flex justify-content-between align-items-start mb-4">
        <h1 className="h3 mb-0">
          youtube-radar{" "}
          <small className="text-muted fs-6">
            v{__APP_VERSION__}（{formatBuildTime(__APP_BUILD_TIME__)}）
          </small>
        </h1>
        {userInfo?.picture && (
          <UserMenu
            userInfo={userInfo}
            isOpen={userMenuOpen}
            onToggle={() => setUserMenuOpen((open) => !open)}
            onLogout={handleLogout}
          />
        )}
      </div>

      {status !== "loaded" && (
        <LoginScreen status={status} returningUser={returningUser} errorMessage={errorMessage} onLogin={handleLogin} />
      )}

      {status === "loaded" && !selectedChannel && (
        <ChannelList channels={channels} onSelectChannel={handleSelectChannel} />
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
            <VideoList
              videos={videos}
              videoTags={videoTags}
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
              expandedVideoId={expandedVideoId}
              videoDetails={videoDetails}
              onToggleVideo={handleToggleVideo}
              transcriptApiBaseUrl={TRANSCRIPT_API_BASE_URL}
            />
          )}
        </>
      )}
    </div>
  );
}
