import { useState } from 'react';
import Player from './Player';
import MemoryLayoutView from './scenes/MemoryLayoutView';
import { buildMemoryLayoutScene } from './scenes/memoryLayout';
import './vizStage.css';

interface Props {
  /** 어느 개념에서 열었는지. 닫을 때 그 자리로 돌아간다. */
  fromTitle: string;
  onClose: () => void;
}

/**
 * 시각화를 볼 때는 시각화에 공간을 준다.
 *
 * 480px 설명 패널에 코드·그림·자막·재생 조작을 전부 밀어 넣으면 그림이 손톱만 해지고
 * 조작이 화면 밖으로 밀린다. "코드 줄이 켜지면 그림이 변한다"가 이 장면의 핵심이라
 * 넷을 **한 화면에서 같이** 봐야 한다. 그래서 높이를 나눠 쓰는 세로 배치로 간다.
 */
export default function VizStage({ fromTitle, onClose }: Props) {
  const [scene] = useState(buildMemoryLayoutScene);
  /** 좁은 화면에서는 코드 전체를 접어 둔다. 그림·자막·조작이 먼저다. */
  const [showCode, setShowCode] = useState(false);

  /*
   * 초점은 이 상자가 아니라 **재생기 안쪽**으로 간다(Player autoFocus).
   * ←/→/Space 처리기가 재생기에 붙어 있어서, 바깥에 초점을 두면 키가 거기까지 안 내려온다.
   * Esc는 위로 올라오므로 여기서 받는다.
   */

  return (
    <div
      className="vizstage"
      role="dialog"
      aria-modal="true"
      aria-label={`${fromTitle} 시각화`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="vizstage-bar">
        {/* 조사를 붙이면 "관리(으)로"처럼 어색해진다. 제목만 둔다. */}
        <button className="btn btn-quiet" onClick={onClose}>
          ← {fromTitle}
        </button>
        <span className="vizstage-hint">← → 한 단계씩 · Space 멈춤 · Esc 닫기</span>
        <button
          className="btn btn-quiet vizstage-code-toggle"
          onClick={() => setShowCode((v) => !v)}
          aria-expanded={showCode}
        >
          {showCode ? '코드 접기' : '전체 코드 보기'}
        </button>
      </header>

      <div className={`vizstage-body${showCode ? ' with-code' : ''}`}>
        <Player scene={scene} render={(state) => <MemoryLayoutView state={state} />} stage />
      </div>
    </div>
  );
}
