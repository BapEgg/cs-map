import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadContent } from './content/load';
import ConceptPanel, { type PanelPlace } from './panel/ConceptPanel';
import NotesOverview from './panel/NotesOverview';
import SearchBox from './panel/SearchBox';
import StartPanel from './panel/StartPanel';
import { buildTermIndex } from './panel/termIndex';
import QuizMode from './quiz/QuizMode';
import { isBlank, marksByConcept } from './store/studyStore';
import { useStudy } from './store/useStudy';
import TreeCanvas, { type TreeHandle } from './tree/TreeCanvas';
import type { Orientation } from './tree/layout';
import { useTheme, type ThemeMode } from './theme/useTheme';
import Splitter from './ui/Splitter';
import { clampPanel, usePanelWidth, wideFor } from './ui/panelWidth';
import { useReadSize } from './ui/readSize';
import ToolsMenu, { type Tool } from './ui/ToolsMenu';
import { ONE_PANE, useMedia } from './ui/media';
import VizStage from './viz/VizStage';
import './App.css';

const THEME_LABEL: Record<ThemeMode, string> = {
  light: '라이트',
  dark: '다크',
  system: '시스템',
};

/**
 * 지도가 뻗는 방향. 버튼은 **지금 상태**를 보여준다(테마 버튼과 같은 규칙).
 * "좌→우 / 위→아래"는 화살표가 눈에 먼저 들어와서 무슨 버튼인지보다 기호를 먼저 읽게 됐다.
 */
const ORIENTATION_LABEL: Record<Orientation, string> = {
  h: '가로',
  v: '세로',
};

/** 어디서 어떻게 보고 있었는지 통째로. 돌아가기가 이걸 그대로 되살린다. */
interface Visit extends PanelPlace {
  id: string;
  /** 그때 지도를 보던 자리와 배율. */
  cam?: { x: number; y: number; k: number };
  /** 그때 펼쳐져 있던 가지. */
  open: Set<string>;
  /** 그때 보던 범위("이 가지만 보기" 자취). */
  roots: string[];
  orientation: Orientation;
}

