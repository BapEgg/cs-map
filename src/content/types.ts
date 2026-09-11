/** 이론 트랙(cs)인지 실무 트랙(dev)인지. 뱃지와 색 계열에 쓴다. */
export type Track = 'cs' | 'dev';

/** 한 줄 정의 3줄 카드. 규칙은 HANDOFF 5-4. */
export interface ConceptCard {
  /** 25자 안팎. 분류어로 맺는다. 형광펜(**)은 핵심어 1개만. */
  one_line: string;
  /** 일상 사물 한 문장. */
  analogy?: string;
  /** 3개 안팎. 퀴즈에서 가리고 떠올리기용. */
  keywords?: string[];
}

/** 흐름 화살표 한 칸. "이것 —이유→ 다음" */
export interface FlowRef {
  id: string;
  reason: string;
}

/** 마크다운 frontmatter에 들어가는 것 전부. */
export interface ConceptMeta {
  id: string;
  title: string;
  /** 형제들 사이 순서. 없으면 제목순. */
  order?: number;
  track?: Track;
  card?: ConceptCard;
  flow?: { prev?: FlowRef; next?: FlowRef };
  /** 비교표로 묶을 형제들. */
  compare?: string[];
  /** 이론 ↔ 실무 교차 링크. HANDOFF 5-6. */
  see_also?: string[];
  /** 시각화 id. */
  sim?: string;
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
}

/** 트리 노드가 아닌 용어 사전 항목. */
export interface GlossaryEntry {
  term: string;
  aliases?: string[];
  /** 트리 개념이면 그 id. 아니면 null. */
  link?: string | null;
  /** 자동 링크의 문맥 스코프. 가까운 쪽을 우선한다. HANDOFF 5-3. */
  scope?: string;
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
