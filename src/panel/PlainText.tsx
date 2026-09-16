import { Fragment, type ReactNode } from 'react';
import { SLOT, maskCode } from './inlineCode';

/**
 * 용어 링크 없이 마크다운 표시만 정리해 그린다. 퀴즈와 질문 제목에 쓴다.
 * `코드`는 <code>로, `**강조**`는 표시만 뗀다(퀴즈에서 형광펜은 답을 미리 알려 준다).
 */
export function InlineText({ text }: { text: string }): ReactNode {
  const { masked, codes } = maskCode(text.replace(/\*\*(.+?)\*\*/g, '$1'));
  return (
    <>
      {masked
        .split(SLOT)
        .map((piece, i) =>
          i % 2 === 1 ? (
            <code key={i}>{codes[Number(piece)]}</code>
          ) : (
            <Fragment key={i}>{piece}</Fragment>
          ),
        )}
    </>
  );
}

/**
 * 줄마다 <p>. 면접 답은 "결론 / 이유 / 예시·한계"를 한 줄씩 쓰므로(HANDOFF 5-4),
 * 줄을 합치면 그 구조가 사라진다.
 */
export default function PlainText({ text, className }: { text: string; className?: string }) {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <>
      {lines.map((line, i) => (
        <p key={i} className={className}>
          <InlineText text={line} />
        </p>
      ))}
    </>
  );
}
