import type { Scene, SceneStep } from '../types';

/**
 * 메모리 영역 장면. HANDOFF 6-3.
 *
 * 무대(공간축)를 먼저 세우고 → 그 위에서 프로그램을 돌린다(시간축).
 * 핵심은 **힙과 스택이 가운데 빈 공간을 서로를 향해 자라며 나눠 쓴다**는 것이다.
 * 글로 읽으면 안 와닿고 그림으로 봐야 한다.
 */

/**
 * 막대를 나눈 칸 수. 0이 바닥(낮은 주소), SLOTS-1이 꼭대기(높은 주소).
 *
 * 가장 많이 쌓였을 때(힙 1칸 + 스택 4칸)도 가운데가 몇 칸 남도록 잡았다.
 * 딱 맞게 잡으면 막대가 꽉 차서 "메모리가 부족하다"는 엉뚱한 인상을 준다.
 */
export const SLOTS = 11;
/** 코드 영역이 쓰는 칸. */
export const CODE_SLOT = 0;
/** 데이터 영역이 쓰는 칸. */
export const DATA_SLOTS = [1, 2];
/** 힙이 자라기 시작하는 칸. 위로 올라간다. */
export const HEAP_BASE = 3;
/** 스택이 자라기 시작하는 칸. 아래로 내려온다. */
export const STACK_BASE = SLOTS - 1;

export type RegionId = 'code' | 'data' | 'heap' | 'stack';
/**
 * 상자가 사라질 때는 세 박자로 간다.
 * `dying`(빨갛게, 자리는 그대로) → `gone`(서서히 사라지고 자리도 내놓음) → 배열에서 제거.
 * 곧바로 없애면 뭐가 사라졌는지 눈이 못 따라간다.
 */
export type BoxTone = 'normal' | 'new' | 'active' | 'dying' | 'gone';

export interface Box {
  id: string;
  label: string;
  region: Exclude<RegionId, 'code'>;
  /** 영역 안에서 몇 번째 칸인지. 힙은 아래에서부터, 스택은 위에서부터 센다. */
  index: number;
  tone: BoxTone;
  /** 같은 함수 프레임끼리 묶어 테두리를 친다. */
  frame?: string;
}

export interface Pointer {
  id: string;
  from: string;
  to: string;
  tone: BoxTone;
}

export interface MemoryState {
  /** 무대 세우기 단계에서 하나씩 드러난다. */
  revealed: RegionId[];
  /** 코드 영역에 명령어가 올라갔는지. */
  codeLoaded: boolean;
  /** 가운데 빈 공간을 강조할지. */
  highlightFree: boolean;
  boxes: Box[];
  pointers: Pointer[];
}

/** 그 칸이 화면에서 몇 번째 슬롯인지. 렌더러와 테스트가 같이 쓴다. */
export function slotOf(box: Pick<Box, 'region' | 'index'>): number {
  if (box.region === 'data') return DATA_SLOTS[0] + box.index;
  if (box.region === 'heap') return HEAP_BASE + box.index;
  return STACK_BASE - box.index;
}

/** 지금 비어 있는 칸의 구간. 힙 꼭대기와 스택 바닥 사이. */
export function freeRange(boxes: Box[]): { from: number; to: number; size: number } {
  const heap = boxes.filter((b) => b.region === 'heap' && b.tone !== 'gone');
  const stack = boxes.filter((b) => b.region === 'stack' && b.tone !== 'gone');
  const from = HEAP_BASE + heap.length;
  const to = STACK_BASE - stack.length;
  return { from, to, size: Math.max(0, to - from + 1) };
}

export const CODE_LINES = [
  'int g = 1;',
  'void f(int x) {',
  '    int y = x * 2;',
  '}',
  'int main(void) {',
  '    int a = 3;',
  '    int *p = malloc(sizeof(int));',
  '    *p = 7;',
  '    f(a);',
  '    free(p);',
  '    return 0;',
  '}',
];

type Step = SceneStep<MemoryState>;

const box = (
  id: string,
  label: string,
  region: Box['region'],
  index: number,
  tone: BoxTone = 'normal',
  frame?: string,
): Box => ({ id, label, region, index, tone, frame });

/**
 * 다음 단계로 넘어갈 때 이전 강조를 가라앉힌다.
 * 빨갛던 것은 사라지는 중(`gone`)이 되고, 이미 사라진 것은 목록에서 빠진다.
 */
const settle = (boxes: Box[]): Box[] =>
  boxes
    .filter((b) => b.tone !== 'gone')
    .map((b) => ({ ...b, tone: b.tone === 'dying' ? ('gone' as const) : ('normal' as const) }));

const settlePointers = (ps: Pointer[]): Pointer[] =>
  ps
    .filter((p) => p.tone !== 'gone')
    .map((p) => ({ ...p, tone: p.tone === 'dying' ? ('gone' as const) : ('normal' as const) }));

