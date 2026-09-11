---
id: non-preemptive
title: 비선점형
order: 1
card:
  one_line: 한번 CPU를 잡으면 끝날 때까지 놓지 않는 방식
  analogy: ''
  keywords: []
flow:
  next: { id: preemptive, reason: 긴 작업이 CPU를 독점해서 }
---

## 왜 나왔나

구현이 단순하고 문맥 교환이 적다. 대신 긴 작업이 CPU를 잡으면 **짧은 작업들이 한참 기다린다**.
