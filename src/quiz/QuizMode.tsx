import { useMemo, useState } from 'react';
import type { ContentTree } from '../content/types';
import type { StudyData } from '../store/studyStore';
import { buildQuestions, descendants, shuffle, type QuizKind } from './buildQuestions';
import './quiz.css';

interface Props {
  tree: ContentTree;
  marks: StudyData['marks'];
  onMark: (id: string, known: boolean | null) => void;
  onClearMarks: (ids: string[]) => void;
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

export default function QuizMode({ tree, marks, onMark, onClearMarks, onClose, onGoTo }: Props) {
  const scopes = useMemo(() => scopeOptions(tree), [tree]);
  const [scope, setScope] = useState(tree.rootId);
  const [kind, setKind] = useState<QuizKind>('basic');
  const [deck, setDeck] = useState<ReturnType<typeof buildQuestions> | null>(null);
  const [at, setAt] = useState(0);
  const [shown, setShown] = useState(false);

  const available = useMemo(() => buildQuestions(tree, scope, kind), [tree, scope, kind]);

  const start = () => {
    onClearMarks(descendants(tree, scope));
    setDeck(shuffle(available));
    setAt(0);
    setShown(false);
  };

  const answer = (known: boolean) => {
    onMark(deck![at].id, known);
    setAt((i) => i + 1);
    setShown(false);
  };

  // ── 범위 고르기 ──
  if (!deck) {
    return (
      <div className="quiz">
        <header className="quiz-bar">
          <h2>퀴즈</h2>
          <button className="quiz-close" onClick={onClose}>
            닫기
          </button>
        </header>

        <div className="quiz-setup">
          <section>
            <h3>어디서 낼까요</h3>
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
            <h3>무엇을 물을까요</h3>
            <div className="quiz-kinds">
              <button
                className={kind === 'basic' ? 'on' : undefined}
                onClick={() => setKind('basic')}
              >
                기초 개념
                <em>제목을 보고 한 줄 정의를 떠올립니다</em>
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
                  <b>{tree.byId[scope].title}</b>에서 <b>{available.length}문제</b>를 낼 수 있어요.
                </>
              ) : (
                <>이 범위에는 낼 문제가 없어요. 다른 가지를 골라보세요.</>
              )}
            </p>

            <button className="quiz-start" onClick={start} disabled={available.length === 0}>
              시작하기
            </button>
          </section>
        </div>
      </div>
    );
  }

  // ── 결과 ──
  if (at >= deck.length) {
    const asked = deck.map((q) => q.id);
    const known = asked.filter((id) => marks[id]?.known).length;
    const unsure = deck.filter((q) => marks[q.id] && !marks[q.id].known);
    return (
      <div className="quiz">
        <header className="quiz-bar">
          <h2>퀴즈 결과</h2>
          <button className="quiz-close" onClick={onClose}>
            닫기
          </button>
        </header>
        <div className="quiz-result">
          <p className="quiz-score">
            {deck.length}문제 중 <b>{known}개</b> 기억났어요.
          </p>
          {unsure.length > 0 && (
            <>
              <h3>다시 볼 개념 {unsure.length}개</h3>
              <div className="quiz-again">
                {[...new Map(unsure.map((q) => [q.id, q])).values()].map((q) => (
                  <button
                    key={q.id}
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
            <button onClick={start}>다시 풀기</button>
            <button onClick={() => setDeck(null)}>범위 바꾸기</button>
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
        <button className="quiz-close" onClick={onClose}>
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
                ? '한 줄 정의를 떠올려 보세요.'
                : '먼저 말로 답해보고 나서 펼치세요.'}
            </p>
            <button className="quiz-reveal" onClick={() => setShown(true)}>
              떠올렸어요 · 답 보기
            </button>
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
              <button className="ok" onClick={() => answer(true)}>
                ✓ 기억났음
              </button>
              <button className="no" onClick={() => answer(false)}>
                ✗ 헷갈렸음
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
