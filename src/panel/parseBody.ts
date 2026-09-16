/**
 * 개념 마크다운 본문을 화면 구조로 가른다. 형식은 HANDOFF 5-2.
 *
 *   ## 개념 / ## 왜 나왔나 / ## 확인 질문 / ## 심화
 *   심화 아래 `### 아무 제목`이 순서대로 절이 되고, `### 면접 질문` 아래 `#### 질문`만 면접 문제다.
 *   다른 절의 `#### 소제목`은 그 절 안의 소제목(h4)이다.
 *
 * 절 안의 글은 블록으로 읽는다 — 문단, `- ` 목록, `| 표 |`, ``` 코드, ```diagram 관계도.
 * 파일에 적었는데 화면에 못 나가는 줄은 `dropped`에 모아 통합 테스트가 잡는다.
 */

export type Block =
  | { kind: 'p'; text: string }
  /** 절 안의 소제목(`####`). `### 면접 질문` 아래에서만 질문으로 읽히고, 다른 절에서는 소제목이다. */
  | { kind: 'h4'; text: string }
  | { kind: 'list'; items: string[]; ordered?: boolean }
  | { kind: 'table'; head: string[]; rows: string[][] }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'diagram'; edges: DiagramEdge[] };

/** `A -> B: 이유` 한 줄. */
export interface DiagramEdge {
  from: string;
  to: string;
  label: string;
}

export interface InterviewQuestion {
  q: string;
  a: string;
  /** 꼬리 질문. */
  follow: string[];
  /** 흔한 오답. `- 오답: …` 줄. 없으면 생략. */
  wrong?: string[];
}

/** 심화의 절 하나. 제목은 파일에 적은 그대로. */
export interface DeepSubsection {
  title: string;
  blocks: Block[];
}

export interface DeepSection {
  /** 면접 질문을 뺀 절들, 파일 순서대로. */
  sections: DeepSubsection[];
  interview: InterviewQuestion[];
}

/** 기초를 읽고 바로 풀어 보는 확인 질문. 답은 눌러서 본다. */
export interface CheckQuestion {
  q: string;
  a: string;
}

export interface ParsedBody {
  /** 기초 탭 맨 위. 무엇이고 어떻게 도는지. */
  concept: Block[];
  /** 기초 탭의 "왜 나왔나". */
  why: Block[];
  checks: CheckQuestion[];
  deep: DeepSection | null;
  /** 파일에는 있는데 화면에는 안 나갈 줄. */
  dropped: string[];
}

const FOLLOW = /^-\s*꼬리\s*:\s*/;
/** 흔한 오답. 답 아래 `- 오답: …` 줄. 무엇이 틀린 답인지 없으면 외운 답이 맞는지 스스로 못 가린다. */
const WRONG = /^-\s*오답\s*:\s*/;
const FENCE = /^```(\w*)\s*$/;
const EDGE = /^(.+?)\s*(?:->|→)\s*(.+?)\s*(?::\s*(.*))?$/;

/** 칸 나누기. 칸 안에 `\|`를 쓰면 글자 그대로의 세로줄이다. */
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .replace(/\\\|/g, '\uE001')
    .split('|')
    .map((c) => c.trim().replace(/\uE001/g, '|'));

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isSeparator = (line: string) =>
  /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

/** 관계도 줄 `A -> B: 이유`. 화살표가 없는 줄은 버린다(누락으로 올림). */
export function parseDiagram(lines: string[], dropped: string[] = []): DiagramEdge[] {
  const edges: DiagramEdge[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = EDGE.exec(line);
    if (!m) {
      dropped.push(raw);
      continue;
    }
    edges.push({ from: m[1], to: m[2], label: (m[3] ?? '').trim() });
  }
  return edges;
}

/**
 * 줄 묶음을 블록으로. 빈 줄이 문단을 가르고, `- `는 목록, `1. `은 번호 목록, `|`는 표, ```은 코드.
 * 목록 항목은 들여쓴 다음 줄까지 한 항목이다.
 */
export function parseBlocks(lines: string[], dropped: string[] = []): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  let ordered = false;

  const flushPara = () => {
    if (para.length) out.push({ kind: 'p', text: para.join('\n').trim() });
    para = [];
  };
  const flushList = () => {
    if (list?.length)
      out.push(
        ordered ? { kind: 'list', items: list, ordered: true } : { kind: 'list', items: list },
      );
    list = null;
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '');

    const h4 = /^####\s+(.*)$/.exec(line);
    if (h4) {
      flush();
      out.push({ kind: 'h4', text: h4[1].trim() });
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      if (fence[1] === 'diagram') out.push({ kind: 'diagram', edges: parseDiagram(body, dropped) });
      else out.push({ kind: 'code', lang: fence[1], code: body.join('\n') });
      continue;
    }

    if (isTableRow(line)) {
      flush();
      const rows: string[] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(lines[i++]);
      i--;
      const head = cells(rows[0]);
      const body = rows.slice(1).filter((r) => !isSeparator(r));
      out.push({ kind: 'table', head, rows: body.map(cells) });
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    const bullet = /^- /.test(line);
    const numbered = /^\d+\.\s/.test(line);
    if (bullet || numbered) {
      flushPara();
      // 번호 목록과 점 목록이 붙어 있으면 다른 목록이다.
      if (list && ordered !== numbered) flushList();
      list ??= [];
      ordered = numbered;
      list.push(line.replace(/^(- |\d+\.\s+)/, '').trim());
      continue;
    }
    if (list && /^\s/.test(line)) {
      // 목록 항목이 다음 줄로 이어짐
      list[list.length - 1] += '\n' + line.trim();
      continue;
    }
    flushList();
    para.push(line);
  }
  flush();
  return out;
}

