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

export interface Placed extends Point {
  id: string;
  depth: number;
  /** 노드 하나의 가로 길이. */
  w: number;
  /**
   * 접혀서 안 보이는 노드. **지우지 않고 부모 자리에 겹쳐 둔다.**
   * 그래야 펼치고 접는 게 요소의 생성·삭제가 아니라 자리 이동이 되어,
   * 본체·제목·상태·연결선이 같은 진행률로 함께 움직인다.
   */
  hidden: boolean;
}

export interface Layout {
  /** 루트 아래 **모든** 노드. 접힌 것도 들어 있다. */
  nodes: Placed[];
  byId: Record<string, Placed>;
  /** 지금 펼쳐져 보이는 id만. 카메라와 키보드 이동이 이걸 쓴다. */
  visible: string[];
  links: { from: string; to: string; hidden: boolean }[];
  /** 보이는 노드만으로 잰 범위. 접힌 것까지 세면 카메라가 엉뚱하게 맞춰진다. */
  bounds: Box;
}

export const NODE_H = 40;

const ROW_H = 54; // 좌→우에서 형제 한 칸. 노드 높이보다 커야 서로 안 붙는다.
const GAP_X = 28; // 형제 사이 틈(위→아래) / 열 사이 틈(좌→우)
const LEV_H = 116; // 위→아래에서 깊이 한 칸

const MIN_W = 76;
const MAX_W = 264;

/** 글자 폭 어림. 한글은 넓고 영문은 좁다. 배치와 그리기가 같은 값을 써야 해서 여기 둔다. */
export function textWidth(text: string, size: number) {
  let w = 0;
  for (const ch of text) w += ch.codePointAt(0)! > 0x2e80 ? size * 0.98 : size * 0.55;
  return w;
}

export const TITLE_SIZE = 14;

/** 노드 안쪽 자리. 그리는 쪽과 너비 계산이 같은 값을 봐야 글씨가 안 잘린다. */
export const PAD_L = 12;
export const PAD_R = 10;
export const ICON_W = 22;
export const TOGGLE_W = 26;
/** 상태 표시 하나가 차지하는 폭. */
export const STATUS_W = 16;

/**
 * 노드 하나의 가로 길이. **있는 것만 더한다.**
 * 전에는 토글이 없는 잎에도 토글 자리를 빼서 글씨가 11.5px로 쪼그라들었다.
 *
 * @param statusCount 이 노드에 붙는 상태 표시 개수(시각화·심화·메모·퀴즈)
 */
export function nodeWidth(node: ConceptNode, statusCount = 0): number {
  const icon = node.depth === 1 ? ICON_W : 0;
  const toggle = node.childIds.length > 0 ? TOGGLE_W : 0;
  const raw =
    PAD_L + icon + textWidth(node.title, TITLE_SIZE) + statusCount * STATUS_W + toggle + PAD_R;
  // 올림으로 잡는다. 내림·반올림하면 딱 맞는 제목이 1px 차이로 잘려 "…"가 붙는다.
  return Math.ceil(Math.min(MAX_W, Math.max(MIN_W, raw)));
}

/** 제목이 들어갈 수 있는 폭. 넘치면 줄여 쓰지 말고 잘라 쓴다(글씨 크기는 유지). */
export function titleSpace(w: number, hasIcon: boolean, hasToggle: boolean, statusCount: number) {
  return (
    w - PAD_L - (hasIcon ? ICON_W : 0) - statusCount * STATUS_W - (hasToggle ? TOGGLE_W : 0) - PAD_R
  );
}

/** 폭에 맞게 잘라낸 제목. 잘렸으면 `full`로 원래 이름을 알려준다. */
export function fitTitle(title: string, space: number) {
  // 글자 폭이 어림값이라 0.5px쯤은 봐준다. 안 그러면 딱 맞는 이름이 잘린다.
  if (textWidth(title, TITLE_SIZE) <= space + 0.5) return { text: title, clipped: false };
  let cut = title;
  while (cut.length > 1 && textWidth(cut + '…', TITLE_SIZE) > space) cut = cut.slice(0, -1);
  return { text: cut + '…', clipped: true };
}

