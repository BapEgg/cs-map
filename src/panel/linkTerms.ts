import { maskCode } from './inlineCode';
import { resolveTerm, standsAlone, type TermIndex, type TermTarget } from './termIndex';

export interface TermHit {
  name: string;
  at: number;
  target: TermTarget;
}

/**
 * 글 한 조각에서 링크할 용어 자리를 찾는다. `used`에 있는 이름은 건너뛰고, 찾은 이름은 `used`에 더한다.
 * RichText가 그릴 때도, Blocks가 "앞 블록에서 이미 링크한 이름"을 셀 때도 같은 함수를 쓴다 —
 * 두 곳의 판단이 어긋나면 밑줄이 두 번 나오거나 아예 안 나온다.
 */
export function findTerms(
  chunk: string,
  index: TermIndex,
  selfId: string | null,
  used: Set<string>,
): TermHit[] {
  if (!chunk || !index.pattern) return [];
  const hits: TermHit[] = [];
  index.pattern.lastIndex = 0;
  for (const m of chunk.matchAll(index.pattern)) {
    const name = m[0];
    const at = m.index!;
    if (used.has(name)) continue;
    // "프레임워크"의 '프레임'처럼 낱말 안에 파묻힌 건 건너뛴다
    if (!standsAlone(chunk, at, at + name.length)) continue;
    const target = resolveTerm(index, name, selfId);
    if (!target) continue;
    used.add(name);
    hits.push({ name, at, target });
  }
  return hits;
}

/**
 * 이 글이 링크할 이름들. 코드와 강조 표시를 뗀 뒤 센다.
 * 순수 함수라 렌더 중에 몇 번 불려도 결과가 같다 — React StrictMode가 렌더를 두 번 돌려도
 * 공유 Set을 렌더 중에 고치는 방식처럼 두 번째 렌더에서 링크가 사라지는 일이 없다.
 */
export function termsIn(text: string, index: TermIndex, selfId: string | null, skip: Set<string>) {
  const used = new Set(skip);
  const plain = maskCode(text.replace(/\*\*(.+?)\*\*/g, '$1')).masked;
  findTerms(plain, index, selfId, used);
  return used;
}
