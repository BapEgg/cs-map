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
