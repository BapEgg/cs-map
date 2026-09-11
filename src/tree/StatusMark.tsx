/**
 * 노드 안에 들어가는 상태 표시.
 *
 * 전에는 색 점 네 개를 노드 아래 테두리에 걸쳐 놓아서, 무슨 색이 뭘 뜻하는지
 * 범례를 외워야 했고 축소하면 얼룩이 됐다. 모양이 뜻을 담게 바꾸고,
 * 각각에 툴팁을 달아 외우지 않아도 알 수 있게 한다.
 */
export type StatusKind = 'sim' | 'deep' | 'note' | 'known' | 'unsure';

const LABEL: Record<StatusKind, string> = {
  sim: '눈으로 보는 시각화가 있어요',
  deep: '심화 내용이 있어요',
  note: '내 메모를 남겼어요',
  known: '퀴즈에서 기억났어요',
  unsure: '퀴즈에서 헷갈렸어요',
};

const COLOR: Record<StatusKind, string> = {
  sim: 'var(--badge-sim)',
  deep: 'var(--badge-deep)',
  note: 'var(--accent)',
  known: 'var(--mark-known)',
  unsure: 'var(--mark-unsure)',
};

/** 12×12 기준으로 그린다. 모양만으로도 구분되게 서로 다른 실루엣을 쓴다. */
function Glyph({ kind }: { kind: StatusKind }) {
  switch (kind) {
    case 'sim': // 재생 삼각형 — 움직이는 것
      return <path d="M4 2.5 L10 6 L4 9.5 Z" />;
    case 'deep': // 겹친 층 — 더 깊이 들어가는 것
      return <path d="M6 1.5 L11 4.25 L6 7 L1 4.25 Z M1 7.5 L6 10.25 L11 7.5" />;
    case 'note': // 접힌 쪽지
      return <path d="M2.5 1.5 h7 v6 l-2.5 3 h-4.5 Z M9.5 7.5 h-2.5 v3" />;
    case 'known': // 체크
      return <path d="M2 6.2 L4.8 9 L10 3" />;
    case 'unsure': // 물음
      return <path d="M3.8 4.2a2.2 2.2 0 1 1 2.2 2.4v1.1 M6 10.2v.2" />;
  }
}

export default function StatusMark({ kind, x, y }: { kind: StatusKind; x: number; y: number }) {
  return (
    <g
      className={`status status-${kind}`}
      transform={`translate(${x} ${y})`}
      style={{ color: COLOR[kind] }}
    >
      <title>{LABEL[kind]}</title>
      <Glyph kind={kind} />
    </g>
  );
}
