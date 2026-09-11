import type { ConceptNode } from '../content/types';

/** 가로(h)가 기본. 세로(v)로 바꿀 수 있다. */
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

const ROW_H = 54; // 가로에서 형제 한 칸. 노드 높이보다 커야 서로 안 붙는다.
const GAP_X = 28; // 형제 사이 틈(세로) / 열 사이 틈(가로)
const LEV_H = 116; // 세로에서 깊이 한 칸

const MIN_W = 76;
const MAX_W = 264;

/** 글자 폭을 재는 함수. 브라우저에서는 실제 글꼴로 재고(measure.ts), 테스트에서는 어림값을 쓴다. */
export type Measure = (text: string, size: number) => number;

/**
 * 글자 폭 어림. 한글은 넓고 영문은 좁다. **어림값이라 기기마다 어긋난다** —
 * Pretendard가 없는 윈도우에서는 맑은 고딕으로 떨어지는데 한글 폭이 이 값보다 좁아서
 * 상자 오른쪽이 비고 글씨가 왼쪽으로 몰려 보였다. 화면에서는 measure.ts가 실제로 잰다.
 */
export function textWidth(text: string, size: number) {
  let w = 0;
  for (const ch of text) w += ch.codePointAt(0)! > 0x2e80 ? size * 0.98 : size * 0.55;
  return w;
}

export const TITLE_SIZE = 14;

/** 노드 안쪽 자리. 그리는 쪽과 너비 계산이 같은 값을 봐야 글씨가 안 잘린다. */
export const PAD_L = 12;
export const PAD_R = 12; // 왼쪽과 같게. 잎은 토글이 없어 좌우가 그대로 드러난다.
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
export function nodeWidth(
  node: ConceptNode,
  statusCount = 0,
  measure: Measure = textWidth,
): number {
  const icon = node.depth === 1 ? ICON_W : 0;
  const toggle = node.childIds.length > 0 ? TOGGLE_W : 0;
  const raw =
    PAD_L + icon + measure(node.title, TITLE_SIZE) + statusCount * STATUS_W + toggle + PAD_R;
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
export function fitTitle(title: string, space: number, measure: Measure = textWidth) {
  // 반올림으로 0.5px쯤은 봐준다. 안 그러면 딱 맞는 이름이 잘린다.
  const width = measure(title, TITLE_SIZE);
  if (width <= space + 0.5) return { text: title, width, clipped: false };
  let cut = title;
  while (cut.length > 1 && measure(cut + '…', TITLE_SIZE) > space) cut = cut.slice(0, -1);
  return { text: cut + '…', width: measure(cut + '…', TITLE_SIZE), clipped: true };
}

/**
 * 트리를 좌표로 펼친다. 가로 배치에서 `x`는 노드의 왼쪽 끝, 세로 배치에서는 가운데다. `y`는 언제나 가운데.
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

  /*
   * 그리는 차례를 **펼침 상태와 무관하게** 고정한다.
   *
   * walk는 펼쳤을 때 자식을 먼저, 접었을 때 부모를 먼저 넣는다. 그대로 내보내면
   * 접을 때 React가 DOM 요소를 앞뒤로 옮기고, 옮겨진 요소는 시작값을 잃어 전환이 아예 안 걸린다.
   * (접기가 스르륵이 아니라 툭 사라지던 원인. 펼치기만 멀쩡해 보여서 놓치기 쉽다.)
   */
  const order = orderOf(byIdSource, root);
  nodes.sort((a, b) => (order[a.id] ?? 0) - (order[b.id] ?? 0));

  return { nodes, byId, visible, links, bounds: boundsOf(visible, byId, orientation) };
}

/** 펼침과 상관없이 트리 전체를 한 번 훑어 매기는 차례. 그리는 순서를 고정하는 데만 쓴다. */
function orderOf(byIdSource: Record<string, ConceptNode>, root: string): Record<string, number> {
  const out: Record<string, number> = {};
  let n = 0;
  const walk = (id: string) => {
    const node = byIdSource[id];
    if (!node || id in out) return;
    out[id] = n++;
    for (const child of node.childIds) walk(child);
  };
  walk(root);
  return out;
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
 * 부모에서 자식으로 가는 연결선. 가로는 부드러운 곡선, 세로는 직각(엘보).
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
 *
 * @param focus 다 안 들어갈 때 **꼭 보여야 하는 자리**(고른 노드, 방금 펼친 가지).
 *   전부를 담는 게 목적이 아니다. 읽히는 크기를 지키면서 지금 관심 있는 데를 보여 준다.
 */
export function fitCamera(
  bounds: Box,
  view: { w: number; h: number },
  { min = 0.55, max = 1, focus }: { min?: number; max?: number; focus?: Box } = {},
) {
  /*
   * 여백은 두 값을 쓴다.
   *
   * 배율을 정할 때는 **최소 여백만** 요구한다. 40px을 고정으로 요구하면
   * "80px만 더 있으면 다 들어가는데" 하는 상황에서 통째로 포기해 버린다
   * (1000×800에서 19개 중 2개가 그렇게 잘렸다).
   * 자리를 잡을 때는 남는 만큼 여백을 주되 40px을 넘기지 않는다.
   */
  const PAD = 40;
  const MIN_PAD = 8;
  if (bounds.w <= 0 || bounds.h <= 0 || view.w <= 0 || view.h <= 0) {
    return { x: PAD, y: Math.max(0, view.h) / 2, k: 1 };
  }
  /*
   * 넉넉한 여백으로 들어가면 그대로 쓴다. **바닥에 걸릴 때만** 여백을 깎아 본다.
   * 늘 최소 여백으로 재면 넓은 화면에서도 가장자리까지 꽉 채워 버려 답답해진다.
   */
  const fitWith = (pad: number) =>
    Math.min(max, (view.w - pad * 2) / bounds.w, (view.h - pad * 2) / bounds.h);
  const roomy = fitWith(PAD);
  const k = roomy >= min ? roomy : Math.max(min, fitWith(MIN_PAD));
  /*
   * 들어가면 가운데.
   *
   * 안 들어가면 **관심 있는 데를 가운데**에 놓되, 내용 바깥까지 밀려나지 않게 잡아 둔다.
   * 관심 자리가 없으면 시작점에 붙인다 — 양쪽을 똑같이 잘라 버리면 가로 트리의
   * 뿌리와 과목 열이 화면 밖으로 사라져서, 어디서 뻗어 나온 가지인지 모른 채 보게 된다.
   */
  const place = (
    span: number,
    size: number,
    origin: number,
    at?: { from: number; size: number },
  ) => {
    const drawn = size * k;
    const pad = Math.min(PAD, Math.max(MIN_PAD, (span - drawn) / 2));
    const room = span - pad * 2;
    if (drawn <= room) return pad + (room - drawn) / 2 - origin * k;
    if (!at) return pad - origin * k;
    const centered = span / 2 - (at.from + at.size / 2) * k;
    const atStart = pad - origin * k;
    const atEnd = span - pad - (origin + size) * k;
    return Math.min(atStart, Math.max(atEnd, centered));
  };
  return {
    k,
    x: place(view.w, bounds.w, bounds.x, focus && { from: focus.x, size: focus.w }),
    y: place(view.h, bounds.h, bounds.y, focus && { from: focus.y, size: focus.h }),
  };
}
