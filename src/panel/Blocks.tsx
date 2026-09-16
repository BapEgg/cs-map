import { Fragment } from 'react';
import Diagram from './Diagram';
import { termsIn } from './linkTerms';
import type { Block } from './parseBody';
import { InlineText } from './PlainText';
import RichText from './RichText';
import type { TermIndex, TermTarget } from './termIndex';

interface Props {
  blocks: Block[];
  selfId: string | null;
  index: TermIndex;
  onTerm: (target: TermTarget) => void;
}

/**
 * 절 안의 블록들을 그린다. 문단은 문단으로, 목록은 목록으로, 표·코드·관계도는 각자 모양으로.
 * 전에는 목록 항목이 각각 <p>로 나가서 문단과 구분이 안 됐다.
 */
/** 블록 안에서 따로 그리는 글 조각들(문단 하나, 목록 항목들, 표 칸들). */
const piecesOf = (b: Block): string[] => {
  if (b.kind === 'p') return [b.text];
  if (b.kind === 'list') return b.items;
  if (b.kind === 'table') return [...b.head, ...b.rows.flat()];
  return [];
};

/**
 * 조각마다 "앞에서 이미 링크한 이름"을 미리 센다. 순수 계산이라 렌더를 몇 번 돌려도 같다.
 * (렌더 중에 공유 Set을 고치는 방식은 StrictMode의 두 번째 렌더에서 링크를 전부 지웠다.)
 */
function skipsFor(blocks: Block[], index: TermIndex, selfId: string | null): Set<string>[][] {
  let seen = new Set<string>();
  return blocks.map((b) =>
    piecesOf(b).map((text) => {
      const before = seen;
      seen = termsIn(text, index, selfId, seen);
      return before;
    }),
  );
}

export default function Blocks({ blocks, selfId, index, onTerm }: Props) {
  const skips = skipsFor(blocks, index, selfId);
  const piece = (text: string, skip: Set<string>, as: 'p' | 'span' = 'p') => (
    <RichText text={text} selfId={selfId} index={index} onTerm={onTerm} skip={skip} as={as} />
  );
  return (
    <>
      {blocks.map((b, i) => {
        const sk = skips[i];
        switch (b.kind) {
          case 'p':
            return <Fragment key={i}>{piece(b.text, sk[0])}</Fragment>;
          case 'h4':
            return (
              <h4 key={i} className="sub-title">
                <InlineText text={b.text} />
              </h4>
            );
          case 'list': {
            const Tag = b.ordered ? 'ol' : 'ul';
            return (
              <Tag key={i} className="rich-list">
                {b.items.map((item, k) => (
                  <li key={k}>{piece(item, sk[k], 'span')}</li>
                ))}
              </Tag>
            );
          }
          case 'table': {
            // 칸 조각의 순서 = 머리글 전부, 그다음 행마다 칸. 행 길이가 달라도 맞게 누적한다.
            const offsets: number[] = [];
            let at = b.head.length;
            for (const row of b.rows) {
              offsets.push(at);
              at += row.length;
            }
            return (
              <div key={i} className="cmp-wrap">
                <table className="cmp">
                  <thead>
                    <tr>
                      {b.head.map((h, k) => (
                        <th key={k}>{piece(h, sk[k], 'span')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}>{piece(cell, sk[offsets[r] + c], 'span')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case 'code':
            return (
              <pre key={i} className="code-block" data-lang={b.lang || undefined}>
                <code>{b.code}</code>
              </pre>
            );
          case 'diagram':
            return <Diagram key={i} edges={b.edges} />;
        }
      })}
    </>
  );
}
