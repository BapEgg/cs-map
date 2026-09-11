/**
 * 일회성 변환 스크립트. `docs/prototype/cs-map-v3.html` 안의 데이터를 content/ 마크다운으로 옮긴다.
 *
 *   node scripts/import-prototype.mjs
 *
 * 이미 있는 과목 _index.md는 건드리지 않는다(5갈래 뼈대는 손으로 잡았다).
 * 그 아래 자식 노드와 용어 사전만 새로 쓴다. 여러 번 돌려도 결과가 같다.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = join(ROOT, 'docs/prototype/cs-map-v3.html');
const CONTENT = join(ROOT, 'content');

/** 프로토타입의 가지 → content/ 안의 자리. 이 4개 루트 자체는 이미 있으므로 안 쓴다. */
const SUBTREES = {
  arch: 'cs-basics/computer-arch',
  os: 'cs-basics/os',
  prog: 'service-dev/program-dev',
  svc: 'service-dev/stages',
};

/**
 * 짧고 알아보기 힘든 id를 풀어 쓴다. 옵시디언에서 파일 이름으로 보이는 값이라
 * `np.md`보다 `non-preemptive.md`가 낫다. 여기 없는 id는 그대로 쓴다.
 */
const RENAME = {
  vn: 'von-neumann',
  reg: 'register',
  mem: 'main-memory',
  proc: 'process-and-thread',
  ctx: 'context-switch',
  cpusched: 'cpu-scheduling',
  np: 'non-preemptive',
  pre: 'preemptive',
  rr: 'round-robin',
  mlq: 'multilevel-queue',
  mlfq: 'multilevel-feedback-queue',
  memmgmt: 'memory-management',
  seg: 'segmentation',
  vm: 'virtual-memory',
  replace: 'page-replacement',
  disksched: 'disk-scheduling',
  dfcfs: 'disk-fcfs',
  cscan: 'c-scan',
  func: 'function',
  cls: 'class',
  obj: 'object',
  pkg: 'package',
  comp: 'component',
  plan: 'planning',
  dev: 'development',
  fe: 'frontend',
  be: 'backend',
  db: 'db-build',
  vcs: 'source-control',
  maint: 'maintenance',
  monet: 'monetization',
};

/** 이론 ↔ 실무 교차 링크. HANDOFF 5-6. 지금 존재하는 노드끼리만 건다. */
const SEE_ALSO = {
  'db-build': ['database'],
  api: ['backend'],
};

const id = (old) => RENAME[old] ?? old;

// ── 프로토타입에서 데이터 꺼내기 ───────────────────────────
const html = readFileSync(HTML, 'utf8');

/** `const NAME = <여기>;` 의 균형 잡힌 리터럴을 통째로 잘라낸다. */
function extract(name) {
  const start = html.indexOf(`const ${name} = `);
  if (start === -1) throw new Error(`${name}을 못 찾았다`);
  let i = html.indexOf('=', start) + 1;
  while (' \t\n'.includes(html[i])) i++;
  const open = html[i];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let inStr = null;
  for (let j = i; j < html.length; j++) {
    const c = html[j];
    if (inStr) {
      if (c === '\\') j++;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') inStr = c;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) {
      return new Function(`return ${html.slice(i, j + 1)}`)();
    }
  }
  throw new Error(`${name}의 끝을 못 찾았다`);
}

const RAW = extract('RAW');
const DEEP = extract('DEEP');
const GLOSS = extract('GLOSS');

// ── 트리 세우기 ────────────────────────────────────────────
const N = {};
for (const [oldId, title, oneLine, why, kids = [], edges = []] of RAW) {
  N[oldId] = { oldId, title, oneLine, why, kids, edges };
}
for (const n of Object.values(N)) {
  for (const k of n.kids) {
    if (N[k]) N[k].parent = n.oldId;
  }
}

/** 흐름 화살표는 부모에 [from, to, 이유]로 저장돼 있다. 각 노드의 prev/next로 옮긴다. */
for (const n of Object.values(N)) {
  for (const [from, to, reason] of n.edges) {
    if (!N[from] || !N[to]) continue;
    (N[from].next ??= []).push({ id: id(to), reason });
    (N[to].prev ??= []).push({ id: id(from), reason });
  }
}

// ── 마크다운 만들기 ────────────────────────────────────────
const q = (s) => {
  const t = String(s);
  // YAML에서 뜻이 달라지는 글자가 있으면 따옴표로 감싼다.
  return /^[\s>|*&!%@`-]|[:#]\s|["'{}[\],]|\s$/.test(t) ? `'${t.replace(/'/g, "''")}'` : t;
};

