import { describe, expect, it } from 'vitest';
import { items, parseBody } from './parseBody';

const SAMPLE = `
## 개념

무엇인지 설명.

## 왜 나왔나

문제가 있었다.
그래서 해결했다.

## 심화

### 내부 구조

- 목록 하나
- 두 줄로 이어지는
  목록 둘

문단으로 쓴 설명도 항목이다.
두 줄이어도 한 항목.

### 실제 활용

- 실무 예

### 면접 질문

#### 첫 질문은?

결론부터 말하면 이렇다.

- 꼬리: 꼬리 하나
- 꼬리:꼬리 둘
`;

describe('parseBody', () => {
  const parsed = parseBody(SAMPLE);

  it('개념·왜 나왔나를 가른다', () => {
    expect(parsed.concept).toBe('무엇인지 설명.');
    expect(parsed.why).toBe('문제가 있었다.\n그래서 해결했다.');
  });

  it('내부 구조는 목록이든 문단이든 항목으로 읽는다', () => {
    expect(parsed.deep?.internals).toEqual([
      '목록 하나',
      '두 줄로 이어지는\n목록 둘',
      '문단으로 쓴 설명도 항목이다.\n두 줄이어도 한 항목.',
    ]);
    expect(parsed.deep?.usage).toEqual(['실무 예']);
  });

  it('면접 질문은 #### 제목 + 답 + 꼬리', () => {
    expect(parsed.deep?.interview).toEqual([
      { q: '첫 질문은?', a: '결론부터 말하면 이렇다.', follow: ['꼬리 하나', '꼬리 둘'] },
    ]);
    expect(parsed.dropped).toEqual([]);
  });

  it('안 읽히는 형식은 누락으로 잡는다', () => {
    const p = parseBody(
      `## 심화\n\n### 면접 질문\n\n- Q. 옛 형식?\n  A. 답.\n\n### 참고\n\n출처 목록`,
    );
    expect(p.dropped).toEqual(['- Q. 옛 형식?', '  A. 답.', '### 참고', '출처 목록']);
    expect(p.deep).toBeNull();
  });

  it('면접 질문 절 밖의 ####는 질문이 아니다', () => {
    const p = parseBody(`## 심화\n\n### 내부 구조\n\n#### 소제목\n\n- 항목`);
    expect(p.deep).toBeNull();
    expect(p.dropped).toEqual(['#### 소제목', '- 항목']);
  });

  it('심화가 없으면 deep은 null', () => {
    expect(parseBody('## 개념\n\n설명').deep).toBeNull();
  });

  it('items: 빈 줄이 문단을 가르고 들여쓴 줄은 앞 항목에 붙는다', () => {
    expect(items(['a', 'b', '', '- c', '  d', '- e'])).toEqual(['a\nb', 'c\nd', 'e']);
  });
});
