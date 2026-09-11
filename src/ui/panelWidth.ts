import { useCallback, useState } from 'react';

/** 설명 패널 기본 너비. 이보다 좁으면 한 줄에 들어가는 글자가 너무 적다. */
export const PANEL_DEFAULT = 480;
/** 설명이 이보다 좁으면 한 줄에 20자도 안 들어가 읽기가 더 힘들어진다. */
export const PANEL_MIN = 340;
/** 지도에 남겨 둘 최소 폭. 이보다 좁으면 지도가 한 열밖에 못 보여준다. */
const MAP_MIN = 360;
/** 손잡이와 그 양옆 틈. 둘의 폭을 더한 게 전체가 아니라 이만큼을 빼고 나눠 갖는다. */
const GUTTER = 22;

const KEY = 'csmap.panel-width';

export const clampPanel = (px: number, available: number) =>
  Math.round(Math.min(Math.max(px, PANEL_MIN), Math.max(PANEL_MIN, available - MAP_MIN - GUTTER)));

/**
 * 설명 패널 너비. 브라우저에만 남긴다.
 *
 * 공부 기록(StudyStore)과 섞지 않는다. 저건 나중에 DB로 옮길 **내 자료**고
 * 이건 이 기기에서 보기 편한 자리일 뿐이라, 기기를 옮길 때 따라갈 이유가 없다.
 */
export function usePanelWidth() {
  const [width, setWidth] = useState<number>(() => {
    try {
      const raw = Number(localStorage.getItem(KEY));
      return Number.isFinite(raw) && raw > 0 ? raw : PANEL_DEFAULT;
    } catch {
      return PANEL_DEFAULT;
    }
  });

  const set = useCallback((px: number) => {
    setWidth(px);
    try {
      localStorage.setItem(KEY, String(px));
    } catch {
      // 저장을 못 해도 이번 세션 동안은 쓸 수 있어야 한다.
    }
  }, []);

  return { width, set };
}
