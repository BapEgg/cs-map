/**
 * 개념 마크다운 본문을 탭별로 가른다.
 * 형식은 HANDOFF 5-2를 따른다: `## 개념`, `## 왜 나왔나`, `## 심화` 아래 `### 내부 구조 / 실제 활용 / 면접 질문`.
 */

export interface InterviewQuestion {
  q: string;
  a: string;
  /** 꼬리 질문. */
  follow: string[];
}

export interface DeepSection {
  internals: string[];
  usage: string[];
  interview: InterviewQuestion[];
}

export interface ParsedBody {
  /** 기초 탭 맨 위. 무엇이고 어떻게 도는지. 길어도 된다. */
  concept: string;
  /** 기초 탭의 "왜 나왔나". */
  why: string;
  deep: DeepSection | null;
}

const bullets = (lines: string[]) =>
  lines
    .filter((l) => l.startsWith('- '))
    .map((l) => l.slice(2).trim())
    .filter(Boolean);

export function parseBody(body: string): ParsedBody {
  const lines = body.split(/\r?\n/);

  // 제목 줄 위치를 먼저 찾아 구간으로 자른다.
  const heads: { level: number; title: string; at: number }[] = [];
  lines.forEach((line, i) => {
    const m = /^(#{2,4})\s+(.*)$/.exec(line);
    if (m) heads.push({ level: m[1].length, title: m[2].trim(), at: i });
  });

  const sliceAfter = (index: number) => {
    const start = heads[index].at + 1;
    const end = index + 1 < heads.length ? heads[index + 1].at : lines.length;
    return lines.slice(start, end);
  };

  let concept = '';
  let why = '';
  const deep: DeepSection = { internals: [], usage: [], interview: [] };
  let sawDeep = false;

  for (let i = 0; i < heads.length; i++) {
    const { level, title } = heads[i];
    const chunk = sliceAfter(i);

    if (level === 2 && title === '개념') {
      concept = chunk.join('\n').trim();
    } else if (level === 2 && title === '왜 나왔나') {
      why = chunk.join('\n').trim();
    } else if (level === 2 && title === '심화') {
      sawDeep = true;
    } else if (level === 3 && title === '내부 구조') {
      deep.internals = bullets(chunk);
    } else if (level === 3 && title === '실제 활용') {
      deep.usage = bullets(chunk);
    } else if (level === 4) {
      // 면접 질문. 답변은 꼬리 질문 앞까지.
      const follow = chunk
        .filter((l) => l.startsWith('- 꼬리:'))
        .map((l) => l.replace('- 꼬리:', '').trim());
      const a = chunk
        .filter((l) => !l.startsWith('- 꼬리:'))
        .join('\n')
        .trim();
      deep.interview.push({ q: title, a, follow });
    }
  }

  const hasDeep = sawDeep && (deep.internals.length || deep.usage.length || deep.interview.length);
  return { concept, why, deep: hasDeep ? deep : null };
}
