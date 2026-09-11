---
id: fifo
title: FIFO
order: 1
card:
  one_line: 가장 먼저 들어온 페이지를 교체
  analogy: ''
  keywords: []
flow:
  next: { id: lru, reason: 오래됐어도 자주 쓸 수 있어서 }
---

## 왜 나왔나

**구현이 가장 쉽다**. 하지만 오래됐어도 자주 쓰는 페이지를 내보낼 수 있고, 프레임을 늘려도 폴트가 느는 벨라디의 모순이 생긴다.
