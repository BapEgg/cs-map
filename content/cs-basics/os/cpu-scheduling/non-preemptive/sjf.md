---
id: sjf
title: SJF
order: 2
card:
  one_line: 'SJF는 실행 시간이 가장 짧은 작업부터 처리해 평균 대기 시간을 줄인다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: fcfs, reason: 긴 작업 뒤에 막혀서 }
  next: { id: hrn, reason: 긴 작업이 영영 밀려서 }
---

## 왜 나왔나

**평균 대기 시간은 가장 짧지만**, 긴 작업은 계속 밀리는 기아 현상이 생긴다.
