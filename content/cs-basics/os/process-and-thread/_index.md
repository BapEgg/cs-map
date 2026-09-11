---
id: process-and-thread
title: 프로세스와 쓰레드
order: 1
card:
  one_line: 실행 중인 프로그램과 그 안의 실행 흐름
  analogy: ''
  keywords: []
flow:
  next: { id: cpu-scheduling, reason: CPU를 나눠 쓰려면 }
---

## 왜 나왔나

디스크의 프로그램이 메모리에 올라가면 프로세스가 된다. 프로세스를 여러 개 만드는 건 무거워서, 메모리를 공유하는 **가벼운 단위인 쓰레드**가 나왔다.
