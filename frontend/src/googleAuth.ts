// Google Identity Services (GIS) のトークンクライアントをラップする。
// index.htmlで読み込んだ https://accounts.google.com/gsi/client のグローバル`google`を利用する。
// バックエンドを介さず、ブラウザ内で完結するアクセストークン取得のみを行う（表示専用のため
// リフレッシュトークンの取得・保存は行わない。トークンの有効期限が切れたら再ログインする）。

// userinfo.profileは右上に表示するログインユーザーのアイコン取得のために追加している。
// userinfo.emailは、backendのPOST /channels（チャンネル一覧同期）がアクセストークンから
// 呼び出し元のメールアドレスを取得するために必要（backend/src/lib/verifyGoogleAccessToken.js）。
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export interface TokenResponse {
  access_token: string;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            use_fedcm_for_prompt?: boolean;
          }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
          revoke: (accessToken: string, done: () => void) => void;
        };
      };
    };
  }
}

// requestAccessTokenのcallbackはPromiseの外で呼ばれるため、Promiseでラップして
// 呼び出し側からはasync/awaitで扱えるようにする。
//
// silent: trueの場合、GISに`prompt: ""`を渡す。既に同意済み・Googleのログイン
// セッションが有効なユーザーであれば、同意画面を一切表示せずアクセストークンを
// 再取得できる（再訪問のたびに手動でログインボタンを押す必要を減らすため）。
// Googleセッションが切れている等でサイレント取得できない場合はcallbackが
// エラーを返すため、呼び出し側で通常のログイン画面へフォールバックする。
export function requestAccessToken(clientId: string, { silent = false }: { silent?: boolean } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error("Google Identity Servicesの読み込みに失敗しました"));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      // iOS SafariのITP（サードパーティCookie制限）下では、GISの従来方式（ポップアップ＋
      // 内部的なサードパーティCookie通信）だとGoogleアカウント選択画面が2回表示される
      // 既知の問題があるため、サードパーティCookieに依存しないFedCMベースのフローを使う
      use_fedcm_for_prompt: true,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "アクセストークンの取得に失敗しました"));
          return;
        }
        resolve(response.access_token);
      },
    });
    client.requestAccessToken(silent ? { prompt: "" } : undefined);
  });
}

export function revokeAccessToken(accessToken: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.google) {
      resolve();
      return;
    }
    window.google.accounts.oauth2.revoke(accessToken, resolve);
  });
}
