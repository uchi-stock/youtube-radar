// E2Eテスト実行時（Playwright、Node.js側）専用のヘルパー。ログインを伴うE2Eでは、
// Google Identity Servicesの対話的な同意画面をPlaywrightで自動操作するのは現実的でないため、
// backendが既に保持するリフレッシュトークンから実際のアクセストークンを事前に取得し、
// ブラウザへ注入する（同意画面のみを迂回し、その先のYouTube Data API/userinfo APIへは
// 実際のAPIへ直結させる）。backend/src/lib/googleAuth.jsと同じ交換ロジック。

export interface GoogleTestCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export function loadGoogleTestCredentials(): GoogleTestCredentials | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }
  return { clientId, clientSecret, refreshToken };
}

export async function getTestAccessToken(credentials: GoogleTestCredentials): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google OAuthのアクセストークン取得に失敗しました: ${res.status}`);
  }
  const data = await res.json();
  return data.access_token;
}
