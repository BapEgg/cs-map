---
id: cpu-scheduling
title: CPU 스케줄링
order: 2
card:
  one_line: 어떤 프로세스에게 CPU를 줄지 정하는 규칙
  analogy: ''
  keywords: []
flow:
  prev: { id: process-and-thread, reason: CPU를 나눠 쓰려면 }
  next: { id: memory-management, reason: 메모리도 나눠야 해서 }
---

## 왜 나왔나

CPU는 하나인데 실행하고 싶은 프로세스는 여럿이다. **누구에게 먼저, 얼마나 주느냐**에 따라 대기 시간과 공평함이 달라진다.
