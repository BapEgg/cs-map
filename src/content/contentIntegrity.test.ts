import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseBody } from '../panel/parseBody';
import { buildTree } from './buildTree';

/**
 * 진짜 content/ 폴더를 그대로 읽어 검증한다.
 * 옵시디언에서 편집하다 id를 잘못 쓰거나 참조가 끊기면 여기서 잡힌다.
 */
const CONTENT = join(process.cwd(), 'content');

function readAll(dir = CONTENT, prefix = '', out: Record<string, string> = {}) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) readAll(join(dir, entry.name), rel, out);
    else if (entry.name.endsWith('.md')) out[rel] = readFileSync(join(dir, entry.name), 'utf8');
  }
  return out;
}

const files = readAll();
const tree = buildTree(files);

describe('content/ 전체', () => {
  it('깨진 데가 없다', () => {
    expect(tree.problems).toEqual([]);
  });

  it('5갈래 뼈대가 그대로다', () => {
    expect(tree.rootId).toBe('cs');
    expect(tree.byId.cs.childIds).toEqual([
      'cs-basics',
      'java',
      'spring',
      'database',
      'service-dev',
    ]);
  });

  it('모든 개념에 한 줄 정의가 있다', () => {
    const missing = Object.values(tree.byId)
      .filter((n) => !n.card?.one_line?.trim())
      .map((n) => n.path);
    expect(missing).toEqual([]);
  });

  it('심화에 적은 글이 화면에 다 나간다 (파싱 누락 없음)', () => {
    // `- Q.` 같은 옛 형식이나 모르는 제목 아래 글은 파서가 버린다. 파일에는 있는데 안 보이면 모른다.
    const dropped = Object.values(tree.byId)
      .map((n) => ({ path: n.path, lines: parseBody(n.body).dropped }))
      .filter((x) => x.lines.length)
      .map((x) => `${x.path}: ${x.lines[0]}`);
    expect(dropped).toEqual([]);
  });

  it('심화가 있으면 출처와 확인 날짜가 있다', () => {
    const missing = Object.values(tree.byId)
      .filter((n) => n.hasDeep && (!n.checked || !n.sources?.length))
      .map((n) => n.path);
    expect(missing).toEqual([]);
  });

  it('flow·see_also·compare가 실제 노드를 가리킨다', () => {
    const bad: string[] = [];
    for (const n of Object.values(tree.byId)) {
      for (const f of [...n.flowPrev, ...n.flowNext]) if (!tree.byId[f.id]) bad.push(`${n.id} flow → ${f.id}`);
      for (const id of [...(n.see_also ?? []), ...(n.compare ?? [])])
        if (!tree.byId[id]) bad.push(`${n.id} → ${id}`);
    }
    for (const g of tree.glossary) if (g.link && !tree.byId[g.link]) bad.push(`용어 ${g.term} link → ${g.link}`);
    expect(bad).toEqual([]);
  });

  it('용어 별칭이 서로 겹치지 않는다', () => {
    // 겹치면 자동 링크가 어느 쪽으로 갈지 알 수 없다.
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const g of tree.glossary) {
      for (const name of [g.term, ...(g.aliases ?? [])]) {
        const owner = seen.get(name);
        if (owner) dupes.push(`"${name}": ${owner} vs ${g.term}`);
        else seen.set(name, g.term);
      }
    }
    expect(dupes).toEqual([]);
  });

  it('용어의 scope가 실제 노드를 가리킨다', () => {
    const bad: string[] = [];
    for (const g of tree.glossary) {
      for (const s of g.scope ?? []) {
        if (!tree.byId[s]) bad.push(`"${g.term}" → ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
