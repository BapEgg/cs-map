import { useSyncExternalStore } from 'react';

/**
 * 화면 폭 기준선. **CSS와 값을 맞춰야 한다** — 같은 숫자가 App.css, panel.css, vizStage.css에도 있다.
 * 옮길 때는 같이 옮긴다(각 파일 주석이 이 파일을 가리킨다).
 */

/**
 * 지도와 설명을 한 화면에 같이 못 두는 폭.
 *
 * 1100px이다. 900px이던 걸 올렸다. 1000px 화면에서 나란히 놓으면 지도 556px, 설명 400px이라
 * 지도는 두 열밖에 못 보여주고 설명은 한 줄에 40자가 안 됐다. 둘 다 반쪽이 되느니
 * 한 번에 하나를 제대로 보여주는 게 낫다.
 */
export const ONE_PANE = '(max-width: 1100px)';

/**
 * 시각화 장면이 **배치를 바꿔야 하는** 폭.
 *
 * 한 화면에 하나만 보이는 폭(1100)과 다르다. 1000px에서는 무대가 화면을 꽉 채워
 * 그림에 940px쯤 주어지므로 원래 배치가 더 잘 보인다. 진짜 좁을 때만 폰 배치로 간다.
 */
export const PHONE = '(max-width: 620px)';

/**
 * 질의마다 구독 함수를 한 번만 만들어 둔다.
 * 렌더마다 새 함수를 넘기면 useSyncExternalStore가 그때마다 구독을 끊고 다시 건다.
 */
const watchers = new Map<string, (onChange: () => void) => () => void>();

function watch(query: string) {
  let made = watchers.get(query);
  if (!made) {
    made = (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    };
    watchers.set(query, made);
  }
  return made;
}

const read = (query: string) =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false;

/**
 * 미디어 질의를 그대로 구독한다.
 * effect 안에서 setState 하는 방식은 첫 그림이 한 번 어긋났다가 고쳐지는 깜빡임을 만든다.
 */
export function useMedia(query: string) {
  return useSyncExternalStore(
    watch(query),
    () => read(query),
    () => false,
  );
}
