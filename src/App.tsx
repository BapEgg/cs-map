import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadContent } from './content/load';
import ConceptPanel from './panel/ConceptPanel';
import NotesOverview from './panel/NotesOverview';
import { buildTermIndex } from './panel/termIndex';
import QuizMode from './quiz/QuizMode';
import { isBlank } from './store/studyStore';
import { useStudy } from './store/useStudy';
import TreeCanvas from './tree/TreeCanvas';
import type { Orientation } from './tree/layout';
import { useTheme, type ThemeMode } from './theme/useTheme';
import './App.css';

const THEME_LABEL: Record<ThemeMode, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
};

export default function App() {
  const { mode, cycle } = useTheme();
  const tree = useMemo(() => loadContent(), []);
  const index = useMemo(() => buildTermIndex(tree), [tree]);

  const [orientation, setOrientation] = useState<Orientation>('h');
  const [selected, setSelected] = useState<string | null>(null);
  /** "이 가지만 크게 보기"로 파고든 자취. 마지막이 지금 루트다. */
  const [roots, setRoots] = useState<string[]>([tree.rootId]);
  const root = roots[roots.length - 1];
  const [open, setOpen] = useState<Set<string>>(() => new Set([tree.rootId]));
  const [overlay, setOverlay] = useState<'quiz' | 'notes' | null>(null);
  const study = useStudy();

  const notedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, note] of Object.entries(study.data.notes)) {
      if (!isBlank(note)) ids.add(id);
    }
    return ids;
  }, [study.data.notes]);

  const toggle = useCallback((id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** 그 개념으로 간다. 가는 길의 조상들을 모두 펼쳐 트리에서도 보이게 한다. */
  const goTo = useCallback(
    (id: string) => {
      if (!tree.byId[id]) return;
      setOpen((prev) => {
        const next = new Set(prev);
        let cursor = tree.byId[id].parentId;
        while (cursor) {
          next.add(cursor);
          cursor = tree.byId[cursor].parentId;
        }
        return next;
      });
      setSelected(id);
      setOverlay(null);
    },
    [tree.byId],
  );

  // Esc: 덮어쓴 화면을 먼저 닫고, 없으면 파고든 가지에서 한 단계 나온다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (overlay) setOverlay(null);
      else if (roots.length > 1) setRoots((r) => r.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay, roots.length]);

  const node = selected ? tree.byId[selected] : null;
  const canZoomBranch = node && node.childIds.length > 0 && node.id !== root;

  return (
    <div className="app">
      <header className="bar">
        <h1>CS 지식 지도</h1>

        <nav className="bar-roots">
          📍
          {roots.map((rid, i) => (
            <span key={rid}>
              {i > 0 && <span className="sep">›</span>}
              {i === roots.length - 1 ? (
                <b>{tree.byId[rid].title}</b>
              ) : (
                <button type="button" onClick={() => setRoots((r) => r.slice(0, i + 1))}>
                  {tree.byId[rid].title}
                </button>
              )}
            </span>
          ))}
        </nav>

        <div className="bar-tools">
          {canZoomBranch && (
            <button onClick={() => setRoots((r) => [...r, node.id])}>이 가지만 보기</button>
          )}
          <button onClick={() => setOverlay('quiz')}>퀴즈</button>
          <button onClick={() => setOverlay('notes')}>
            내 메모{notedIds.size > 0 && ` ${notedIds.size}`}
          </button>
          <button onClick={() => setOrientation((o) => (o === 'h' ? 'v' : 'h'))}>
            {orientation === 'h' ? '좌→우' : '위→아래'}
          </button>
          <button onClick={cycle}>테마: {THEME_LABEL[mode]}</button>
        </div>
      </header>

      <main className="map">
        <TreeCanvas
          byId={tree.byId}
          root={root}
          open={open}
          selected={selected}
          orientation={orientation}
          marks={study.data.marks}
          noted={notedIds}
          onToggle={toggle}
          onSelect={setSelected}
        />
        {selected ? (
          <ConceptPanel
            key={selected}
            tree={tree}
            index={index}
            id={selected}
            onGoTo={goTo}
            note={study.data.notes[selected]}
            onNote={(patch) => study.setNote(selected, patch)}
          />
        ) : (
          <aside className="panel panel-empty">
            <p>왼쪽 지도에서 개념을 누르면 여기에 설명이 열립니다.</p>
            <p className="muted">
              드래그로 이동, 휠로 스크롤, Ctrl+휠로 확대. 설명 속 밑줄 친 용어를 누르면 그 자리에서
              뜻을 볼 수 있어요.
            </p>
          </aside>
        )}

        {overlay === 'quiz' && (
          <QuizMode
            tree={tree}
            marks={study.data.marks}
            onMark={study.setMark}
            onClearMarks={study.clearMarks}
            onClose={() => setOverlay(null)}
            onGoTo={goTo}
          />
        )}
        {overlay === 'notes' && (
          <NotesOverview
            tree={tree}
            data={study.data}
            onImport={study.importJson}
            onGoTo={goTo}
            onClose={() => setOverlay(null)}
          />
        )}
      </main>

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
