import ShareButton from "./ShareButton"; // symlink
import type { GoogleUserInfo } from "./googleUserInfo";

interface UserMenuProps {
  userInfo: GoogleUserInfo;
  isOpen: boolean;
  onToggle: () => void;
  onLogout: () => void;
}

export default function UserMenu({ userInfo, isOpen, onToggle, onLogout }: UserMenuProps) {
  return (
    <div className="position-relative">
      <button type="button" className="btn p-0 border-0 bg-transparent" onClick={onToggle}>
        <img
          src={userInfo.picture}
          alt={userInfo.name}
          title={userInfo.name}
          width={40}
          height={40}
          className="rounded-circle"
        />
      </button>
      {isOpen && (
        <ul
          className="dropdown-menu show position-absolute"
          // .dropdown-menu-endはBootstrap JS（Popper.js）がdata-bs-popper属性を付与した場合のみ
          // 右端基準になる仕様のため、独自のReact stateで開閉制御する本実装では効かない。
          // 明示的なインラインスタイルで右端基準に配置し、画面右へのはみ出しを防ぐ。
          style={{ right: 0, left: "auto" }}
        >
          <li>
            <button type="button" className="dropdown-item" onClick={onLogout}>
              ログアウト
            </button>
          </li>
          <li>
            <ShareButton label="アプリリンクを共有" className="dropdown-item" />
          </li>
        </ul>
      )}
    </div>
  );
}
