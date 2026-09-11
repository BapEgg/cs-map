import { useNarrow } from '../useNarrow';
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

/**
 * 무대 치수. **폰에서는 줄이는 게 아니라 다시 잡는다.**
 *
 * 데스크톱 치수를 그대로 두고 배율만 낮추면 316×383 자리에서 0.68배가 되어
 * 11px 글씨가 7.5px로 찍힌다. 그래서 폰에서는
 *   - 칸 높이를 낮추고(46 → 34) 위아래 여백을 줄여 세로를 426으로 만들고,
 *   - 영역 이름을 넣는 왼쪽 여백을 118 → 66으로 좁히고(곁가지 설명은 뺀다),
 *   - 포인터가 도는 오른쪽 길을 90 → 40으로 줄인다.
 * 결과적으로 배율이 0.9 근처가 되고, 남은 글씨는 아래 FONT에서 키워 10~13px로 찍힌다.
 */
interface Metrics {
  slotH: number;
  barX: number;
  barW: number;
  top: number;
  labelX: number;
  laneOut: number;
  /** 곁가지 설명("명령어", "위로 자람 ↑"). 폰에서는 뺀다. */
  subs: boolean;
  /** 칸 안에서 상자가 비워 두는 세로 여백(위아래 합). 칸이 낮아지면 같이 줄어야 한다. */
  boxGap: number;
  w: number;
  h: number;
}

function metricsOf(narrow: boolean): Metrics {
  const slotH = narrow ? 34 : 46;
  const barX = narrow ? 66 : 118;
  const barW = narrow ? 180 : 222;
  const top = narrow ? 26 : 30;
  return {
    slotH,
    barX,
    barW,
    top,
    labelX: barX - 13,
    laneOut: barX + barW + (narrow ? 30 : 42),
    subs: !narrow,
    boxGap: narrow ? 7 : 10,
    w: barX + barW + (narrow ? 40 : 90),
    h: SLOTS * slotH + top * 2,
  };
}

/** 슬롯 i(0 = 바닥)의 윗변 y좌표. */
const slotYOf = (m: Metrics, i: number) => m.top + (SLOTS - 1 - i) * m.slotH;

const TONE_FILL: Record<Box['tone'], string> = {
  normal: 'transparent',
  new: 'var(--viz-current)',
  active: 'var(--viz-done)',
  dying: 'var(--viz-compare)',
  gone: 'var(--viz-compare)',
};

function RegionLabel({
  m,
  slot,
  span,
  title,
  sub,
  shown,
}: {
  m: Metrics;
  slot: number;
  span: number;
  title: string;
  sub?: string;
  shown: boolean;
}) {
  const y = slotYOf(m, slot + span - 1) + (span * m.slotH) / 2;
  const withSub = sub && m.subs;
  return (
    <g className="viz-fade" style={{ opacity: shown ? 1 : 0 }}>
      <text x={m.labelX} y={withSub ? y - 4 : y + 5} textAnchor="end" className="viz-region-title">
        {title}
      </text>
      {withSub && (
        <text x={m.labelX} y={y + 14} textAnchor="end" className="viz-region-sub">
          {sub}
        </text>
      )}
    </g>
  );
}