const flowLine = (label, refs) => {
  if (!refs?.length) return '';
  if (refs.length === 1) return `  ${label}: { id: ${refs[0].id}, reason: ${q(refs[0].reason)} }\n`;
  return (
    `  ${label}:\n` + refs.map((r) => `    - { id: ${r.id}, reason: ${q(r.reason)} }\n`).join('')
  );
};

function frontmatter(n, order) {
  const deep = DEEP[n.oldId];
  let fm = `---\nid: ${id(n.oldId)}\ntitle: ${q(n.title)}\norder: ${order}\n`;
  fm += `card:\n  one_line: ${q(n.oneLine)}\n`;
  // 비유와 키워드는 프로토타입에 없다. 콘텐츠 작업(M3) 때 채운다.
  fm += `  analogy: ''\n  keywords: []\n`;
  const flow = flowLine('prev', n.prev) + flowLine('next', n.next);
  if (flow) fm += `flow:\n${flow}`;
  const see = SEE_ALSO[id(n.oldId)];
  if (see) fm += `see_also: [${see.join(', ')}]\n`;
  if (deep?.checked) fm += `checked: ${q(deep.checked)}\n`;
  return fm + '---\n';
}

function body(n) {
  const deep = DEEP[n.oldId];
  let out = `\n## 왜 나왔나\n\n${n.why}\n`;
  if (!deep) return out;

  out += '\n## 심화\n';
  if (deep.ins?.length) {
    out += '\n### 내부 구조\n\n' + deep.ins.map((s) => `- ${s}`).join('\n') + '\n';
  }
  if (deep.use?.length) {
    out += '\n### 실제 활용\n\n' + deep.use.map((s) => `- ${s}`).join('\n') + '\n';
  }
  if (deep.iv?.length) {
    out += '\n### 면접 질문\n';
    for (const { q: question, a, f = [] } of deep.iv) {
      out += `\n#### ${question}\n\n${a}\n`;
      if (f.length) out += '\n' + f.map((t) => `- 꼬리: ${t}`).join('\n') + '\n';
    }
  }
  return out;
}

const written = [];
function write(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf8');
  written.push(path.slice(CONTENT.length + 1).replace(/\\/g, '/'));
}

/** 가지 하나를 폴더로 펼친다. 자식이 있으면 폴더+_index.md, 없으면 파일 하나. */
function emit(oldId, dir, order) {
  const n = N[oldId];
  const has = n.kids.length > 0;
  const path = has
    ? join(CONTENT, dir, id(oldId), '_index.md')
    : join(CONTENT, dir, `${id(oldId)}.md`);
  write(path, frontmatter(n, order) + body(n));
  if (has) {
    n.kids.forEach((k, i) => emit(k, join(dir, id(oldId)), i + 1));
  }
}

// 과목 루트는 손으로 잡아둔 게 있으니 자식들만 새로 쓴다.
for (const [rootOld, dir] of Object.entries(SUBTREES)) {
  const abs = join(CONTENT, dir);
  // 이전에 돌린 결과를 지우고 다시 쓴다(과목 _index.md는 남긴다).
  for (const child of N[rootOld].kids) {
    const asFile = join(abs, `${id(child)}.md`);
    const asDir = join(abs, id(child));
    if (existsSync(asFile)) rmSync(asFile);
    if (existsSync(asDir)) rmSync(asDir, { recursive: true });
  }
  N[rootOld].kids.forEach((k, i) => emit(k, dir, i + 1));
}

// ── 용어 사전 ──────────────────────────────────────────────
const slug = (s) =>
  s
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const glossDir = join(CONTENT, 'glossary');
if (existsSync(glossDir)) rmSync(glossDir, { recursive: true });

const seen = new Set();
for (const [term, aliases = [], text, link = null, scope = []] of GLOSS) {
  let name = slug(term);
  while (seen.has(name)) name += '-2';
  seen.add(name);
  let fm = `---\nterm: ${q(term)}\n`;
  if (aliases.length) fm += `aliases: [${aliases.map(q).join(', ')}]\n`;
  fm += `link: ${link ? id(link) : 'null'}\n`;
  // 프로토타입 스코프에 'FCFS', 'RR' 같은 대문자가 섞여 있다. 노드 id는 전부 소문자다.
  if (scope.length) fm += `scope: [${scope.map((s) => id(String(s).toLowerCase())).join(', ')}]\n`;
  fm += '---\n';
  write(join(glossDir, `${name}.md`), `${fm}\n${text}\n`);
}

console.log(`${written.length}개 파일을 썼다.`);
console.log(`  개념 ${written.filter((p) => !p.startsWith('glossary/')).length}개`);
console.log(`  용어 ${written.filter((p) => p.startsWith('glossary/')).length}개`);
