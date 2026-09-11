---
id: cpu
title: CPU
order: 2
card:
  one_line: 명령어를 가져와(fetch) 해석하고(decode) 실행하는 장치
  analogy: ''
  keywords: []
flow:
  prev: { id: von-neumann, reason: 그 핵심 두뇌 }
  next: { id: cache, reason: 메모리가 너무 느려서 }
---

## 왜 나왔나

메모리에 저장된 명령어를 **하나씩 꺼내 처리할 주체**가 필요했다. 안에는 계산 회로(ALU), 초고속 저장소(레지스터), 알아듣는 명령 목록(ISA)이 있다.