/** 이력이 끝없이 쌓이지 않게 한다. 그보다 멀리 간 건 "직전 맥락"이 아니다. */
const TRAIL_MAX = 30;

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
  /**
   * 설명 패널 너비. 사람마다·화면마다 편한 비율이 달라서 **끌어서 정하게** 둔다.
   * (전에는 "설명 넓게" 버튼으로 두 단계만 오갔다.)
   */
  const { width: panelWidth, set: setPanelWidth } = usePanelWidth();
  /** 읽는 글씨 크기. 화면 전체를 확대하면 지도가 좁아지니 읽는 글만 키운다. */
  const read = useReadSize();
  /**
   * "넓게 읽기" — 본문이 640px(× 글자 크기)을 온전히 얻도록 패널을 한 번에 넓힌다.
   * 끌어서 맞추는 것과 별개로, 글 읽을 때 한 번 누르는 용도. 다시 누르면 넓히기 직전 폭으로.
   * 사용자가 직접 끌면 "넓게" 상태는 풀린다 — 버튼 글씨가 실제 폭과 어긋나면 안 된다.
   */
  const mapRef = useRef<HTMLElement>(null);
  const [wide, setWide] = useState<{ before: number } | null>(null);
  const room = () => mapRef.current?.clientWidth ?? window.innerWidth;
  const dragPanel = useCallback(
    (px: number) => {
      setWide(null);
      setPanelWidth(px);
    },
    [setPanelWidth],
  );
  const toggleWide = () => {
    if (wide) {
      setPanelWidth(clampPanel(wide.before, room()));
      setWide(null);
    } else {
      setWide({ before: panelWidth });
      setPanelWidth(clampPanel(wideFor(read.size), room()));
    }
  };
  // 넓게 읽는 중에 글자 크기를 바꾸면 그 크기의 640px에 맞춰 다시 넓힌다.
  useEffect(() => {
    if (wide) setPanelWidth(clampPanel(wideFor(read.size), room()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [read.size]);

  /**
   * 좁은 화면에서는 지도와 설명을 한 화면에 같이 못 둔다. 세로로 쌓으면 둘 다 반쪽이 된다.
   * 그래서 한 번에 하나만 보여주고, 개념을 고르면 설명으로 넘어간다.
   */
  const narrow = useMedia(ONE_PANE);
  const [phoneView, setPhoneView] = useState<'map' | 'read'>('map');
  /**
   * "본문만 보기" — 정독할 때 지도가 옆에서 시선을 끈다. 지도는 숨기기만 하고(언마운트 안 함)
   * 본문을 읽기 폭(640×글자 배율)으로 가운데에 둔다. 돌아오면 지도의 카메라·선택, 패널 폭이 그대로다.
   * 자동으로 켜지지 않는다. 좁은 화면(한 화면)에서는 뜻이 없어 무시한다.
   */
  const [focus, setFocus] = useState(false);
  const focusOn = focus && !narrow;

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

  // 지도의 점은 개념 단위. 면접 문제별 기록을 개념 하나로 묶는다.
  const conceptMarks = useMemo(() => marksByConcept(study.data.marks), [study.data.marks]);
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

  /**
   * 지금 자리를 이력에 쌓는다. 어디로 가든(지도·검색·설명 링크) 같은 규칙을 쓴다.
   *
   * 스냅샷은 **여기서** 찍는다. setTrail 업데이터 안에서 찍으면 업데이터가 나중에
   * 실행되면서 이미 옮겨간 카메라를 떠 버린다.
   */
  const pushTrail = useCallback(
    (from?: PanelPlace) => {
      if (!selected) return;
      const cam = treeRef.current?.snapshot();
      const here: Visit = {
        id: selected,
        tab: from?.tab ?? 'basic',
        scroll: from?.scroll ?? 0,
        cam,
        open: new Set(open),
        roots: [...roots],
        orientation,
      };
      setTrail((t) => [...t, here].slice(-TRAIL_MAX));
      setRestore(undefined);
    },
    [open, orientation, roots, selected],
  );

  /** 설명 속 링크로 건너뛴다. 읽던 자리를 남겨 돌아올 수 있게 한다. */
  const navigate = useCallback(
    (targetId: string, from: PanelPlace) => {
      if (!tree.byId[targetId] || targetId === selected) return;
      pushTrail(from);
      reveal(targetId);
    },
    [pushTrail, reveal, selected, tree.byId],
  );

  /** 검색·시작 화면·퀴즈 결과에서 건너뛴다. 이력 규칙은 같다. */
  const jump = useCallback(
    (id: string) => {
      if (id === selected) return;
      pushTrail();
      reveal(id);
    },
    [pushTrail, reveal, selected],
  );

  /**
   * 직전 맥락으로 돌아간다. 개념뿐 아니라 **펼침 상태·보던 범위·방향·카메라·탭·스크롤**을
   * 그때 그대로 되살린다. 하나라도 빠지면 "돌아왔다"는 느낌이 깨진다.
   */
  const back = useCallback(() => {
    // 업데이터 안에서 다른 state를 건드리면 두 번 실행돼 자취가 제대로 안 줄어든다.
    const last = trail[trail.length - 1];
    if (!last) return;
    setTrail((t) => t.slice(0, -1));
    setRestore({ tab: last.tab, scroll: last.scroll });

    setRoots(last.roots);
    setOrientation(last.orientation);
    setOpen(new Set(last.open));
    setSelected(last.id);
    setOverlay(null);
    setPhoneView('read');

    /*
     * 카메라는 여기서 바로 되돌린다. requestAnimationFrame으로 미루면 탭이 안 보일 때
     * 아예 안 돌아 복원이 통째로 건너뛰어진다. restore가 "잠깐 자동 이동 금지"를
     * 걸어두므로, 뒤이어 도는 따라가기 효과가 이 자리를 덮어쓰지 못한다.
     */
    if (last.cam) treeRef.current?.restore(last.cam);
  }, [trail]);

  /**
   * 트리에서 노드 본체를 눌렀을 때. 고르고 그 갈래로 들어간다. **접지는 않는다.**
   * 한 층에 한 갈래만 펼친다(아코디언).
   */
  const clickNode = useCallback(
    (id: string) => {
      if (id === selected) return;
      /*
       * 지도에서 옮겨 다닌 것도 이력에 남긴다.
       * 전에는 지도 클릭이 이력을 비워서, 설명 링크로 간 건 뒤로 갈 수 있고 지도로 간 건
       * 못 가는 두 가지 규칙이 생겼다. "뒤로 = 직전 맥락"으로 하나만 둔다.
       */
      pushTrail();
      select(id);
      if (tree.byId[id].childIds.length > 0) setOpen(pathOf(id));
      else setPhoneView('read'); // 더 펼칠 게 없으면 읽으러 가는 뜻이다
    },
    [pathOf, pushTrail, select, selected, tree.byId],
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

  /**
   * 머리말 도구. 넓은 화면에서는 줄로 펼치고 좁은 화면에서는 접는다.
   * 같은 목록을 두 곳이 나눠 쓴다 — 한쪽에만 버튼이 생기는 일이 없도록.
   */
  const tools: Tool[] = [
    ...(canZoomBranch
      ? [
          {
            key: 'branch',
            label: '이 가지만 보기',
            onClick: () => setRoots((r) => [...r, node.id]),
          },
        ]
      : []),
    { key: 'quiz', label: '퀴즈', onClick: () => setOverlay('quiz') },
    {
      key: 'notes',
      label: (
        <>
          내 메모
          {notedIds.size > 0 && <em className="bar-count">{notedIds.size}</em>}
        </>
      ),
      onClick: () => setOverlay('notes'),
    },
    { key: 'sep', separator: true },
    {
      key: 'orientation',
      label: ORIENTATION_LABEL[orientation],
      title: `지도가 뻗는 방향 — 지금은 ${ORIENTATION_LABEL[orientation]}`,
      quiet: true,
      onClick: () => setOrientation((o) => (o === 'h' ? 'v' : 'h')),
    },
    {
      key: 'read',
      label: `글씨 ${read.label}`,
      title: `설명 글씨 크기 — 지금은 ${read.label}`,
      quiet: true,
      onClick: read.cycle,
    },
    {
      key: 'theme',
      label: THEME_LABEL[mode],
      title: `화면 밝기 — 지금은 ${THEME_LABEL[mode]}`,
      quiet: true,
      onClick: cycle,
    },
  ];

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

        {/*
          좁은 화면에서는 도구를 접는다. 머리말 한 줄이 통째로 사라지고 그만큼 지도가 커진다.
          넓은 화면에서는 그대로 펼쳐 둔다 — 자리가 있는데 한 번 더 누르게 만들 이유가 없다.
        */}
        {narrow ? (
          <ToolsMenu tools={tools} count={notedIds.size} />
        ) : (
          <div className="bar-tools">
            {tools.map((t) =>
              'separator' in t ? (
                <span key={t.key} className="bar-divider" aria-hidden="true" />
              ) : (
                <button
                  key={t.key}
                  className={`btn ${t.quiet ? 'btn-quiet' : 'btn-secondary'}`}
                  title={t.title}
                  onClick={t.onClick}
                >
                  {t.label}
                </button>
              ),
            )}
          </div>
        )}
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

      <main
        ref={mapRef}
        className={`map${narrow ? ` phone-${phoneView}` : ''}${focusOn ? ' focus' : ''}`}
        style={
          {
            ['--read-scale' as string]: read.size,
            ...(narrow ? {} : { ['--panel-w' as string]: `${panelWidth}px` }),
          } as React.CSSProperties
        }
      >
        <TreeCanvas
          byId={tree.byId}
          root={root}
          open={open}
          selected={selected}
          orientation={orientation}
          marks={conceptMarks}
          noted={notedIds}
          onNodeClick={clickNode}
          onToggle={toggle}
          visible={(!narrow || phoneView === 'map') && !focusOn}
          handleRef={treeRef}
        />
        {!narrow && !focusOn && <Splitter width={panelWidth} onChange={dragPanel} />}

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
            wide={narrow ? undefined : !!wide}
            onToggleWide={narrow ? undefined : toggleWide}
            focus={narrow ? undefined : focusOn}
            onToggleFocus={narrow ? undefined : () => setFocus((f) => !f)}
            layoutKey={`${narrow ? 'one' : focusOn ? 'focus' : panelWidth}:${read.size}`}
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
            marks={study.data.marks}
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
