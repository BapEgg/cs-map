/**
 * 내 메모와 퀴즈 기록의 저장소.
 *
 * 지금은 브라우저에만 저장한다. 나중에 로그인 + DB로 옮길 수 있게 **인터페이스로 분리**한다.
 * 화면 쪽은 `StudyStore`만 알고 localStorage를 직접 건드리지 않는다.
 */

export interface ConceptNote {
  /** 자유 메모. */
  text: string;
  /** 내 말로 다시 쓴 한 줄 정의. */
  myLine: string;
  /** 헷갈림 표시. */
  unsure: boolean;
  updatedAt: string;
}

/** 퀴즈에서 떠올렸는지 여부. */
export interface QuizMark {
  known: boolean;
  at: string;
}

export interface StudyData {
  version: 1;
  notes: Record<string, ConceptNote>;
  marks: Record<string, QuizMark>;
  /** 최근에 본 개념. 최신이 앞. 다시 열었을 때 보던 자리로 돌아가는 데 쓴다. */
  recent: string[];
}

/** 최근 목록에 남기는 개수. 이보다 길면 "최근"이 아니다. */
export const RECENT_MAX = 12;

export interface StudyStore {
  load(): StudyData;
  /** 저장에 성공했는지. 사생활 보호 모드나 용량 초과로 실패할 수 있고, 그건 사용자가 알아야 한다. */
  save(data: StudyData): boolean;
}

export const EMPTY: StudyData = { version: 1, notes: {}, marks: {}, recent: [] };

export const emptyNote = (): ConceptNote => ({
  text: '',
  myLine: '',
  unsure: false,
  updatedAt: new Date().toISOString(),
});

export const isBlank = (n: ConceptNote | undefined): boolean =>
  !n || (!n.text.trim() && !n.myLine.trim() && !n.unsure);

/** 남이 만든 JSON일 수도 있으니 모양을 확인하고 받아들인다. */
export function normalize(raw: unknown): StudyData {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  const data = raw as Partial<StudyData>;
  const notes: StudyData['notes'] = {};
  const marks: StudyData['marks'] = {};

  for (const [id, value] of Object.entries(data.notes ?? {})) {
    if (!value || typeof value !== 'object') continue;
    const n = value as Partial<ConceptNote>;
    notes[id] = {
      text: typeof n.text === 'string' ? n.text : '',
      myLine: typeof n.myLine === 'string' ? n.myLine : '',
      unsure: n.unsure === true,
      updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : new Date().toISOString(),
    };
  }
  for (const [id, value] of Object.entries(data.marks ?? {})) {
    if (!value || typeof value !== 'object') continue;
    const m = value as Partial<QuizMark>;
    if (typeof m.known !== 'boolean') continue;
    marks[id] = { known: m.known, at: typeof m.at === 'string' ? m.at : new Date().toISOString() };
  }
  const recent = Array.isArray(data.recent)
    ? data.recent.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX)
    : [];
  return { version: 1, notes, marks, recent };
}

const KEY = 'csmap.study.v1';

export const localStore: StudyStore = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? normalize(JSON.parse(raw)) : { ...EMPTY };
    } catch {
      // 저장소를 막아둔 브라우저이거나 내용이 깨졌다. 빈 상태로 시작한다.
      return { ...EMPTY };
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch {
      // 저장을 못 해도 이번 세션 동안은 쓸 수 있어야 한다. 다만 조용히 넘어가지는 않는다.
      return false;
    }
  },
};

/** 내보내기용 파일 이름. */
export const exportName = () => `cs-map-메모-${new Date().toISOString().slice(0, 10)}.json`;

/**
 * 퀴즈 기록의 키. 기초 문제는 개념 id 그대로(예전 기록이 그대로 살아 있게),
 * 면접 문제는 `id#iv:<질문 해시>`로 따로 둔다. 한 개념에 면접 질문이 여럿이면
 * 같은 id로 저장할 때 서로 덮어썼고, 기초 기록까지 지웠다.
 */
export const conceptOf = (key: string): string => key.split('#')[0];

/** 짧은 해시. 질문 글이 같으면 순서를 바꿔도 같은 키가 나온다. */
export function shortHash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export const interviewKey = (id: string, question: string) =>
  `${id}#iv:${shortHash(question.trim())}`;

/**
 * 개념 하나로 묶은 기록. 지도의 점과 시작 화면의 "다시 볼 것"은 개념 단위로 본다.
 * 기초든 면접이든 **하나라도 헷갈렸으면 헷갈림**, 시각은 가장 최근 것.
 */
export function marksByConcept(marks: Record<string, QuizMark>): Record<string, QuizMark> {
  const out: Record<string, QuizMark> = {};
  for (const [key, m] of Object.entries(marks)) {
    const id = conceptOf(key);
    const prev = out[id];
    if (!prev) out[id] = { ...m };
    else out[id] = { known: prev.known && m.known, at: prev.at > m.at ? prev.at : m.at };
  }
  return out;
}
