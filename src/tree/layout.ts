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
  /** 지금 화면에 있는 노드. 펼쳐진 가지만 들어간다. */
  visible: string[];
  /** 부모 → 자식 연결선. */
  links: { from: string; to: string }[];
  bounds: Box;
}

export const NODE_W = 150;
export const NODE_H = 40;

const COL_W = 210; // 좌→우에서 깊이 한 칸
const ROW_H = 54; // 좌→우에서 형제 한 칸. 노드 높이보다 커야 서로 안 붙는다.
const SLOT_W = NODE_W + 34; // 위→아래에서 형제 한 칸
const LEV_H = 116; // 위→아래에서 깊이 한 칸

/**
 * 트리를 좌표로 펼친다.
 *
 * 잎을 순서대로 한 칸씩 놓고, 부모는 **자식들의 가운데**에 둔다.
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
  const visible: string[] = [];
  const links: { from: string; to: string }[] = [];
  let slot = 0;

  const walk = (id: string, depth: number): number => {
    const node = byId[id];
    if (!node) return 0;
    visible.push(id);

    const expanded = open.has(id) && node.childIds.length > 0;
    let lane: number;

    if (expanded) {
      const lanes = node.childIds.map((child) => {
        links.push({ from: id, to: child });
        return walk(child, depth + 1);
      });
      lane = (Math.min(...lanes) + Math.max(...lanes)) / 2;
    } else {
      lane = slot++;
    }

    pos[id] =
      orientation === 'h'
        ? { x: depth * COL_W, y: lane * ROW_H }
        : { x: lane * SLOT_W, y: depth * LEV_H };
    return lane;
  };

  walk(root, 0);

  return { pos, visible, links, bounds: boundsOf(pos, orientation) };
}

function boundsOf(pos: Record<string, Point>, orientation: Orientation): Box {
  const points = Object.values(pos);
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

  // 좌→우에서는 노드가 자기 자리에서 오른쪽으로 뻗고, 위→아래에서는 가운데 정렬이다.
  const padX = orientation === 'h' ? 0 : NODE_W / 2;
  const x0 = Math.min(...points.map((p) => p.x)) - padX;
  const x1 = Math.max(...points.map((p) => p.x)) + (orientation === 'h' ? NODE_W : NODE_W / 2);
  const y0 = Math.min(...points.map((p) => p.y)) - NODE_H / 2;
  const y1 = Math.max(...points.map((p) => p.y)) + NODE_H / 2;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** 부모에서 자식으로 가는 연결선. 좌→우는 부드러운 곡선, 위→아래는 직각(엘보). */
export function linkPath(a: Point, b: Point, orientation: Orientation): string {
  if (orientation === 'h') {
    const x1 = a.x + NODE_W;
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
