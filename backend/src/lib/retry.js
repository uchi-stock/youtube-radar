// HTTP 429（アクセス制限）に対するバックオフ・リトライ制御。
// 同一Lambda実行内で無制限にリトライして大量アクセスを継続することを避けるため、
// リトライ回数には必ず上限を設ける。

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 500;
// Retry-Afterヘッダーが大きな値を返した場合でも、1回のLambda実行のタイムアウトを
// 圧迫しすぎないよう待機時間の上限を設ける。
const DEFAULT_MAX_DELAY_MS = 5000;

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelayMs(attempt, res, baseDelayMs, maxDelayMs) {
  const retryAfterHeader = res.headers?.get?.("retry-after");
  const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
  const delayMs = Number.isFinite(retryAfterMs)
    ? retryAfterMs
    : baseDelayMs * 2 ** attempt + Math.random() * baseDelayMs;
  return Math.min(delayMs, maxDelayMs);
}

// requestFn: () => Promise<{ ok, status, headers, ... }>（fetchのResponse相当）
// 429が返る限り、上限回数までバックオフ+jitter（またはRetry-After優先）で待機してリトライする。
// 上限に達した場合は最後に取得したレスポンス（429のまま）を返す。呼び出し側で分類する。
export async function fetchWithRetry(requestFn, {
  maxRetries = DEFAULT_MAX_RETRIES,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  sleep = defaultSleep,
  onRetry,
} = {}) {
  let lastResult;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await requestFn();
    if (lastResult.res.status !== 429) {
      return lastResult;
    }
    if (attempt === maxRetries) {
      break;
    }
    const delayMs = computeDelayMs(attempt, lastResult.res, baseDelayMs, maxDelayMs);
    onRetry?.({ attempt: attempt + 1, maxRetries, delayMs });
    await sleep(delayMs);
  }
  return lastResult;
}
