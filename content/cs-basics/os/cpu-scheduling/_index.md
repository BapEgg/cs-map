---
id: cpu-scheduling
title: CPU 스케줄링
order: 3
card:
  one_line: 'CPU 스케줄링은 여러 프로세스 중 어떤 것에 CPU를 줄지 정하는 규칙이다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: process-and-thread, reason: CPU를 나눠 쓰려면 }
  next: { id: memory-management, reason: 메모리도 나눠야 해서 }
---

## 개념

CPU는 한 번에 하나만 실행하는데 기다리는 프로세스는 여럿이다. **누구에게 먼저, 얼마나 오래** CPU를 줄지 정하는 규칙이다.
먼저 온 순서, 짧은 것 먼저, 돌아가며 조금씩처럼 여러 방식이 있고, 각각 평균 대기 시간과 공평함이 다르다.

## 왜 나왔나

CPU는 하나인데 실행하고 싶은 프로세스는 여럿이다. **누구에게 먼저, 얼마나 주느냐**에 따라 대기 시간과 공평함이 달라진다.
