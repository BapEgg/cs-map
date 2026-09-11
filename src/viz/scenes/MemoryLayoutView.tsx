import {
  CODE_SLOT,
  DATA_SLOTS,
  HEAP_BASE,
  SLOTS,
  STACK_BASE,
  freeRange,
  slotOf,
  type Box,
  type MemoryState,
} from './memoryLayout';

const SLOT_H = 46;
const BAR_X = 118;
const BAR_W = 222;
const TOP = 30;
const BAR_H = SLOTS * SLOT_H;
const W = 430;
const H = BAR_H + TOP * 2;
const LANE = BAR_X + BAR_W + 8; // 포인터 화살표가 지나가는 길

/** 슬롯 i(0 = 바닥)의 윗변 y좌표. */
const slotY = (i: number) => TOP + (SLOTS - 1 - i) * SLOT_H;

const TONE_FILL: Record<Box['tone'], string> = {
  normal: 'transparent',
  new: 'var(--viz-current)',
  active: 'var(--viz-done)',
  dying: 'var(--viz-compare)',
  gone: 'var(--viz-compare)',
};

function RegionLabel({
  slot,
  span,
  title,
  sub,
  shown,
}: {
  slot: number;
  span: number;
  title: string;
  sub?: string;
  shown: boolean;
}) {
  const y = slotY(slot + span - 1) + (span * SLOT_H) / 2;
  return (
    <g className="viz-fade" style={{ opacity: shown ? 1 : 0 }}>
      <text x={105} y={sub ? y - 4 : y + 5} textAnchor="end" className="viz-region-title">
        {title}
      </text>
      {sub && (
        <text x={105} y={y + 14} textAnchor="end" className="viz-region-sub">
          {sub}
        </text>
      )}
    </g>
  );
}

