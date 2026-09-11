import { useCallback, useState } from 'react';

/**
 * 읽는 글씨 크기. 설명 본문에만 건다(지도 노드는 배치가 글자 폭에 묶여 있어 같이 키울 수 없다).
 *
 * 브라우저 기본 확대(Ctrl +)와 다르다. 저건 화면 전체를 키워 지도가 좁아지는데,
 * 이건 **읽는 글만** 키워서 지도는 그대로 둔다.
 */
export const READ_SIZES = [1, 1.15, 1.32] as const;
export type ReadSize = (typeof READ_SIZES)[number];

export const READ_LABEL: Record<string, string> = {
  '1': '보통',
  '1.15': '크게',
  '1.32': '더 크게',
};

const KEY = 'csmap.read-size';

export function useReadSize() {
  const [size, setSize] = useState<ReadSize>(() => {
    try {
      const raw = Number(localStorage.getItem(KEY));
      return (READ_SIZES as readonly number[]).includes(raw) ? (raw as ReadSize) : 1;
    } catch {
      return 1;
    }
  });

  const cycle = useCallback(() => {
    setSize((now) => {
      const next = READ_SIZES[(READ_SIZES.indexOf(now) + 1) % READ_SIZES.length];
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        // 저장을 못 해도 이번 세션 동안은 쓸 수 있어야 한다.
      }
      return next;
    });
  }, []);

  return { size, cycle, label: READ_LABEL[String(size)] };
}
