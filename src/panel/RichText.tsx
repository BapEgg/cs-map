import { Fragment, type ReactNode } from 'react';
import { SLOT, maskCode } from './inlineCode';
import { findTerms } from './linkTerms';
import type { TermIndex, TermTarget } from './termIndex';

interface Props {
  text: string;
  /** 지금 읽고 있는 개념. 자기 자신은 링크하지 않고, 같은 이름은 여기서 가까운 쪽을 고른다. */
  selfId: string | null;
  index: TermIndex;
  onTerm: (target: TermTarget) => void;
  /**
   * 앞에서 이미 링크한 용어. 여기 있는 이름은 다시 밑줄을 치지 않는다(절 안에서 한 번만).
   * **읽기만 한다** — 복사해서 쓰므로 부모가 넘긴 Set은 바뀌지 않는다. 렌더 중에 공유 Set을
   * 고치면 StrictMode의 두 번째 렌더에서 모든 링크가 사라진다(실제로 그랬다).
   */
  skip?: Set<string>;
  /** 문단 태그. 목록 항목 안에서는 <span>으로 그린다. */
  as?: 'p' | 'span';
}

/** `**강조**`를 형광펜으로, `코드`를 <code>로, 용어를 누를 수 있는 버튼으로 바꾼다. */
function renderInline(
  text: string,
  {
    selfId,
    index,
    onTerm,
    used,
  }: Pick<Props, 'selfId' | 'index' | 'onTerm'> & { used: Set<string> },
): ReactNode[] {
  const { masked, codes } = maskCode(text);
  const out: ReactNode[] = [];
  let key = 0;

  // 먼저 **강조**로 자른다. 홀수 조각이 강조된 부분이다.
  masked.split(/\*\*(.+?)\*\*/g).forEach((part, i) => {
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
    const pieces: ReactNode[] = [];
    let last = 0;
    for (const { name, at, target } of findTerms(chunk, index, selfId, used)) {
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
 * 설명 본문 한 문단. 빈 줄로 나뉜 문단마다 <p>, 문단 안의 줄바꿈은 이어 쓴다.
 *
 * 전에는 문장마다 줄을 바꿔 블록으로 세웠다(v3 "한 줄씩 딱딱하다"의 반동). 그 결과
 * 문단이 사라지고 문장 간격 = 주제 간격이 되어 글이 한 덩어리로 보였다. 문단이 묶여야
 * 어디서 주제가 바뀌는지 보인다. 연결어 색도 뺐다 — 형광펜·밑줄과 셋이 경쟁했다.
 */
export default function RichText({ text, selfId, index, onTerm, skip, as = 'p' }: Props) {
  const seen = new Set(skip);
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim());
  const Tag = as;
  return (
    <>
      {paragraphs.map((para, pi) => (
        <Tag key={pi} className="rich">
          {renderInline(para.replace(/\s*\n\s*/g, ' ').trim(), {
            selfId,
            index,
            onTerm,
            used: seen,
          })}
        </Tag>
      ))}
    </>
  );
}
