import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContentTree } from '../content/types';
import './search.css';

interface Props {
  tree: ContentTree;
  onGoTo: (id: string) => void;
}

/**
 * 제목·별칭으로 개념을 바로 찾는다.
 *
 * 개념이 수백 개가 되면 지도를 접었다 폈다 하며 찾는 건 현실적이지 않다.
 * 이름을 아는 개념은 이름으로 가는 길이 있어야 한다.
 */
export default function SearchBox({ tree, onGoTo }: Props) {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (key.length < 1) return [];
    const scored = Object.values(tree.byId)
      .map((n) => {
        const names = [n.title, ...(n.aliases ?? [])].map((s) => s.toLowerCase());
        const best = names.reduce((acc, name) => {
          if (name === key) return Math.max(acc, 3);
          if (name.startsWith(key)) return Math.max(acc, 2);
          if (name.includes(key)) return Math.max(acc, 1);
          return acc;
        }, 0);
        return { node: n, score: best };
      })
      .filter((x) => x.score > 0);
    scored.sort((a, b) => b.score - a.score || a.node.depth - b.node.depth);
    return scored.slice(0, 8).map((x) => x.node);
  }, [q, tree.byId]);

  // Ctrl/⌘+K 로 어디서든 검색으로 온다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 바깥을 누르면 결과를 접는다.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setQ('');
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, []);

  const pick = (id: string) => {
    onGoTo(id);
    setQ('');
    input.current?.blur();
  };

  return (
    <div className="search" ref={box}>
      <input
        ref={input}
        type="search"
        value={q}
        placeholder="개념 찾기 (Ctrl+K)"
        aria-label="개념 찾기"
        onChange={(e) => {
          setQ(e.target.value);
          setAt(0); // 글자를 고치면 고른 자리를 처음으로
        }}
        onKeyDown={(e) => {
          if (!hits.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAt((i) => (i + 1) % hits.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setAt((i) => (i - 1 + hits.length) % hits.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(hits[at].id);
          } else if (e.key === 'Escape') {
            setQ('');
          }
        }}
      />
      {hits.length > 0 && (
        <ul className="search-hits" role="listbox">
          {hits.map((n, i) => (
            <li key={n.id}>
              <button
                className={i === at ? 'on' : undefined}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(n.id)}
                role="option"
                aria-selected={i === at}
              >
                <b>{n.title}</b>
                {n.isStub && <i className="chip-stub">준비 중</i>}
                <span>{n.card?.one_line?.replace(/\*\*/g, '') ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
