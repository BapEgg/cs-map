---
id: process
title: 프로세스
order: 2
card:
  one_line: 메모리에 올라가 실행 중인 프로그램
  analogy: ''
  keywords: []
flow:
  prev: { id: program, reason: 메모리에 올라가 실행되면 }
  next: { id: thread, reason: 여러 개 만들기 무거워서 }
---

## 왜 나왔나

운영체제는 프로그램마다 **독립된 메모리 공간**과 상태 정보(PCB)를 주어 서로 간섭 없이 실행되게 한다.