export default function MemoryLayoutView({ state }: { state: MemoryState }) {
  const narrow = useNarrow();
  const m = metricsOf(narrow);
  const slotY = (i: number) => slotYOf(m, i);
  const barH = SLOTS * m.slotH;

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
    <svg
      viewBox={`0 0 ${m.w} ${m.h}`}
      className={`viz-svg${narrow ? ' viz-compact' : ''}`}
      role="img"
      aria-label="메모리 영역 구성"
    >
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
        x={m.barX}
        y={m.top}
        width={m.barW}
        height={barH}
        rx={6}
        fill="none"
        stroke="var(--viz-cell-border)"
        strokeWidth={2}
      />

      <text x={m.barX + m.barW / 2} y={m.top - 11} textAnchor="middle" className="viz-addr">
        높은 주소
      </text>
      <text x={m.barX + m.barW / 2} y={m.top + barH + 20} textAnchor="middle" className="viz-addr">
        낮은 주소
      </text>

      {/* ── 무대: 영역 구분 ── */}
      <g className="viz-fade" style={{ opacity: has('code') ? 1 : 0 }}>
        <rect
          x={m.barX}
          y={slotY(CODE_SLOT)}
          width={m.barW}
          height={m.slotH}
          fill="var(--viz-band)"
          stroke="var(--viz-cell-border)"
          strokeWidth={1}
        />
        <text
          x={m.barX + m.barW / 2}
          y={slotY(CODE_SLOT) + m.slotH / 2 + 5}
          textAnchor="middle"
          className="viz-band-text"
        >
          {codeLoaded ? '1011 0110 1001 …' : ''}
        </text>
      </g>

      <g className="viz-fade" style={{ opacity: has('data') ? 1 : 0 }}>
        <rect
          x={m.barX}
          y={slotY(DATA_SLOTS[DATA_SLOTS.length - 1])}
          width={m.barW}
          height={m.slotH * DATA_SLOTS.length}
          fill="var(--viz-band)"
          stroke="var(--viz-cell-border)"
          strokeWidth={1}
        />
      </g>

      <RegionLabel m={m} slot={CODE_SLOT} span={1} title="코드" sub="명령어" shown={has('code')} />
      <RegionLabel
        m={m}
        slot={DATA_SLOTS[0]}
        span={DATA_SLOTS.length}
        title="데이터"
        sub="전역 변수"
        shown={has('data')}
      />

      {/* 힙: 아래에서 위로 자란다 */}
      <g className="viz-fade" style={{ opacity: has('heap') ? 1 : 0 }}>
        <text
          x={m.labelX}
          y={slotY(HEAP_BASE) + m.slotH * 0.6}
          textAnchor="end"
          className="viz-region-title"
        >
          힙
        </text>
        {m.subs && (
          <text
            x={m.labelX}
            y={slotY(HEAP_BASE) + m.slotH * 0.98}
            textAnchor="end"
            className="viz-region-sub"
          >
            위로 자람 ↑
          </text>
        )}
        <line
          x1={m.barX + 6}
          y1={slotY(HEAP_BASE) + m.slotH - 3}
          x2={m.barX + m.barW - 6}
          y2={slotY(HEAP_BASE) + m.slotH - 3}
          stroke="var(--viz-cell-border)"
          strokeDasharray="3 3"
          opacity={0.5}
        />
      </g>

      {/* 스택: 위에서 아래로 자란다 */}
      <g className="viz-fade" style={{ opacity: has('stack') ? 1 : 0 }}>
        <text
          x={m.labelX}
          y={slotY(STACK_BASE) + m.slotH * (m.subs ? 0.48 : 0.68)}
          textAnchor="end"
          className="viz-region-title"
        >
          스택
        </text>
        {m.subs && (
          <text
            x={m.labelX}
            y={slotY(STACK_BASE) + m.slotH * 0.87}
            textAnchor="end"
            className="viz-region-sub"
          >
            아래로 자람 ↓
          </text>
        )}
      </g>

      {/* 가운데 빈 공간 — 힙 꼭대기와 스택 바닥 사이 */}
      {free.size > 0 && has('heap') && has('stack') && (
        <g className="viz-free">
          <rect
            x={m.barX + 4}
            y={slotY(free.to)}
            width={m.barW - 8}
            height={free.size * m.slotH}
            fill="none"
            stroke="var(--viz-cell-border)"
            strokeDasharray="5 5"
            opacity={highlightFree ? 0.9 : 0.35}
            rx={4}
          />
          <text
            x={m.barX + m.barW / 2}
            y={slotY(free.to) + (free.size * m.slotH) / 2 + 5}
            textAnchor="middle"
            className="viz-free-text"
            opacity={highlightFree ? 1 : 0.55}
          >
            빈 공간
          </text>
          {highlightFree && (
            <>
              <line
                x1={m.barX + 26}
                y1={slotY(free.from) + m.slotH - 6}
                x2={m.barX + 26}
                y2={slotY(free.from) - m.slotH + 6}
                stroke="var(--viz-current)"
                strokeWidth={2}
                markerEnd="url(#viz-arrow)"
              />
              <line
                x1={m.barX + m.barW - 26}
                y1={slotY(free.to) + 6}
                x2={m.barX + m.barW - 26}
                y2={slotY(free.to) + m.slotH * 2 - 6}
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
            x={m.barX + 3}
            y={slotY(top) + 3}
            width={m.barW - 6}
            height={(top - bottom + 1) * m.slotH - 6}
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
              transform: `translate(${m.barX + 10}px, ${slotY(slot) + m.boxGap / 2}px)`,
              opacity: b.tone === 'gone' ? 0 : 1,
            }}
          >
            <rect
              width={m.barW - 20}
              height={m.slotH - m.boxGap}
              rx={5}
              fill={TONE_FILL[b.tone]}
              fillOpacity={b.tone === 'normal' ? 0 : 0.88}
              stroke="var(--viz-cell-border)"
              strokeWidth={1.5}
            />
            <text
              x={(m.barW - 20) / 2}
              y={(m.slotH - m.boxGap) / 2 + 5}
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
        const y1 = slotY(slotOf(from)) + m.slotH / 2;
        const y2 = slotY(slotOf(to)) + m.slotH / 2;
        const out = m.laneOut;
        return (
          <path
            key={ptr.id}
            className="viz-pointer"
            d={`M ${m.barX + m.barW - 12} ${y1} C ${out} ${y1}, ${out} ${y2}, ${m.barX + m.barW - 12} ${y2}`}
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
