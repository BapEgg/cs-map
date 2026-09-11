import { describe, expect, it } from 'vitest';
import { buildTree } from '../content/buildTree';
import { fitCamera, fitTitle, layoutTree, nodeWidth, titleSpace } from './layout';

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
  it('접힌 자식은 지우지 않고 부모 자리에 겹쳐 둔다', () => {
    // 그래야 펼침·접힘이 요소의 생성·삭제가 아니라 자리 이동이 된다.
    const { visible, byId, nodes } = layoutTree(tree.byId, 'root', new Set(), 'h');
    expect(visible).toEqual(['root']);
    // 접혔어도 목록에는 있다
    expect(nodes.map((n) => n.id).sort()).toEqual(
      ['a', 'a1', 'a2', 'a3', 'b', 'b1', 'root'].sort(),
    );
    expect(byId.a.hidden).toBe(true);
    expect(byId.a.x).toBe(byId.root.x);
    expect(byId.a.y).toBe(byId.root.y);
  });

  it('펼친 가지의 자식만 자리를 차지한다', () => {
    const { visible, byId } = layoutTree(tree.byId, 'root', new Set(['root']), 'h');
    expect(visible).toEqual(['root', 'a', 'b']);
    expect(byId.a.hidden).toBe(false);
    // 손자는 여전히 부모(a) 자리에 겹쳐 있다
    expect(byId.a1.hidden).toBe(true);
    expect(byId.a1.y).toBe(byId.a.y);
  });

  it('깊이가 깊을수록 오른쪽에 놓인다 (좌→우)', () => {
    const { byId } = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'h');
    expect(byId.root.x).toBeLessThan(byId.a.x);
    expect(byId.a.x).toBeLessThan(byId.a1.x);
    expect(byId.a1.x).toBe(byId.a2.x); // 형제는 같은 열
  });

  it('부모는 자식들의 가운데에 놓인다', () => {
    const { byId } = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'h');
    expect(byId.a.y).toBeCloseTo((byId.a1.y + byId.a3.y) / 2);
  });

  it('보이는 형제끼리 자리가 겹치지 않는다', () => {
    const { byId, visible } = layoutTree(tree.byId, 'root', new Set(['root', 'a', 'b']), 'h');
    const spots = visible.map((id) => `${byId[id].x}:${byId[id].y}`);
    expect(new Set(spots).size).toBe(spots.length);
  });

  it('긴 이름이 다음 열을 침범하지 않는다', () => {
    const long = buildTree({
      '_index.md': md('id: root\ntitle: 루트'),
      'big/_index.md': md('id: big\ntitle: 아주아주아주 긴 이름을 가진 개념입니다'),
      'big/kid.md': md('id: kid\ntitle: 짧음'),
    });
    const { byId } = layoutTree(long.byId, 'root', new Set(['root', 'big']), 'h');
    expect(byId.big.x + byId.big.w).toBeLessThanOrEqual(byId.kid.x);
    expect(byId.root.x + byId.root.w).toBeLessThanOrEqual(byId.big.x);
  });

  it('범위는 보이는 노드만으로 잰다', () => {
    // 접힌 것까지 세면 카메라가 아무것도 없는 자리를 잡는다.
    const closed = layoutTree(tree.byId, 'root', new Set(['root']), 'h');
    const opened = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'h');
    expect(opened.bounds.h).toBeGreaterThan(closed.bounds.h);
    expect(opened.bounds.w).toBeGreaterThan(closed.bounds.w);
  });

  it('위→아래에서는 깊이가 y로 간다', () => {
    const { byId } = layoutTree(tree.byId, 'root', new Set(['root', 'a']), 'v');
    expect(byId.root.y).toBeLessThan(byId.a.y);
    expect(byId.a.y).toBeLessThan(byId.a1.y);
    expect(byId.a1.y).toBe(byId.a2.y);
  });

  it('가지 하나만 루트로 떼어 볼 수 있다', () => {
    const { visible, byId } = layoutTree(tree.byId, 'a', new Set(['a']), 'h');
    expect(visible).toEqual(['a', 'a1', 'a2', 'a3']);
    expect(byId.a.x).toBe(0);
  });
});

describe('노드 너비', () => {
  it('토글이 없는 잎에는 토글 자리를 빼지 않는다', () => {
    // 전에는 잎에도 22px를 빼서 글씨가 11.5px로 쪼그라들었다.
    const t = buildTree({
      '_index.md': md('id: root\ntitle: 루트'),
      'leaf.md': md('id: leaf\ntitle: 프로세스와 쓰레드'),
      'branch/_index.md': md('id: branch\ntitle: 프로세스와 쓰레드'),
      'branch/kid.md': md('id: kid\ntitle: 자식'),
    });
    // 같은 제목인데 가지 쪽이 토글만큼 넓다
    expect(nodeWidth(t.byId.branch)).toBeGreaterThan(nodeWidth(t.byId.leaf));
  });

  it('상태 표시가 늘면 그만큼 넓어진다', () => {
    const t = buildTree({
      '_index.md': md('id: root\ntitle: 루트'),
      'x.md': md('id: x\ntitle: 페이징'),
    });
    expect(nodeWidth(t.byId.x, 2)).toBeGreaterThan(nodeWidth(t.byId.x, 0));
  });

  it('제목이 들어갈 자리는 실제로 있는 것만 뺀 나머지다', () => {
    const w = 200;
    expect(titleSpace(w, false, false, 0)).toBeGreaterThan(titleSpace(w, true, true, 2));
  });
});

describe('제목 자르기', () => {
  it('들어가면 그대로 둔다', () => {
    expect(fitTitle('페이징', 200)).toEqual({ text: '페이징', clipped: false });
  });

  it('넘치면 글씨를 줄이지 않고 잘라 쓴다', () => {
    const got = fitTitle('아주 긴 개념 이름이 여기에 들어간다', 60);
    expect(got.clipped).toBe(true);
    expect(got.text.endsWith('…')).toBe(true);
    expect(got.text.length).toBeLessThan('아주 긴 개념 이름이 여기에 들어간다'.length);
  });
});

describe('fitCamera', () => {
  const view = { w: 800, h: 600 };

  it('다 들어가면 가운데에 놓는다', () => {
    const bounds = { x: 0, y: 0, w: 400, h: 300 };
    const cam = fitCamera(bounds, view);
    expect(cam.k).toBe(1);
    expect(cam.x).toBeCloseTo(40 + (800 - 80 - 400) / 2);
    expect(cam.y).toBeCloseTo(40 + (600 - 80 - 300) / 2);
  });

  it('안 들어가면 가운데가 아니라 시작점에 붙인다', () => {
    // 넘치는데 가운데에 두면 양쪽이 잘려서 뿌리와 과목 열이 화면 밖으로 사라진다.
    const bounds = { x: 0, y: 0, w: 4000, h: 300 };
    const cam = fitCamera(bounds, view, { min: 0.85, max: 1 });
    expect(cam.k).toBe(0.85);
    expect(cam.x).toBe(40);
  });

  it('배율 아래 한계를 지켜 글씨가 얼룩이 되지 않게 한다', () => {
    const cam = fitCamera({ x: 0, y: 0, w: 6000, h: 4000 }, view, { min: 0.85 });
    expect(cam.k).toBe(0.85);
  });

  it('크기가 없는 화면에서는 카메라를 만들지 않는다', () => {
    expect(fitCamera({ x: 0, y: 0, w: 400, h: 300 }, { w: 0, h: 0 }).k).toBe(1);
  });
});
