import type { ReactNode } from "react";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// プレーンテキスト中のURLをクリック可能なリンクに変換する。splitに渡す正規表現へ
// キャプチャグループを含めると、マッチした区切り文字（URL部分）も結果配列に含まれ、
// 奇数インデックスに来る仕様を利用している。
export function linkifyText(text: string): ReactNode[] {
  return text.split(URL_PATTERN).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    ),
  );
}
