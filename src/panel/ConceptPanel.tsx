import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ContentTree } from '../content/types';
import type { ConceptNote } from '../store/studyStore';
import NoteTab from './NoteTab';
import { parseBody } from './parseBody';
import { InlineText } from './PlainText';
import Blocks from './Blocks';
import RichText from './RichText';
import type { TermIndex, TermTarget } from './termIndex';
import './panel.css';

export type Tab = 'basic' | 'deep' | 'note';

const URL_IN = /https?:\/\/\S+/;

/** 출처 한 줄. "OSTEP 26장 — https://…"처럼 URL이 있으면 그 부분만 링크로. */
function SourceLine({ text }: { text: string }) {
  const m = URL_IN.exec(text);
  if (!m) return <>{text}</>;
  const before = text.slice(0, m.index).replace(/[\s—-]+$/, '');
  const after = text.slice(m.index + m[0].length);
  return (
    <>
      {before}
      {before && ' — '}
      <a href={m[0]} target="_blank" rel="noopener noreferrer">
        {before ? '링크' : m[0]}
      </a>
      {after}
    </>
  );
}

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
}: Props) {
  const node = tree.byId[id];
  const [tab, setTab] = useState<Tab>(restore?.tab ?? 'basic');
  const [cards, setCards] = useState<TermCard[]>([]);
  const [openAnswers, setOpenAnswers] = useState<Set<number>>(new Set());
  /** 확인 질문 중 답을 펼친 것. 개념이 바뀌면(key=selected) 다시 닫힌다. */
  const [openChecks, setOpenChecks] = useState<Set<number>>(new Set());
  /** 외울 한 문장을 봤는지. 개념이 바뀌면(key=selected) 다시 가려진다. */
  const [revealed, setRevealed] = useState(false);
  /** 긴 경로의 가운데를 접어 두었다가 눌러서 펼친다. 경로는 보조 정보라 상단 높이를 먹지 않게. */
  const [pathOpen, setPathOpen] = useState(false);
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
  const top = cards[cards.length - 1];

  return (
    <aside className="panel" ref={scroller}>
      {/*
        본문 폭은 패널 폭과 따로 간다. 패널을 넓혀도 글은 640px(기본 글자 크기 기준, 글자를 키우면 비례)
        안에서 가운데에 놓인다 — 줄이 길어지면 다음 줄 첫 글자를 찾기 어렵다(HANDOFF 6-2-16).
      */}
      <div className="panel-inner">
        {backTo && (
          <div className="panel-top">
            <button className="btn btn-quiet panel-back" onClick={onBack}>
              ← {backTo}
            </button>
          </div>
        )}

        <nav className="panel-path" aria-label="경로">
          {/*
          경로는 보조 정보다. 4단계 넘게 길어지면 가운데를 "…"로 접는다 — 누르면 전부 펼쳐진다.
          첫 항목(뿌리)과 부모, 현재는 늘 보인다.
        */}
          {(() => {
            const shown =
              path.length > 4 && !pathOpen ? [path[0], '…', path[path.length - 2], id] : path;
            return shown.map((pid, i) => (
              <span key={`${pid}-${i}`}>
                {i > 0 && <span className="sep">›</span>}
                {pid === '…' ? (
                  <button type="button" onClick={() => setPathOpen(true)} title="경로 전부 보기">
                    …
                  </button>
                ) : pid === id ? (
                  <b aria-current="page">{tree.byId[pid].title}</b>
                ) : (
                  <button type="button" onClick={() => go(pid)}>
                    {tree.byId[pid].title}
                  </button>
                )}
              </span>
            ));
          })()}
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
            {/*
            읽는 순서: **개념 정리 → 왜 나왔나 → 한 문장으로.**
            무엇인지 먼저 알고, 왜 생겼는지 읽고, 그걸 한 문장으로 외운다.
            개념 정리는 길어도 된다 — 외우는 건 그 아래 한 문장이 맡는다.
          */}
            {node.isStub ? (
              <p className="stub-note">
                이 개념은 아직 내용을 쓰지 않았어요. 뼈대만 잡혀 있고, 곧 채울 예정이에요.
              </p>
            ) : (
              <>
                {parsed.concept.length > 0 && (
                  <section>
                    <h3 className="section-title">개념 정리</h3>
                    <Blocks blocks={parsed.concept} {...richProps} />
                  </section>
                )}
                {parsed.why.length > 0 && (
                  <section>
                    <h3 className="section-title">왜 나왔나</h3>
                    <Blocks blocks={parsed.why} {...richProps} />
                  </section>
                )}
              </>
            )}

            {/*
            외울 한 문장. 설명(개념 정리·왜 나왔나)을 다 읽은 **뒤에** 둔다.
            배경을 이해한 직후에 나와야 "아, 그래서 이 말이구나"가 된다.
            면접에서 그대로 튀어나올 수 있게 앞뒤가 맞는 완전한 문장으로 쓴다(HANDOFF 5-4).
          */}
            {node.card?.one_line && (
              <section className="memo-line">
                <h3 className="section-title">한 문장으로</h3>
                <div className="card3">
                  {/*
                  div로 감싼다. RichText가 문단마다 <p>를 내보내는데 <p> 안의 <p>는
                  브라우저가 바깥 <p>를 먼저 닫아 버려서 구조가 통째로 어긋난다.
                */}
                  {/*
                  가려 두고 눌러서 본다. 표시(상자·띠·형광펜)로 구분하는 게 아니라 **동작**으로 구분한다 —
                  읽을 때마다 한 번 떠올리게 되어, 그 자체가 외우는 일이 된다.
                  개념을 옮기면(key=selected) 다시 가려진다.
                */}
                  {revealed ? (
                    <div className="card3-line">
                      <RichText text={node.card.one_line} {...richProps} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="card3-cover"
                      onClick={() => setRevealed(true)}
                      aria-label="한 문장 보기 — 먼저 떠올려 보세요"
                    >
                      {/* 흐린 글은 장식이다. 읽는 건 버튼 이름으로 충분하다. */}
                      <span className="card3-line card3-blur" aria-hidden="true">
                        {node.card.one_line}
                      </span>
                      <span className="card3-hint" aria-hidden="true">
                        떠올려 보고 눌러서 확인
                      </span>
                    </button>
                  )}
                  {node.card.analogy && <p className="card3-analogy">비유 · {node.card.analogy}</p>}
                  {node.card.analogy_limit && (
                    <p className="card3-analogy card3-limit">다만 · {node.card.analogy_limit}</p>
                  )}
                  {!!node.card.keywords?.length && (
                    <p className="card3-keys">
                      {node.card.keywords.map((k) => (
                        <em key={k}>{k}</em>
                      ))}
                    </p>
                  )}
                </div>
              </section>
            )}

            {parsed.checks.length > 0 && (
              <section>
                <h3 className="section-title">확인 질문</h3>
                <p className="hint">기초만 읽고 답해 봅니다. 답은 눌러서 확인.</p>
                <ol className="checks">
                  {parsed.checks.map((c, i) => (
                    <li key={i} className="check">
                      <p className="check-q">
                        <InlineText text={c.q} />
                      </p>
                      {openChecks.has(i) ? (
                        <div className="check-a">
                          <RichText text={c.a} {...richProps} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="check-reveal"
                          onClick={() => setOpenChecks((s) => new Set(s).add(i))}
                        >
                          답 보기
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {(node.flowPrev.length > 0 || node.flowNext.length > 0) && (
              <section>
                <h3 className="section-title">왜 이어지나</h3>
                {/*
                세로 시간선. 위가 먼저, 아래가 나중. 지금 개념은 가운데 채운 점.
                이유는 두 점 사이 선 위에 놓인다 — "여기서 저기로 가는 까닭"이니까.
                "앞에서/다음으로" 같은 말은 안 쓴다. 선과 점이 이미 방향을 말한다.
              */}
                <ol className="flow">
                  {node.flowPrev.map((f) => (
                    <Fragment key={`p-${f.id}`}>
                      <li className="flow-step">
                        <button type="button" className="flow-go" onClick={() => go(f.id)}>
                          {tree.byId[f.id]?.title ?? f.id}
                        </button>
                      </li>
                      <li className="flow-gap">{f.reason}</li>
                    </Fragment>
                  ))}
                  <li className="flow-step is-here">
                    <b>{node.title}</b>
                  </li>
                  {node.flowNext.map((f) => (
                    <Fragment key={`n-${f.id}`}>
                      <li className="flow-gap">{f.reason}</li>
                      <li className="flow-step">
                        <button type="button" className="flow-go" onClick={() => go(f.id)}>
                          {tree.byId[f.id]?.title ?? f.id}
                        </button>
                      </li>
                    </Fragment>
                  ))}
                </ol>
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
                <h3 className="section-title">같이 보기</h3>
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
            {parsed.deep?.sections.map((sec) => (
              <section key={sec.title}>
                <h3 className="section-title">
                  <InlineText text={sec.title} />
                </h3>
                <Blocks blocks={sec.blocks} {...richProps} />
              </section>
            ))}

            {parsed.deep?.interview.length ? (
              <section>
                <h3 className="section-title">면접 질문</h3>
                <p className="hint">먼저 말로 답해보고 나서 펼쳐 보세요.</p>
                {parsed.deep.interview.map((qa, i) => (
                  <div key={i} className="qa">
                    <h4 className="qa-h">
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
                        {openAnswers.has(i) ? '▾' : '▸'} <InlineText text={qa.q} />
                      </button>
                    </h4>
                    {openAnswers.has(i) && (
                      <div className="qa-a">
                        <RichText text={qa.a} {...richProps} />
                        {qa.follow.map((f) => (
                          <p key={f} className="qa-follow">
                            꼬리 질문 · <InlineText text={f} />
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </section>
            ) : null}

            {(node.checked || node.sources?.length) && (
              <div className="checked">
                {node.checked && <p style={{ margin: 0 }}>사실 확인 {node.checked}</p>}
                {node.sources?.length ? (
                  <ul className="sources">
                    {node.sources.map((s) => (
                      <li key={s}>
                        <SourceLine text={s} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
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
      </div>
    </aside>
  );
}
