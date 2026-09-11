import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ConceptNode } from '../content/types';
import StatusMark, { type StatusKind } from './StatusMark';
import SubjectIcon from './SubjectIcon';
import {
  ICON_W,
  NODE_H,
  PAD_L,
  STATUS_W,
  TITLE_SIZE,
  TOGGLE_W,
  fitTitle,
  layoutTree,
  linkPath,
  nodeWidth,
  titleSpace,
  type Box,
  type Orientation,
} from './layout';
import { useCamera, type Camera } from './useCamera';
import './tree.css';

interface Props {
  byId: Record<string, ConceptNode>;
  root: string;
  open: Set<string>;
  selected: string | null;
  orientation: Orientation;
  /** 퀴즈 결과. 기억났으면 초록, 헷갈렸으면 주황. */
  marks: Record<string, { known: boolean }>;
  /** 메모를 남긴 개념. */
  noted: Set<string>;
  /** 노드 본체를 눌렀을 때. 고르고, 그 갈래로 들어간다. 접지는 않는다. */
  onNodeClick: (id: string) => void;
  /** 펼침 표시를 눌렀을 때. 접기·펴기만 한다. */
  onToggle: (id: string) => void;
  /** 카메라를 떠 두고 되돌리기 위한 손잡이. */
  handleRef?: React.RefObject<TreeHandle | null>;
}

export interface TreeHandle {
  snapshot(): Camera;
  restore(cam: Camera): void;
}

