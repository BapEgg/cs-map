---
id: memory-management
title: 메모리 관리
order: 3
sim: memory-layout
card:
  one_line: 한정된 메모리를 여러 프로세스에 나눠주는 방법
  analogy: ''
  keywords: []
flow:
  prev: { id: cpu-scheduling, reason: 메모리도 나눠야 해서 }
  next: { id: disk-scheduling, reason: 디스크 요청도 줄 세우려고 }
---

## 왜 나왔나

여러 프로세스가 동시에 메모리에 올라가면서, **서로의 영역을 침범하지 않게** 나누고 빈 공간을 효율적으로 쓰는 방법이 필요해졌다.
