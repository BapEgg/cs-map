import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTree } from '../content/buildTree';
import { buildQuestions, descendants, pickSession, shuffle, type Question } from './buildQuestions';

function readAll(dir: string, prefix = '', out: Record<string, string> = {}) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) readAll(join(dir, entry.name), rel, out);
    else if (entry.name.endsWith('.md')) out[rel] = readFileSync(join(dir, entry.name), 'utf8');
  }
  return out;
}

const tree = buildTree(readAll(join(process.cwd(), 'content')));

describe('퀴즈 문제 만들기', () => {
  it('고른 가지 안에서만 낸다', () => {
    const ids = new Set(descendants(tree, 'memory-management'));
    expect(ids.has('paging')).toBe(true);
    expect(ids.has('lru')).toBe(true); // 손자까지 들어간다
    expect(ids.has('fcfs')).toBe(false); // 다른 가지
  });

  it('기초 문제는 한 줄 정의를 답으로 쓴다', () => {
    const qs = buildQuestions(tree, 'memory-management', 'basic');
    const paging = qs.find((q) => q.id === 'paging')!;
    expect(paging.answer).toContain('페이지');
    expect(paging.title).toBe('페이징');
    expect(paging.path).toContain('운영체제');
  });

  it('한 줄 정의가 없으면 기초 문제로 안 낸다', () => {
    const qs = buildQuestions(tree, 'cs', 'basic');
    expect(qs.every((q) => q.answer.trim().length > 0)).toBe(true);
  });

  it('면접 문제는 심화에 적어둔 질문에서 나온다', () => {
    const qs = buildQuestions(tree, 'memory-management', 'interview');
    expect(qs.length).toBeGreaterThan(0);
    const one = qs.find((q) => q.id === 'paging')!;
    expect(one.prompt).toContain('세그멘테이션');
    expect(one.answer.length).toBeGreaterThan(10);
    expect(one.follow.length).toBeGreaterThan(0);
  });

  it('심화가 없는 가지는 면접 문제가 없다', () => {
    expect(buildQuestions(tree, 'computer-arch', 'interview').every((q) => q.answer)).toBe(true);
  });

  it('전체 범위면 문제가 꽤 많다', () => {
    expect(buildQuestions(tree, 'cs', 'basic').length).toBeGreaterThan(50);
  });

  it('작성 예정·뿌리·다섯 갈래·quiz: false는 안 낸다', () => {
    const ids = new Set(buildQuestions(tree, 'cs', 'basic').map((q) => q.id));
    expect(ids.has('cs')).toBe(false);
    expect(ids.has('cs-basics')).toBe(false);
    expect(ids.has('java')).toBe(false); // 작성 예정이기도 하다
    expect(ids.has('paging')).toBe(true);
    for (const id of ids) expect(tree.byId[id].isStub).toBe(false);
  });

  it('면접 문제는 질문마다 기록 키가 다르고, 기초 기록과도 겹치지 않는다', () => {
    const iv = buildQuestions(tree, 'cs', 'interview');
    const keys = iv.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.every((k, i) => k.startsWith(`${iv[i].id}#iv:`))).toBe(true);
    const basic = new Set(buildQuestions(tree, 'cs', 'basic').map((q) => q.key));
    expect(keys.some((k) => basic.has(k))).toBe(false);
  });

  it('섞어도 문제가 늘거나 줄지 않는다', () => {
    const qs = buildQuestions(tree, 'memory-management', 'basic');
    let seed = 1;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const mixed = shuffle(qs, rand);
    expect(mixed).toHaveLength(qs.length);
    expect(new Set(mixed.map((q) => q.id))).toEqual(new Set(qs.map((q) => q.id)));
  });
});

describe('pickSession', () => {
  const q = (id: string): Question => ({
    id,
    key: id,
    kind: 'basic',
    title: id,
    path: [],
    prompt: '',
    answer: 'a',
    keywords: [],
    follow: [],
  });
  const never = () => 0.5;

  it('헷갈린 것 → 안 본 것 → 기억난 것 순으로 낸다', () => {
    const all = [q('known'), q('fresh'), q('unsure')];
    const marks = {
      known: { known: true, at: '2026-01-01T00:00:00.000Z' },
      unsure: { known: false, at: '2026-01-01T00:00:00.000Z' },
    };
    expect(pickSession(all, marks, 3, never).map((x) => x.id)).toEqual([
      'unsure',
      'fresh',
      'known',
    ]);
  });

  it('기억난 것끼리는 오래된 순으로', () => {
    const all = [q('new'), q('old')];
    const marks = {
      new: { known: true, at: '2026-09-01T00:00:00.000Z' },
      old: { known: true, at: '2026-01-01T00:00:00.000Z' },
    };
    expect(pickSession(all, marks, 2, never).map((x) => x.id)).toEqual(['old', 'new']);
  });

  it('한 번에 정해진 개수만 낸다', () => {
    const all = Array.from({ length: 40 }, (_, i) => q(`q${i}`));
    expect(pickSession(all, {}, 10, never)).toHaveLength(10);
    // 낼 게 모자라면 있는 만큼만
    expect(pickSession(all.slice(0, 3), {}, 10, never)).toHaveLength(3);
  });
});
