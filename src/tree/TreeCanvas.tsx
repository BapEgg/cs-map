import { useEffect, useMemo, useRef } from 'react';
import type { ConceptNode } from '../content/types';
import { NODE_H, NODE_W, layoutTree, linkPath, type Orientation } from './layout';
import { useCamera } from './useCamera';
import './tree.css';

interface Props {
  byId: Record<string, ConceptNode>;
  root: string;
  open: Set<string>;
  selected: string | null;
  orientation: Orientation;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

/** 글자 폭 어림. 한글은 넓고 영문은 좁다. 정확할 필요는 없고 줄바꿈 판단에만 쓴다. */
function textWidth(text: string, size: number) {
  let w = 0;
  for (const ch of text) w += ch.codePointAt(0)! > 0x2e80 ? size * 0.98 : size * 0.55;
  return w;
}

/** 길면 가운데 공백에서 두 줄로 자른다. */
function splitTitle(title: string, size: number): string[] {
  if (textWidth(title, size) <= NODE_W - 40) return [title];
  const spaces = [...title.matchAll(/ /g)].map((m) => m.index!);
  if (!spaces.length) return [title];
  const mid = title.length / 2;
  const at = spaces.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [title.slice(0, at), title.slice(at + 1)];
}

export default function TreeCanvas({
  byId,
  root,
  open,
  selected,
  orientation,
  onToggle,
  onSelect,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraApi = useCamera(svgRef);
  const { cam, smooth, dragging, didDrag, onPointerDown, fit, zoomBy, ensureVisible } = cameraApi;

  const layout = useMemo(
    () => layoutTree(byId, root, open, orientation),
    [byId, root, open, orientation],
  );

  // 방향을 바꾸거나 가지를 갈아타면 화면에 맞춘다. 첫 화면은 애니메이션 없이 바로.
  const firstFit = useRef(true);
  useEffect(() => {
    fit(layoutTree(byId, root, new Set([root]), orientation).bounds, !firstFit.current);
    firstFit.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orientation, root]);

  // 펼친 노드의 새 자식이 화면 밖이면 카메라가 따라간다.
  const lastOpened = useRef<string | null>(null);
  useEffect(() => {
    const id = lastOpened.current;
    if (!id || !open.has(id)) return;
    const kids = byId[id]?.childIds ?? [];
    const pts = kids.map((k) => layout.pos[k]).filter(Boolean);
    if (!pts.length) return;
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    ensureVisible({
      x: Math.min(...xs),
      y: Math.min(...ys) - NODE_H / 2,
      w: Math.max(...xs) - Math.min(...xs) + NODE_W,
      h: Math.max(...ys) - Math.min(...ys) + NODE_H,
    });
    lastOpened.current = null;
  }, [byId, open, layout, ensureVisible]);

  // 설명 패널에서 다른 개념으로 건너뛰면 트리도 그쪽을 비춘다.
  const lastSelected = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || selected === lastSelected.current) return;
    lastSelected.current = selected;
    const p = layout.pos[selected];
    if (!p) return;
    ensureVisible({ x: p.x - 40, y: p.y - NODE_H, w: NODE_W + 80, h: NODE_H * 2 });
  }, [selected, layout, ensureVisible]);

  const handleNode = (id: string) => {
    if (didDrag()) return;
    onSelect(id);
    if (byId[id].childIds.length > 0) {
      if (!open.has(id)) lastOpened.current = id;
      onToggle(id);
    }
  };

  return (
    <div className="tree-wrap">
      <svg
        ref={svgRef}
        className={`tree-svg${dragging ? ' dragging' : ''}`}
        onPointerDown={onPointerDown}
        role="tree"
        aria-label="개념 지도"
      >
        <g
          className="tree-cam"
          style={{
            transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.k})`,
            transition: smooth ? 'transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none',
          }}
        >
          <g className="tree-links">
            {layout.links.map(({ from, to }) => (
              <path
                key={`${from}-${to}`}
                d={linkPath(layout.pos[from], layout.pos[to], orientation)}
                fill="none"
              />
            ))}
          </g>

          {layout.visible.map((id) => {
            const node = byId[id];
            const p = layout.pos[id];
            const depth = Math.min(node.depth, 5);
            const hasKids = node.childIds.length > 0;
            const isOpen = open.has(id);
            // 좌→우는 왼쪽 끝이 기준, 위→아래는 가운데가 기준이다.
            const x = orientation === 'h' ? p.x : p.x - NODE_W / 2;
            const y = p.y - NODE_H / 2;
            const size = 14;
            const lines = splitTitle(node.title, size);
            const fs = lines.length > 1 || textWidth(node.title, size) > NODE_W - 26 ? 12 : size;

            return (
              <g
                key={id}
                className={`tree-node${id === selected ? ' selected' : ''}`}
                transform={`translate(${x} ${y})`}
                onClick={() => handleNode(id)}
                role="treeitem"
                aria-expanded={hasKids ? isOpen : undefined}
                aria-selected={id === selected}
                tabIndex={-1}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={9}
                  fill={`var(--depth-${depth})`}
                  className="tree-node-box"
                />
                <text
                  x={NODE_W / 2}
                  y={lines.length > 1 ? NODE_H / 2 - 5 : NODE_H / 2 + 5}
                  textAnchor="middle"
                  fontSize={fs}
                  fill={`var(--depth-${depth}-text)`}
                  className="tree-node-title"
                >
                  {lines.map((line, i) => (
                    <tspan key={i} x={NODE_W / 2} dy={i === 0 ? 0 : 15}>
                      {line}
                    </tspan>
                  ))}
                </text>

                {hasKids && (
                  <g className="tree-toggle">
                    <circle cx={NODE_W - 13} cy={NODE_H / 2} r={8.5} />
                    <text x={NODE_W - 13} y={NODE_H / 2 + 4} textAnchor="middle">
                      {isOpen ? '−' : '+'}
                    </text>
                  </g>
                )}

                {(node.hasDeep || node.sim) && (
                  <g className="tree-badges" transform={`translate(6 ${NODE_H - 5})`}>
                    {node.hasDeep && <circle r={3.5} fill="var(--badge-deep)" />}
                    {node.sim && (
                      <circle cx={node.hasDeep ? 10 : 0} r={3.5} fill="var(--badge-sim)" />
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="tree-tools">
        <button onClick={() => zoomBy(1.2)} aria-label="확대">
          ＋
        </button>
        <button onClick={() => zoomBy(1 / 1.2)} aria-label="축소">
          －
        </button>
        <button onClick={() => fit(layout.bounds)} aria-label="화면에 맞추기">
          ⤢
        </button>
      </div>

      <div className="tree-legend">
        <span>큰 개념</span>
        {[0, 1, 2, 3, 4, 5].map((d) => (
          <i key={d} style={{ background: `var(--depth-${d})` }} />
        ))}
        <span>작은 개념</span>
        <em>
          <i className="dot" style={{ background: 'var(--badge-deep)' }} /> 심화
          <i className="dot" style={{ background: 'var(--badge-sim)' }} /> 눈으로 보기
        </em>
      </div>
    </div>
  );
}