/** 이 개념에 붙는 상태 표시. 노드 너비 계산과 그리기가 같은 목록을 봐야 한다. */
function statusesOf(
  id: string,
  node: ConceptNode,
  noted: Set<string>,
  marks: Props['marks'],
): StatusKind[] {
  const out: StatusKind[] = [];
  if (node.sim) out.push('sim');
  if (node.hasDeep) out.push('deep');
  if (noted.has(id)) out.push('note');
  if (id in marks) out.push(marks[id].known ? 'known' : 'unsure');
  return out;
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
  handleRef,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    cam,
    smooth,
    dragging,
    didDrag,
    onPointerDown,
    fit,
    zoomBy,
    ensureVisible,
    snapshot,
    restore,
    hasSize,
  } = useCamera(svgRef);

  useEffect(() => {
    if (handleRef) handleRef.current = { snapshot, restore };
  }, [handleRef, snapshot, restore]);

  /** 상태 개수가 너비에 들어가므로 배치와 같은 계산을 쓴다. */
  const widthOf = useCallback(
    (node: ConceptNode) => nodeWidth(node, statusesOf(node.id, node, noted, marks).length),
    [marks, noted],
  );

  const layout = useMemo(
    () => layoutTree(byId, root, open, orientation, widthOf),
    [byId, root, open, orientation, widthOf],
  );

  /**
   * 다 들어가지 않을 때 화면 가운데에 둘 자리. 고른 노드가 있으면 그것.
   * 좁은 화면에서는 **전부 담는 것보다 지금 보는 데에 닿는 게** 중요하다.
   */
  const focusBox = useCallback((lay: typeof layout, id: string | null) => {
    const p = id ? lay.byId[id] : null;
    if (!p || p.hidden) return undefined;
    return { x: p.x, y: p.y - NODE_H / 2, w: p.w, h: NODE_H };
  }, []);

  /*
   * 방향을 바꾸거나 가지를 갈아타면 화면에 맞춘다. 첫 화면은 애니메이션 없이 바로.
   * 지도가 숨겨져 있으면(모바일에서 설명만 보는 중) 크기가 0이라 맞출 수 없다. 건너뛴다.
   */
  const lastFit = useRef('');
  useEffect(() => {
    const key = `${orientation}:${root}`;
    if (lastFit.current === key || !hasSize()) return;
    const first = lastFit.current === '';
    lastFit.current = key;
    fit(layout.bounds, !first, focusBox(layout, selected));
  }, [orientation, root, layout, selected, fit, hasSize, focusBox]);

  /**
   * 방금 펼친 노드. 본체 클릭·＋/－·키보드 어느 길로 펼쳐도 여기 기록된다.
   */
  const justOpened = useRef<string | null>(null);
  const lastSelected = useRef<string | null>(null);

  /**
   * 아직 못 보여준 자리. 지도가 숨어 있는 동안(폰에서 설명만 보는 중) 고른 개념이 여기 쌓인다.
   * 크기가 0일 때 카메라를 밀면 다시 보여줄 때 빈 화면이 되므로, 자리만 적어 두고 나중에 민다.
   */
  const pending = useRef<Box | null>(null);

  /**
   * 카메라를 움직이는 곳은 **여기 한 군데뿐이다.**
   *
   * 전에는 "방금 펼친 가지 보여주기"와 "고른 노드 따라가기"가 각자 카메라를 밀었다.
   * 본체를 누르면 둘 다 한 번에 일어나는데, 뒤에 도는 쪽이 앞의 이동을 되돌려서
   * 폰에서는 방금 펼친 자식들이 오른쪽에 잘린 채 남았다.
   *
   * 그래서 한 번만 민다. 펼침이 있었으면 **부모와 새 자식을 함께** 담은 자리를 목표로 잡고,
   * 없으면 고른 노드만 본다.
   */
  useEffect(() => {
    const opened = justOpened.current;
    const selectionMoved = selected !== null && selected !== lastSelected.current;
    if (selected !== null) lastSelected.current = selected;

    /** 이번에 보여줘야 할 자리. 없으면 null. */
    let want: Box | null = null;

    if (opened && open.has(opened)) {
      justOpened.current = null;
      const parent = layout.byId[opened];
      const kids = (byId[opened]?.childIds ?? []).map((k) => layout.byId[k]).filter(Boolean);
      if (kids.length) {
        // 펼쳤으면 부모와 새 자식을 **함께** 담는다. 둘을 따로 밀면 서로 되돌린다.
        const spots = parent && !parent.hidden ? [parent, ...kids] : kids;
        const x0 = Math.min(...spots.map((p) => p.x));
        const x1 = Math.max(...spots.map((p) => p.x + p.w));
        const y0 = Math.min(...spots.map((p) => p.y)) - NODE_H / 2;
        const y1 = Math.max(...spots.map((p) => p.y)) + NODE_H / 2;
        want = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      }
    }

    if (!want && selectionMoved && selected !== null) {
      const p = layout.byId[selected];
      if (p && !p.hidden) want = { x: p.x - 24, y: p.y - NODE_H, w: p.w + 48, h: NODE_H * 2 };
    }

    if (!want) return;
    if (hasSize()) ensureVisible(want);
    else pending.current = want; // 지도가 다시 보이면 그때 민다
  }, [byId, open, selected, layout, ensureVisible, hasSize]);

  /**
   * 지도가 **숨었다가 다시 보일 때**(폰에서 설명을 보다 지도로 돌아옴).
   *
   * 전에는 ResizeObserver가 0 크기를 거쳐 갔는지로만 판단했는데, 관측이 다시 걸리는 시점에 따라
   * 그 0을 못 보고 지나가면 고른 노드가 화면 밖에 남았다. 이제는 위에서 적어 둔 자리를
   * **크기가 잡히는 대로 비운다.** 적어 둔 게 없으면 보던 자리를 그대로 둔다.
   */
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const box = pending.current;
      if (!box || el.clientWidth <= 0 || el.clientHeight <= 0) return;
      pending.current = null;
      ensureVisible(box);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ensureVisible]);

  /**
   * 흐리게 하지 않을 노드: 고른 개념, 거기까지 가는 길, 그 아래 자식, 그리고 형제.
   * 형제를 살려 두는 건 설명 패널의 '흐름'이 바로 그 형제들을 가리키기 때문이다.
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

  const expand = (id: string) => {
    if (!open.has(id) && byId[id].childIds.length > 0) justOpened.current = id;
    onToggle(id);
  };

  const handleNode = (id: string) => {
    if (didDrag()) return;
    if (byId[id].childIds.length > 0 && !open.has(id)) justOpened.current = id;
    onNodeClick(id);
  };

  /** 화살표 키로 지도를 돌아다닌다. 마우스 없이는 아예 못 쓰던 화면이었다. */
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
        if (!open.has(node.id)) expand(node.id);
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
        if (here !== -1 && byId[list[here]].childIds.length) {
          e.preventDefault();
          expand(list[here]);
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
            transition: smooth ? 'transform var(--move) var(--ease-out)' : 'none',
          }}
        >
          <g className="tree-links">
            {layout.links.map(({ from, to, hidden }) => {
              const a = layout.byId[from];
              const b = layout.byId[to];
              if (!a || !b) return null;
              const dim = focused && !(focused.has(from) && focused.has(to));
              return (
                <path
                  key={`${from}-${to}`}
                  className={`${hidden ? 'gone' : ''}${dim ? ' dim' : ''}`}
                  d={linkPath(a, b, orientation)}
                  fill="none"
                />
              );
            })}
          </g>

          {layout.nodes.map((p) => {
            const node = byId[p.id];
            const depth = Math.min(p.depth, 5);
            const hasKids = node.childIds.length > 0;
            const isOpen = open.has(p.id);
            const icon = p.depth === 1;
            const statuses = statusesOf(p.id, node, noted, marks);
            // 좌→우는 왼쪽 끝이 기준, 위→아래는 가운데가 기준이다.
            const x = orientation === 'h' ? p.x : p.x - p.w / 2;
            const y = p.y - NODE_H / 2;

            const titleX = PAD_L + (icon ? ICON_W : 0);
            const title = fitTitle(node.title, titleSpace(p.w, icon, hasKids, statuses.length));
            // 상태는 토글 앞, 노드 **안쪽**에 놓는다. 테두리에 걸치지 않게.
            const statusRight = p.w - (hasKids ? TOGGLE_W : 0) - 8;

            return (
              <g
                key={p.id}
                className={[
                  'tree-node',
                  `depth-${depth}`,
                  p.id === selected && 'selected',
                  p.hidden && 'gone',
                  focused && !focused.has(p.id) && 'dim',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ transform: `translate(${x}px, ${y}px)` }}
                onClick={() => !p.hidden && handleNode(p.id)}
                role="treeitem"
                aria-expanded={hasKids ? isOpen : undefined}
                aria-selected={p.id === selected}
                aria-hidden={p.hidden || undefined}
              >
                {/*
                 * 손가락이 닿는 자리. 보이는 상자보다 위아래로 넓다(터치 화면에서만).
                 * 노드 높이 40에 배율 0.85면 34px이라 손가락으로는 잘 안 눌린다.
                 * 형제 간격이 54라 52까지는 넓혀도 옆 노드와 겹치지 않는다 — 실제 크기는 tree.css.
                 */}
                <rect className="tree-node-hit" y={0} width={p.w} height={NODE_H} />
                <rect className="tree-node-box" width={p.w} height={NODE_H} rx={10} />
                {icon && <SubjectIcon id={p.id} x={PAD_L} y={(NODE_H - 16) / 2} />}
                <text
                  className="tree-node-title"
                  x={titleX}
                  y={NODE_H / 2 + 5}
                  fontSize={TITLE_SIZE}
                >
                  {title.clipped && <title>{node.title}</title>}
                  {title.text}
                </text>

                {statuses.map((kind, i) => (
                  <StatusMark
                    key={kind}
                    kind={kind}
                    x={statusRight - (statuses.length - i) * STATUS_W + 2}
                    y={(NODE_H - 12) / 2}
                  />
                ))}

                {/*
                 * 펼침 표시. 셰브런이 열림/닫힘 방향을 그대로 보여준다.
                 *
                 * 표시 중심으로 g를 옮겨 놓고 안쪽은 0,0 기준으로 그린다. 그래야 닿는 자리를
                 * 노드 폭과 무관하게 CSS에서 키울 수 있다(터치 화면에서만 넓힌다).
                 * 마우스에서는 보이는 둥근 자리 그대로 — 안 보이는 큰 판을 누르게 되면
                 * 노드로 들어가려던 클릭이 접기로 새어 나간다.
                 */}
                {hasKids && (
                  <g
                    className="tree-toggle"
                    transform={`translate(${p.w - TOGGLE_W / 2 - 2} ${NODE_H / 2})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!didDrag()) expand(p.id);
                    }}
                    role="button"
                    aria-label={`${node.title} ${isOpen ? '접기' : '펴기'}`}
                  >
                    <rect
                      className="tree-toggle-hit"
                      x={-13}
                      y={-13}
                      width={26}
                      height={26}
                      rx={8}
                    />
                    <path
                      className="tree-toggle-mark"
                      transform={`rotate(${isOpen ? 90 : 0})`}
                      d="M-2.5 -5 L2.5 0 L-2.5 5"
                    />
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
          onClick={() => fit(layout.bounds, true, focusBox(layout, selected))}
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
    </div>
  );
}
