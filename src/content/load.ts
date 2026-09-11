import { buildTree } from './buildTree';
import type { ContentTree } from './types';

const modules = import.meta.glob('/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

let cached: ContentTree | null = null;

/** content/ 전체를 읽어 트리로 만든다. 결과는 한 번만 만든다. */
export function loadContent(): ContentTree {
  if (cached) return cached;
  const files: Record<string, string> = {};
  for (const [key, raw] of Object.entries(modules)) {
    files[key.replace(/^\/content\//, '')] = raw;
  }
  cached = buildTree(files);
  return cached;
}
