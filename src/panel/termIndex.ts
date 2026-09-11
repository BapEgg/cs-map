import type { ContentTree } from '../content/types';

export interface TermTarget {
  /** 트리 개념이면 노드 id, 용어 사전 항목이면 그 용어. */
  key: string;
  kind: 'node' | 'term';
  /** 문맥을 재는 기준이 되는 노드들. 용어는 scope, 개념은 자기 자신. */
  anchors: string[];
}

export interface TermIndex {
  /** 본문에서 용어를 찾아내는 정규식. 긴 이름부터 맞춘다. */
  pattern: RegExp | null;
  byName: Map<string, TermTarget[]>;
  /** 노드 id → 루트부터의 경로. 문맥 거리를 재는 데 쓴다. */
  pathTo: Map<string, string[]>;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 설명 속 용어를 자동으로 링크하기 위한 색인.
 *
 * 같은 이름이 여러 개일 수 있다(“FCFS”는 CPU 스케줄링에도 디스크 스케줄링에도 있다).
 * 그래서 **지금 읽고 있는 개념에서 가장 가까운 쪽**을 고른다. HANDOFF 5-3.
 */
export function buildTermIndex(tree: ContentTree): TermIndex {
  const byName = new Map<string, TermTarget[]>();
  const add = (name: string, target: TermTarget) => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return; // 한 글자는 아무 데나 걸린다
    const list = byName.get(trimmed) ?? [];
    list.push(target);
    byName.set(trimmed, list);
  };

  for (const node of Object.values(tree.byId)) {
    const target: TermTarget = { key: node.id, kind: 'node', anchors: [node.id] };
    add(node.title, target);
    for (const alias of node.aliases ?? []) add(alias, target);
  }
  for (const entry of tree.glossary) {
    const target: TermTarget = { key: entry.term, kind: 'term', anchors: entry.scope ?? [] };
    add(entry.term, target);
    for (const alias of entry.aliases ?? []) add(alias, target);
  }

  const pathTo = new Map<string, string[]>();
  const walk = (id: string, trail: string[]) => {
    const next = [...trail, id];
    pathTo.set(id, next);
    for (const child of tree.byId[id]?.childIds ?? []) walk(child, next);
  };
  if (tree.rootId) walk(tree.rootId, []);

  const names = [...byName.keys()].sort((a, b) => b.length - a.length);
  const pattern = names.length ? new RegExp(names.map(escape).join('|'), 'g') : null;

  return { pattern, byName, pathTo };
}

/**
 * 낱말 안에 파묻힌 글자를 용어로 잘못 잡는 걸 막는다.
 *
 * 한국어는 조사가 붙어 쓰이므로(페이징은, 프레임을) 뒤에 글자가 온다고 무조건 거를 수 없다.
 * 대신 **조사·어미로 시작하는 글자만 허용**한다. 그러면 "프레임워크"의 '워'는 걸리고
 * "프레임을"의 '을'은 통과한다.
 */
const PARTICLE_HEAD = new Set(
  (
    '은는이가을를의에와과도만로으랑나라든부까처보마조밖뿐요야들임입서고며면지' + '한했하되된다세'
  ).split(''),
);

const HANGUL = /\p{Script=Hangul}/u;
const WORDISH = /[\p{Script=Hangul}A-Za-z0-9]/u;

/** 이 자리의 매치가 낱말 하나로 온전히 떨어지는지. */
export function standsAlone(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text[start - 1] : '';
  const after = end < text.length ? text[end] : '';

  // 앞에 글자가 붙어 있으면 합성어 안이다. "페이지프레임"에서 "프레임"을 잡지 않는다.
  if (before && WORDISH.test(before)) return false;

  if (!after) return true;
  if (HANGUL.test(after)) return PARTICLE_HEAD.has(after);
  // 영문·숫자가 이어지면 더 긴 낱말의 일부다. "APIs"의 s 정도는 봐준다.
  if (/[A-Za-z0-9]/.test(after)) return after === 's' && !/[A-Za-z0-9]/.test(text[end + 1] ?? '');
  return true;
}

/** 두 노드가 트리에서 얼마나 가까운지. 공통 조상이 깊을수록 크다. 없으면 -1. */
function closeness(index: TermIndex, a: string, b: string): number {
  const pa = index.pathTo.get(a);
  const pb = index.pathTo.get(b);
  if (!pa || !pb) return -1;
  let i = 0;
  while (i < pa.length && i < pb.length && pa[i] === pb[i]) i++;
  return i - 1;
}

/**
 * 이 자리에서 이 이름이 가리키는 것. 같은 이름이 여럿이면 지금 개념에서 가까운 쪽을 고른다.
 * 자기 자신을 가리키면 링크하지 않는다(읽던 자리로 다시 보내는 꼴이라).
 */
export function resolveTerm(
  index: TermIndex,
  name: string,
  currentId: string | null = null,
): TermTarget | null {
  const candidates = index.byName.get(name);
  if (!candidates?.length) return null;

  const best = candidates.reduce((a, b) => (scoreOf(b) > scoreOf(a) ? b : a));
  if (best.kind === 'node' && best.key === currentId) return null;
  return best;

  function scoreOf(t: TermTarget) {
    if (!currentId || !t.anchors.length) return 0;
    return 1 + Math.max(...t.anchors.map((anchor) => closeness(index, anchor, currentId)));
  }
}