/** `## 확인 질문` 아래 `- 질문` + 들여쓴 `답: …`. */
function parseChecks(lines: string[], dropped: string[]): CheckQuestion[] {
  const out: CheckQuestion[] = [];
  for (const block of parseBlocks(lines, dropped)) {
    if (block.kind !== 'list') {
      dropped.push(...describe(block));
      continue;
    }
    for (const item of block.items) {
      const [q, ...rest] = item.split(/\n답\s*:\s*/);
      const a = rest.join('\n').trim();
      if (!a) {
        dropped.push(`- ${item}`);
        continue;
      }
      out.push({ q: q.replace(/^(설명해 보기|다음 상태 예측(하기)?)\s*:\s*/, '$1: ').trim(), a });
    }
  }
  return out;
}

const describe = (b: Block): string[] => {
  if (b.kind === 'p') return b.text.split('\n');
  if (b.kind === 'list') return b.items.map((x) => `- ${x}`);
  if (b.kind === 'table') return [`| ${b.head.join(' | ')} |`];
  if (b.kind === 'code') return ['```' + b.lang];
  return ['```diagram'];
};

export function parseBody(body: string): ParsedBody {
  const lines = body.split(/\r?\n/);

  // 제목 줄 위치를 먼저 찾아 구간으로 자른다. 코드 블록 안의 #은 제목이 아니다.
  const heads: { level: number; title: string; at: number }[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^```/.test(line)) inFence = !inFence;
    if (inFence) return;
    const m = /^(#{2,4})\s+(.*)$/.exec(line);
    if (m) heads.push({ level: m[1].length, title: m[2].trim(), at: i });
  });

  /** 이 제목 아래 글. 소제목(####)까지 품으려면 `upTo`를 3으로 — 다음 ##/### 앞까지 자른다. */
  const sliceAfter = (index: number, upTo = 4) => {
    const start = heads[index].at + 1;
    let end = lines.length;
    for (let j = index + 1; j < heads.length; j++) {
      if (heads[j].level <= upTo) {
        end = heads[j].at;
        break;
      }
    }
    return lines.slice(start, end);
  };

  let concept: Block[] = [];
  let why: Block[] = [];
  let checks: CheckQuestion[] = [];
  const deep: DeepSection = { sections: [], interview: [] };
  const dropped: string[] = [];
  let sawDeep = false;
  /** 지금 어느 ## / ### 아래인지. */
  let top: string | null = null;
  let section: string | null = null;

  const nonEmpty = (chunk: string[]) => chunk.filter((l) => l.trim());

  for (let i = 0; i < heads.length; i++) {
    const { level, title } = heads[i];
    const chunk = sliceAfter(i);

    if (level === 2) {
      top = title;
      section = null;
      // 기초 절도 #### 소제목(예시·작동 과정·비교)을 품는다 — 다음 ##/### 앞까지.
      if (title === '개념') concept = parseBlocks(sliceAfter(i, 3), dropped);
      else if (title === '왜 나왔나') why = parseBlocks(sliceAfter(i, 3), dropped);
      else if (title === '확인 질문') checks = parseChecks(chunk, dropped);
      else if (title === '심화') {
        sawDeep = true;
        // `## 심화` 바로 아래 글은 어느 절에도 안 속한다.
        dropped.push(...nonEmpty(chunk));
      } else dropped.push(`## ${title}`, ...nonEmpty(chunk));
    } else if (level === 3) {
      if (top !== '심화') {
        dropped.push(`### ${title}`, ...nonEmpty(chunk));
        continue;
      }
      section = title;
      if (title === '면접 질문') {
        // 질문은 #### 로 쓴다. 다른 형식은 안 읽히니 누락으로 잡는다.
        dropped.push(...nonEmpty(chunk));
      } else deep.sections.push({ title, blocks: parseBlocks(sliceAfter(i, 3), dropped) });
    } else if (level === 4) {
      // 면접 질문 절 밖의 ####는 위에서 소제목으로 이미 읽었다.
      if (section !== '면접 질문') continue;
      // 답변은 꼬리 질문 앞까지.
      const follow = chunk.filter((l) => FOLLOW.test(l)).map((l) => l.replace(FOLLOW, '').trim());
      const wrong = chunk.filter((l) => WRONG.test(l)).map((l) => l.replace(WRONG, '').trim());
      const a = chunk
        .filter((l) => !FOLLOW.test(l) && !WRONG.test(l))
        .join('\n')
        .trim();
      deep.interview.push({ q: title, a, follow, ...(wrong.length ? { wrong } : {}) });
    }
  }

  const hasDeep = sawDeep && (deep.sections.length || deep.interview.length);
  return { concept, why, checks, deep: hasDeep ? deep : null, dropped };
}