export function buildMemoryLayoutScene(): Scene<MemoryState> {
  const steps: Step[] = [];
  let boxes: Box[] = [];
  let pointers: Pointer[] = [];
  let revealed: RegionId[] = [];
  let codeLoaded = false;

  const push = (
    caption: string,
    opts: { phase?: 'stage' | 'run'; codeLine?: number | null; hold?: number } = {},
  ) => {
    steps.push({
      state: {
        revealed: [...revealed],
        codeLoaded,
        highlightFree: false,
        boxes: boxes.map((b) => ({ ...b })),
        pointers: pointers.map((p) => ({ ...p })),
      },
      caption,
      codeLine: opts.codeLine ?? null,
      phase: opts.phase ?? 'run',
      hold: opts.hold,
    });
  };

  // ── 1단계 · 무대 세우기 ────────────────────────────────
  push('프로그램 하나가 쓰는 메모리는 이렇게 생긴 막대 한 줄이다.', {
    phase: 'stage',
    hold: 3200,
  });

  revealed = ['code'];
  push('맨 아래는 코드 영역. 우리가 짠 명령어가 기계어로 바뀌어 여기 올라간다.', {
    phase: 'stage',
  });

  revealed = ['code', 'data'];
  push('그 위는 데이터 영역. 프로그램이 끝날 때까지 살아 있는 전역 변수 자리다.', {
    phase: 'stage',
  });

  revealed = ['code', 'data', 'heap'];
  push('가운데는 힙. 실행 도중에 필요해지면 여기서 공간을 받아온다. 아래에서 위로 자란다.', {
    phase: 'stage',
  });

  revealed = ['code', 'data', 'heap', 'stack'];
  push('꼭대기는 스택. 함수를 부를 때마다 여기 쌓인다. 위에서 아래로 자란다.', {
    phase: 'stage',
  });

  steps.push({
    state: {
      revealed: [...revealed],
      codeLoaded,
      highlightFree: true,
      boxes: [],
      pointers: [],
    },
    caption: '힙과 스택은 이 빈 공간을 나눠 쓴다. 서로를 향해 자라다가 만나면 메모리가 바닥난다.',
    codeLine: null,
    phase: 'stage',
    hold: 4000,
  });

  // ── 2단계 · 그 위에서 돌리기 ──────────────────────────
  codeLoaded = true;
  push('이제 이 프로그램을 그 무대 위에서 돌려보자. 명령어가 코드 영역에 올라갔다.', {
    hold: 3400,
  });

  boxes = [box('g', 'g = 1', 'data', 0, 'new')];
  push('전역 변수 g는 데이터 영역에 자리를 잡는다. 프로그램이 끝날 때까지 여기 있는다.', {
    codeLine: 1,
  });

  boxes = [...settle(boxes), box('a', 'a = 3', 'stack', 0, 'new', 'main')];
  push('main이 호출되면 스택 꼭대기에 main 프레임이 생긴다. 지역 변수 a는 그 안에 들어간다.', {
    codeLine: 6,
    hold: 3400,
  });

  boxes = [
    ...settle(boxes),
    box('heap1', '( 빈 상자 )', 'heap', 0, 'new'),
    box('p', 'p', 'stack', 1, 'new', 'main'),
  ];
  push('malloc은 힙에서 상자를 하나 받아온다. 힙이 아래에서 위로 한 칸 자랐다.', {
    codeLine: 7,
    hold: 3400,
  });

  boxes = settle(boxes);
  pointers = [{ id: 'p-heap1', from: 'p', to: 'heap1', tone: 'new' }];
  push('p는 스택에 있다. p 안에 든 건 값이 아니라 힙 상자의 주소다.', {
    codeLine: 7,
    hold: 3600,
  });

  boxes = settle(boxes).map((b) => (b.id === 'heap1' ? { ...b, label: '7', tone: 'active' } : b));
  pointers = settlePointers(pointers);
  push('*p = 7 은 p가 가리키는 곳, 즉 힙 상자에 값을 넣는다.', { codeLine: 8 });

  boxes = [...settle(boxes), box('x', 'x = 3', 'stack', 2, 'new', 'f')];
  push('f를 부르면 그 위에 f 프레임이 또 쌓인다. 인자 x에는 a의 값 3이 복사된다 — 사본이다.', {
    codeLine: 9,
    hold: 3800,
  });

  boxes = [...settle(boxes), box('y', 'y = 6', 'stack', 3, 'new', 'f')];
  push('y는 x의 두 배인 6. 스택이 아래로 한 칸 더 내려왔고 빈 공간이 그만큼 줄었다.', {
    codeLine: 3,
  });

  boxes = settle(boxes).map((b) => (b.frame === 'f' ? { ...b, tone: 'dying' as const } : b));
  push('f가 끝나면 그 프레임이 통째로 사라진다. x도 y도 같이 없어진다.', {
    codeLine: 4,
    hold: 3600,
  });

  boxes = settle(boxes).map((b) => (b.id === 'heap1' ? { ...b, tone: 'dying' as const } : b));
  pointers = settlePointers(pointers).map((p) => ({ ...p, tone: 'dying' as const }));
  push('free(p)는 힙 상자를 돌려준다. 이걸 빼먹으면 쓰지도 않는 상자가 남는다 — 메모리 누수다.', {
    codeLine: 10,
    hold: 4000,
  });

  boxes = settle(boxes).map((b) => (b.frame === 'main' ? { ...b, tone: 'dying' as const } : b));
  pointers = settlePointers(pointers);
  push('main까지 끝나면 남은 프레임도 사라진다. 스택이 다시 비었다.', {
    codeLine: 11,
    hold: 3400,
  });

  // 전역 변수가 마지막까지 남아 있다는 게 이 장면의 마지막 포인트다.
  boxes = settle(boxes).map((b) => (b.id === 'g' ? { ...b, tone: 'dying' as const } : b));
  pointers = settlePointers(pointers);
  push('데이터 영역의 g는 여기까지 살아 있었다. 프로그램이 내려가면서 막대가 통째로 반납된다.', {
    codeLine: 12,
    hold: 4200,
  });

  return {
    id: 'memory-layout',
    title: '메모리는 어떻게 나뉘어 있나',
    code: { lang: 'c', lines: CODE_LINES },
    steps,
  };
}
