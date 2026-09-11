import type { ReactNode } from 'react';
import { SPEEDS, type Scene, type Speed } from './types';
import { usePlayer } from './usePlayer';
import './viz.css';

interface Props<S> {
  scene: Scene<S>;
  render: (state: S) => ReactNode;
  /** 전체 화면 무대로 열 때. 초점을 이 안으로 가져오고, 기다리지 않고 바로 재생한다. */
  stage?: boolean;
}

export default function Player<S>({ scene, render, stage }: Props<S>) {
  const {
    containerRef,
    index,
    step,
    total,
    atEnd,
    playing,
    speed,
    setSpeed,
    toggle,
    restart,
    prev,
    next,
    seek,
  } = usePlayer(scene, { stage });

  return (
    <div className="viz" ref={containerRef} tabIndex={0} aria-label={scene.title}>
      <div className="viz-head">
        <h3>{scene.title}</h3>
        <span className={`viz-phase viz-phase-${step.phase}`}>
          {step.phase === 'stage' ? '1 · 공간 살펴보기' : '2 · 그 위에서 돌려보기'}
        </span>
      </div>

      <div className="viz-body">
        {scene.code && (
          <pre className="viz-code">
            {scene.code.lines.map((line, i) => (
              <code key={i} className={step.codeLine === i + 1 ? 'on' : undefined}>
                <span className="viz-code-num">{i + 1}</span>
                {line || ' '}
              </code>
            ))}
          </pre>
        )}
        <div className="viz-stage">{render(step.state)}</div>
      </div>

      <p className="viz-caption" key={index}>
        {step.caption}
      </p>

      <div className="viz-controls">
        <button onClick={prev} disabled={index === 0} aria-label="이전 단계">
          ‹
        </button>
        {atEnd ? (
          <button className="viz-primary" onClick={restart}>
            ↻ 처음부터
          </button>
        ) : (
          <button className="viz-primary" onClick={toggle}>
            {playing ? '❚❚ 멈춤' : '▶ 재생'}
          </button>
        )}
        <button onClick={next} disabled={atEnd} aria-label="다음 단계">
          ›
        </button>

        <div className="viz-track" role="group" aria-label="단계 이동">
          {scene.steps.map((s, i) => (
            <button
              key={i}
              className={`viz-tick viz-tick-${s.phase}${i === index ? ' on' : ''}${i < index ? ' past' : ''}`}
              onClick={() => seek(i)}
              aria-label={`${i + 1}번째 단계 (전체 ${total})`}
              aria-current={i === index}
            />
          ))}
        </div>

        <div className="viz-speed" role="group" aria-label="배속">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={speed === s ? 'on' : undefined}
              onClick={() => setSpeed(s as Speed)}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
