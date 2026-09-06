import { verifyGoogleAccessToken } from "./lib/verifyGoogleAccessToken.js";

// frontendがログイン時に取得した登録チャンネル一覧を受け取り、永続化する。
// リクエストのGoogleアクセストークンを検証し、そのユーザー自身の行にのみ書き込む
// （他ユーザーの行には影響しないため、所有者照合のような認可判定は不要）。
export async function submitChannels({ store, accessToken, channels, clientId, deps = {} }) {
  if (!accessToken) {
    return { status: "unauthorized" };
  }

  const identity = await verifyGoogleAccessToken(accessToken, { clientId, fetchImpl: deps.fetchImpl });
  if (!identity) {
    return { status: "unauthorized" };
  }

  if (!Array.isArray(channels)) {
    return { status: "invalid_body" };
  }

  await store.saveChannels(identity.email, channels);
  return { status: "saved", count: channels.length };
}
