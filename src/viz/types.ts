/**
 * 시각화 한 장면. HANDOFF 6-2-2를 따른다.
 *
 * 단계는 **상태 스냅샷의 배열**이다. 렌더러가 이전 상태 → 다음 상태를 트윈으로 잇는다.
 * 단계를 만드는 쪽(순수 함수)과 그리는 쪽을 섞지 않는다. 그래야 로직에 테스트를 붙일 수 있다.
 */

/**
 * - `stage`: 무대 세우기. 아직 아무것도 안 움직인다. 공간이 어떻게 생겼는지만 보여준다.
 * - `run`: 그 무대 위에서 값과 요청이 움직인다.
 */
export type Phase = 'stage' | 'run';

export interface SceneStep<S> {
  state: S;
  /** 자막 한 줄. 지금 화면에서 무슨 일이 일어나는지. */
  caption: string;
  /** 켜질 코드 줄 (1부터). 코드가 없거나 해당 없으면 null. */
  codeLine?: number | null;
  phase: Phase;
  /** 이 단계에 머무는 시간(ms). 없으면 기본값. 긴 설명이 붙는 단계만 늘린다. */
  hold?: number;
}

export interface SceneCode {
  lang: string;
  lines: string[];
}

export interface Scene<S> {
  id: string;
  title: string;
  code?: SceneCode;
  steps: SceneStep<S>[];
}

/** 배속. 사용자가 정한 다섯 단계. */
export const SPEEDS = [1, 1.2, 1.5, 1.8, 2] as const;
export type Speed = (typeof SPEEDS)[number];

/** 한 단계에 머무는 기본 시간. 느린 게 기본이다. */
export const DEFAULT_HOLD = 2800;

/** 상태 사이를 잇는 트윈 시간. HANDOFF 6-2의 300~700ms 안. */
export const TWEEN_MS = 600;
