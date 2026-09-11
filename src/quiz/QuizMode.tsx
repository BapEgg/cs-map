import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContentTree } from '../content/types';
import { SESSION, buildQuestions, pickSession, type QuizKind } from './buildQuestions';
import './quiz.css';

interface Props {
  tree: ContentTree;
  /** 누적 퀴즈 기록. 이번에 낼 문제를 고르는 데 쓴다(모르는 것부터). */
  marks: Record<string, { known: boolean; at: string }>;
  onMark: (id: string, known: boolean | null) => void;
  onClose: () => void;
  onGoTo: (id: string) => void;
}

/** 범위로 고를 수 있는 건 가지가 있는 노드뿐이다. 잎 하나로는 퀴즈가 안 된다. */
function scopeOptions(tree: ContentTree) {
  const out: { id: string; title: string; depth: number }[] = [];
  const walk = (id: string) => {
    const node = tree.byId[id];
    if (!node || node.childIds.length === 0) return;
    out.push({ id, title: node.title, depth: node.depth });
    for (const child of node.childIds) walk(child);
  };
  walk(tree.rootId);
  return out;
}

export default function QuizMode({ tree, marks, onMark, onClose, onGoTo }: Props) {
  const scopes = useMemo(() => scopeOptions(tree), [tree]);
  const [scope, setScope] = useState(tree.rootId);
  const [kind, setKind] = useState<QuizKind>('basic');
  const [deck, setDeck] = useState<ReturnType<typeof buildQuestions> | null>(null);
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState(false);
  /**
   * 이번 회차에 어떻게 답했는지. 누적 기록(marks)과 따로 둔다.
   * 예전에는 시작할 때 그 범위의 누적 기록을 통째로 지웠는데, 퀴즈를 한 번 켜기만 해도
   * 지금까지 쌓은 표시가 날아갔다.
   */
  const [answers, setAnswers] = useState<Record<number, boolean>>({});

  const available = useMemo(() => buildQuestions(tree, scope, kind), [tree, scope, kind]);

  /**
   * 기록은 **회차를 시작할 때의 것**을 쓴다. 푸는 중에 바뀐 표시로 다시 고르면
   * 방금 "헷갈렸음"을 누른 문제가 이번 회차에 또 나온다.
   */
  const marksRef = useRef(marks);
  useEffect(() => {
    marksRef.current = marks;
  }, [marks]);

  const start = () => {
    setDeck(pickSession(available, marksRef.current));
    setAt(0);
    setShown(false);
    setAnswers({});
  };

  const answer = (known: boolean) => {
    const q = deck![at];
    onMark(q.id, known); // 누적 기록
    setAnswers((prev) => ({ ...prev, [at]: known })); // 이번 회차
    setAt((i) => i + 1);
    setShown(false);
  };

  /*
   * 손을 자판에서 떼지 않고 풀 수 있게 한다. 카드를 넘기는 리듬이 끊기면 집중이 끊긴다.
   * 열려 있는 동안 창에서 듣는다 — 퀴즈는 화면을 덮고 있으므로 다른 데로 갈 키가 없다.
   *
   * `answer`까지 ref에 담는다. 처음 렌더의 것을 붙잡아 두면 그때 deck이 아직 null이라
   * 키를 눌러도 아무 일이 안 일어난다(실제로 그래서 1·2가 먹지 않았다).
   */
  const latest = useRef({ deck, at, shown, answer });
  useEffect(() => {
    latest.current = { deck, at, shown, answer };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      const { deck: d, at: i, shown: open, answer: judge } = latest.current;
      if (!d || i >= d.length) return;
      if (!open) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setShown(true);
        }
        return;
      }
      if (e.key === '1') judge(false);
      else if (e.key === '2') judge(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── 범위 고르기 ──
  if (!deck) {
    return (
      <div className="quiz">
        <header className="quiz-bar">
          <h2>퀴즈</h2>
          <button className="btn btn-quiet" onClick={onClose}>
            닫기
          </button>
        </header>

        <div className="quiz-setup">
          <section>
            <h3 className="section-title">어디서 낼까요</h3>
            <div className="quiz-scopes">
              {scopes.map((s) => (
                <button
                  key={s.id}
                  className={s.id === scope ? 'on' : undefined}
                  style={{ marginLeft: s.depth * 14 }}
                  onClick={() => setScope(s.id)}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="section-title">무엇을 물을까요</h3>
            <div className="quiz-kinds">
              <button
                className={kind === 'basic' ? 'on' : undefined}
                onClick={() => setKind('basic')}
              >
                기초 개념
                <em>제목을 보고 한 문장으로 말해 봅니다</em>
              </button>
              <button
                className={kind === 'interview' ? 'on' : undefined}
                onClick={() => setKind('interview')}
              >
                면접 질문
                <em>심화에 적어둔 질문에 말로 답해봅니다</em>
              </button>
            </div>

            <p className="quiz-count">
              {available.length > 0 ? (
                <>
                  <b>{tree.byId[scope].title}</b>에서{' '}
                  <b>{Math.min(SESSION, available.length)}문제</b>를 냅니다.
                  {available.length > SESSION && <> (전체 {available.length}문제 중)</>}
                </>
              ) : (
                <>이 범위에는 낼 문제가 없어요. 다른 가지를 골라보세요.</>
              )}
            </p>
            {available.length > 0 && (
              <p className="quiz-policy">
                헷갈렸던 것 → 아직 안 본 것 → 오래전에 외운 것 순으로 골라요.
              </p>
            )}

            <button
              className="btn btn-primary quiz-start"
              onClick={start}
              disabled={available.length === 0}
            >
              시작하기
            </button>
          </section>
        </div>
      </div>
    );
  }

  // ── 결과 ──
  if (at >= deck.length) {
    const known = Object.values(answers).filter(Boolean).length;
    const unsure = deck.filter((_, i) => answers[i] === false);
    return (
      <div className="quiz">
        <header className="quiz-bar">
          <h2>퀴즈 결과</h2>
          <button className="btn btn-quiet" onClick={onClose}>
            닫기
          </button>
        </header>
        <div className="quiz-result">
          <p className="quiz-score">
            {deck.length}문제 중 <b>{known}개</b> 기억났어요.
          </p>
          {unsure.length > 0 && (
            <>
              <h3 className="section-title">다시 볼 개념 {unsure.length}개</h3>
              <div className="chip-row quiz-again">
                {[...new Map(unsure.map((q) => [q.id, q])).values()].map((q) => (
                  <button
                    key={q.id}
                    className="chip chip-warn"
                    onClick={() => {
                      onGoTo(q.id);
                      onClose();
                    }}
                  >
                    {q.title}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="quiz-actions">
            <button className="btn btn-primary" onClick={start}>
              {Math.min(SESSION, available.length)}문제 더 풀기
            </button>
            <button className="btn btn-secondary" onClick={() => setDeck(null)}>
              범위 바꾸기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 문제 풀기 ──
  const q = deck[at];
  return (
    <div className="quiz">
      <header className="quiz-bar">
        <h2>
          {at + 1} / {deck.length}
        </h2>
        <div className="quiz-progress">
          <i style={{ width: `${(at / deck.length) * 100}%` }} />
        </div>
        <button className="btn btn-quiet" onClick={onClose}>
          닫기
        </button>
      </header>

      <div className="quiz-card">
        {q.path.length > 0 && <p className="quiz-path">{q.path.join(' › ')}</p>}
        <h3 className="quiz-q">{q.kind === 'basic' ? q.title : q.prompt}</h3>
        {q.kind === 'interview' && <p className="quiz-from">{q.title}</p>}

        {!shown ? (
          <>
            <p className="quiz-ask">
              {q.kind === 'basic'
                ? '면접에서 답하듯 한 문장으로 말해 보세요.'
                : '먼저 말로 답해보고 나서 펼치세요.'}
            </p>
            <button className="btn btn-primary quiz-reveal" onClick={() => setShown(true)}>
              떠올렸어요 · 답 보기
            </button>
            <p className="quiz-keyhint">
              <kbd>Space</kbd> 답 보기 · <kbd>Esc</kbd> 닫기
            </p>
          </>
        ) : (
          <>
            <div className="quiz-answer">
              <p>{q.answer}</p>
              {q.keywords.length > 0 && (
                <p className="quiz-keys">
                  {q.keywords.map((k) => (
                    <em key={k}>{k}</em>
                  ))}
                </p>
              )}
              {q.follow.map((f) => (
                <p key={f} className="quiz-follow">
                  꼬리 질문 · {f}
                </p>
              ))}
            </div>
            <div className="quiz-judge">
              <button className="no" onClick={() => answer(false)}>
                <kbd>1</kbd> ✗ 헷갈렸음
              </button>
              <button className="ok" onClick={() => answer(true)}>
                <kbd>2</kbd> ✓ 기억났음
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
