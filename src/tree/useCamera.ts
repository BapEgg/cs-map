import { useCallback, useEffect, useRef, useState } from 'react';
import type { Box } from './layout';
import { fitCamera } from './layout';

export interface Camera {
  x: number;
  y: number;
  k: number;
}

/** 손으로 줄일 수 있는 한계. 전체 모양을 훑어보려고 일부러 줄이는 건 막지 않는다. */
const MIN_K = 0.55;
const MAX_K = 2.2;
const clampK = (k: number) => Math.min(MAX_K, Math.max(MIN_K, k));

/**
 * **자동** 맞춤이 내려갈 수 있는 바닥. 손으로 줄이는 것과 다른 값이다.
 *
 * 폰(366px)에서 전체를 맞추면 0.55까지 내려가 14px 제목이 7.7px이 된다. 지도가 아니라 얼룩이다.
 * 좁은 화면에서는 다 담으려 하지 말고 읽을 수 있는 크기를 지키고 밀어서 보게 한다.
 */
const fitFloor = (viewW: number) => (viewW < 620 ? 0.85 : MIN_K);

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

  /**
   * 지도의 실제 크기. 숨겨져 있으면(모바일에서 설명만 보는 중) 0이 나온다.
   * 전에는 0일 때 임의의 800×600으로 때워서, 숨은 동안 카메라가 엉뚱한 자리로 옮겨졌다가
   * 다시 보여줄 때 빈 화면이 됐다. 이제 0을 그대로 돌려주고 부르는 쪽이 건너뛴다.
   */
  const viewSize = useCallback(() => {
    const el = svgRef.current;
    return { w: el?.clientWidth ?? 0, h: el?.clientHeight ?? 0 };
  }, [svgRef]);

  /** 지금 지도가 화면에 자리를 갖고 있는지. 카메라를 건드리기 전에 확인한다. */
  const hasSize = useCallback(() => {
    const { w, h } = viewSize();
    return w > 0 && h > 0;
  }, [viewSize]);

  const fit = useCallback(
    /** @param focus 다 안 들어갈 때 가운데에 둘 자리(고른 노드). */
    (bounds: Box, animate = true, focus?: Box) => {
      const view = viewSize();
      setCam(fitCamera(bounds, view, { min: fitFloor(view.w), max: MAX_K, focus }), animate);
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

  /**
   * 되돌리는 동안에는 자동 이동을 막는다.
   * 뒤로 갈 때 "보던 자리로 복원" 직후에 "선택이 바뀌었으니 따라가기"가 한 번 더 밀어서
   * 복원한 자리가 몇십 px씩 어긋났다.
   */
  const holdUntil = useRef(0);

  /**
   * 그 자리가 화면 안에 오도록 살짝 밀어준다. 노드를 펼치거나 다른 개념으로 건너뛸 때 쓴다.
   *
   * 여백은 **들어갈 만큼만** 잡는다. 80px을 고정으로 요구하면 폰에서 방금 펼친 가지처럼
   * 넓은 자리는 아무리 밀어도 조건을 못 맞춰 오른쪽이 잘린 채 남는다.
   */
  const ensureVisible = useCallback(
    (box: Box) => {
      if (Date.now() < holdUntil.current) return;
      const { w, h } = viewSize();
      if (w <= 0 || h <= 0) return; // 숨겨진 지도를 움직이면 다시 보여줄 때 빈 화면이 된다
      const c = camRef.current;
      const padOf = (view: number, size: number) => Math.min(80, Math.max(8, (view - size) / 2));
      const padX = padOf(w, box.w * c.k);
      const padY = padOf(h, box.h * c.k);
      const left = box.x * c.k + c.x;
      const right = (box.x + box.w) * c.k + c.x;
      const top = box.y * c.k + c.y;
      const bottom = (box.y + box.h) * c.k + c.y;
      let { x, y } = c;
      if (right > w - padX) x -= right - (w - padX);
      else if (left < padX) x += padX - left;
      if (bottom > h - padY) y -= bottom - (h - padY);
      else if (top < padY) y += padY - top;
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

  /** 지금 카메라를 그대로 떠 둔다. 뒤로 갈 때 이 자리로 되돌리려고. */
  const snapshot = useCallback(() => ({ ...camRef.current }), []);
  const restore = useCallback(
    (c: Camera) => {
      holdUntil.current = Date.now() + 400;
      setCam({ ...c }, true);
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
    snapshot,
    restore,
    hasSize,
  };
}
