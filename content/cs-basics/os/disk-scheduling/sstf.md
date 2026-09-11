---
id: sstf
title: SSTF
order: 2
card:
  one_line: 현재 헤드에서 가장 가까운 요청부터
  analogy: ''
  keywords: []
flow:
  prev: { id: disk-fcfs, reason: 헤드가 너무 왔다갔다해서 }
  next: { id: scan, reason: 먼 요청이 굶어서 }
---

## 왜 나왔나

이동 거리는 줄지만 멀리 있는 요청은 계속 밀리는 기아가 생긴다.
