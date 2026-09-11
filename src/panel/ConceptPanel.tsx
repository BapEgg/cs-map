import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContentTree } from '../content/types';
import type { ConceptNote } from '../store/studyStore';
import NoteTab from './NoteTab';
import { parseBody } from './parseBody';
import RichText from './RichText';
import type { TermIndex, TermTarget } from './termIndex';
import './panel.css';

export type Tab = 'basic' | 'deep' | 'note';

/** 다른 개념으로 건너뛸 때 남겨두는 자리. 돌아오면 이대로 복원한다. */
export interface PanelPlace {
  tab: Tab;
  scroll: number;
}

interface Props {
  tree: ContentTree;
  index: TermIndex;
  id: string;
  note: ConceptNote | undefined;
  onNote: (patch: Partial<ConceptNote>) => void;
  /** 다른 개념으로 간다. 지금 자리를 같이 넘겨 돌아올 수 있게 한다. */
  onNavigate: (targetId: string, from: PanelPlace) => void;
  /** 돌아왔을 때 복원할 자리. */
  restore?: PanelPlace;
  /** 되돌아갈 곳이 있으면 제목. 없으면 undefined. */
  backTo?: string;
  onBack: () => void;
  onOpenViz: () => void;
  /** 넓게 읽기 토글. */
  wide: boolean;
  onToggleWide: () => void;
}

/** 용어를 눌러 펼친 짧은 설명. 개념이든 용어든 **항상 이걸 먼저 보여준다.** */
interface TermCard {
  label: string;
  body: string;
  /** 있으면 "이 개념으로 가기"를 띄운다. */
  goId?: string;
}

