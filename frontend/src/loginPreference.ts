// ログイン成功時のユーザー情報をlocalStorageへ保存し、再訪問時に「おかえりなさい」表示で
// ログイン導線をパーソナライズするために使う。アクセストークン自体は保存しない（トークンの
// 自動再取得はブラウザのポップアップブロック対策上できないため、保存する意味が無い）。

const STORAGE_KEY = "youtube-radar:lastLoggedInUser";

export interface LoginPreference {
  name: string;
  picture: string;
}

export function saveLoginPreference(preference: LoginPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // localStorageが使えない環境（プライベートブラウズ等）では何もしない
  }
}

export function loadLoginPreference(): LoginPreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name === "string" && typeof parsed?.picture === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearLoginPreference(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorageが使えない環境では何もしない
  }
}
