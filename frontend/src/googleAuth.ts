// Google Identity Services (GIS) のトークンクライアントをラップする。
// index.htmlで読み込んだ https://accounts.google.com/gsi/client のグローバル`google`を利用する。
// バックエンドを介さず、ブラウザ内で完結するアクセストークン取得のみを行う（表示専用のため
// リフレッシュトークンの取得・保存は行わない。トークンの有効期限が切れたら再ログインする）。

const YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

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
          }) => { requestAccessToken: () => void };
          revoke: (accessToken: string, done: () => void) => void;
        };
      };
    };
  }
}

// requestAccessTokenのcallbackはPromiseの外で呼ばれるため、Promiseでラップして
// 呼び出し側からはasync/awaitで扱えるようにする。
export function requestAccessToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error("Google Identity Servicesの読み込みに失敗しました"));
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: YOUTUBE_READONLY_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "アクセストークンの取得に失敗しました"));
          return;
        }
        resolve(response.access_token);
      },
    });
    client.requestAccessToken();
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