export default function ConceptPanel({
  tree,
  index,
  id,
  note,
  onNote,
  onNavigate,
  restore,
  backTo,
  onBack,
  onOpenViz,
  wide,
  onToggleWide,
}: Props) {
  const node = tree.byId[id];
  const [tab, setTab] = useState<Tab>(restore?.tab ?? 'basic');
  const [cards, setCards] = useState<TermCard[]>([]);
  const [openAnswers, setOpenAnswers] = useState<Set<number>>(new Set());
  const scroller = useRef<HTMLElement>(null);

  const parsed = useMemo(() => parseBody(node.body), [node.body]);

  // 돌아왔으면 읽던 자리까지 되돌려 놓는다. 맨 위로 튕기면 어디까지 읽었는지 잃는다.
  useEffect(() => {
    if (restore?.scroll && scroller.current) scroller.current.scrollTop = restore.scroll;
  }, [restore]);

  const place = (): PanelPlace => ({ tab, scroll: scroller.current?.scrollTop ?? 0 });
  const go = (targetId: string) => onNavigate(targetId, place());

  const path = useMemo(() => {
    const trail: string[] = [];
    let cursor: string | null = id;
    while (cursor) {
      trail.unshift(cursor);
      cursor = tree.byId[cursor]?.parentId ?? null;
    }
    return trail;
  }, [id, tree.byId]);

  /**
   * 밑줄 친 용어를 눌렀을 때. **개념이든 용어든 똑같이 짧은 설명을 먼저 편다.**
   * 전에는 개념이면 곧바로 화면을 갈아치워서, 같은 밑줄인데 어떤 건 설명이 뜨고
   * 어떤 건 읽던 자리를 잃었다.
   */
  const openTerm = (target: TermTarget) => {
    if (target.kind === 'node') {
      const t = tree.byId[target.key];
      if (!t) return;
      setCards((s) => [...s, { label: t.title, body: t.card?.one_line ?? '', goId: t.id }]);
      return;
    }
    const entry = tree.glossary.find((g) => g.term === target.key);
    if (entry) {
      setCards((s) => [
        ...s,
        { label: entry.term, body: entry.body, goId: entry.link ?? undefined },
      ]);
    }
  };

  const richProps = { selfId: id, index, onTerm: openTerm };
  const hasFullCard = !!(node.card?.analogy || node.card?.keywords?.length);
  const top = cards[cards.length - 1];

  return (
    <aside className={`panel${wide ? ' panel-wide' : ''}`} ref={scroller}>
      <div className="panel-top">
        {backTo && (
          <button className="btn btn-quiet panel-back" onClick={onBack}>
            ← {backTo}
          </button>
        )}
        <button
          className="btn btn-quiet btn-icon panel-wide-toggle"
          onClick={onToggleWide}
          aria-label={wide ? '설명 좁게' : '설명 넓게'}
          title={wide ? '설명 좁게' : '설명 넓게'}
        >
          {wide ? '⇥' : '⇤'}
        </button>
      </div>

      <nav className="panel-path">
        {path.map((pid, i) => (
          <span key={pid}>
            {i > 0 && <span className="sep">›</span>}
            {pid === id ? (
              <b>{tree.byId[pid].title}</b>
            ) : (
              <button type="button" onClick={() => go(pid)}>
                {tree.byId[pid].title}
              </button>
            )}
          </span>
        ))}
      </nav>

      <h2 className="panel-title">
        {node.title}
        {node.isStub && <span className="stub-badge">준비 중</span>}
      </h2>

      {node.sim && (
        <button className="panel-sim-open" type="button" onClick={onOpenViz}>
          ▶ 동작 과정 눈으로 보기
        </button>
      )}

      <div className="panel-tabs" role="tablist">
        {(
          [
            ['basic', '기초', false],
            ['deep', '심화', !parsed.deep],
            ['note', '내 메모', false],
          ] as const
        ).map(([key, label, disabled]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'on' : undefined}
            onClick={() => setTab(key)}
            disabled={disabled}
          >
            {label}
            {key === 'note' && note?.unsure && <span className="tab-dot" title="헷갈림 표시" />}
          </button>
        ))}
      </div>

      {tab === 'note' ? (
        <NoteTab note={note} onChange={onNote} />
      ) : tab === 'basic' ? (
        <div className="panel-body">
          <div className={hasFullCard ? 'card3' : 'card3 card3-bare'}>
            <p className="card3-line">
              <RichText text={node.card?.one_line ?? ''} {...richProps} />
            </p>
            {node.card?.analogy && <p className="card3-analogy">비유 · {node.card.analogy}</p>}
            {!!node.card?.keywords?.length && (
              <p className="card3-keys">
                {node.card.keywords.map((k) => (
                  <em key={k}>{k}</em>
                ))}
              </p>
            )}
          </div>

          {node.isStub ? (
            <p className="stub-note">
              이 개념은 아직 내용을 쓰지 않았어요. 뼈대만 잡혀 있고, 곧 채울 예정이에요.
            </p>
          ) : (
            parsed.why && (
              <section>
                <h3 className="section-title">왜 나왔나</h3>
                <RichText text={parsed.why} {...richProps} />
              </section>
            )
          )}

          {(node.flowPrev.length > 0 || node.flowNext.length > 0) && (
            <section>
              <h3 className="section-title">흐름</h3>
              <ul className="flow">
                {node.flowPrev.map((f) => (
                  <li key={`p-${f.id}`}>
                    <button type="button" onClick={() => go(f.id)}>
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
                    <button type="button" onClick={() => go(f.id)}>
                      {tree.byId[f.id]?.title ?? f.id}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {node.childIds.length > 0 && (
            <section>
              <h3 className="section-title">하위 개념</h3>
              <div className="chip-row">
                {node.childIds.map((cid) => (
                  <button key={cid} type="button" className="chip" onClick={() => go(cid)}>
                    {tree.byId[cid].title}
                    {tree.byId[cid].isStub && <i className="chip-stub">준비 중</i>}
                  </button>
                ))}
              </div>
            </section>
          )}

          {!!node.see_also?.length && (
            <section>
              <h3 className="section-title">이어 보기</h3>
              <div className="chip-row">
                {node.see_also.map((sid) => (
                  <button key={sid} type="button" className="chip" onClick={() => go(sid)}>
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
              <h3 className="section-title">내부 구조</h3>
              {parsed.deep.internals.map((line, i) => (
                <RichText key={i} text={line} {...richProps} />
              ))}
            </section>
          ) : null}

          {parsed.deep?.usage.length ? (
            <section>
              <h3 className="section-title">실제 활용</h3>
              {parsed.deep.usage.map((line, i) => (
                <RichText key={i} text={line} {...richProps} />
              ))}
            </section>
          ) : null}

          {parsed.deep?.interview.length ? (
            <section>
              <h3 className="section-title">면접 질문</h3>
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

      {top && (
        <div className="term-stack">
          <div className="term-crumbs">
            {cards.map((c, i) => (
              <span key={c.label}>
                {i > 0 && <span className="sep">›</span>}
                <button type="button" onClick={() => setCards((s) => s.slice(0, i + 1))}>
                  {c.label}
                </button>
              </span>
            ))}
            <button type="button" className="term-close" onClick={() => setCards([])}>
              닫기
            </button>
          </div>
          <div className="term-body">
            <RichText text={top.body} selfId={id} index={index} onTerm={openTerm} />
          </div>
          {top.goId && top.goId !== id && (
            <button className="btn btn-secondary term-go" onClick={() => go(top.goId!)}>
              {top.label} 개념으로 가기 →
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
