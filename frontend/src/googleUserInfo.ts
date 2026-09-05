// ログイン中のGoogleアカウントのプロフィール（アイコン表示用）を取得する。
// googleAuth.tsが要求するuserinfo.profileスコープのアクセストークンが必要。

export interface GoogleUserInfo {
  name: string;
  picture: string;
}

interface UserInfoResponse {
  name?: string;
  picture?: string;
}

const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export async function fetchGoogleUserInfo(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleUserInfo> {
  const res = await fetchImpl(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`ユーザー情報の取得に失敗しました: HTTP ${res.status}`);
  }
  const data: UserInfoResponse = await res.json();
  return { name: data.name ?? "", picture: data.picture ?? "" };
}
