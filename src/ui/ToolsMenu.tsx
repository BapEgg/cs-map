import { useEffect, useRef, useState, type ReactNode } from 'react';

export type Tool =
  | {
      key: string;
      /** 버튼에 보이는 글자. 지금 상태를 그대로 보여주는 것도 있다(가로/세로, 다크/라이트). */
      label: ReactNode;
      /** 무슨 버튼인지. 글자만으로 모자랄 때 쓴다. */
      title?: string;
      onClick: () => void;
      /** 덜 중요한 설정. 흐리게 둔다. */
      quiet?: boolean;
    }
  | { key: string; separator: true };

/**
 * 좁은 화면의 도구 모음. **줄 하나를 통째로 아낀다.**
 *
 * 폰에서 머리말이 세 줄(검색 / 도구 / 지도·설명 전환)이면 지도에 659px밖에 안 남는다.
 * 자주 쓰지 않는 것들을 여기 접어 두면 도구 줄이 사라지고 그만큼 지도가 커진다.
 * 넓은 화면에서는 접지 않는다 — 자리가 있는데 한 번 더 누르게 만들 이유가 없다.
 */
export default function ToolsMenu({ tools, count }: { tools: Tool[]; count?: number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // 바깥을 누르거나 Esc를 누르면 닫는다.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <div className="tools-menu" ref={box}>
      <button
        className="btn btn-secondary tools-menu-open"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="더보기"
        title="더보기"
      >
        ⋯{!!count && count > 0 && <em className="bar-count">{count}</em>}
      </button>

      {open && (
        <div className="tools-menu-list" role="menu">
          {tools.map((t) =>
            'separator' in t ? (
              <span key={t.key} className="tools-menu-sep" role="separator" />
            ) : (
              <button
                key={t.key}
                role="menuitem"
                className={t.quiet ? 'quiet' : undefined}
                title={t.title}
                onClick={() => {
                  t.onClick();
                  setOpen(false);
                }}
              >
                {t.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
