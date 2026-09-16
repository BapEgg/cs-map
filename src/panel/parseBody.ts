/**
 * 개념 마크다운 본문을 탭별로 가른다.
 * 형식은 HANDOFF 5-2를 따른다: `## 개념`, `## 왜 나왔나`, `## 심화` 아래 `### 내부 구조 / 실제 활용 / 면접 질문`.
 *
 * 내부 구조·실제 활용은 `- ` 목록이든 일반 문단이든 항목 하나로 읽는다.
 * 전에는 목록만 읽어서 문단으로 쓴 심화(AI와 개발하기)가 화면에 통째로 빠졌다.
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
  /**
   * 파일에는 있는데 화면에는 안 나갈 줄. 알 수 없는 제목 아래 있거나,
   * 지원하지 않는 형식(`- Q.` 면접 질문)이다. 통합 테스트가 이걸로 누락을 잡는다.
   */
  dropped: string[];
}

const DEEP_SECTIONS = new Set(['내부 구조', '실제 활용', '면접 질문']);
const FOLLOW = /^-\s*꼬리\s*:\s*/;

/**
 * 목록 줄은 한 항목, 빈 줄로 나뉜 문단도 한 항목.
 * 들여쓴 줄은 바로 앞 항목에 이어 붙인다(목록 항목이 두 줄로 이어질 때).
 */
export function items(lines: string[]): string[] {
  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(para.join('\n').trim());
    para = [];
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^- /.test(line)) {
      flush();
      para.push(line.slice(2));
    } else if (/^\s/.test(line) && para.length) {
      para.push(line.trim());
    } else {
      para.push(line);
    }
  }
  flush();
  return out.filter(Boolean);
}

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
  const dropped: string[] = [];
  let sawDeep = false;
  /** 지금 어느 ### 아래인지. 면접 질문 절 안의 #### 만 질문으로 친다. */
  let section: string | null = null;

  const nonEmpty = (chunk: string[]) => chunk.filter((l) => l.trim());

  for (let i = 0; i < heads.length; i++) {
    const { level, title } = heads[i];
    const chunk = sliceAfter(i);

    if (level === 2) {
      section = null;
      if (title === '개념') concept = chunk.join('\n').trim();
      else if (title === '왜 나왔나') why = chunk.join('\n').trim();
      else if (title === '심화') {
        sawDeep = true;
        // `## 심화` 바로 아래 글은 어느 절에도 안 속한다.
        dropped.push(...nonEmpty(chunk));
      } else dropped.push(`## ${title}`, ...nonEmpty(chunk));
    } else if (level === 3) {
      section = DEEP_SECTIONS.has(title) ? title : null;
      if (title === '내부 구조') deep.internals = items(chunk);
      else if (title === '실제 활용') deep.usage = items(chunk);
      else if (title === '면접 질문') {
        // 질문은 #### 로 쓴다. `- Q.` 같은 다른 형식은 안 읽히니 누락으로 잡는다.
        dropped.push(...nonEmpty(chunk));
      } else dropped.push(`### ${title}`, ...nonEmpty(chunk));
    } else if (level === 4) {
      if (section !== '면접 질문') {
        dropped.push(`#### ${title}`, ...nonEmpty(chunk));
        continue;
      }
      // 답변은 꼬리 질문 앞까지.
      const follow = chunk.filter((l) => FOLLOW.test(l)).map((l) => l.replace(FOLLOW, '').trim());
      const a = chunk
        .filter((l) => !FOLLOW.test(l))
        .join('\n')
        .trim();
      deep.interview.push({ q: title, a, follow });
    }
  }

  const hasDeep = sawDeep && (deep.internals.length || deep.usage.length || deep.interview.length);
  return { concept, why, deep: hasDeep ? deep : null, dropped };
}
