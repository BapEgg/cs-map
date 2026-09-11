import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadContent } from './content/load';
import ConceptPanel from './panel/ConceptPanel';
import NotesOverview from './panel/NotesOverview';
import StartPanel from './panel/StartPanel';
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

  const study = useStudy();
  const { touch } = study;

  const [orientation, setOrientation] = useState<Orientation>('h');
  /** "이 가지만 크게 보기"로 파고든 자취. 마지막이 지금 루트다. */
  const [roots, setRoots] = useState<string[]>([tree.rootId]);
  const root = roots[roots.length - 1];
  const [overlay, setOverlay] = useState<'quiz' | 'notes' | null>(null);

  /** 지난번에 보던 개념. 다시 열었을 때 그 자리로 돌아간다. */
  const lastSeen = study.data.recent.find((id) => tree.byId[id]) ?? null;
  const [selected, setSelected] = useState<string | null>(lastSeen);

  // 처음부터 과목까지는 펼쳐 둔다. 루트 하나만 있으면 화면이 비어서 뭘 눌러야 할지 모른다.
  const [open, setOpen] = useState<Set<string>>(() => {
    const set = new Set<string>([tree.rootId, ...(tree.byId[tree.rootId]?.childIds ?? [])]);
    let cursor = lastSeen ? tree.byId[lastSeen].parentId : null;
    while (cursor) {
      set.add(cursor);
      cursor = tree.byId[cursor].parentId;
    }
    return set;
  });

  const notedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [id, note] of Object.entries(study.data.notes)) {
      if (!isBlank(note)) ids.add(id);
    }
    return ids;
  }, [study.data.notes]);

  /** 그 개념까지 내려가는 길에 있는 노드들. 이것만 펼쳐 두면 지도가 한 줄기로 유지된다. */
  const pathOf = useCallback(
    (id: string) => {
      const set = new Set<string>();
      let cursor: string | null = id;
      while (cursor) {
        set.add(cursor);
        cursor = tree.byId[cursor]?.parentId ?? null;
      }
      return set;
    },
    [tree.byId],
  );

  /** 개념을 고른다. 본 기록을 남겨 다음에 열었을 때 이어서 볼 수 있게 한다. */
  const select = useCallback(
    (id: string) => {
      setSelected(id);
      touch(id);
    },
    [touch],
  );

  /**
   * 트리에서 노드 본체를 눌렀을 때. 고르고 그 갈래로 들어간다. **접지는 않는다.**
   *
   * 한 층에 한 갈래만 펼친다(아코디언). 형제를 다 펼쳐두면 개념이 늘어날수록
   * 지도가 옆으로 끝없이 넓어져서 전체를 잃는다.
   */
  const clickNode = useCallback(
    (id: string) => {
      select(id);
      if (tree.byId[id].childIds.length > 0) setOpen(pathOf(id));
    },
    [pathOf, select, tree.byId],
  );

  /** ＋/－ 를 눌렀을 때. 접기·펴기만 한다. */
  const toggle = useCallback(
    (id: string) => {
      setOpen((prev) => {
        if (!prev.has(id)) return pathOf(id);
        // 접을 때는 그 아래도 같이 접는다. 다시 열었을 때 예전 상태가 튀어나오지 않게.
        const next = new Set<string>();
        for (const opened of prev) {
          if (opened !== id && !pathOf(opened).has(id)) next.add(opened);
        }
        return next;
      });
    },
    [pathOf],
  );

  /** 그 개념으로 간다. 가는 길의 조상들을 모두 펼쳐 트리에서도 보이게 한다. */
  const goTo = useCallback(
    (id: string) => {
      if (!tree.byId[id]) return;
      const path = pathOf(id);

      /*
       * "이 가지만 보기"로 파고든 상태에서 가지 밖 개념으로 건너뛰면, 지도에는 그 개념이
       * 아예 없어서 설명만 바뀌고 지도는 그대로였다. 갈 수 없는 가지면 범위를 되돌린다.
       */
      setRoots((prev) => {
        const kept = prev.filter((rid, i) => i === 0 || path.has(rid));
        return kept.length ? kept : [tree.rootId];
      });

      // 가는 길만 펼친다. 트리에서 누를 때와 같은 규칙이라 지도가 예상대로 움직인다.
      setOpen(pathOf(tree.byId[id].parentId ?? id));
      select(id);
      setOverlay(null);
    },
    [pathOf, select, tree.byId, tree.rootId],
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

        {/* 가지를 파고들었을 때만 보여준다. 전체를 보고 있을 때는 앱 제목과 같은 말이라 군더더기다. */}
        {roots.length > 1 && (
          <nav className="bar-roots" aria-label="보고 있는 가지">
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
            <button
              type="button"
              className="bar-roots-out"
              onClick={() => setRoots((r) => r.slice(0, -1))}
            >
              전체로 (Esc)
            </button>
          </nav>
        )}

        <div className="bar-tools">
          {canZoomBranch && (
            <button className="btn btn-secondary" onClick={() => setRoots((r) => [...r, node.id])}>
              이 가지만 보기
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setOverlay('quiz')}>
            퀴즈
          </button>
          <button className="btn btn-secondary" onClick={() => setOverlay('notes')}>
            내 메모
            {notedIds.size > 0 && <em className="bar-count">{notedIds.size}</em>}
          </button>

          <span className="bar-divider" aria-hidden="true" />

          <button
            className="btn btn-quiet"
            onClick={() => setOrientation((o) => (o === 'h' ? 'v' : 'h'))}
          >
            {orientation === 'h' ? '좌→우' : '위→아래'}
          </button>
          <button className="btn btn-quiet" onClick={cycle}>
            {THEME_LABEL[mode]}
          </button>
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
          onNodeClick={clickNode}
          onToggle={toggle}
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
          <StartPanel
            tree={tree}
            data={study.data}
            onGoTo={goTo}
            onQuiz={() => setOverlay('quiz')}
          />
        )}

        {overlay === 'quiz' && (
          <QuizMode
            tree={tree}
            onMark={study.setMark}
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

      {study.saveFailed && (
        <p className="save-failed" role="status">
          이 브라우저에 저장이 막혀 있어요. 지금 적는 메모와 퀴즈 기록은{' '}
          <b>창을 닫으면 사라집니다.</b> 사생활 보호 창이라면 일반 창에서 열어 주세요.
        </p>
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
