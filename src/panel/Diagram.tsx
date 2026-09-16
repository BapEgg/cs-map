import { useMemo } from 'react';
import { PHONE, useMedia } from '../ui/media';
import type { DiagramEdge } from './parseBody';

/**
 * 상태 관계도. `A -> B: 이유` 줄들을 받아 상자와 화살표로 그린다.
 *
 * 노드는 처음 등장한 순서대로 한 줄에 놓는다. 앞으로 가는 화살표는 위(넓은 화면)·오른쪽(폰),
 * 되돌아가는 화살표는 아래·왼쪽으로 돌아간다 — "정상 흐름"과 "되돌아가는 흐름"이 그림에서 갈린다.
 * 폰에서는 줄이지 않고 세로로 다시 배치한다(HANDOFF 6-2-6). 색은 전부 테마 토큰이다.
 */

const FONT = 14;
const LABEL = 12;
const NODE_H = 34;
const GAP = 48;
const PAD_X = 16;
/** 한 칸 건너뛸 때마다 호를 이만큼 더 띄운다. 겹치지 않게. */
const ARC_BASE = 30;
const ARC_STEP = 24;
const MARGIN = 10;

const textWidth = (s: string, size = FONT) =>
  [...s].reduce((w, ch) => w + (/[ㄱ-힝]/.test(ch) ? size : size * 0.58), 0);

interface Arc extends DiagramEdge {
  i: number;
  j: number;
  forward: boolean;
  height: number;
}

function layout(edges: DiagramEdge[], vertical: boolean) {
  const names: string[] = [];
  for (const e of edges) {
    if (!names.includes(e.from)) names.push(e.from);
    if (!names.includes(e.to)) names.push(e.to);
  }
  // 세로 배치는 상자 폭을 맞춘다 — 폭이 들쭉날쭉하면 화살표 출발점이 어긋난다.
  const widths = names.map((n) => Math.max(64, textWidth(n) + PAD_X * 2));
  const uniform = Math.max(...widths);
  const sizes = names.map((_, i) => (vertical ? NODE_H : widths[i]));
  const alongs: number[] = [];
  let cursor = 0;
  sizes.forEach((s) => {
    alongs.push(cursor);
    cursor += s + GAP;
  });
  const total = cursor - GAP;

  // 같은 방향으로 같은 거리를 도는 호가 여럿이면 층을 올린다.
  const lanes = new Map<string, number>();
  const arcs: Arc[] = edges.map((e) => {
    const i = names.indexOf(e.from);
    const j = names.indexOf(e.to);
    const forward = j >= i;
    const span = Math.max(1, Math.abs(j - i));
    const key = `${forward}:${span}`;
    const lane = lanes.get(key) ?? 0;
    lanes.set(key, lane + 1);
    return { ...e, i, j, forward, height: ARC_BASE + ARC_STEP * (span - 1) + lane * ARC_STEP };
  });

  // 호가 차지하는 두께. 넓은 화면은 글씨가 호 위에 얹히고, 폰은 호 옆에 붙는다(폭이 더 든다).
  const extent = (side: Arc[]) => {
    if (!side.length) return MARGIN;
    const arc = Math.max(...side.map((a) => a.height));
    const label = vertical ? Math.max(...side.map((a) => textWidth(a.label, LABEL))) + 8 : LABEL;
    return arc + label + MARGIN;
  };
  const forwardExtent = extent(arcs.filter((a) => a.forward));
  const backExtent = extent(arcs.filter((a) => !a.forward));

  return {
    names,
    widths,
    uniform,
    sizes,
    alongs,
    total,
    arcs,
    across: vertical ? uniform : NODE_H,
    forwardExtent,
    backExtent,
  };
}

export default function Diagram({ edges }: { edges: DiagramEdge[] }) {
  const vertical = useMedia(PHONE);
  const L = useMemo(() => layout(edges, vertical), [edges, vertical]);
  if (!edges.length) return null;

  // 진행 축(along)과 가로지르는 축(cross). 넓은 화면: along=x, 앞으로 가는 호는 위(cross 작은 쪽).
  // 폰: along=y, 앞으로 가는 호는 오른쪽(cross 큰 쪽).
  const forwardSign = vertical ? 1 : -1;
  const neg = vertical ? L.backExtent : L.forwardExtent; // cross 작은 쪽에 필요한 두께
  const pos = vertical ? L.forwardExtent : L.backExtent;
  const bandStart = neg;
  const bandEnd = neg + L.across;
  const crossSize = neg + L.across + pos;
  const W = vertical ? crossSize : L.total + MARGIN * 2;
  const H = vertical ? L.total + MARGIN * 2 : crossSize;
  const pt = (along: number, cross: number) =>
    vertical ? { x: cross, y: along + MARGIN } : { x: along + MARGIN, y: cross };

  return (
    <div
      className="diagram"
      role="img"
      aria-label={edges
        .map((e) => `${e.from}에서 ${e.to}${e.label ? `: ${e.label}` : ''}`)
        .join('. ')}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <defs>
          <marker
            id="dg-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="diagram-head" />
          </marker>
        </defs>
        {L.arcs.map((a, k) => {
          const sign = a.forward ? forwardSign : -forwardSign;
          const face = sign < 0 ? bandStart : bandEnd;
          const a0 = L.alongs[a.i] + L.sizes[a.i] / 2;
          const a1 = L.alongs[a.j] + L.sizes[a.j] / 2;
          const self = a.i === a.j;
          const p0 = pt(self ? a0 - 12 : a0, face);
          const p1 = pt(self ? a0 + 12 : a1, face);
          const c0 = pt(self ? a0 - 30 : a0, face + sign * a.height * 1.3);
          const c1 = pt(self ? a0 + 30 : a1, face + sign * a.height * 1.3);
          const apex = pt((a0 + a1) / 2, face + sign * a.height);
          const d = `M ${p0.x} ${p0.y} C ${c0.x} ${c0.y}, ${c1.x} ${c1.y}, ${p1.x} ${p1.y}`;
          const label = vertical
            ? { x: apex.x + sign * 6, y: apex.y, anchor: sign > 0 ? 'start' : 'end' }
            : { x: apex.x, y: apex.y + (sign < 0 ? -5 : LABEL + 3), anchor: 'middle' };
          return (
            <g key={k} className="diagram-edge">
              <path d={d} markerEnd="url(#dg-arrow)" />
              {a.label && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor as 'start' | 'end' | 'middle'}
                  dominantBaseline={vertical ? 'central' : undefined}
                  className="diagram-label"
                >
                  {a.label}
                </text>
              )}
            </g>
          );
        })}
        {L.names.map((name, i) => {
          const p = pt(L.alongs[i], bandStart);
          const w = vertical ? L.uniform : L.sizes[i];
          const h = vertical ? L.sizes[i] : NODE_H;
          return (
            <g key={name} className="diagram-node">
              <rect x={p.x} y={p.y} width={w} height={h} rx={8} />
              <text x={p.x + w / 2} y={p.y + h / 2} textAnchor="middle" dominantBaseline="central">
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
