import { describe, expect, it } from 'vitest';
import { parseBlocks, parseBody, parseDiagram } from './parseBody';

const SAMPLE = `
## 개념

무엇인지 설명.
이어지는 문장.

둘째 문단.

## 왜 나왔나

문제가 있었다.
그래서 해결했다.

## 확인 질문

- 설명해 보기: 프로그램과 프로세스의 차이는?
  답: 프로그램은 파일, 프로세스는 실행 중.
- 다음 상태 예측: 실행 중 파일 읽기를 요청하면?
  답: 대기.

## 심화

### 언제 실행하고 기다리는가

\`\`\`diagram
준비 -> 실행: 스케줄러가 뽑음
실행 -> 준비: 퀀텀 끝
실행 -> 대기: I/O 요청
대기 -> 준비: I/O 완료
\`\`\`

설명 문단.

### 실무 선택

| 제품 | 모델 |
|---|---|
| Nginx | 워커 몇 개 |
| PostgreSQL | 연결당 프로세스 |

- 목록 하나
- 두 줄로 이어지는
  목록 둘

\`\`\`c
int x = 1; // # 주석
\`\`\`

### 면접 질문

#### 첫 질문은?

결론부터 말하면 이렇다.

- 꼬리: 꼬리 하나
- 꼬리:꼬리 둘
`;

describe('parseBody', () => {
  const parsed = parseBody(SAMPLE);

  it('개념·왜 나왔나는 문단 블록', () => {
    expect(parsed.concept).toEqual([
      { kind: 'p', text: '무엇인지 설명.\n이어지는 문장.' },
      { kind: 'p', text: '둘째 문단.' },
    ]);
    expect(parsed.why).toEqual([{ kind: 'p', text: '문제가 있었다.\n그래서 해결했다.' }]);
  });

  it('확인 질문은 질문과 답으로 갈린다', () => {
    expect(parsed.checks).toEqual([
      {
        q: '설명해 보기: 프로그램과 프로세스의 차이는?',
        a: '프로그램은 파일, 프로세스는 실행 중.',
      },
      { q: '다음 상태 예측: 실행 중 파일 읽기를 요청하면?', a: '대기.' },
    ]);
  });

  it('심화는 ### 절이 순서대로, 면접 질문은 따로', () => {
    expect(parsed.deep?.sections.map((s) => s.title)).toEqual([
      '언제 실행하고 기다리는가',
      '실무 선택',
    ]);
    expect(parsed.deep?.interview).toEqual([
      { q: '첫 질문은?', a: '결론부터 말하면 이렇다.', follow: ['꼬리 하나', '꼬리 둘'] },
    ]);
    expect(parsed.dropped).toEqual([]);
  });

  it('관계도·표·목록·코드 블록을 읽는다', () => {
    const [first, second] = parsed.deep!.sections;
    expect(first.blocks[0]).toEqual({
      kind: 'diagram',
      edges: [
        { from: '준비', to: '실행', label: '스케줄러가 뽑음' },
        { from: '실행', to: '준비', label: '퀀텀 끝' },
        { from: '실행', to: '대기', label: 'I/O 요청' },
        { from: '대기', to: '준비', label: 'I/O 완료' },
      ],
    });
    expect(first.blocks[1]).toEqual({ kind: 'p', text: '설명 문단.' });
    expect(second.blocks).toEqual([
      {
        kind: 'table',
        head: ['제품', '모델'],
        rows: [
          ['Nginx', '워커 몇 개'],
          ['PostgreSQL', '연결당 프로세스'],
        ],
      },
      { kind: 'list', items: ['목록 하나', '두 줄로 이어지는\n목록 둘'] },
      { kind: 'code', lang: 'c', code: 'int x = 1; // # 주석' },
    ]);
  });

  it('안 읽히는 형식은 누락으로 잡는다', () => {
    const p = parseBody(
      `## 심화\n\n### 면접 질문\n\n- Q. 옛 형식?\n  A. 답.\n\n## 참고\n\n출처 목록`,
    );
    expect(p.dropped).toEqual(['- Q. 옛 형식?', '  A. 답.', '## 참고', '출처 목록']);
    expect(p.deep).toBeNull();
  });

  it('면접 질문 절 밖의 ####는 질문이 아니라 소제목이다', () => {
    const p = parseBody(
      `## 심화\n\n### 내부 구조\n\n글\n\n#### 소제목\n\n- 항목\n\n### 면접 질문\n\n#### 진짜 질문?\n\n답`,
    );
    expect(p.deep?.sections).toEqual([
      {
        title: '내부 구조',
        blocks: [
          { kind: 'p', text: '글' },
          { kind: 'h4', text: '소제목' },
          { kind: 'list', items: ['항목'] },
        ],
      },
    ]);
    expect(p.deep?.interview).toEqual([{ q: '진짜 질문?', a: '답', follow: [] }]);
    expect(p.dropped).toEqual([]);
  });

  it('개념·왜 나왔나 안의 ####는 소제목으로 남는다(예시·작동 과정·비교)', () => {
    const p = parseBody(`## 개념

정의

#### 예시

글

## 왜 나왔나

문제

#### 그래서

해결`);
    expect(p.concept).toEqual([
      { kind: 'p', text: '정의' },
      { kind: 'h4', text: '예시' },
      { kind: 'p', text: '글' },
    ]);
    expect(p.why).toEqual([
      { kind: 'p', text: '문제' },
      { kind: 'h4', text: '그래서' },
      { kind: 'p', text: '해결' },
    ]);
    expect(p.dropped).toEqual([]);
  });

  it('심화 밖의 ###과 답 없는 확인 질문도 누락이다', () => {
    const p = parseBody(`## 개념\n\n### 소제목\n\n글\n\n## 확인 질문\n\n- 답이 없는 질문`);
    expect(p.dropped).toEqual(['### 소제목', '글', '- 답이 없는 질문']);
  });

  it('심화가 없으면 deep은 null', () => {
    expect(parseBody('## 개념\n\n설명').deep).toBeNull();
  });

  it('parseBlocks: 빈 줄이 문단을 가르고 들여쓴 줄은 목록 항목에 붙는다', () => {
    expect(parseBlocks(['a', 'b', '', '- c', '  d', '- e', 'f'])).toEqual([
      { kind: 'p', text: 'a\nb' },
      { kind: 'list', items: ['c\nd', 'e'] },
      { kind: 'p', text: 'f' },
    ]);
  });

  it('번호 목록은 ordered', () => {
    expect(parseBlocks(['1. 하나', '2. 둘', '- 점'])).toEqual([
      { kind: 'list', items: ['하나', '둘'], ordered: true },
      { kind: 'list', items: ['점'] },
    ]);
  });

  it('parseDiagram: 화살표 없는 줄은 누락', () => {
    const dropped: string[] = [];
    expect(parseDiagram(['A → B', 'C -> D: 이유', '이상한 줄'], dropped)).toEqual([
      { from: 'A', to: 'B', label: '' },
      { from: 'C', to: 'D', label: '이유' },
    ]);
    expect(dropped).toEqual(['이상한 줄']);
  });
});

describe('표 칸 안의 세로줄', () => {
  it('역슬래시 세로줄은 글자 그대로', () => {
    const [t] = parseBlocks(['| a | b |', '|---|---|', '| `ls \\| grep` | x |']);
    expect(t).toEqual({ kind: 'table', head: ['a', 'b'], rows: [['`ls | grep`', 'x']] });
  });
});
