/**
 * `코드`는 문장 자르기·용어 링크에서 빼 둔다. `Thread.start()`의 점에서 문장이 갈리거나
 * `count++`의 count가 용어로 잡히면 코드가 아니라 글처럼 보인다.
 * 자리 표시자(사용자 영역 글자 U+E000)로 바꿔 두었다가 그릴 때 <code>로 되돌린다.
 */
const CODE = /`([^`\n]+)`/g;
const MARK = '';
export const SLOT = /(\d+)/g;

export function maskCode(text: string): { masked: string; codes: string[] } {
  const codes: string[] = [];
  const masked = text.replace(CODE, (_, c: string) => {
    codes.push(c);
    return `${MARK}${codes.length - 1}${MARK}`;
  });
  return { masked, codes };
}
