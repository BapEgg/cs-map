/** 이론 트랙(cs)인지 실무 트랙(dev)인지. 뱃지와 색 계열에 쓴다. */
export type Track = 'cs' | 'dev';

/** 한 줄 정의 3줄 카드. 규칙은 HANDOFF 5-4. */
export interface ConceptCard {
  /** 25자 안팎. 분류어로 맺는다. 형광펜(**)은 핵심어 1개만. */
  one_line: string;
  /** 일상 사물 한 문장. */
  analogy?: string;
  /** 비유가 안 통하는 데. 비유 바로 옆에 한 줄로 보여 비유가 만든 오해를 그 자리에서 걷는다. */
  analogy_limit?: string;
  /** 3개 안팎. 퀴즈에서 가리고 떠올리기용. */
  keywords?: string[];
}

/** 흐름 화살표 한 칸. "이것 —이유→ 다음" */
export interface FlowRef {
  id: string;
  reason: string;
}

/**
 * frontmatter에서는 하나만 쓸 때 `next: { id: x, reason: y }`로 써도 되고
 * 여러 개일 때는 배열로 써도 된다. 로더가 배열로 맞춘다.
 * (한 개념으로 여러 갈래가 흘러들 수 있다. 예: FIFO도 OPT도 LRU로 이어진다.)
 */
export type FlowField = FlowRef | FlowRef[];

/** 마크다운 frontmatter에 들어가는 것 전부. */
export interface ConceptMeta {
  id: string;
  title: string;
  /**
   * 본문에서 이 개념을 부르는 다른 이름. 자동 링크가 이것도 잡는다.
   * 제목만으로는 안 걸리는 경우에 쓴다. 예: `FCFS (디스크)`는 본문에서 그냥 `FCFS`라고 쓴다.
   */
  aliases?: string[];
  /** 형제들 사이 순서. 없으면 제목순. */
  order?: number;
  track?: Track;
  card?: ConceptCard;
  /** 비교표로 묶을 형제들. */
  compare?: string[];
  /** 이론 ↔ 실무 교차 링크. HANDOFF 5-6. */
  see_also?: string[];
  /** 시각화 id. */
  sim?: string;
  /** `false`면 퀴즈에 안 낸다. 묶음 이름만 있는 분류용 노드에 쓴다. */
  quiz?: boolean;
  /** 사실 확인한 연월. 심화 내용에 남긴다. */
  checked?: string;
  sources?: string[];
}

/** 트리에 올라간 개념 하나. */
export interface ConceptNode extends ConceptMeta {
  /** content/ 기준 경로. 예: cs-basics/os/paging.md */
  path: string;
  /** frontmatter를 뺀 본문. */
  body: string;
  /** 루트가 0. */
  depth: number;
  parentId: string | null;
  childIds: string[];
  /** 이 개념으로 흘러든 갈래. frontmatter의 `flow.prev`를 배열로 맞춘 것. */
  flowPrev: FlowRef[];
  /** 이 개념에서 뻗어 나가는 갈래. */
  flowNext: FlowRef[];
  /** 본문에 `## 심화`가 있는지. 트리 뱃지에 쓴다. */
  hasDeep: boolean;
  /** 아직 내용을 안 쓴 개념. 열어봤자 "작성 예정"만 있으니 미리 알려준다. */
  isStub: boolean;
}

/** 트리 노드가 아닌 용어 사전 항목. */
export interface GlossaryEntry {
  term: string;
  aliases?: string[];
  /** 트리 개념이면 그 id. 아니면 null. */
  link?: string | null;
  /**
   * 이 용어가 통하는 가지들의 노드 id. 자동 링크가 문맥을 무시하는 걸 막는다.
   * 예: 디스크 스케줄링 문맥의 FCFS가 CPU 스케줄링의 FCFS로 연결되면 안 된다. HANDOFF 5-3.
   */
  scope?: string[];
  sim?: string;
  body: string;
}

export interface ContentTree {
  rootId: string;
  byId: Record<string, ConceptNode>;
  glossary: GlossaryEntry[];
  /** 로더가 발견한 문제. 개발 중 화면에 띄운다. */
  problems: string[];
}
