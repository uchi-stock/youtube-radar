import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ServiceWorkerRegistration from "./ServiceWorkerRegistration";

describe("ServiceWorkerRegistration", () => {
  afterEach(() => {
    // navigator.serviceWorkerを消す前に、実行中のコンポーネントのuseEffect
    // クリーンアップ（removeEventListener呼び出し）を先に走らせておく必要がある
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    // @ts-expect-error テスト用に上書きしたserviceWorkerを元に戻す
    delete navigator.serviceWorker;
  });

  it("serviceWorker未対応環境では何もしない", () => {
    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
  });

  it("/sw.jsを登録し、フォアグラウンド復帰時・定期的に更新チェックする", async () => {
    vi.useFakeTimers();
    const update = vi.fn().mockResolvedValue(undefined);
    const register = vi.fn().mockResolvedValue({ update });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegistration />);
    await vi.waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js"));

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("登録に失敗してもエラーを投げない", async () => {
    const register = vi.fn().mockRejectedValue(new Error("boom"));
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ServiceWorkerRegistration />);

    await vi.waitFor(() => expect(register).toHaveBeenCalled());
  });
});
