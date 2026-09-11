import { describe, expect, it } from 'vitest';
import { buildTree } from './buildTree';
import { parseFrontmatter } from './frontmatter';

const md = (fm: string, body = '') => `---\n${fm}\n---\n${body}`;

describe('parseFrontmatter', () => {
  it('머리말과 본문을 가른다', () => {
    const { data, body } = parseFrontmatter(md('id: paging\norder: 2', '## 왜 나왔나\n조각이 생겨서.'));
    expect(data).toEqual({ id: 'paging', order: 2 });
    expect(body).toBe('## 왜 나왔나\n조각이 생겨서.');
  });

  it('머리말이 없으면 전체를 본문으로 본다', () => {
    expect(parseFrontmatter('그냥 글')).toEqual({ data: {}, body: '그냥 글' });
  });

  it('본문이 비어도 된다', () => {
    expect(parseFrontmatter(md('id: x')).body).toBe('');
  });

  it('BOM이 붙어 저장돼도 읽는다', () => {
    const withBom = String.fromCharCode(0xfeff) + md('id: paging', '본문');
    expect(parseFrontmatter(withBom)).toEqual({ data: { id: 'paging' }, body: '본문' });
  });

  it('CRLF로 저장돼도 읽는다', () => {
    const crlf = md('id: paging', '본문').replace(/\n/g, '\r\n');
    expect(parseFrontmatter(crlf)).toEqual({ data: { id: 'paging' }, body: '본문' });
  });
});

describe('buildTree', () => {
  const files = {
    '_index.md': md('id: cs\ntitle: CS 지식 지도'),
    'cs-basics/_index.md': md('id: cs-basics\ntitle: CS 기초\norder: 1\ntrack: cs'),
    'cs-basics/os/_index.md': md('id: os\ntitle: 운영체제\norder: 2'),
    'cs-basics/os/paging.md': md('id: paging\ntitle: 페이징\norder: 2\nsee_also: [jvm-memory]'),
    'cs-basics/os/segmentation.md': md(
      'id: segmentation\ntitle: 세그멘테이션\norder: 1\nflow:\n  next: { id: paging, reason: 빈 공간이 조각나서 }',
    ),
    'cs-basics/computer-arch/_index.md': md('id: computer-arch\ntitle: 컴퓨터 구조\norder: 1'),
    'java/_index.md': md('id: java\ntitle: Java\norder: 3\ntrack: dev'),
    'java/jvm-memory.md': md('id: jvm-memory\ntitle: JVM 메모리 구조\nsee_also: [paging]'),
    'glossary/tlb.md': md('term: TLB\naliases: [TLB 히트]\nscope: cs-basics/os', '그 결과를 저장하는 캐시다.'),
  };

  it('폴더 구조대로 부모·자식을 잇는다', () => {
    const t = buildTree(files);
    expect(t.problems).toEqual([]);
    expect(t.rootId).toBe('cs');
    expect(t.byId.cs.childIds).toEqual(['cs-basics', 'java']);
    expect(t.byId.os.parentId).toBe('cs-basics');
    expect(t.byId.paging.parentId).toBe('os');
  });

  it('형제를 order 순으로 놓는다', () => {
    const t = buildTree(files);
    expect(t.byId['cs-basics'].childIds).toEqual(['computer-arch', 'os']);
    expect(t.byId.os.childIds).toEqual(['segmentation', 'paging']);
  });

  it('루트에서의 깊이를 매긴다', () => {
    const t = buildTree(files);
    expect(t.byId.cs.depth).toBe(0);
    expect(t.byId['cs-basics'].depth).toBe(1);
    expect(t.byId.os.depth).toBe(2);
    expect(t.byId.paging.depth).toBe(3);
  });

  it('용어 사전은 트리에 넣지 않고 따로 모은다', () => {
    const t = buildTree(files);
    expect(t.byId.TLB).toBeUndefined();
    expect(t.glossary).toHaveLength(1);
    expect(t.glossary[0]).toMatchObject({ term: 'TLB', aliases: ['TLB 히트'], scope: 'cs-basics/os' });
  });

  it('id가 겹치면 문제로 남긴다', () => {
    const t = buildTree({ ...files, 'java/dup.md': md('id: paging\ntitle: 또 페이징') });
    expect(t.problems.join()).toContain('id "paging"');
  });

  it('끊어진 see_also를 잡아낸다', () => {
    const t = buildTree({ ...files, 'java/gc.md': md('id: gc\ntitle: GC\nsee_also: [없는개념]') });
    expect(t.problems.join()).toContain('없는개념');
  });

  it('끊어진 flow를 잡아낸다', () => {
    const t = buildTree({
      ...files,
      'java/gc.md': md('id: gc\ntitle: GC\nflow:\n  prev: { id: 없는개념, reason: 테스트 }'),
    });
    expect(t.problems.join()).toContain('없는개념');
  });

  it('_index.md가 없는 폴더를 잡아낸다', () => {
    const t = buildTree({ ...files, 'spring/di.md': md('id: di\ntitle: 의존성 주입') });
    expect(t.problems.join()).toContain('spring');
  });

  it('id나 title이 없으면 문제로 남긴다', () => {
    const t = buildTree({ ...files, 'java/x.md': md('title: 제목만 있다') });
    expect(t.problems.join()).toContain('id가 없다');
  });
});
