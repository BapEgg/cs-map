import { parseFrontmatter } from './frontmatter';
import type { ConceptNode, ContentTree, GlossaryEntry, Track } from './types';

const INDEX = '_index.md';

const dirOf = (rel: string) => {
  const i = rel.lastIndexOf('/');
  return i === -1 ? '' : rel.slice(0, i);
};

const parentDir = (dir: string): string | null => {
  if (dir === '') return null;
  const i = dir.lastIndexOf('/');
  return i === -1 ? '' : dir.slice(0, i);
};

const isIndex = (rel: string) => rel === INDEX || rel.endsWith(`/${INDEX}`);

const asStringArray = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;

/**
 * content/ 아래 마크다운을 트리로 만든다. **폴더 구조가 곧 트리 구조다.**
 * - 폴더의 `_index.md`는 그 폴더 자신을 나타내는 노드다.
 * - 폴더 안의 다른 .md는 그 폴더의 자식이다.
 *
 * @param files content/ 기준 상대 경로 → 파일 내용. 예: { 'cs-basics/os/paging.md': '---\n...' }
 */
export function buildTree(files: Record<string, string>): ContentTree {
  const problems: string[] = [];
  const byId: Record<string, ConceptNode> = {};
  const glossary: GlossaryEntry[] = [];
  const indexIdByDir = new Map<string, string>();
  const pending: { rel: string; node: ConceptNode; parent: string | null }[] = [];

  for (const [rel, raw] of Object.entries(files)) {
    const { data, body } = parseFrontmatter(raw);

    if (rel.startsWith('glossary/')) {
      const term = typeof data.term === 'string' ? data.term : null;
      if (!term) {
        problems.push(`${rel}: term이 없다`);
        continue;
      }
      glossary.push({
        term,
        aliases: asStringArray(data.aliases),
        link: typeof data.link === 'string' ? data.link : null,
        scope: typeof data.scope === 'string' ? data.scope : undefined,
        sim: typeof data.sim === 'string' ? data.sim : undefined,
        body,
      });
      continue;
    }

    const id = typeof data.id === 'string' ? data.id : null;
    const title = typeof data.title === 'string' ? data.title : null;
    if (!id || !title) {
      problems.push(`${rel}: ${!id ? 'id' : 'title'}가 없다`);
      continue;
    }
    if (byId[id]) {
      problems.push(`${rel}: id "${id}"가 ${byId[id].path}와 겹친다`);
      continue;
    }

    const dir = dirOf(rel);
    const node: ConceptNode = {
      id,
      title,
      order: typeof data.order === 'number' ? data.order : undefined,
      track: data.track === 'cs' || data.track === 'dev' ? (data.track as Track) : undefined,
      card: (data.card ?? undefined) as ConceptNode['card'],
      flow: (data.flow ?? undefined) as ConceptNode['flow'],
      compare: asStringArray(data.compare),
      see_also: asStringArray(data.see_also),
      sim: typeof data.sim === 'string' ? data.sim : undefined,
      checked: typeof data.checked === 'string' ? data.checked : undefined,
      sources: asStringArray(data.sources),
      path: rel,
      body,
      depth: 0,
      parentId: null,
      childIds: [],
    };

    byId[id] = node;
    if (isIndex(rel)) indexIdByDir.set(dir, id);
    pending.push({ rel, node, parent: isIndex(rel) ? parentDir(dir) : dir });
  }

  // 부모 연결. _index.md를 다 모은 뒤에 해야 순서에 안 휘둘린다.
  const roots: string[] = [];
  for (const { rel, node, parent } of pending) {
    if (parent === null) {
      roots.push(node.id);
      continue;
    }
    const parentId = indexIdByDir.get(parent);
    if (!parentId) {
      problems.push(`${rel}: 부모 폴더 "${parent || '(최상위)'}"에 ${INDEX}가 없다`);
      continue;
    }
    node.parentId = parentId;
    byId[parentId].childIds.push(node.id);
  }

  if (roots.length === 0) problems.push(`최상위 ${INDEX}가 없다`);
  if (roots.length > 1) problems.push(`최상위 노드가 여럿이다: ${roots.join(', ')}`);

  // 형제 순서: order 먼저, 없으면 제목순
  for (const node of Object.values(byId)) {
    node.childIds.sort((a, b) => {
      const x = byId[a];
      const y = byId[b];
      if (x.order !== y.order) return (x.order ?? Infinity) - (y.order ?? Infinity);
      return x.title.localeCompare(y.title, 'ko');
    });
  }

  const rootId = roots[0] ?? '';

  // 깊이 계산 + 순환 방지
  const seen = new Set<string>();
  const walk = (id: string, depth: number) => {
    if (seen.has(id)) {
      problems.push(`${id}: 트리에 순환이 있다`);
      return;
    }
    seen.add(id);
    byId[id].depth = depth;
    for (const child of byId[id].childIds) walk(child, depth + 1);
  };
  if (rootId) walk(rootId, 0);

  for (const node of Object.values(byId)) {
    if (!seen.has(node.id)) problems.push(`${node.path}: 루트에서 닿지 않는다`);
  }

  // 참조 검사
  const check = (from: ConceptNode, ids: string[] | undefined, label: string) => {
    for (const id of ids ?? []) {
      if (!byId[id]) problems.push(`${from.path}: ${label}이 가리키는 "${id}"가 없다`);
    }
  };
  for (const node of Object.values(byId)) {
    check(node, node.see_also, 'see_also');
    check(node, node.compare, 'compare');
    check(node, [node.flow?.prev?.id, node.flow?.next?.id].filter((x): x is string => !!x), 'flow');
  }
  for (const entry of glossary) {
    if (entry.link && !byId[entry.link]) {
      problems.push(`glossary "${entry.term}": link가 가리키는 "${entry.link}"가 없다`);
    }
  }

  return { rootId, byId, glossary, problems };
}
