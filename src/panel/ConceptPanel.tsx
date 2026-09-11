import { useMemo, useState } from 'react';
import type { ContentTree } from '../content/types';
import Player from '../viz/Player';
import MemoryLayoutView from '../viz/scenes/MemoryLayoutView';
import { buildMemoryLayoutScene } from '../viz/scenes/memoryLayout';
import type { ConceptNote } from '../store/studyStore';
import NoteTab from './NoteTab';
import { parseBody } from './parseBody';
import RichText from './RichText';
import type { TermIndex, TermTarget } from './termIndex';
import './panel.css';

type Tab = 'basic' | 'deep' | 'note';

interface Props {
  tree: ContentTree;
  index: TermIndex;
  id: string;
  onGoTo: (id: string) => void;
  note: ConceptNote | undefined;
  onNote: (patch: Partial<ConceptNote>) => void;
}

/** 용어를 눌러 들어간 자취. "📖 지역성 › 캐시 라인"처럼 쌓인다. */
interface TermCrumb {
  term: string;
  body: string;
}

export default function ConceptPanel({ tree, index, id, onGoTo, note, onNote }: Props) {
  const node = tree.byId[id];
  const [tab, setTab] = useState<Tab>('basic');
  const [terms, setTerms] = useState<TermCrumb[]>([]);
  const [showSim, setShowSim] = useState(false);
  const [openAnswers, setOpenAnswers] = useState<Set<number>>(new Set());

  const parsed = useMemo(() => parseBody(node.body), [node.body]);
  const scene = useMemo(() => (node.sim ? buildMemoryLayoutScene() : null), [node.sim]);

  // 다른 개념으로 옮기면 읽던 자취(탭·용어 카드·펼친 답변)는 접힌다.
  // App이 key={id}로 이 컴포넌트를 새로 만들어서, 여기서 따로 되돌릴 필요가 없다.

  const path = useMemo(() => {
    const trail: string[] = [];
    let cursor: string | null = id;
    while (cursor) {
      trail.unshift(cursor);
      cursor = tree.byId[cursor]?.parentId ?? null;
    }
    return trail;
  }, [id, tree.byId]);

  const openTerm = (target: TermTarget) => {
    if (target.kind === 'node') {
      onGoTo(target.key);
      return;
    }
    const entry = tree.glossary.find((g) => g.term === target.key);
    if (entry) setTerms((stack) => [...stack, { term: entry.term, body: entry.body }]);
  };

  const richProps = { selfId: id, index, onTerm: openTerm };

  return (
    <aside className="panel">
      <nav className="panel-path">
        {path.map((pid, i) => (
          <span key={pid}>
            {i > 0 && <span className="sep">›</span>}
            {pid === id ? (
              <b>{tree.byId[pid].title}</b>
            ) : (
              <button type="button" onClick={() => onGoTo(pid)}>
                {tree.byId[pid].title}
              </button>
            )}
          </span>
        ))}
      </nav>

      <h2 className="panel-title">{node.title}</h2>

      {node.sim && (
        <button className="panel-sim-open" type="button" onClick={() => setShowSim((v) => !v)}>
          {showSim ? '▲ 시각화 접기' : '▶ 동작 과정 눈으로 보기'}
        </button>
      )}

      {showSim && scene && (
        <div className="panel-sim">
          <Player scene={scene} render={(state) => <MemoryLayoutView state={state} />} />
        </div>
      )}

      <div className="panel-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'basic'}
          className={tab === 'basic' ? 'on' : undefined}
          onClick={() => setTab('basic')}
        >
          기초
        </button>
        <button
          role="tab"
          aria-selected={tab === 'deep'}
          className={tab === 'deep' ? 'on' : undefined}
          onClick={() => setTab('deep')}
          disabled={!parsed.deep}
        >
          심화
        </button>
        <button
          role="tab"
          aria-selected={tab === 'note'}
          className={tab === 'note' ? 'on' : undefined}
          onClick={() => setTab('note')}
        >
          내 메모
          {note?.unsure && <span className="tab-dot" title="헷갈림 표시" />}
        </button>
      </div>

      {tab === 'note' ? (
        <NoteTab note={note} onChange={onNote} />
      ) : tab === 'basic' ? (
        <div className="panel-body">
          <div className="card3">
            <p className="card3-line">
              <RichText text={node.card?.one_line ?? ''} {...richProps} />
            </p>
            {node.card?.analogy && <p className="card3-analogy">🔎 {node.card.analogy}</p>}
            {!!node.card?.keywords?.length && (
              <p className="card3-keys">
                {node.card.keywords.map((k) => (
                  <em key={k}>{k}</em>
                ))}
              </p>
            )}
          </div>

          {parsed.why && (
            <section>
              <h3>왜 나왔나</h3>
              <RichText text={parsed.why} {...richProps} />
            </section>
          )}

          {(node.flowPrev.length > 0 || node.flowNext.length > 0) && (
            <section>
              <h3>흐름</h3>
              <ul className="flow">
                {node.flowPrev.map((f) => (
                  <li key={`p-${f.id}`}>
                    <button type="button" onClick={() => onGoTo(f.id)}>
                      {tree.byId[f.id]?.title ?? f.id}
                    </button>
                    <span className="reason">—{f.reason}→</span>
                    <b>{node.title}</b>
                  </li>
                ))}
                {node.flowNext.map((f) => (
                  <li key={`n-${f.id}`}>
                    <b>{node.title}</b>
                    <span className="reason">—{f.reason}→</span>
                    <button type="button" onClick={() => onGoTo(f.id)}>
                      {tree.byId[f.id]?.title ?? f.id}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {node.childIds.length > 0 && (
            <section>
              <h3>하위 개념</h3>
              <div className="chips">
                {node.childIds.map((cid) => (
                  <button key={cid} type="button" onClick={() => onGoTo(cid)}>
                    {tree.byId[cid].title}
                  </button>
                ))}
              </div>
            </section>
          )}

          {!!node.see_also?.length && (
            <section>
              <h3>이어 보기</h3>
              <div className="chips">
                {node.see_also.map((sid) => (
                  <button key={sid} type="button" onClick={() => onGoTo(sid)}>
                    {tree.byId[sid]?.title ?? sid}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="panel-body">
          {parsed.deep?.internals.length ? (
            <section>
              <h3>🔧 내부 구조</h3>
              {parsed.deep.internals.map((line, i) => (
                <RichText key={i} text={line} {...richProps} />
              ))}
            </section>
          ) : null}

          {parsed.deep?.usage.length ? (
            <section>
              <h3>🌍 실제 활용</h3>
              {parsed.deep.usage.map((line, i) => (
                <RichText key={i} text={line} {...richProps} />
              ))}
            </section>
          ) : null}

          {parsed.deep?.interview.length ? (
            <section>
              <h3>🎤 면접 질문</h3>
              <p className="hint">먼저 말로 답해보고 나서 펼쳐 보세요.</p>
              {parsed.deep.interview.map((qa, i) => (
                <div key={i} className="qa">
                  <button
                    type="button"
                    className="qa-q"
                    onClick={() =>
                      setOpenAnswers((s) => {
                        const next = new Set(s);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                  >
                    {openAnswers.has(i) ? '▾' : '▸'} {qa.q}
                  </button>
                  {openAnswers.has(i) && (
                    <div className="qa-a">
                      <RichText text={qa.a} {...richProps} />
                      {qa.follow.map((f) => (
                        <p key={f} className="qa-follow">
                          꼬리 질문 · {f}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          ) : null}

          {node.checked && (
            <p className="checked">
              사실 확인 {node.checked}
              {node.sources?.length ? ` · ${node.sources.join(', ')}` : ''}
            </p>
          )}
        </div>
      )}

      {terms.length > 0 && (
        <div className="term-stack">
          <div className="term-crumbs">
            📖
            {terms.map((t, i) => (
              <span key={t.term}>
                {i > 0 && <span className="sep">›</span>}
                <button type="button" onClick={() => setTerms((s) => s.slice(0, i + 1))}>
                  {t.term}
                </button>
              </span>
            ))}
            <button type="button" className="term-close" onClick={() => setTerms([])}>
              닫기
            </button>
          </div>
          <div className="term-body">
            <RichText
              text={terms[terms.length - 1].body}
              selfId={id}
              index={index}
              onTerm={openTerm}
            />
          </div>
        </div>
      )}
    </aside>
  );
}
