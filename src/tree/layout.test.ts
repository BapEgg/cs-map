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

  it('깊이가 깊을수록 오른쪽에 놓인다 (가로)', () => {
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

  it('세로에서는 깊이가 y로 간다', () => {
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
      'leaf.md': md('id: leaf\ntitle: 프로세스와 스레드'),
      'branch/_index.md': md('id: branch\ntitle: 프로세스와 스레드'),
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
    expect(fitTitle('페이징', 200)).toMatchObject({ text: '페이징', clipped: false });
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
    // 넘칠 때 여백은 최소값(8)까지 줄어든다 — 남는 자리가 없으니 더 줄 수도 없다.
    const bounds = { x: 0, y: 0, w: 4000, h: 300 };
    const cam = fitCamera(bounds, view, { min: 0.85, max: 1 });
    expect(cam.k).toBe(0.85);
    expect(cam.x).toBe(8);
  });

  it('조금 모자랄 때는 여백을 줄여서라도 다 담는다', () => {
    /*
     * 40px 여백을 고정으로 요구하면 "조금만 더 있으면 들어가는데" 하고 통째로 포기한다.
     * 1000×800에서 19개 중 2개가 그렇게 잘렸다.
     */
    // 여백 40을 고집하면 배율이 0.81까지 내려가야 해서 바닥(0.85)에 걸리고 아래가 잘린다.
    const bounds = { x: 0, y: 0, w: 400, h: 640 };
    const cam = fitCamera(bounds, { w: 800, h: 600 }, { min: 0.85, max: 1 });
    expect(cam.k).toBeGreaterThanOrEqual(0.85);
    expect(cam.y).toBeGreaterThanOrEqual(0);
    expect(cam.y + bounds.h * cam.k).toBeLessThanOrEqual(600);
  });

  it('배율 아래 한계를 지켜 글씨가 얼룩이 되지 않게 한다', () => {
    const cam = fitCamera({ x: 0, y: 0, w: 6000, h: 4000 }, view, { min: 0.85 });
    expect(cam.k).toBe(0.85);
  });

  it('크기가 없는 화면에서는 카메라를 만들지 않는다', () => {
    expect(fitCamera({ x: 0, y: 0, w: 400, h: 300 }, { w: 0, h: 0 }).k).toBe(1);
  });
});

describe('fitCamera · 다 안 들어갈 때', () => {
  const view = { w: 800, h: 600 };
  const bounds = { x: 0, y: 0, w: 4000, h: 300 };
  const opts = { min: 0.85, max: 1 };

  it('관심 자리를 주면 그걸 가운데에 놓는다', () => {
    // 좁은 화면에서는 전부 담는 것보다 지금 보는 노드에 닿는 게 중요하다.
    const focus = { x: 2000, y: 0, w: 100, h: 40 };
    const cam = fitCamera(bounds, view, { ...opts, focus });
    const middle = (focus.x + focus.w / 2) * cam.k + cam.x;
    expect(middle).toBeCloseTo(view.w / 2);
  });

  it('관심 자리가 끝에 있어도 내용 바깥으로 밀려나지 않는다', () => {
    const atStart = fitCamera(bounds, view, { ...opts, focus: { x: 0, y: 0, w: 80, h: 40 } });
    expect(atStart.x).toBe(8);

    const atEnd = fitCamera(bounds, view, { ...opts, focus: { x: 3920, y: 0, w: 80, h: 40 } });
    expect(atEnd.x).toBeCloseTo(view.w - 8 - bounds.w * atEnd.k);
  });

  it('관심 자리가 없으면 시작점에 붙인다', () => {
    expect(fitCamera(bounds, view, opts).x).toBe(8);
  });
});

describe('그리는 차례', () => {
  it('펼치든 접든 순서가 같다', () => {
    /*
     * 순서가 바뀌면 React가 DOM 요소를 앞뒤로 옮기고, 옮겨진 요소는 시작값을 잃어
     * 전환이 아예 안 걸린다. 접기가 스르륵이 아니라 툭 사라지던 원인이다.
     */
    const closed = layoutTree(tree.byId, 'root', new Set(), 'h').nodes.map((n) => n.id);
    const open = layoutTree(tree.byId, 'root', new Set(['a', 'b']), 'h').nodes.map((n) => n.id);
    expect(open).toEqual(closed);
  });

  it('부모가 자식보다 먼저 온다', () => {
    const ids = layoutTree(tree.byId, 'root', new Set(['a']), 'h').nodes.map((n) => n.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('a1'));
    expect(ids.indexOf('root')).toBe(0);
  });
});
