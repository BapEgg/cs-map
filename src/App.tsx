import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadContent } from './content/load';
import ConceptPanel, { type PanelPlace } from './panel/ConceptPanel';
import NotesOverview from './panel/NotesOverview';
import SearchBox from './panel/SearchBox';
import StartPanel from './panel/StartPanel';
import { buildTermIndex } from './panel/termIndex';
import QuizMode from './quiz/QuizMode';
import { isBlank } from './store/studyStore';
import { useStudy } from './store/useStudy';
import TreeCanvas, { type TreeHandle } from './tree/TreeCanvas';
import type { Orientation } from './tree/layout';
import { useTheme, type ThemeMode } from './theme/useTheme';
import VizStage from './viz/VizStage';
import './App.css';

const THEME_LABEL: Record<ThemeMode, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
};

/** 어디서 어떻게 읽고 있었는지. 돌아가기가 이걸 되살린다. */
interface Visit extends PanelPlace {
  id: string;
  /** 그때 지도를 보던 자리와 배율. */
  cam?: { x: number; y: number; k: number };
}

export default function App() {
  const { mode, cycle } = useTheme();
  const tree = useMemo(() => loadContent(), []);
  const index = useMemo(() => buildTermIndex(tree), [tree]);

  const study = useStudy();
  const { touch } = study;
  /** 지도의 카메라 손잡이. 뒤로 갈 때 보던 자리로 되돌리는 데 쓴다. */
  const treeRef = useRef<TreeHandle | null>(null);

  const [orientation, setOrientation] = useState<Orientation>('h');
  /** "이 가지만 크게 보기"로 파고든 자취. 마지막이 지금 루트다. */
  const [roots, setRoots] = useState<string[]>([tree.rootId]);
  const root = roots[roots.length - 1];
  const [overlay, setOverlay] = useState<'quiz' | 'notes' | 'viz' | null>(null);
  /** 읽기에 공간을 더 줄지. 탐색할 때는 지도, 읽을 때는 설명이 넓어야 한다. */
  const [wide, setWide] = useState(false);

  /**
   * 좁은 화면에서는 지도와 설명을 한 화면에 같이 못 둔다. 세로로 쌓으면 둘 다 반쪽이 된다.
   * 그래서 한 번에 하나만 보여주고, 개념을 고르면 설명으로 넘어간다.
   */
  const [narrow, setNarrow] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 900px)').matches,
  );
  const [phoneView, setPhoneView] = useState<'map' | 'read'>('map');
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(max-width: 900px)');
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  /** 지난번에 보던 개념. 다시 열었을 때 그 자리로 돌아간다. */
  const lastSeen = study.data.recent.find((id) => tree.byId[id]) ?? null;
  const [selected, setSelected] = useState<string | null>(lastSeen);

  /** 건너뛰기 전에 읽던 자리들. 돌아가기가 여기서 하나씩 꺼낸다. */
  const [trail, setTrail] = useState<Visit[]>([]);
  /** 돌아온 직후 한 번만 쓰는 복원 정보. */
  const [restore, setRestore] = useState<PanelPlace | undefined>();

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

  /** 지도와 설명을 그 개념에 맞춘다. 어디서 불러도 셋(선택·범위·펼침)이 어긋나지 않게 한 곳에 모았다. */
  const reveal = useCallback(
    (id: string) => {
      if (!tree.byId[id]) return false;
      const path = pathOf(id);
      // 갈 수 없는 가지에 갇혀 있으면 범위를 되돌린다.
      setRoots((prev) => {
        const kept = prev.filter((rid, i) => i === 0 || path.has(rid));
        return kept.length ? kept : [tree.rootId];
      });
      setOpen(pathOf(tree.byId[id].parentId ?? id));
      select(id);
      setOverlay(null);
      setPhoneView('read'); // 좁은 화면에서는 고르는 순간 설명으로 넘어간다
      return true;
    },
    [pathOf, select, tree.byId, tree.rootId],
  );

  /** 설명 속 링크로 건너뛴다. 읽던 자리를 남겨 돌아올 수 있게 한다. */
  const navigate = useCallback(
    (targetId: string, from: PanelPlace) => {
      if (!tree.byId[targetId] || targetId === selected) return;
      // 스냅샷은 **여기서** 찍는다. setTrail 업데이터 안에서 찍으면 업데이터가 나중에
      // 실행되면서 이미 옮겨간 카메라를 떠 버린다.
      const cam = treeRef.current?.snapshot();
      if (selected) setTrail((t) => [...t, { id: selected, ...from, cam }]);
      setRestore(undefined);
      reveal(targetId);
    },
    [reveal, selected, tree.byId],
  );

  /** 자취 없이 그냥 간다. 지도 클릭·검색·시작 화면처럼 "새로 시작하는" 이동. */
  const jump = useCallback(
    (id: string) => {
      setTrail([]);
      setRestore(undefined);
      reveal(id);
    },
    [reveal],
  );

  const back = useCallback(() => {
    // 업데이터 안에서 다른 state를 건드리면 두 번 실행돼 자취가 제대로 안 줄어든다.
    const last = trail[trail.length - 1];
    if (!last) return;
    setTrail((t) => t.slice(0, -1));
    setRestore({ tab: last.tab, scroll: last.scroll });
    reveal(last.id);
    /*
     * 지도도 그때 보던 자리·배율로 되돌린다.
     * 여기서 바로 부른다. requestAnimationFrame으로 미루면 탭이 안 보일 때 아예 안 돌아
     * 복원이 통째로 건너뛰어진다. restore가 "잠깐 자동 이동 금지"를 걸어두므로,
     * 뒤이어 도는 reveal의 따라가기 효과가 이 자리를 덮어쓰지 못한다.
     */
    if (last.cam) treeRef.current?.restore(last.cam);
  }, [reveal, trail]);

  /**
   * 트리에서 노드 본체를 눌렀을 때. 고르고 그 갈래로 들어간다. **접지는 않는다.**
   * 한 층에 한 갈래만 펼친다(아코디언).
   */
  const clickNode = useCallback(
    (id: string) => {
      setTrail([]);
      setRestore(undefined);
      select(id);
      if (tree.byId[id].childIds.length > 0) setOpen(pathOf(id));
      else setPhoneView('read'); // 더 펼칠 게 없으면 읽으러 가는 뜻이다
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

  // Esc: 덮어쓴 화면 → 돌아가기 → 가지 밖으로, 순서대로 한 겹씩 벗긴다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (overlay) setOverlay(null);
      else if (trail.length > 0) back();
      else if (roots.length > 1) setRoots((r) => r.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back, overlay, roots.length, trail.length]);

  const node = selected ? tree.byId[selected] : null;
  const canZoomBranch = node && node.childIds.length > 0 && node.id !== root;
  const backTo = trail.length ? tree.byId[trail[trail.length - 1].id]?.title : undefined;

  return (
    <div className="app">
      <header className="bar">
        <button
          className="bar-home"
          onClick={() => {
            setSelected(null);
            setTrail([]);
            setOverlay(null);
          }}
          title="시작 화면으로"
        >
          CS 지식 지도
        </button>

        <SearchBox tree={tree} onGoTo={jump} />

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

      {narrow && (
        <div className="phone-switch" role="tablist" aria-label="보기 전환">
          <button
            role="tab"
            aria-selected={phoneView === 'map'}
            className={phoneView === 'map' ? 'on' : undefined}
            onClick={() => setPhoneView('map')}
          >
            지도
          </button>
          <button
            role="tab"
            aria-selected={phoneView === 'read'}
            className={phoneView === 'read' ? 'on' : undefined}
            onClick={() => setPhoneView('read')}
          >
            {node ? node.title : '시작'}
          </button>
        </div>
      )}

      <main className={`map${wide ? ' map-wide' : ''}${narrow ? ` phone-${phoneView}` : ''}`}>
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
          handleRef={treeRef}
        />
        {selected ? (
          <ConceptPanel
            key={selected}
            tree={tree}
            index={index}
            id={selected}
            note={study.data.notes[selected]}
            onNote={(patch) => study.setNote(selected, patch)}
            onNavigate={navigate}
            restore={restore}
            backTo={backTo}
            onBack={back}
            onOpenViz={() => setOverlay('viz')}
            wide={wide}
            onToggleWide={() => setWide((w) => !w)}
          />
        ) : (
          <StartPanel
            tree={tree}
            data={study.data}
            onGoTo={jump}
            onQuiz={() => setOverlay('quiz')}
          />
        )}

        {overlay === 'viz' && node && (
          <VizStage fromTitle={node.title} onClose={() => setOverlay(null)} />
        )}
        {overlay === 'quiz' && (
          <QuizMode
            tree={tree}
            onMark={study.setMark}
            onClose={() => setOverlay(null)}
            onGoTo={jump}
          />
        )}
        {overlay === 'notes' && (
          <NotesOverview
            tree={tree}
            data={study.data}
            onImport={study.importJson}
            onGoTo={jump}
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
