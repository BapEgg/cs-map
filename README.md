# cs-map · CS 지식 지도

CS 기초부터 실무까지를 하나의 지도로 모아, 클릭해서 파고들고 애니메이션으로 동작을 보며 외우는 웹앱.

- **전체 맥락**: [`docs/HANDOFF.md`](docs/HANDOFF.md)
- **작업 지침**: [`CLAUDE.md`](CLAUDE.md)
- **원본 손필기**: `docs/reference/`
- **초기 프로토타입**: `docs/prototype/cs-map-v3.html` (브라우저로 바로 열림)

## 명령어

```bash
npm install      # 처음 한 번
npm run dev      # 개발 서버
npm run build    # 타입 검사 + 빌드
npm test         # 테스트
npm run lint     # 린트
npm run format   # 포맷
```

## 구조

```
content/    개념 1개 = 마크다운 1개. 폴더 구조가 곧 트리 구조다. 옵시디언으로 편집할 수 있다.
src/
  content/  마크다운 → 트리로 만드는 로더
  theme/    라이트/다크/시스템 테마
  styles/   색 토큰. 색은 여기서만 정한다.
docs/       인계서, 원본 자료, 프로토타입
```

**코드와 콘텐츠를 섞지 않는다.** 개념 텍스트를 컴포넌트에 하드코딩하지 않는다.

## 콘텐츠 쓰는 법

폴더를 만들고 그 안에 `_index.md`를 두면 그 폴더가 트리의 한 노드가 된다.
같은 폴더의 다른 `.md`는 그 노드의 자식이 된다.

```markdown
---
id: paging # 전체에서 유일한 영문 kebab-case
title: 페이징
order: 2 # 형제들 사이 순서
track: cs # cs(이론) | dev(실무)
card:
  one_line: 메모리를 **같은 크기 칸**으로 잘라 나눠 주는 방법
  analogy: 주차장에 같은 크기 칸을 그어두면 빈칸 어디든 댈 수 있다
  keywords: [고정 크기, 외부 단편화 없음, 페이지 테이블]
flow:
  prev: { id: segmentation, reason: 빈 공간이 조각나서 }
  next: { id: virtual-memory, reason: 더 큰 프로그램도 돌리려고 }
see_also: [jvm-memory] # 이론 ↔ 실무 교차 링크
checked: 2026-09
sources:
  - 'Operating System Concepts (Silberschatz 외)'
---

## 왜 나왔나

...
```

작성 규칙(한 줄 25자 안팎, 비유, 키워드 3개)은 `docs/HANDOFF.md` 5-4를 따른다.
빠진 필드나 끊어진 참조는 개발 화면 아래쪽에 목록으로 뜬다.
