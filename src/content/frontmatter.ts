import { load } from 'js-yaml';

export interface Parsed {
  data: Record<string, unknown>;
  body: string;
}

const BOM = 0xfeff;
const FENCE = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

/**
 * `---`로 감싼 YAML 머리말과 본문을 가른다.
 * gray-matter는 Node 전용이라 브라우저에서 못 쓴다. js-yaml은 브라우저에서 돈다.
 */
export function parseFrontmatter(raw: string): Parsed {
  // 옵시디언이나 메모장이 BOM을 붙여 저장하면 머리말 매칭이 통째로 어긋난다.
  const text = raw.charCodeAt(0) === BOM ? raw.slice(1) : raw;
  const m = FENCE.exec(text);
  if (!m) return { data: {}, body: text.trim() };

  const parsed = load(m[1]);
  const data =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  return { data, body: (m[2] ?? '').trim() };
}
