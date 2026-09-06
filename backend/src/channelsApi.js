import { verifyGoogleAccessToken } from "./lib/verifyGoogleAccessToken.js";

// frontendがログイン時に取得した登録チャンネル一覧を受け取り、永続化する。
// リクエストのGoogleアクセストークンを検証し、メールアドレスが所有者（ownerEmail）と
// 一致する場合のみ書き込みを許可する。誰でも書き込めると新着検知の対象チャンネルを
// 外部から改ざんできてしまうため。
export async function submitChannels({ store, accessToken, channels, clientId, ownerEmail, deps = {} }) {
  if (!accessToken) {
    return { status: "unauthorized" };
  }

  const identity = await verifyGoogleAccessToken(accessToken, { clientId, fetchImpl: deps.fetchImpl });
  if (!identity || identity.email !== ownerEmail) {
    return { status: "unauthorized" };
  }

  if (!Array.isArray(channels)) {
    return { status: "invalid_body" };
  }

  await store.saveChannels(channels);
  return { status: "saved", count: channels.length };
}
