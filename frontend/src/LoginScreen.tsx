import type { LoginPreference } from "./loginPreference";

type Status = "idle" | "loading" | "loaded" | "error";

function loginButtonLabel(status: Status, returningUser: LoginPreference | null): string {
  if (status === "loading") {
    return "読み込み中...";
  }
  return returningUser ? "ログインを再開" : "Googleでログイン";
}

interface LoginScreenProps {
  status: Status;
  returningUser: LoginPreference | null;
  errorMessage: string | null;
  onLogin: () => void;
}

export default function LoginScreen({ status, returningUser, errorMessage, onLogin }: LoginScreenProps) {
  return (
    <>
      {status !== "loaded" && returningUser && (
        <div className="d-flex align-items-center gap-2 mb-3">
          <img src={returningUser.picture} alt="" width={40} height={40} className="rounded-circle" />
          <span>おかえりなさい、{returningUser.name}さん</span>
        </div>
      )}

      {status !== "loaded" && (
        <>
          {!returningUser && (
            <p>
              お気に入りのYouTubeチャンネルをAIが定期巡回し、新着動画の文字起こしを要約・重要度判定してLINEへ通知するアプリです。
              このWebアプリでは、登録チャンネル一覧・最新動画・要約状況を閲覧できます。
            </p>
          )}
          <button type="button" className="btn btn-primary" onClick={onLogin} disabled={status === "loading"}>
            {loginButtonLabel(status, returningUser)}
          </button>
        </>
      )}

      {status === "error" && errorMessage && (
        <p className="text-danger mt-3" role="alert">
          {errorMessage}
        </p>
      )}
    </>
  );
}
