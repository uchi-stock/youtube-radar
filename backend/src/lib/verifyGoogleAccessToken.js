// Googleのtokeninfoエンドポイントでアクセストークンを検証し、audがこのアプリの
// OAuthクライアントID（GOOGLE_OAUTH_CLIENT_ID）と一致することを確認する。
// 一致すればuserinfoエンドポイント（email スコープが必要）でメールアドレスを取得して返す。
// 検証に失敗した場合（トークン無効・aud不一致・userinfo取得失敗）はnullを返す。
export async function verifyGoogleAccessToken(accessToken, { clientId, fetchImpl = fetch } = {}) {
  const tokenInfoRes = await fetchImpl(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
  );
  if (!tokenInfoRes.ok) {
    return null;
  }
  const tokenInfo = await tokenInfoRes.json();
  if (tokenInfo.aud !== clientId) {
    return null;
  }

  const userInfoRes = await fetchImpl("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoRes.ok) {
    return null;
  }
  const userInfo = await userInfoRes.json();
  if (!userInfo.email) {
    return null;
  }
  return { email: userInfo.email };
}
