import { linkifyText } from "./linkifyText";
import type { ChannelVideo } from "./channelVideos";
import type { VideoDetail } from "./videoDetail";

export interface VideoDetailEntry {
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

function VideoSummary({ detail }: { detail: VideoDetail }) {
  if (detail.status !== "COMPLETED" || !detail.summary) {
    return <small className="text-muted">{PROCESSING_STATUS_LABEL[detail.status] ?? detail.status}</small>;
  }
  return (
    <ul className="mb-0 ps-3">
      {detail.summary.summary.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ul>
  );
}

interface VideoProcessingStatusProps {
  transcriptApiBaseUrl: string | undefined;
  detailEntry: VideoDetailEntry | undefined;
}

function VideoProcessingStatus({ transcriptApiBaseUrl, detailEntry }: VideoProcessingStatusProps) {
  if (!transcriptApiBaseUrl) {
    return <small className="text-muted">文字起こしAPIが設定されていません</small>;
  }
  if (detailEntry?.state === "loading") {
    return <small className="text-muted">処理状況を確認中...</small>;
  }
  if (detailEntry?.state === "error") {
    return (
      <small className="text-danger" role="alert">
        {detailEntry.errorMessage}
      </small>
    );
  }
  if (detailEntry?.state === "loaded" && detailEntry.detail === null) {
    return <small className="text-muted">未処理（まだ巡回対象に登録されていません）</small>;
  }
  if (detailEntry?.state === "loaded" && detailEntry.detail) {
    return <VideoSummary detail={detailEntry.detail} />;
  }
  return null;
}

interface VideoDetailPanelProps {
  video: ChannelVideo;
  detailEntry: VideoDetailEntry | undefined;
  transcriptApiBaseUrl: string | undefined;
}

function VideoDetailPanel({ video, detailEntry, transcriptApiBaseUrl }: VideoDetailPanelProps) {
  return (
    <div className="mt-2 ps-2 border-start">
      <a
        href={`https://www.youtube.com/watch?v=${video.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="d-inline-block small mb-2"
      >
        YouTubeで視聴
      </a>
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
          {linkifyText(video.description)}
        </p>
      )}
      <VideoProcessingStatus transcriptApiBaseUrl={transcriptApiBaseUrl} detailEntry={detailEntry} />
    </div>
  );
}

interface VideoListItemProps {
  video: ChannelVideo;
  isExpanded: boolean;
  detailEntry: VideoDetailEntry | undefined;
  onToggle: () => void;
  transcriptApiBaseUrl: string | undefined;
}

function VideoListItem({ video, isExpanded, detailEntry, onToggle, transcriptApiBaseUrl }: VideoListItemProps) {
  return (
    <li className="list-group-item">
      <button
        type="button"
        className="btn btn-link p-0 text-decoration-none text-reset d-flex flex-column align-items-start w-100 text-start"
        onClick={onToggle}
      >
        {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="w-100 rounded" />}
        <small className="mt-1">{video.title}</small>
        <small className="text-muted">
          {formatViewCount(video.viewCount)}
          {video.duration && `・${video.duration}`}
        </small>
      </button>

      {isExpanded && (
        <VideoDetailPanel video={video} detailEntry={detailEntry} transcriptApiBaseUrl={transcriptApiBaseUrl} />
      )}
    </li>
  );
}

interface VideoListProps {
  videos: ChannelVideo[];
  videoTags: Record<string, string[]>;
  selectedTags: Set<string>;
  onToggleTag: (tag: string) => void;
  expandedVideoId: string | null;
  videoDetails: Record<string, VideoDetailEntry>;
  onToggleVideo: (videoId: string) => void;
  transcriptApiBaseUrl: string | undefined;
}

export default function VideoList({
  videos,
  videoTags,
  selectedTags,
  onToggleTag,
  expandedVideoId,
  videoDetails,
  onToggleVideo,
  transcriptApiBaseUrl,
}: VideoListProps) {
  const allTags = Array.from(new Set(Object.values(videoTags).flat())).sort();
  const filteredVideos =
    selectedTags.size === 0
      ? videos
      : videos.filter((video) => (videoTags[video.videoId] ?? []).some((tag) => selectedTags.has(tag)));

  return (
    <>
      {allTags.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`btn btn-sm ${selectedTags.has(tag) ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => onToggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <ul className="list-group">
        {filteredVideos.map((video) => (
          <VideoListItem
            key={video.videoId}
            video={video}
            isExpanded={expandedVideoId === video.videoId}
            detailEntry={videoDetails[video.videoId]}
            onToggle={() => onToggleVideo(video.videoId)}
            transcriptApiBaseUrl={transcriptApiBaseUrl}
          />
        ))}
      </ul>
    </>
  );
}
