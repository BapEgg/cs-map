import { useMemo } from 'react';
import { loadContent } from './content/load';
import type { ContentTree } from './content/types';
import { useTheme, type ThemeMode } from './theme/useTheme';
import Player from './viz/Player';
import MemoryLayoutView from './viz/scenes/MemoryLayoutView';
import { buildMemoryLayoutScene } from './viz/scenes/memoryLayout';
import './App.css';

const THEME_LABEL: Record<ThemeMode, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
};

/** **강조**만 처리한다. 본격적인 본문 렌더는 M1에서. */
function OneLine({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span className="node-one-line">
      {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
    </span>
  );
}

function Node({ id, tree }: { id: string; tree: ContentTree }) {
  const node = tree.byId[id];
  const depth = Math.min(node.depth, 5);
  return (
    <li>
      <div className="node">
        <span
          className="node-title"
          style={{
            background: `var(--depth-${depth})`,
            color: `var(--depth-${depth}-text)`,
          }}
        >
          {node.title}
        </span>
        {node.card?.one_line && <OneLine text={node.card.one_line} />}
        {node.flowNext.map((f) => (
          <span key={f.id} className="flow-reason">
            → {f.reason}
          </span>
        ))}
      </div>
      {node.childIds.length > 0 && (
        <ul>
          {node.childIds.map((childId) => (
            <Node key={childId} id={childId} tree={tree} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function App() {
  const { mode, cycle } = useTheme();
  const tree = useMemo(() => loadContent(), []);
  const scene = useMemo(() => buildMemoryLayoutScene(), []);
  const count = Object.keys(tree.byId).length;

  return (
    <div className="app">
      <div className="topbar">
        <h1>CS 지식 지도</h1>
        <button className="theme-toggle" onClick={cycle}>
          테마: {THEME_LABEL[mode]}
        </button>
      </div>
      <p>
        M0 세팅 확인용 화면이다. content/ 의 마크다운 {count}개를 읽어 트리로 만들었다. 실제 지도
        화면은 M1에서 만든다.
      </p>

      <div className="legend">
        깊이별 색:
        {[0, 1, 2, 3, 4, 5].map((d) => (
          <span key={d} style={{ background: `var(--depth-${d})` }} />
        ))}
        진할수록 큰 개념
      </div>

      {tree.rootId ? (
        <ul className="tree">
          <Node id={tree.rootId} tree={tree} />
        </ul>
      ) : (
        <p>content/ 에서 루트를 못 찾았다.</p>
      )}

      <h2 className="section">시각화 시안 · 메모리 영역</h2>
      <p className="section-note">
        스타일 확정용 첫 장면이다. 무대를 먼저 세우고 그 위에서 프로그램을 돌린다. 화면에 들어오면
        알아서 재생된다.
      </p>
      <Player scene={scene} render={(state) => <MemoryLayoutView state={state} />} />

      {tree.problems.length > 0 && (
        <div className="problems">
          <h2>콘텐츠 문제 {tree.problems.length}개</h2>
          <ul>
            {tree.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
