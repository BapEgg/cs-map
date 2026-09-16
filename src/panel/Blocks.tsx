import { Fragment } from 'react';
import Diagram from './Diagram';
import { termsIn } from './linkTerms';
import type { Block } from './parseBody';
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
export default function Blocks({ blocks, selfId, index, onTerm }: Props) {
  // 같은 용어는 절 안에서 한 번만 밑줄. 앞 글이 링크한 이름을 순수 계산으로 모아 넘긴다.
  // (렌더 중에 공유 Set을 고치는 방식은 StrictMode의 두 번째 렌더에서 링크를 전부 지웠다.)
  let skip = new Set<string>();
  const piece = (text: string, as: 'p' | 'span' = 'p') => {
    const before = skip;
    skip = termsIn(text, index, selfId, skip);
    return (
      <RichText text={text} selfId={selfId} index={index} onTerm={onTerm} skip={before} as={as} />
    );
  };
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'p':
            return <Fragment key={i}>{piece(b.text)}</Fragment>;
          case 'list':
            return (
              <ul key={i} className="rich-list">
                {b.items.map((item, k) => (
                  <li key={k}>{piece(item, 'span')}</li>
                ))}
              </ul>
            );
          case 'table':
            return (
              <div key={i} className="cmp-wrap">
                <table className="cmp">
                  <thead>
                    <tr>
                      {b.head.map((h, k) => (
                        <th key={k}>{piece(h, 'span')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}>{piece(cell, 'span')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
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
