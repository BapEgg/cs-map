import { describe, expect, it } from 'vitest';
import {
  CODE_LINES,
  SLOTS,
  buildMemoryLayoutScene,
  freeRange,
  slotOf,
  type MemoryState,
} from './memoryLayout';

const scene = buildMemoryLayoutScene();
const live = (s: MemoryState) => s.boxes.filter((b) => b.tone !== 'gone');

describe('메모리 영역 장면', () => {
  it('무대를 다 세운 뒤에 프로그램을 돌린다', () => {
    const phases = scene.steps.map((s) => s.phase);
    const lastStage = phases.lastIndexOf('stage');
    const firstRun = phases.indexOf('run');
    expect(firstRun).toBeGreaterThan(lastStage);
  });

  it('무대 단계에서는 아무것도 안 움직인다', () => {
    for (const s of scene.steps.filter((s) => s.phase === 'stage')) {
      expect(s.state.boxes).toHaveLength(0);
      expect(s.state.pointers).toHaveLength(0);
      expect(s.codeLine).toBeNull();
    }
  });

  it('영역을 코드 → 데이터 → 힙 → 스택 순으로 하나씩 드러낸다', () => {
    const reveals = scene.steps
      .filter((s) => s.phase === 'stage')
      .map((s) => s.state.revealed.length);
    expect(reveals).toEqual([...reveals].sort((a, b) => a - b));
    expect(scene.steps.filter((s) => s.phase === 'stage').at(-1)!.state.revealed).toEqual([
      'code',
      'data',
      'heap',
      'stack',
    ]);
  });

  it('힙과 스택이 같은 칸을 쓰지 않는다', () => {
    for (const s of scene.steps) {
      const slots = live(s.state).map(slotOf);
      expect(new Set(slots).size).toBe(slots.length);
    }
  });

  it('빈 공간이 음수가 되지 않는다', () => {
    for (const s of scene.steps) {
      const free = freeRange(s.state.boxes);
      expect(free.size).toBeGreaterThanOrEqual(0);
      expect(free.from).toBeGreaterThanOrEqual(0);
      expect(free.to).toBeLessThan(SLOTS);
    }
  });

  it('가장 많이 쌓인 순간에도 가운데가 비어 있다', () => {
    // 막대가 꽉 차면 "메모리가 부족하다"는 엉뚱한 인상을 준다. 이 프로그램은 그런 예가 아니다.
    const sizes = scene.steps.map((s) => freeRange(s.state.boxes).size);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(2);
  });

  it('힙과 스택이 자랄수록 빈 공간이 줄어든다', () => {
    const sizes = scene.steps.map((s) => freeRange(s.state.boxes).size);
    const smallest = Math.min(...sizes);
    // f 프레임까지 쌓인 시점이 가장 좁다
    expect(smallest).toBeLessThan(sizes[0]);
  });

  it('f 프레임이 사라지면 스택이 다시 줄어든다', () => {
    const stackDepth = scene.steps.map(
      (s) => live(s.state).filter((b) => b.region === 'stack').length,
    );
    const peak = Math.max(...stackDepth);
    expect(stackDepth.at(-1)!).toBeLessThan(peak);
    expect(stackDepth.at(-1)).toBe(0);
  });

  it('free 이후 힙이 비어 있다', () => {
    const last = scene.steps.at(-1)!.state;
    expect(live(last).filter((b) => b.region === 'heap')).toHaveLength(0);
  });

  it('사라지는 상자는 빨갛게 한 단계 머물렀다가 없어진다', () => {
    // 곧바로 없애면 뭐가 사라졌는지 눈이 못 따라간다.
    for (const id of ['x', 'y', 'heap1', 'a', 'p']) {
      const tones = scene.steps
        .map((s) => s.state.boxes.find((b) => b.id === id)?.tone)
        .filter(Boolean);
      expect(tones, `${id}는 dying을 거쳐야 한다`).toContain('dying');
      expect(tones, `${id}는 gone을 거쳐야 한다`).toContain('gone');
      expect(tones.indexOf('dying')).toBeLessThan(tones.indexOf('gone'));
    }
  });

  it('마지막에 스택과 힙은 비고, 전역 변수만 반납을 기다린다', () => {
    const last = scene.steps.at(-1)!.state;
    expect(live(last).filter((b) => b.region !== 'data')).toHaveLength(0);
    expect(last.pointers).toHaveLength(0);
    // 전역은 프로그램이 끝날 때까지 살아 있다 — 이게 이 장면의 마지막 포인트다.
    expect(live(last).map((b) => b.id)).toEqual(['g']);
  });

  it('포인터는 실제로 있는 상자를 가리킨다', () => {
    for (const s of scene.steps) {
      const ids = new Set(s.state.boxes.map((b) => b.id));
      for (const p of s.state.pointers) {
        expect(ids).toContain(p.from);
        expect(ids).toContain(p.to);
      }
    }
  });

  it('켜지는 코드 줄이 실제 줄 범위 안에 있다', () => {
    for (const s of scene.steps) {
      if (s.codeLine === null || s.codeLine === undefined) continue;
      expect(s.codeLine).toBeGreaterThanOrEqual(1);
      expect(s.codeLine).toBeLessThanOrEqual(CODE_LINES.length);
    }
  });

  it('모든 단계에 자막이 있다', () => {
    for (const s of scene.steps) expect(s.caption.trim().length).toBeGreaterThan(0);
  });

  it('슬롯 계산: 힙은 위로, 스택은 아래로 자란다', () => {
    expect(slotOf({ region: 'heap', index: 0 })).toBeLessThan(slotOf({ region: 'heap', index: 1 }));
    expect(slotOf({ region: 'stack', index: 0 })).toBeGreaterThan(
      slotOf({ region: 'stack', index: 1 }),
    );
  });
});
