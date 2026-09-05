// タップされた動画の処理状態・要約（巡回パイプラインで既に文字起こし・要約済みであれば）を
// 自社バックエンドAPI（GET /videos/{videoId}）から取得する。読み取り専用の公開エンドポイントのため
// 認証は不要。バックエンドに未登録の動画（新着検知バッチがまだ拾っていない等）はnullを返す。

export type VideoProcessingStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "TRANSCRIPT_NOT_FOUND"
  | "RETRY_WAIT"
  | "FAILED";

export interface VideoSummary {
  summary: string[];
  importance: number;
  recommendation: number;
}

export interface VideoDetail {
  videoId: string;
  status: VideoProcessingStatus;
  summary: VideoSummary | null;
}

export async function fetchVideoDetail(
  videoId: string,
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<VideoDetail | null> {
  const res = await fetchImpl(`${apiBaseUrl.replace(/\/$/, "")}/videos/${videoId}`);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`動画の処理状態の取得に失敗しました: HTTP ${res.status}`);
  }
  return res.json();
}
