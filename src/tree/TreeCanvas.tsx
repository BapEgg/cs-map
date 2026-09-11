import { useEffect, useMemo, useRef } from 'react';
import type { ConceptNode } from '../content/types';
import SubjectIcon from './SubjectIcon';
import { NODE_H, TITLE_SIZE, layoutTree, linkPath, textWidth, type Orientation } from './layout';
import { useCamera } from './useCamera';
import './tree.css';

interface Props {
  byId: Record<string, ConceptNode>;
  root: string;
  open: Set<string>;
  selected: string | null;
  orientation: Orientation;
  /** 퀴즈 결과. 기억났으면 초록, 헷갈렸으면 주황 점. */
  marks: Record<string, { known: boolean }>;
  /** 메모를 남긴 개념. */
  noted: Set<string>;
  /** 노드 본체를 눌렀을 때. 고르고, 그 갈래로 들어간다. 접지는 않는다. */
  onNodeClick: (id: string) => void;
  /** ＋/－ 표시를 눌렀을 때. 접기·펴기만 한다. */
  onToggle: (id: string) => void;
}

export default function TreeCanvas({
  byId,
  root,
  open,
  selected,
  orientation,
  marks,
  noted,
  onNodeClick,
  onToggle,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { cam, smooth, dragging, didDrag, onPointerDown, fit, zoomBy, ensureVisible } =
    useCamera(svgRef);

  const layout = useMemo(
    () => layoutTree(byId, root, open, orientation),
    [byId, root, open, orientation],
  );

  /*
   * 방향을 바꾸거나 가지를 갈아타면 화면에 맞춘다. 첫 화면은 애니메이션 없이 바로.
   *
   * 맞출 범위는 **지금 화면에 그려진 배치**여야 한다. 전에는 "루트만 펼친 상태"를
   * 따로 계산해서 맞췄는데, 실제로는 과목까지 펼쳐져 있어서 카메라가 트리보다
   * 좁은 범위를 기준으로 잡혔다.
   */
  const lastFit = useRef('');
  useEffect(() => {
    const key = `${orientation}:${root}`;
    if (lastFit.current === key) return;
    const first = lastFit.current === '';
    lastFit.current = key;
    fit(layout.bounds, !first);
  }, [orientation, root, layout, fit]);

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
      w: Math.max(...xs) - Math.min(...xs) + 160,
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
    const w = layout.width[selected] ?? 120;
    ensureVisible({ x: p.x - 30, y: p.y - NODE_H, w: w + 60, h: NODE_H * 2 });
  }, [selected, layout, ensureVisible]);

  /**
   * 흐리게 하지 않을 노드들: 고른 개념, 거기까지 가는 길, 그 아래 자식, **그리고 형제**.
   *
   * 나머지를 흐리게 해야 "지금 보고 있는 게 어디인지"가 한눈에 들어온다.
   * 테두리 색 하나로는 노드 수십 개 중에서 못 찾는다.
   *
   * 형제를 살려 두는 이유는 설명 패널의 '흐름'이 바로 그 형제들을 가리키기 때문이다.
   * (세그멘테이션 → 페이징 → 가상 메모리)
   */
  const focused = useMemo(() => {
    if (!selected || !byId[selected]) return null;
    const set = new Set<string>(byId[selected].childIds);
    const parent = byId[selected].parentId;
    for (const sib of parent ? byId[parent].childIds : []) set.add(sib);
    let cursor: string | null = selected;
    while (cursor) {
      set.add(cursor);
      cursor = byId[cursor]?.parentId ?? null;
    }
    return set;
  }, [byId, selected]);

  const handleNode = (id: string) => {
    if (didDrag()) return;
    if (byId[id].childIds.length > 0 && !open.has(id)) lastOpened.current = id;
    onNodeClick(id);
  };

  /**
   * 지도를 키보드로도 돌아다닐 수 있게 한다. 마우스 없이는 아예 못 쓰던 화면이었다.
   * ↑↓ 로 화면에 보이는 순서대로, → 로 펼치고 들어가고, ← 로 접거나 부모로 나온다.
   */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = layout.visible;
    if (!list.length) return;
    const here = selected && list.includes(selected) ? list.indexOf(selected) : -1;
    const move = (to: number) => {
      e.preventDefault();
      onNodeClick(list[Math.max(0, Math.min(list.length - 1, to))]);
    };

    switch (e.key) {
      case 'ArrowDown':
        return move(here + 1);
      case 'ArrowUp':
        return move(here === -1 ? 0 : here - 1);
      case 'ArrowRight': {
        if (here === -1) return move(0);
        const node = byId[list[here]];
        if (!node.childIds.length) return;
        e.preventDefault();
        if (!open.has(node.id)) onToggle(node.id);
        else onNodeClick(node.childIds[0]);
        return;
      }
      case 'ArrowLeft': {
        if (here === -1) return;
        const node = byId[list[here]];
        e.preventDefault();
        if (open.has(node.id) && node.childIds.length) onToggle(node.id);
        else if (node.parentId && list.includes(node.parentId)) onNodeClick(node.parentId);
        return;
      }
      case 'Enter':
      case ' ':
        if (here !== -1) {
          e.preventDefault();
          onToggle(list[here]);
        }
        return;
      default:
        return;
    }
  };

  return (
    <div className="tree-wrap">
      <svg
        ref={svgRef}
        className={`tree-svg${dragging ? ' dragging' : ''}`}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="tree"
        aria-label="개념 지도. 화살표 키로 옮겨 다닐 수 있어요"
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
                className={focused && !(focused.has(from) && focused.has(to)) ? 'dim' : undefined}
                d={linkPath(layout.pos[from], layout.pos[to], layout.width[from], orientation)}
                fill="none"
              />
            ))}
          </g>

          {layout.visible.map((id) => {
            const node = byId[id];
            const p = layout.pos[id];
            const w = layout.width[id];
            const depth = Math.min(node.depth, 5);
            const hasKids = node.childIds.length > 0;
            const isOpen = open.has(id);
            const icon = node.depth === 1;
            // 좌→우는 왼쪽 끝이 기준, 위→아래는 가운데가 기준이다.
            const x = orientation === 'h' ? p.x : p.x - w / 2;
            const y = p.y - NODE_H / 2;

            const dots = [
              node.hasDeep && 'var(--badge-deep)',
              node.sim && 'var(--badge-sim)',
              noted.has(id) && 'var(--accent)',
              id in marks && (marks[id].known ? 'var(--mark-known)' : 'var(--mark-unsure)'),
            ].filter((c): c is string => typeof c === 'string');

            // 아이콘·제목·＋를 왼쪽부터 차례로 놓는다.
            const padL = 11;
            const titleX = padL + (icon ? 22 : 0);
            const fs = textWidth(node.title, TITLE_SIZE) > w - titleX - 22 ? 11.5 : TITLE_SIZE;

            return (
              <g
                key={id}
                className={`tree-node depth-${depth}${id === selected ? ' selected' : ''}${
                  focused && !focused.has(id) ? ' dim' : ''
                }`}
                transform={`translate(${x} ${y})`}
                onClick={() => handleNode(id)}
                role="treeitem"
                aria-expanded={hasKids ? isOpen : undefined}
                aria-selected={id === selected}
                tabIndex={-1}
              >
                <rect className="tree-node-box" width={w} height={NODE_H} rx={8} />
                {icon && <SubjectIcon id={id} x={padL} y={(NODE_H - 16) / 2} />}
                <text className="tree-node-title" x={titleX} y={NODE_H / 2 + 4.5} fontSize={fs}>
                  {node.title}
                </text>
                {/*
                 * 접기·펴기는 ＋/－ 를 눌러야 한다. 노드 본체를 누르는 건 "여기로 들어가기"다.
                 * 둘을 한 클릭에 몰면, 이미 열린 가지를 눌렀을 때 들어가려던 건지
                 * 닫으려던 건지 알 수 없다.
                 */}
                {hasKids && (
                  <g
                    className="tree-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!didDrag()) onToggle(id);
                    }}
                    role="button"
                    aria-label={`${node.title} ${isOpen ? '접기' : '펴기'}`}
                  >
                    <rect x={w - 24} y={0} width={24} height={NODE_H} fill="transparent" />
                    <text x={w - 12} y={NODE_H / 2 + 5} textAnchor="middle">
                      {isOpen ? '−' : '+'}
                    </text>
                  </g>
                )}
                {/*
                 * 상태 점은 화면 배율을 거슬러 크기를 고정한다.
                 * 안 그러면 축소했을 때 1px짜리 얼룩이 되어 아무것도 못 알린다.
                 * 테두리를 둘러 어떤 바탕에서도 형태가 남게 한다.
                 */}
                {dots.length > 0 && (
                  <g
                    className="tree-badges"
                    transform={`translate(${titleX} ${NODE_H - 1}) scale(${1 / cam.k})`}
                  >
                    {dots.map((color, i) => (
                      <circle
                        key={color}
                        cx={i * 10}
                        r={3.4}
                        fill={color}
                        stroke="var(--surface)"
                        strokeWidth={1.2}
                      />
                    ))}
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="tree-tools">
        <button
          className="btn btn-secondary btn-icon"
          onClick={() => fit(layout.bounds)}
          aria-label="전체가 보이게 맞추기"
          title="전체가 보이게 맞추기"
        >
          ⤢
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={() => zoomBy(1.2)}
          aria-label="확대"
        >
          ＋
        </button>
        <button
          className="btn btn-secondary btn-icon"
          onClick={() => zoomBy(1 / 1.2)}
          aria-label="축소"
        >
          －
        </button>
      </div>

      <div className="tree-legend">
        <i className="dot" style={{ background: 'var(--badge-deep)' }} /> 심화
        <i className="dot" style={{ background: 'var(--badge-sim)' }} /> 눈으로 보기
        <i className="dot" style={{ background: 'var(--accent)' }} /> 내 메모
        <i className="dot" style={{ background: 'var(--mark-known)' }} /> 퀴즈
      </div>
    </div>
  );
}
