import { describe, expect, it, vi } from "vitest";
import { fetchWithRetry } from "../src/lib/retry.js";

function res(status, headers = {}) {
  return { res: { status, headers: { get: (name) => headers[name.toLowerCase()] ?? null } } };
}

describe("fetchWithRetry", () => {
  it("429以外なら即座に返す（リトライしない）", async () => {
    const requestFn = vi.fn().mockResolvedValue(res(200));

    const result = await fetchWithRetry(requestFn);

    expect(result.res.status).toBe(200);
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it("maxRetriesに達するまでリトライし、超えたら最後の429を返す", async () => {
    const sleep = vi.fn(async () => {});
    const requestFn = vi.fn().mockResolvedValue(res(429));

    const result = await fetchWithRetry(requestFn, { maxRetries: 2, baseDelayMs: 10, sleep });

    expect(requestFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(result.res.status).toBe(429);
  });

  it("Retry-Afterヘッダーがあればその秒数(ms換算)を優先して待機する", async () => {
    const sleep = vi.fn(async () => {});
    const requestFn = vi
      .fn()
      .mockResolvedValueOnce(res(429, { "retry-after": "3" }))
      .mockResolvedValueOnce(res(200));

    await fetchWithRetry(requestFn, { maxRetries: 1, sleep });

    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it("Retry-Afterが無い場合は指数バックオフ+jitterで待機する", async () => {
    const sleep = vi.fn(async () => {});
    const requestFn = vi.fn().mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(200));

    await fetchWithRetry(requestFn, { maxRetries: 1, baseDelayMs: 100, sleep });

    const [delayMs] = sleep.mock.calls[0];
    expect(delayMs).toBeGreaterThanOrEqual(100);
    expect(delayMs).toBeLessThan(200);
  });

  it("待機時間はmaxDelayMsで頭打ちにする", async () => {
    const sleep = vi.fn(async () => {});
    const requestFn = vi
      .fn()
      .mockResolvedValueOnce(res(429, { "retry-after": "100" }))
      .mockResolvedValueOnce(res(200));

    await fetchWithRetry(requestFn, { maxRetries: 1, maxDelayMs: 5000, sleep });

    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it("onRetryコールバックにattempt/maxRetries/delayMsを渡す", async () => {
    const sleep = vi.fn(async () => {});
    const onRetry = vi.fn();
    const requestFn = vi.fn().mockResolvedValueOnce(res(429)).mockResolvedValueOnce(res(200));

    await fetchWithRetry(requestFn, { maxRetries: 1, baseDelayMs: 10, sleep, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    const [info] = onRetry.mock.calls[0];
    expect(info.attempt).toBe(1);
    expect(info.maxRetries).toBe(1);
    expect(typeof info.delayMs).toBe("number");
  });
});
