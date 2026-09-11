import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTree } from '../content/buildTree';
import { buildTermIndex, resolveTerm, standsAlone } from './termIndex';

function readAll(dir: string, prefix = '', out: Record<string, string> = {}) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) readAll(join(dir, entry.name), rel, out);
    else if (entry.name.endsWith('.md')) out[rel] = readFileSync(join(dir, entry.name), 'utf8');
  }
  return out;
}

const tree = buildTree(readAll(join(process.cwd(), 'content')));
const index = buildTermIndex(tree);

describe('용어 자동 링크', () => {
  it('개념 이름과 용어를 모두 찾는다', () => {
    expect(resolveTerm(index, '페이징', null)?.key).toBe('paging');
    expect(resolveTerm(index, '캐시 라인', null)?.kind).toBe('term');
  });

  it('별칭으로도 찾는다', () => {
    expect(resolveTerm(index, 'locality')?.key).toBe('지역성');
  });

  it('같은 이름이면 지금 읽는 개념에서 가까운 쪽을 고른다', () => {
    // 인계서 7-3의 알려진 문제: 디스크 문맥에서도 FCFS가 CPU FCFS로 갔다.
    expect(resolveTerm(index, 'FCFS', 'sstf')?.key).toBe('disk-fcfs');
    expect(resolveTerm(index, 'FCFS', 'scan')?.key).toBe('disk-fcfs');
    expect(resolveTerm(index, 'FCFS', 'sjf')?.key).toBe('fcfs');
    expect(resolveTerm(index, 'FCFS', 'round-robin')?.key).toBe('fcfs');
  });

  it('자기 자신은 링크하지 않는다', () => {
    expect(resolveTerm(index, '페이징', 'paging')).toBeNull();
  });

  it('없는 이름은 못 찾는다', () => {
    expect(resolveTerm(index, '없는용어', null)).toBeNull();
  });

  it('긴 이름을 먼저 맞춘다', () => {
    // C-SCAN이 SCAN보다, OpenAPI가 API보다 먼저 걸려야 한다.
    const hits = [...'C-SCAN을 쓰면'.matchAll(index.pattern!)].map((m) => m[0]);
    expect(hits[0]).toBe('C-SCAN');
  });

  it('낱말 안에 파묻힌 글자는 용어로 잡지 않는다', () => {
    const at = (text: string, term: string) => {
      const i = text.indexOf(term);
      return standsAlone(text, i, i + term.length);
    };
    // 이게 실제로 있던 문제: '프레임워크'의 '프레임'이 메모리 용어로 연결됐다
    expect(at('언어와 프레임워크는 몇 년마다 바뀐다', '프레임')).toBe(false);
    expect(at('페이지프레임에 올린다', '프레임')).toBe(false);
    // 조사가 붙은 건 정상이다
    expect(at('프레임을 만든다', '프레임')).toBe(true);
    expect(at('프레임이 쌓인다', '프레임')).toBe(true);
    expect(at('프레임에서 꺼낸다', '프레임')).toBe(true);
    expect(at('빈 프레임', '프레임')).toBe(true);
    // 영문도 마찬가지
    expect(at('OpenAPI 명세', 'API')).toBe(false);
    expect(at('API 설계', 'API')).toBe(true);
  });

  it('한 글자 이름은 색인에 넣지 않는다', () => {
    for (const name of index.byName.keys()) expect(name.length).toBeGreaterThan(1);
  });
});
