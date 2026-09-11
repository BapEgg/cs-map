import { useSyncExternalStore } from 'react';

/**
 * 폰 폭인지. 장면이 **배치를 바꿀지** 정하는 데 쓴다.
 *
 * 그림 전체를 축소하는 걸로는 못 고친다. 430×566짜리 장면을 316×383 자리에 넣으면
 * 배율이 0.68이 되어 11px 글씨가 7.5px로 찍힌다. 줄일 게 아니라 **다시 배치해야** 한다
 * (칸 높이를 낮추고, 곁가지 레이블을 빼고, 남은 글씨는 키운다).
 *
 * 미디어 질의를 그대로 구독한다. effect 안에서 setState 하는 방식은
 * 첫 그림이 한 번 어긋났다가 고쳐지는 깜빡임을 만든다.
 */
const QUERY = '(max-width: 900px)';

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function useNarrow() {
  return useSyncExternalStore(
    subscribe,
    () =>
      typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false,
    () => false,
  );
}