/**
 * 트리를 좌표로 펼친다. `x`는 좌→우에서 왼쪽 끝, 위→아래에서 가로 가운데다. `y`는 세로 가운데.
 *
 * 접힌 노드도 목록에 넣되 **가장 가까운 보이는 조상의 자리**에 겹쳐 두고 `hidden`으로 표시한다.
 * 그리는 쪽이 그걸 투명하게 그리면, 펼치기는 "부모에서 자기 자리로 이동",
 * 접기는 "자기 자리에서 부모로 이동"이 되어 양쪽 다 자연스럽게 이어진다.
 *
 * @param open 펼쳐진 노드 id. 여기 없는 노드의 자식은 접힌 것으로 친다.
 * @param root 지금 루트로 볼 노드. "이 가지만 보기"에 쓴다.
 * @param widthOf 노드별 가로 길이. 상태 표시 개수가 화면 쪽 사정이라 밖에서 받는다.
 */
export function layoutTree(
  byIdSource: Record<string, ConceptNode>,
  root: string,
  open: Set<string>,
  orientation: Orientation,
  widthOf: (node: ConceptNode) => number = (n) => nodeWidth(n),
): Layout {
  const nodes: Placed[] = [];
  const byId: Record<string, Placed> = {};
  const visible: string[] = [];
  const links: { from: string; to: string; hidden: boolean }[] = [];

  let lane = 0;
  let cursorX = 0;
  const widestAt: number[] = [];

  /** 보이는 노드만 자리를 차지한다. 접힌 것은 조상 자리에 얹는다. */
  const walk = (id: string, depth: number, shown: boolean, anchor: Point | null): number => {
    const node = byIdSource[id];
    if (!node) return 0;
    const w = widthOf(node);

    if (shown) {
      visible.push(id);
      widestAt[depth] = Math.max(widestAt[depth] ?? 0, w);
    }

    const expanded = open.has(id) && node.childIds.length > 0;
    let center: number;

    if (shown && expanded) {
      const centers = node.childIds.map((child) => walk(child, depth + 1, true, null));
      center = (Math.min(...centers) + Math.max(...centers)) / 2;
    } else if (!shown) {
      center = orientation === 'h' ? (anchor?.y ?? 0) : (anchor?.x ?? 0);
    } else if (orientation === 'h') {
      center = lane++ * ROW_H;
    } else {
      center = cursorX + w / 2;
      cursorX += w + GAP_X;
    }

    const placed: Placed = {
      id,
      depth,
      w,
      hidden: !shown,
      ...(orientation === 'h' ? { x: 0, y: center } : { x: center, y: depth * LEV_H }),
    };
    nodes.push(placed);
    byId[id] = placed;

    // 접힌 자식들도 목록에 넣는다. 자리는 이 노드에 겹쳐 둔다.
    if (!expanded || !shown) {
      for (const child of node.childIds) {
        links.push({ from: id, to: child, hidden: true });
        walk(child, depth + 1, false, placed);
      }
    } else {
      for (const child of node.childIds) links.push({ from: id, to: child, hidden: false });
    }

    return center;
  };

  walk(root, 0, true, null);

  if (orientation === 'h') {
    /*
     * 열 간격을 고정값으로 두면 긴 이름이 다음 열을 침범한다.
     * 각 깊이에서 가장 긴 노드만큼 자리를 내주고 그 뒤에 다음 열을 놓는다.
     */
    const colX: number[] = [];
    let x = 0;
    for (let d = 0; d < widestAt.length; d++) {
      colX[d] = x;
      x += (widestAt[d] ?? 0) + GAP_X * 2;
    }
    for (const p of nodes) p.x = colX[p.depth] ?? colX[colX.length - 1] ?? 0;
    // 접힌 노드는 조상 자리에 다시 얹는다(열 배정이 덮어썼으므로).
    for (const p of nodes) {
      if (!p.hidden) continue;
      const parent = byIdSource[p.id]?.parentId;
      const at = parent ? byId[parent] : undefined;
      if (at) {
        p.x = at.x;
        p.y = at.y;
      }
    }
  } else {
    for (const p of nodes) {
      if (!p.hidden) continue;
      const parent = byIdSource[p.id]?.parentId;
      const at = parent ? byId[parent] : undefined;
      if (at) {
        p.x = at.x;
        p.y = at.y;
      }
    }
  }

  return { nodes, byId, visible, links, bounds: boundsOf(visible, byId, orientation) };
}

