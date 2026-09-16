import Diagram from './Diagram';
import type { Block } from './parseBody';
import RichText from './RichText';
import type { TermIndex, TermTarget } from './termIndex';

interface Props {
  blocks: Block[];
  selfId: string | null;
  index: TermIndex;
  onTerm: (target: TermTarget) => void;
  /** 절 단위로 하나. 같은 용어는 절 안에서 한 번만 링크한다. */
  used: Set<string>;
}

/**
 * 절 안의 블록들을 그린다. 문단은 문단으로, 목록은 목록으로, 표·코드·관계도는 각자 모양으로.
 * 전에는 목록 항목이 각각 <p>로 나가서 문단과 구분이 안 됐다.
 */
export default function Blocks({ blocks, selfId, index, onTerm, used }: Props) {
  const rich = { selfId, index, onTerm, used };
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'p':
            return <RichText key={i} text={b.text} {...rich} />;
          case 'list':
            return (
              <ul key={i} className="rich-list">
                {b.items.map((item, k) => (
                  <li key={k}>
                    <RichText text={item} {...rich} as="span" />
                  </li>
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
                        <th key={k}>
                          <RichText text={h} {...rich} as="span" />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}>
                            <RichText text={cell} {...rich} as="span" />
                          </td>
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
