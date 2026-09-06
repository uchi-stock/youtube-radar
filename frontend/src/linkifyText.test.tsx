import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { linkifyText } from "./linkifyText";

describe("linkifyText", () => {
  it("URLを含まないテキストはそのまま返す", () => {
    const { container } = render(<>{linkifyText("概要文だけ")}</>);

    expect(container.textContent).toBe("概要文だけ");
    expect(container.querySelector("a")).toBeNull();
  });

  it("文中のURLをクリック可能なリンクに変換する", () => {
    const { container } = render(<>{linkifyText("配信者のXはこちら https://x.com/example です")}</>);

    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute("href", "https://x.com/example");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(container.textContent).toBe("配信者のXはこちら https://x.com/example です");
  });

  it("複数のURLをそれぞれリンクに変換する", () => {
    const { container } = render(<>{linkifyText("https://a.example と https://b.example")}</>);

    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "https://a.example");
    expect(links[1]).toHaveAttribute("href", "https://b.example");
  });
});
