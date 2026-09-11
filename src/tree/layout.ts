import type { ConceptNode } from '../content/types';

/** 좌→우(h)가 기본. 위→아래(v)로 바꿀 수 있다. */
export type Orientation = 'h' | 'v';

export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  w: number;
  h: number;
}

export interface Layout {
  pos: Record<string, Point>;
  /** 노드마다 다른 가로 길이. 이름이 짧으면 칸도 짧다. */
  width: Record<string, number>;
  /** 지금 화면에 있는 노드. 펼쳐진 가지만 들어간다. */
  visible: string[];
  /** 부모 → 자식 연결선. */
  links: { from: string; to: string }[];
  bounds: Box;
}

export const NODE_H = 34;

const COL_W = 190; // 좌→우에서 깊이 한 칸
const ROW_H = 46; // 좌→우에서 형제 한 칸. 노드 높이보다 커야 서로 안 붙는다.
const GAP_X = 26; // 위→아래에서 형제 사이 틈
const LEV_H = 104; // 위→아래에서 깊이 한 칸

const MIN_W = 62;
const MAX_W = 240;

/** 글자 폭 어림. 한글은 넓고 영문은 좁다. 배치와 그리기가 같은 값을 써야 해서 여기 둔다. */
export function textWidth(text: string, size: number) {
  let w = 0;
  for (const ch of text) w += ch.codePointAt(0)! > 0x2e80 ? size * 0.98 : size * 0.55;
  return w;
}

export const TITLE_SIZE = 13;

/**
 * 노드 하나의 가로 길이.
 * 전부 같은 폭으로 두면 "CPU"처럼 짧은 이름도 칸이 커 보인다.
 *
 * 퀴즈·메모 표시는 폭에 넣지 않는다. 넣으면 퀴즈를 풀 때마다 트리가 다시 배치되며 출렁인다.
 */
export function nodeWidth(node: ConceptNode): number {
  const icon = node.depth === 1 ? 22 : 0; // 과목 아이콘은 최상위 바로 아래에만
  const toggle = node.childIds.length > 0 ? 18 : 0;
  const raw = textWidth(node.title, TITLE_SIZE) + 24 + icon + toggle;
  return Math.round(Math.min(MAX_W, Math.max(MIN_W, raw)));
}

/**
 * 트리를 좌표로 펼친다. `pos`는 노드의 **왼쪽 위 모서리가 아니라 세로 가운데 기준점**이다
 * (좌→우에서는 왼쪽 끝, 위→아래에서는 가로 가운데).
 *
 * 잎을 순서대로 한 칸씩 놓고, 부모는 자식들의 가운데에 둔다.
 * 접힌 노드는 자기도 한 칸을 차지한다. 그래야 펼치고 접을 때 자리가 안 튄다.
 *
 * @param open 펼쳐진 노드 id. 여기 없는 노드의 자식은 화면에 없다.
 * @param root 지금 루트로 볼 노드. "이 가지만 크게 보기"에 쓴다.
 */
export function layoutTree(
  byId: Record<string, ConceptNode>,
  root: string,
  open: Set<string>,
  orientation: Orientation,
): Layout {
  const pos: Record<string, Point> = {};
  const width: Record<string, number> = {};
  const visible: string[] = [];
  const links: { from: string; to: string }[] = [];

  // 좌→우는 칸 번호로, 위→아래는 실제 길이를 쌓아서 자리를 잡는다.
  let lane = 0;
  let cursorX = 0;

  const walk = (id: string, depth: number): number => {
    const node = byId[id];
    if (!node) return 0;
    visible.push(id);
    const w = nodeWidth(node);
    width[id] = w;

    const expanded = open.has(id) && node.childIds.length > 0;
    let center: number;

    if (expanded) {
      const centers = node.childIds.map((child) => {
        links.push({ from: id, to: child });
        return walk(child, depth + 1);
      });
      center = (Math.min(...centers) + Math.max(...centers)) / 2;
    } else if (orientation === 'h') {
      center = lane++ * ROW_H;
    } else {
      center = cursorX + w / 2;
      cursorX += w + GAP_X;
    }

    pos[id] =
      orientation === 'h' ? { x: depth * COL_W, y: center } : { x: center, y: depth * LEV_H };
    return center;
  };

  walk(root, 0);

  return { pos, width, visible, links, bounds: boundsOf(pos, width, orientation) };
}

function boundsOf(
  pos: Record<string, Point>,
  width: Record<string, number>,
  orientation: Orientation,
): Box {
  const ids = Object.keys(pos);
  if (ids.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

  const left = (id: string) => (orientation === 'h' ? pos[id].x : pos[id].x - width[id] / 2);
  const right = (id: string) => left(id) + width[id];

  const x0 = Math.min(...ids.map(left));
  const x1 = Math.max(...ids.map(right));
  const y0 = Math.min(...ids.map((id) => pos[id].y)) - NODE_H / 2;
  const y1 = Math.max(...ids.map((id) => pos[id].y)) + NODE_H / 2;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * 부모에서 자식으로 가는 연결선. 좌→우는 부드러운 곡선, 위→아래는 직각(엘보).
 * 부모의 오른쪽 끝에서 나가야 해서 부모의 길이를 받는다.
 */
export function linkPath(
  a: Point,
  b: Point,
  parentWidth: number,
  orientation: Orientation,
): string {
  if (orientation === 'h') {
    const x1 = a.x + parentWidth;
    const mid = (x1 + b.x) / 2;
    return `M ${x1} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
  }
  const y1 = a.y + NODE_H / 2;
  const y2 = b.y - NODE_H / 2;
  const mid = (y1 + y2) / 2;
  return `M ${a.x} ${y1} V ${mid} H ${b.x} V ${y2}`;
}

/** 화면에 딱 맞는 배율과 위치. */
export function fitCamera(bounds: Box, view: { w: number; h: number }, maxScale = 1) {
  const pad = 48;
  if (bounds.w <= 0 || bounds.h <= 0) return { x: pad, y: view.h / 2, k: 1 };
  const k = Math.min(maxScale, (view.w - pad * 2) / bounds.w, (view.h - pad * 2) / bounds.h);
  return {
    k,
    x: pad + (view.w - pad * 2 - bounds.w * k) / 2 - bounds.x * k,
    y: pad + (view.h - pad * 2 - bounds.h * k) / 2 - bounds.y * k,
  };
}