function boundsOf(visible: string[], byId: Record<string, Placed>, orientation: Orientation): Box {
  if (!visible.length) return { x: 0, y: 0, w: 0, h: 0 };
  const left = (id: string) => (orientation === 'h' ? byId[id].x : byId[id].x - byId[id].w / 2);
  const x0 = Math.min(...visible.map(left));
  const x1 = Math.max(...visible.map((id) => left(id) + byId[id].w));
  const y0 = Math.min(...visible.map((id) => byId[id].y)) - NODE_H / 2;
  const y1 = Math.max(...visible.map((id) => byId[id].y)) + NODE_H / 2;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/**
 * 부모에서 자식으로 가는 연결선. 좌→우는 부드러운 곡선, 위→아래는 직각(엘보).
 * 노드와 같은 속도로 움직여야 해서 CSS로 `d`를 전환한다. 명령 구조가 같아야 보간된다.
 */
export function linkPath(a: Placed, b: Placed, orientation: Orientation): string {
  if (orientation === 'h') {
    const x1 = a.x + a.w;
    const mid = (x1 + b.x) / 2;
    return `M ${x1} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
  }
  const y1 = a.y + NODE_H / 2;
  const y2 = b.y - NODE_H / 2;
  const mid = (y1 + y2) / 2;
  return `M ${a.x} ${y1} V ${mid} H ${b.x} V ${y2}`;
}

/**
 * 화면에 맞는 배율과 위치.
 *
 * 배율에 **아래쪽 한계**를 둔다. 좁은 화면에서 트리 전체를 욱여넣으면 글씨가 6px이 되어
 * 지도가 아니라 얼룩이 된다. 다 안 들어가면 차라리 밀어서 보는 게 낫다.
 */
export function fitCamera(
  bounds: Box,
  view: { w: number; h: number },
  { min = 0.55, max = 1 }: { min?: number; max?: number } = {},
) {
  const pad = 40;
  if (bounds.w <= 0 || bounds.h <= 0 || view.w <= 0 || view.h <= 0) {
    return { x: pad, y: Math.max(0, view.h) / 2, k: 1 };
  }
  const raw = Math.min(max, (view.w - pad * 2) / bounds.w, (view.h - pad * 2) / bounds.h);
  const k = Math.max(min, raw);
  /*
   * 들어가면 가운데, **안 들어가면 시작점에 붙인다.**
   * 넘치는데도 가운데에 두면 양쪽이 똑같이 잘려서, 좌→우 트리의 뿌리와 과목 열이
   * 화면 왼쪽 밖으로 사라진다. 어디서부터 뻗어 나온 가지인지 모른 채 보게 된다.
   * 잘릴 거라면 잎 쪽이 잘려야 한다 — 그쪽은 밀어서 따라가면 되니까.
   */
  const place = (view: number, size: number, origin: number) =>
    size * k <= view - pad * 2
      ? pad + (view - pad * 2 - size * k) / 2 - origin * k
      : pad - origin * k;
  return {
    k,
    x: place(view.w, bounds.w, bounds.x),
    y: place(view.h, bounds.h, bounds.y),
  };
}
