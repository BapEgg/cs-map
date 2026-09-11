---
id: nru
title: NRU
order: 5
card:
  one_line: 최근에 참조되지 않은 페이지를 교체 (참조·변경 비트)
  analogy: ''
  keywords: []
flow:
  prev: { id: lru, reason: 정확한 기록이 비싸서 }
---

## 왜 나왔나

LRU처럼 정확한 시간을 기록하는 건 비싸서, 비트 두 개로 대략적으로 판단한다.
