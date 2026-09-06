import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import UpdateNotifier from "./UpdateNotifier";

function mockServiceWorker(hasController: boolean) {
  const listeners: Record<string, () => void> = {};
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      controller: hasController ? {} : null,
      addEventListener: (type: string, listener: () => void) => {
        listeners[type] = listener;
      },
      removeEventListener: vi.fn(),
    },
    configurable: true,
  });
  return listeners;
}

describe("UpdateNotifier", () => {
  afterEach(() => {
    // navigator.serviceWorkerを消す前に、実行中のコンポーネントのuseEffect
    // クリーンアップ（removeEventListener呼び出し）を先に走らせておく必要がある
    cleanup();
    // @ts-expect-error テスト用に上書きしたserviceWorkerを元に戻す
    delete navigator.serviceWorker;
  });

  it("serviceWorker未対応環境では何も表示しない", () => {
    render(<UpdateNotifier />);

    expect(screen.queryByText("新しいバージョンがあります")).not.toBeInTheDocument();
  });

  it("初回インストール（controllerが無い状態）ではcontrollerchangeが起きてもバナーを出さない", () => {
    const listeners = mockServiceWorker(false);
    render(<UpdateNotifier />);

    listeners.controllerchange();

    expect(screen.queryByText("新しいバージョンがあります")).not.toBeInTheDocument();
  });

  it("既存バージョンからの切り替え時はバナーを表示し、ボタンで再読み込みする", async () => {
    const listeners = mockServiceWorker(true);
    const reloadMock = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      configurable: true,
    });
    render(<UpdateNotifier />);

    listeners.controllerchange();

    expect(await screen.findByText("新しいバージョンがあります")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "更新する" }));
    expect(reloadMock).toHaveBeenCalled();
  });
});
