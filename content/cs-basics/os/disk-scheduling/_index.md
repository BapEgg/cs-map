---
id: disk-scheduling
title: 디스크 스케줄링
order: 4
card:
  one_line: '디스크 스케줄링은 디스크 헤드가 어떤 순서로 요청을 처리할지 정하는 규칙이다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: memory-management, reason: 디스크 요청도 줄 세우려고 }
---

## 왜 나왔나

디스크는 헤드가 물리적으로 움직여야 해서 느리다. **처리 순서만 바꿔도** 이동 거리가 크게 줄어든다.
