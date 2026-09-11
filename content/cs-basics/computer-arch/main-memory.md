---
id: main-memory
title: 메인 메모리
order: 4
card:
  one_line: 실행 중인 프로그램과 데이터가 올라가는 작업 공간(RAM)
  analogy: ''
  keywords: []
flow:
  prev: { id: cache, reason: 캐시에 못 담는 나머지 }
  next: { id: disk, reason: 꺼지면 사라지니까 }
---

## 왜 나왔나

CPU가 직접 읽고 쓸 수 있는 공간이 필요했다. 빠르지만 **전원이 꺼지면 내용이 사라진다**.
