import { useCallback, useEffect, useRef, useState } from 'react';
import type { Box } from './layout';
import { fitCamera } from './layout';

export interface Camera {
  x: number;
  y: number;
  k: number;
}

const MIN_K = 0.35;
const MAX_K = 2.2;
const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));

/**
 * 드래그로 이동, 휠로 스크롤, Ctrl+휠로 확대. 가로 스크롤바는 쓰지 않는다.
 *
 * 부드러운 이동은 CSS 트랜지션에 맡긴다. requestAnimationFrame으로 직접 보간하면
 * 탭이 안 보이는 동안 아예 멈춰서 카메라가 엉뚱한 자리에 남는다.
 * 손으로 끄는 동안에는 트랜지션을 꺼야 끌리는 느낌이 난다.
 */
export function useCamera(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [cam, setCamState] = useState<Camera>({ x: 60, y: 200, k: 1 });
  const [dragging, setDragging] = useState(false);
  /** 지금 이동을 애니메이션으로 보여줄지. 직접 조작 중에는 끈다. */
  const [smooth, setSmooth] = useState(true);

  const camRef = useRef(cam);
  const setCam = useCallback((next: Camera | ((c: Camera) => Camera), animate = false) => {
    const value = typeof next === 'function' ? next(camRef.current) : next;
    camRef.current = value;
    setSmooth(animate);
    setCamState(value);
  }, []);

  const viewSize = useCallback(() => {
    const el = svgRef.current;
    return { w: el?.clientWidth ?? 800, h: el?.clientHeight ?? 600 };
  }, [svgRef]);

  const fit = useCallback(
    (bounds: Box, animate = true) => {
      const next = fitCamera(bounds, viewSize());
      setCam({ ...next, k: clampK(next.k) }, animate);
    },
    [setCam, viewSize],
  );

  /** 화면 가운데를 기준으로 배율만 바꾼다. ＋/－ 버튼용. */
  const zoomBy = useCallback(
    (factor: number) => {
      const { w, h } = viewSize();
      setCam((c) => {
        const k = clampK(c.k * factor);
        const scale = k / c.k;
        return { k, x: w / 2 - (w / 2 - c.x) * scale, y: h / 2 - (h / 2 - c.y) * scale };
      }, true);
    },
    [setCam, viewSize],
  );

  /** 그 자리가 화면 안에 오도록 살짝 밀어준다. 노드를 펼치거나 다른 개념으로 건너뛸 때 쓴다. */
  const ensureVisible = useCallback(
    (box: Box) => {
      const { w, h } = viewSize();
      const c = camRef.current;
      const pad = 80;
      const left = box.x * c.k + c.x;
      const right = (box.x + box.w) * c.k + c.x;
      const top = box.y * c.k + c.y;
      const bottom = (box.y + box.h) * c.k + c.y;
      let { x, y } = c;
      if (right > w - pad) x -= right - (w - pad);
      else if (left < pad) x += pad - left;
      if (bottom > h - pad) y -= bottom - (h - pad);
      else if (top < pad) y += pad - top;
      if (x === c.x && y === c.y) return;
      setCam({ ...c, x, y }, true);
    },
    [setCam, viewSize],
  );

  // 휠: 스크롤은 이동, Ctrl+휠은 커서 자리를 기준으로 확대.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        setCam((c) => {
          const k = clampK(c.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
          const scale = k / c.k;
          return { k, x: px - (px - c.x) * scale, y: py - (py - c.y) * scale };
        });
      } else {
        setCam((c) => ({ ...c, x: c.x - e.deltaX, y: c.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setCam, svgRef]);

  // 드래그로 이동. 조금이라도 움직였으면 그 다음 클릭은 무시한다(노드를 열어버리지 않게).
  const moved = useRef(false);
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      moved.current = false;
      setDragging(true);
      const startX = e.clientX;
      const startY = e.clientY;
      let lastX = startX;
      let lastY = startY;

      // setPointerCapture는 쓰지 않는다. 캡처하면 포인터 이벤트가 전부 SVG로 가서
      // 안쪽 노드의 click이 아예 안 터진다. window에 붙이면 캔버스 밖으로 끌어도 따라온다.
      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - lastX;
        const dy = ev.clientY - lastY;
        lastX = ev.clientX;
        lastY = ev.clientY;
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) moved.current = true;
        setCam((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
      };
      const onUp = () => {
        setDragging(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [setCam],
  );

  return {
    cam,
    smooth,
    dragging,
    /** 방금 드래그였는지. 노드 클릭을 걸러낼 때 쓴다. */
    didDrag: () => moved.current,
    onPointerDown,
    fit,
    zoomBy,
    ensureVisible,
  };
}
