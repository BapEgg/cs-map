import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_HOLD, type Scene, type Speed } from './types';

export type PlayState = 'waiting' | 'playing' | 'paused';

interface Options {
  /** 화면에 들어오면 알아서 재생한다. 페이지를 열자마자가 아니라, 눈에 보일 때. */
  autoPlay?: boolean;
  /**
   * 전체 화면 무대로 열렸는지. 켜면 두 가지가 달라진다.
   *
   * 1. **초점을 이 안으로 가져온다.** 바깥 상자에 두면 안 된다 — ←/→/Space 처리기가
   *    이 안(containerRef)에 붙어 있고 keydown은 위로만 올라가서, 바깥에서 누른 키는
   *    여기까지 내려오지 않는다. 안내에 "← → 한 단계씩"이라 써 놓고 아무 일도
   *    안 일어나던 게 그 때문이었다.
   * 2. **기다리지 않고 바로 재생한다.** 화면을 덮고 열리니 "보일 때까지 기다리기"가
   *    필요 없고, 그 기다림이 풀리지 않으면 자동 재생이 통째로 멈춰 버린다.
   */
  stage?: boolean;
}

/**
 * 장면 재생기. 열면 바로 움직이기 시작한다(HANDOFF 6-2 원칙 3).
 * "재생 버튼을 눌러 영상을 시작하는" 느낌이 아니어야 해서 기본 상태가 재생 중이다.
 *
 * 다만 끝까지 가면 멈춘다. 옆에서 계속 움직이면 글을 못 읽는다.
 */
export function usePlayer<S>(scene: Scene<S>, { autoPlay = true, stage = false }: Options = {}) {
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [play, setPlay] = useState<PlayState>(() => {
    if (!autoPlay) return 'paused';
    // 무대는 화면을 덮고 열린다. IntersectionObserver가 없는 환경도 기다릴 방법이 없다.
    if (stage || typeof IntersectionObserver === 'undefined') return 'playing';
    return 'waiting';
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const last = scene.steps.length - 1;
  const atEnd = index >= last;
  const step = scene.steps[Math.min(index, last)];

  const go = useCallback(
    (next: number) => {
      setPlay('paused');
      setIndex(Math.max(0, Math.min(last, next)));
    },
    [last],
  );

  const restart = useCallback(() => {
    setIndex(0);
    setPlay('playing');
  }, []);

  const toggle = useCallback(() => {
    setPlay((s) => (s === 'playing' ? 'paused' : 'playing'));
  }, []);

  // 열릴 때 키보드를 데려오고, 닫힐 때 열었던 자리로 돌려준다.
  useEffect(() => {
    if (!stage) return;
    const opener = document.activeElement as HTMLElement | null;
    containerRef.current?.focus();
    return () => opener?.focus?.();
  }, [stage]);

  // 화면에 들어올 때 재생을 시작한다. 안 보이는 동안 혼자 다 돌아버리면 의미가 없다.
  useEffect(() => {
    if (play !== 'waiting') return;
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setPlay('playing');
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  // 단계 넘기기. 끝에 닿으면 타이머를 걸지 않는다.
  useEffect(() => {
    if (play !== 'playing' || atEnd) return;
    const hold = (step.hold ?? DEFAULT_HOLD) / speed;
    const t = setTimeout(() => setIndex((i) => Math.min(last, i + 1)), hold);
    return () => clearTimeout(t);
  }, [play, atEnd, last, speed, step]);

  // 키보드: ← → Space
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
        setPlay('paused');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex((i) => Math.min(last, i + 1));
        setPlay('paused');
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setPlay((s) => (s === 'playing' ? 'paused' : 'playing'));
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [last]);

  return {
    containerRef,
    index,
    step,
    total: scene.steps.length,
    atEnd,
    playing: play === 'playing',
    speed,
    setSpeed,
    toggle,
    restart,
    prev: () => go(index - 1),
    next: () => go(index + 1),
    seek: go,
  };
}
