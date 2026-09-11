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
 * 전에는 480px 설명 패널 안에 코드·그림·자막·재생 조작을 전부 밀어 넣어서,
 * 그림이 손톱만 해지고 코드는 아래로 밀렸다. 셋을 같이 봐야 "코드 줄이 켜지면
 * 그림이 변한다"가 읽히는데 그게 안 됐다.
 *
 * 그래서 지도·설명 위를 덮는 넓은 무대로 띄운다. 읽던 개념은 그대로 있고,
 * 닫으면 곧바로 그 자리로 돌아온다.
 */
export default function VizStage({ fromTitle, onClose }: Props) {
  const scene = buildMemoryLayoutScene();

  return (
    <div className="vizstage" role="dialog" aria-label={`${fromTitle} 시각화`}>
      <header className="vizstage-bar">
        {/* 조사를 붙이면 "관리(으)로"처럼 어색해진다. 제목만 둔다. */}
        <button className="btn btn-quiet" onClick={onClose}>
          ← {fromTitle}
        </button>
        <span className="vizstage-hint">← → 로 한 단계씩, Space로 멈춤</span>
      </header>
      <div className="vizstage-body">
        <Player scene={scene} render={(state) => <MemoryLayoutView state={state} />} />
      </div>
    </div>
  );
}
