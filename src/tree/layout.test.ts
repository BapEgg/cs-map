import { describe, expect, it } from 'vitest';
import { buildTree } from '../content/buildTree';
import { layoutTree } from './layout';

const md = (fm: string) => `---\n${fm}\n---\n`;

const tree = buildTree({
  '_index.md': md('id: root\ntitle: 루트'),
  'a/_index.md': md('id: a\ntitle: A\norder: 1'),
  'a/a1.md': md('id: a1\ntitle: A1\norder: 1'),
  'a/a2.md': md('id: a2\ntitle: A2\norder: 2'),
  'a/a3.md': md('id: a3\ntitle: A3\norder: 3'),
  'b/_index.md': md('id: b\ntitle: B\norder: 2'),
  'b/b1.md': md('id: b1\ntitle: B1\norder: 1'),
});

describe('layoutTree', () => {
  it('접힌 가지의 자식은 화면에 없다', () => {
    const { visible } = layoutTree(tree.byId, 'root', new Set(), 'h');
    expect(visible).toEqual(['root']);
  });

  it('펼친 가지의 자식만 나온다', () => {
    const { visible } = layoutTree(tree.byId, 'root', new Set(['root']), 'h');
    expect(visible).toEqual(['root', 'a', 'b']);
  });

  it('깊이가 깊을수록 오른쪽에 놓인다 (좌→우)', () => {
    const { pos } = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'h');
    expect(pos.root.x).toBeLessThan(pos.a.x);
    expect(pos.a.x).toBeLessThan(pos.a1.x);
    expect(pos.a1.x).toBe(pos.a2.x); // 형제는 같은 열
  });

  it('부모는 자식들의 가운데에 놓인다', () => {
    const { pos } = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'h');
    expect(pos.a.y).toBeCloseTo((pos.a1.y + pos.a3.y) / 2);
  });

  it('형제끼리 자리가 겹치지 않는다', () => {
    const { pos, visible } = layoutTree(tree.byId, 'root', new Set(['root', 'a', 'b']), 'h');
    const ys = visible.map((id) => `${pos[id].x}:${pos[id].y}`);
    expect(new Set(ys).size).toBe(ys.length);
  });

  it('위→아래에서는 깊이가 y로 간다', () => {
    const { pos } = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'v');
    expect(pos.root.y).toBeLessThan(pos.a.y);
    expect(pos.a.y).toBeLessThan(pos.a1.y);
    expect(pos.a1.y).toBe(pos.a2.y);
  });

  it('연결선은 펼쳐진 부모에서만 나간다', () => {
    const { links } = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'h');
    expect(links).toEqual([
      { from: 'root', to: 'a' },
      { from: 'a', to: 'a1' },
      { from: 'a', to: 'a2' },
      { from: 'a', to: 'a3' },
      { from: 'root', to: 'b' },
    ]);
  });

  it('가지 하나만 루트로 떼어 볼 수 있다', () => {
    const { visible, pos } = layoutTree(tree.byId, 'a', new Set(['a']), 'h');
    expect(visible).toEqual(['a', 'a1', 'a2', 'a3']);
    expect(pos.a.x).toBe(0);
  });

  it('펼친 만큼 자리를 더 쓴다', () => {
    const closed = layoutTree(tree.byId, 'root', new Set(['root']), 'h');
    const opened = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'h');
    expect(opened.bounds.h).toBeGreaterThan(closed.bounds.h);
    expect(opened.bounds.w).toBeGreaterThan(closed.bounds.w);
  });
});
