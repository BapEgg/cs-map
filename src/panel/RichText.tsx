import { Fragment, type ReactNode } from 'react';
import { SLOT, maskCode } from './inlineCode';
import { resolveTerm, standsAlone, type TermIndex, type TermTarget } from './termIndex';

interface Props {
  text: string;
  /** 지금 읽고 있는 개념. 자기 자신은 링크하지 않고, 같은 이름은 여기서 가까운 쪽을 고른다. */
  selfId: string | null;
  index: TermIndex;
  onTerm: (target: TermTarget) => void;
  /**
   * 이미 링크한 용어. 절(section) 단위로 하나를 넘겨 주면 그 절 안에서는 같은 용어를
   * 한 번만 링크한다. 문단마다 새로 링크하면 밑줄이 반복돼 글이 한 덩어리로 보였다.
   */
  used?: Set<string>;
  /** 문단 태그. 목록 항목 안에서는 <span>으로 그린다. */
  as?: 'p' | 'span';
}

/** `**강조**`를 형광펜으로, `코드`를 <code>로, 용어를 누를 수 있는 버튼으로 바꾼다. */
function renderInline(
  text: string,
  { selfId, index, onTerm, used }: Required<Pick<Props, 'selfId' | 'index' | 'onTerm' | 'used'>>,
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
 * 설명 본문 한 문단. 빈 줄로 나뉜 문단마다 <p>, 문단 안의 줄바꿈은 이어 쓴다.
 *
 * 전에는 문장마다 줄을 바꿔 블록으로 세웠다(v3 "한 줄씩 딱딱하다"의 반동). 그 결과
 * 문단이 사라지고 문장 간격 = 주제 간격이 되어 글이 한 덩어리로 보였다. 문단이 묶여야
 * 어디서 주제가 바뀌는지 보인다. 연결어 색도 뺐다 — 형광펜·밑줄과 셋이 경쟁했다.
 */
export default function RichText({ text, selfId, index, onTerm, used, as = 'p' }: Props) {
  const seen = used ?? new Set<string>();
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
