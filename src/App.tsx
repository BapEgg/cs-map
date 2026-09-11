import { useMemo } from 'react';
import { loadContent } from './content/load';
import type { ContentTree } from './content/types';
import { useTheme, type ThemeMode } from './theme/useTheme';
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
        {node.flow?.next && <span className="flow-reason">→ {node.flow.next.reason}</span>}
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
