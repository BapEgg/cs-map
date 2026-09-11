---
id: nru
title: NRU
order: 5
card:
  one_line: 'NRU는 참조 비트와 변경 비트를 보고 최근에 안 쓰인 페이지를 내보내는 교체 방식이다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: lru, reason: 정확한 기록이 비싸서 }
---

## 왜 나왔나

LRU처럼 정확한 시간을 기록하는 건 비싸서, 비트 두 개로 대략적으로 판단한다.
