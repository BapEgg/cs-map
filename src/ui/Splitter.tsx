import { useEffect, useRef, useState } from 'react';
import { PANEL_DEFAULT, PANEL_MIN, clampPanel } from './panelWidth';

interface Props {
  width: number;
  onChange: (px: number) => void;
}

/**
 * 지도와 설명 사이를 끄는 손잡이.
 *
 * 눌러서 넓히는 버튼 하나("설명 넓게")를 없애고 이걸로 대신한다.
 * 두 단계만 오가는 것보다 **원하는 자리에 두는 게** 사람마다 다른 화면 크기에 맞는다.
 * 두 번 누르면 기본값으로 돌아오고, 화살표 키로도 옮길 수 있다.
 */
export default function Splitter({ width, onChange }: Props) {
  const self = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [active, setActive] = useState(false);

  /**
   * 지도와 설명을 합친 폭. 여기서 최소·최대가 나온다.
   * 부모를 그때그때 재는 게 낫다 — 창 크기가 바뀌어도 따로 맞출 게 없다.
   */
  const room = () => self.current?.parentElement?.clientWidth ?? window.innerWidth;

  // 끄는 동안에는 글자가 선택되지 않게 한다. 안 그러면 지나간 자리가 파랗게 칠해진다.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.body.style.userSelect = prev;
      document.body.style.cursor = '';
    };
  }, [active]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    setActive(true);

    const onMove = (ev: PointerEvent) => {
      if (!dragging.current) return;
      // 손잡이 오른쪽이 설명이다. 화면 오른쪽 끝에서 커서까지가 설명 폭.
      onChange(clampPanel(window.innerWidth - ev.clientX, room()));
    };
    const onUp = () => {
      dragging.current = false;
      setActive(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      ref={self}
      className={`splitter${active ? ' dragging' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="지도와 설명의 경계 — 끌어서 너비 조절, 두 번 누르면 기본값"
      aria-valuenow={width}
      aria-valuemin={PANEL_MIN}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onDoubleClick={() => onChange(clampPanel(PANEL_DEFAULT, room()))}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 96 : 24;
        if (e.key === 'ArrowLeft') onChange(clampPanel(width + step, room()));
        else if (e.key === 'ArrowRight') onChange(clampPanel(width - step, room()));
        else if (e.key === 'Home') onChange(clampPanel(PANEL_DEFAULT, room()));
        else return;
        e.preventDefault();
      }}
    >
      <span className="splitter-grip" aria-hidden="true" />
    </div>
  );
}
