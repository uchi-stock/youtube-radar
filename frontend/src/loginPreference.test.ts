import { afterEach, describe, expect, it } from "vitest";
import { clearLoginPreference, loadLoginPreference, saveLoginPreference } from "./loginPreference";

describe("loginPreference", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("保存した情報を読み込める", () => {
    saveLoginPreference({ name: "テストユーザー", picture: "https://example.com/icon.jpg" });

    expect(loadLoginPreference()).toEqual({ name: "テストユーザー", picture: "https://example.com/icon.jpg" });
  });

  it("保存されていない場合はnullを返す", () => {
    expect(loadLoginPreference()).toBeNull();
  });

  it("clearすると読み込めなくなる", () => {
    saveLoginPreference({ name: "テストユーザー", picture: "https://example.com/icon.jpg" });

    clearLoginPreference();

    expect(loadLoginPreference()).toBeNull();
  });

  it("不正な形式のデータが保存されている場合はnullを返す", () => {
    localStorage.setItem("youtube-radar:lastLoggedInUser", "not json");

    expect(loadLoginPreference()).toBeNull();
  });
});
