import { parseBody } from '../panel/parseBody';
import type { ContentTree } from '../content/types';

export type QuizKind = 'basic' | 'interview';

export interface Question {
  /** 개념 id. 퀴즈 기록도 이 id로 남는다. */
  id: string;
  kind: QuizKind;
  title: string;
  /** 어디에 있는 개념인지. 화면에 경로로 보여준다. */
  path: string[];
  /** 면접 문제의 질문. 기초 문제는 비어 있다(제목이 곧 문제다). */
  prompt: string;
  /** 가렸다가 공개할 내용. */
  answer: string;
  /** 기초 문제에서 떠올려야 할 키워드. */
  keywords: string[];
  /** 면접 문제의 꼬리 질문. */
  follow: string[];
}

/** 그 가지에 속한 개념 전부(자기 자신 포함). */
export function descendants(tree: ContentTree, rootId: string): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    if (!tree.byId[id]) return;
    out.push(id);
    for (const child of tree.byId[id].childIds) walk(child);
  };
  walk(rootId);
  return out;
}

const titlePath = (tree: ContentTree, id: string): string[] => {
  const trail: string[] = [];
  let cursor: string | null = id;
  while (cursor) {
    const node: ContentTree['byId'][string] | undefined = tree.byId[cursor];
    if (!node) break;
    trail.unshift(node.title);
    cursor = node.parentId;
  }
  return trail.slice(1, -1); // 루트와 자기 자신은 뺀다
};

/**
 * 고른 범위에서 문제를 만든다.
 *
 * - 기초: 제목만 보여주고 한 줄 정의를 가린다. 떠올린 뒤 공개한다.
 * - 면접: 심화에 적어둔 면접 질문 중에서 낸다.
 */
export function buildQuestions(tree: ContentTree, scopeId: string, kind: QuizKind): Question[] {
  const out: Question[] = [];

  for (const id of descendants(tree, scopeId)) {
    const node = tree.byId[id];
    if (kind === 'basic') {
      const answer = node.card?.one_line?.trim();
      if (!answer) continue;
      out.push({
        id,
        kind,
        title: node.title,
        path: titlePath(tree, id),
        prompt: '',
        answer,
        keywords: node.card?.keywords ?? [],
        follow: [],
      });
    } else {
      for (const qa of parseBody(node.body).deep?.interview ?? []) {
        out.push({
          id,
          kind,
          title: node.title,
          path: titlePath(tree, id),
          prompt: qa.q,
          answer: qa.a,
          keywords: [],
          follow: qa.follow,
        });
      }
    }
  }

  return out;
}

/** 문제 순서를 섞는다. 매번 같은 순서면 순서로 외워버린다. */
export function shuffle<T>(list: T[], random: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
