import { Fragment, type ReactNode } from 'react';
import { SLOT, maskCode } from './inlineCode';
import { resolveTerm, standsAlone, type TermIndex, type TermTarget } from './termIndex';

/** 문장을 이어주는 말. 눈에 띄게 해두면 "문제 → 그래서 해결" 구조가 보인다. */
const CONNECTIVES = /^(그래서|하지만|대신|다만|즉|결국|그런데|반대로|따라서)\s*/;

interface Props {
  text: string;
  /** 지금 읽고 있는 개념. 자기 자신은 링크하지 않고, 같은 이름은 여기서 가까운 쪽을 고른다. */
  selfId: string | null;
  index: TermIndex;
  onTerm: (target: TermTarget) => void;
  /** 한 문단 안에서 같은 용어는 처음 한 번만 링크한다. */
  used?: Set<string>;
}

/** `**강조**`를 형광펜으로, 용어를 누를 수 있는 버튼으로 바꾼다. */
function renderInline(
  text: string,
  { selfId, index, onTerm, used }: Required<Omit<Props, 'text'>>,
  codes: string[] = [],
): ReactNode[] {
  const out: ReactNode[] = [];
  let key = 0;

  // 먼저 **강조**로 자른다. 홀수 조각이 강조된 부분이다.
  text.split(/\*\*(.+?)\*\*/g).forEach((part, i) => {
    if (!part) return;
    const inner = i % 2 === 1 ? <mark>{unmask(part)}</mark> : unmask(part);
    out.push(<Fragment key={key++}>{inner}</Fragment>);
  });

  return out;

  function unmask(chunk: string): ReactNode[] {
    return chunk.split(SLOT).flatMap((piece, i): ReactNode[] => {
      if (i % 2 === 0) return linkify(piece);
      return [<code key={`c${key++}`}>{codes[Number(piece)]}</code>];
    });
  }

  function linkify(chunk: string): ReactNode[] {
    if (!chunk) return [];
    if (!index.pattern) return [chunk];
    const pieces: ReactNode[] = [];
    let last = 0;
    index.pattern.lastIndex = 0;
    for (const m of chunk.matchAll(index.pattern)) {
      const name = m[0];
      const at = m.index!;
      if (used.has(name)) continue;
      // "프레임워크"의 '프레임'처럼 낱말 안에 파묻힌 건 건너뛴다
      if (!standsAlone(chunk, at, at + name.length)) continue;
      const target = resolveTerm(index, name, selfId);
      if (!target) continue;
      used.add(name);
      if (at > last) pieces.push(chunk.slice(last, at));
      pieces.push(
        <button
          key={`t${key++}`}
          type="button"
          className="term"
          onClick={() => onTerm(target)}
          title={target.kind === 'node' ? '트리에서 보기' : '용어 설명 보기'}
        >
          {name}
        </button>,
      );
      last = at + name.length;
    }
    if (last < chunk.length) pieces.push(chunk.slice(last));
    return pieces;
  }
}

/**
 * 설명 본문을 읽기 좋게 그린다.
 * 한 문장 = 한 줄로 끊고, 연결어에 색을 주고, 모르는 용어를 누를 수 있게 만든다.
 * v3에서 "오른쪽 설명이 한 줄씩 딱딱해서 읽기 힘들다"던 걸 고친 방식이다.
 */
export default function RichText({ text, selfId, index, onTerm, used }: Props) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());

  return (
    <>
      {paragraphs.map((para, pi) => {
        // 문단마다 새로 센다. 문단이 길어도 같은 용어가 계속 파랗게 되진 않는다.
        const seen = used ?? new Set<string>();
        const { masked, codes } = maskCode(para);
        const sentences = masked
          .split(/\n/)
          .flatMap((line) => line.split(/(?<=[.!?])\s+/))
          .map((s) => s.trim())
          .filter(Boolean);

        return (
          <p key={pi} className="rich">
            {sentences.map((sentence, si) => {
              const conn = CONNECTIVES.exec(sentence);
              const rest = conn ? sentence.slice(conn[0].length) : sentence;
              return (
                <span key={si} className="rich-line">
                  {conn && <span className="conn">{conn[1]} </span>}
                  {renderInline(rest, { selfId, index, onTerm, used: seen }, codes)}
                </span>
              );
            })}
          </p>
        );
      })}
    </>
  );
}
