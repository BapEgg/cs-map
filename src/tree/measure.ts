import { textWidth, type Measure } from './layout';

/**
 * 글자 폭을 **실제 글꼴로** 잰다.
 *
 * 어림값(textWidth)은 기기마다 어긋난다. Pretendard가 없는 윈도우에서는 맑은 고딕으로
 * 떨어지는데 한글 폭이 어림값보다 좁아서, 상자 오른쪽이 비고 글씨가 왼쪽으로 몰려 보였다.
 * 캔버스 measureText는 SVG <text>와 같은 글꼴 대체 규칙을 타므로 그 기기에서 보이는
 * 그대로를 잰다. 같은 글자는 한 번만 재고 기억해 둔다(노드 수백 개에 매 렌더 호출된다).
 *
 * @param family SVG 제목과 같은 font-family 목록. 대개 body의 계산된 값.
 * @param weight SVG 제목의 굵기(tree.css의 .tree-node-title).
 */
export function makeMeasurer(family: string, weight = 500): Measure {
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  const ctx = canvas?.getContext('2d') ?? null;
  if (!ctx) return textWidth; // 캔버스가 없는 환경(테스트)이면 어림값으로

  const cache = new Map<string, number>();
  return (text, size) => {
    const key = `${size}|${text}`;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    ctx.font = `${weight} ${size}px ${family}`;
    const w = ctx.measureText(text).width;
    cache.set(key, w);
    return w;
  };
}