export default function MemoryLayoutView({ state }: { state: MemoryState }) {
  const { revealed, codeLoaded, highlightFree, boxes, pointers } = state;
  const has = (r: string) => revealed.includes(r as never);
  const free = freeRange(boxes);

  const boxById = new Map(boxes.map((b) => [b.id, b]));
  const frames = new Map<string, Box[]>();
  for (const b of boxes) {
    if (!b.frame) continue;
    const list = frames.get(b.frame) ?? [];
    list.push(b);
    frames.set(b.frame, list);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" role="img" aria-label="메모리 영역 구성">
      <defs>
        <marker
          id="viz-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--viz-current)" />
        </marker>
      </defs>

      {/* 막대 바깥 테두리 */}
      <rect
        x={BAR_X}
        y={TOP}
        width={BAR_W}
        height={BAR_H}
        rx={6}
        fill="none"
        stroke="var(--viz-cell-border)"
        strokeWidth={2}
      />

      <text x={BAR_X + BAR_W / 2} y={TOP - 11} textAnchor="middle" className="viz-addr">
        높은 주소
      </text>
      <text x={BAR_X + BAR_W / 2} y={TOP + BAR_H + 20} textAnchor="middle" className="viz-addr">
        낮은 주소
      </text>

      {/* ── 무대: 영역 구분 ── */}
      <g className="viz-fade" style={{ opacity: has('code') ? 1 : 0 }}>
        <rect
          x={BAR_X}
          y={slotY(CODE_SLOT)}
          width={BAR_W}
          height={SLOT_H}
          fill="var(--viz-band)"
          stroke="var(--viz-cell-border)"
          strokeWidth={1}
        />
        <text
          x={BAR_X + BAR_W / 2}
          y={slotY(CODE_SLOT) + SLOT_H / 2 + 5}
          textAnchor="middle"
          className="viz-band-text"
        >
          {codeLoaded ? '1011 0110 1001 …' : ''}
        </text>
      </g>

      <g className="viz-fade" style={{ opacity: has('data') ? 1 : 0 }}>
        <rect
          x={BAR_X}
          y={slotY(DATA_SLOTS[DATA_SLOTS.length - 1])}
          width={BAR_W}
          height={SLOT_H * DATA_SLOTS.length}
          fill="var(--viz-band)"
          stroke="var(--viz-cell-border)"
          strokeWidth={1}
        />
      </g>

      <RegionLabel slot={CODE_SLOT} span={1} title="코드" sub="명령어" shown={has('code')} />
      <RegionLabel
        slot={DATA_SLOTS[0]}
        span={DATA_SLOTS.length}
        title="데이터"
        sub="전역 변수"
        shown={has('data')}
      />

      {/* 힙: 아래에서 위로 자란다 */}
      <g className="viz-fade" style={{ opacity: has('heap') ? 1 : 0 }}>
        <text x={105} y={slotY(HEAP_BASE) + 28} textAnchor="end" className="viz-region-title">
          힙
        </text>
        <text x={105} y={slotY(HEAP_BASE) + 46} textAnchor="end" className="viz-region-sub">
          위로 자람 ↑
        </text>
        <line
          x1={BAR_X + 6}
          y1={slotY(HEAP_BASE) + SLOT_H - 3}
          x2={BAR_X + BAR_W - 6}
          y2={slotY(HEAP_BASE) + SLOT_H - 3}
          stroke="var(--viz-cell-border)"
          strokeDasharray="3 3"
          opacity={0.5}
        />
      </g>

      {/* 스택: 위에서 아래로 자란다 */}
      <g className="viz-fade" style={{ opacity: has('stack') ? 1 : 0 }}>
        <text x={105} y={slotY(STACK_BASE) + 22} textAnchor="end" className="viz-region-title">
          스택
        </text>
        <text x={105} y={slotY(STACK_BASE) + 40} textAnchor="end" className="viz-region-sub">
          아래로 자람 ↓
        </text>
      </g>

      {/* 가운데 빈 공간 — 힙 꼭대기와 스택 바닥 사이 */}
      {free.size > 0 && has('heap') && has('stack') && (
        <g className="viz-free">
          <rect
            x={BAR_X + 4}
            y={slotY(free.to)}
            width={BAR_W - 8}
            height={free.size * SLOT_H}
            fill="none"
            stroke="var(--viz-cell-border)"
            strokeDasharray="5 5"
            opacity={highlightFree ? 0.9 : 0.35}
            rx={4}
          />
          <text
            x={BAR_X + BAR_W / 2}
            y={slotY(free.to) + (free.size * SLOT_H) / 2 + 5}
            textAnchor="middle"
            className="viz-free-text"
            opacity={highlightFree ? 1 : 0.55}
          >
            빈 공간
          </text>
          {highlightFree && (
            <>
              <line
                x1={BAR_X + 26}
                y1={slotY(free.from) + SLOT_H - 6}
                x2={BAR_X + 26}
                y2={slotY(free.from) - SLOT_H + 6}
                stroke="var(--viz-current)"
                strokeWidth={2}
                markerEnd="url(#viz-arrow)"
              />
              <line
                x1={BAR_X + BAR_W - 26}
                y1={slotY(free.to) + 6}
                x2={BAR_X + BAR_W - 26}
                y2={slotY(free.to) + SLOT_H * 2 - 6}
                stroke="var(--viz-current)"
                strokeWidth={2}
                markerEnd="url(#viz-arrow)"
              />
            </>
          )}
        </g>
      )}

      {/* 프레임 묶음 테두리 */}
      {[...frames.entries()].map(([name, list]) => {
        const slots = list.map(slotOf);
        const top = Math.max(...slots);
        const bottom = Math.min(...slots);
        const dying = list.every((b) => b.tone === 'dying');
        const gone = list.every((b) => b.tone === 'gone');
        return (
          <rect
            key={`frame-${name}`}
            className="viz-frame"
            x={BAR_X + 3}
            y={slotY(top) + 3}
            width={BAR_W - 6}
            height={(top - bottom + 1) * SLOT_H - 6}
            rx={6}
            fill={dying ? 'var(--viz-compare)' : 'var(--viz-frame-bg)'}
            fillOpacity={dying ? 0.22 : 1}
            stroke={dying ? 'var(--viz-compare)' : 'var(--viz-label-muted)'}
            strokeWidth={1}
            strokeDasharray="5 4"
            opacity={gone ? 0 : 0.9}
          />
        );
      })}

      {/* ── 무대 위의 물건들 ── */}
      {boxes.map((b) => {
        const slot = slotOf(b);
        return (
          <g
            key={b.id}
            className="viz-box"
            style={{
              transform: `translate(${BAR_X + 10}px, ${slotY(slot) + 5}px)`,
              opacity: b.tone === 'gone' ? 0 : 1,
            }}
          >
            <rect
              width={BAR_W - 20}
              height={SLOT_H - 10}
              rx={5}
              fill={TONE_FILL[b.tone]}
              fillOpacity={b.tone === 'normal' ? 0 : 0.88}
              stroke="var(--viz-cell-border)"
              strokeWidth={1.5}
            />
            <text
              x={(BAR_W - 20) / 2}
              y={(SLOT_H - 10) / 2 + 5}
              textAnchor="middle"
              className="viz-box-text"
              fill={b.tone === 'normal' ? 'var(--viz-cell-text)' : 'var(--viz-on-role)'}
            >
              {b.label}
            </text>
          </g>
        );
      })}

      {/* 포인터: 스택의 p → 힙 상자 */}
      {pointers.map((ptr) => {
        const from = boxById.get(ptr.from);
        const to = boxById.get(ptr.to);
        if (!from || !to) return null;
        const y1 = slotY(slotOf(from)) + SLOT_H / 2;
        const y2 = slotY(slotOf(to)) + SLOT_H / 2;
        const out = LANE + 34;
        return (
          <path
            key={ptr.id}
            className="viz-pointer"
            d={`M ${BAR_X + BAR_W - 12} ${y1} C ${out} ${y1}, ${out} ${y2}, ${BAR_X + BAR_W - 12} ${y2}`}
            fill="none"
            stroke={ptr.tone === 'dying' ? 'var(--viz-compare)' : 'var(--viz-current)'}
            strokeWidth={2}
            markerEnd="url(#viz-arrow)"
            opacity={ptr.tone === 'gone' ? 0 : 1}
          />
        );
      })}
    </svg>
  );
}
