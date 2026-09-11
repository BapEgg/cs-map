---
id: cpu
title: CPU
order: 2
card:
  one_line: 'CPU는 명령어를 가져와 해석하고 실행하는 장치다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: von-neumann, reason: 그 핵심 두뇌 }
  next: { id: cache, reason: 메모리가 너무 느려서 }
---

## 개념

명령어를 **가져와(fetch) → 해석하고(decode) → 실행하는(execute)** 일을 쉬지 않고 반복하는 장치다.
안에는 계산을 맡는 ALU, 지금 다루는 값을 잠깐 담는 레지스터, 다음 명령어가 어디 있는지 가리키는 카운터가 있다. 이 한 바퀴를 1초에 수십억 번 돈다.

## 왜 나왔나

메모리에 저장된 명령어를 **하나씩 꺼내 처리할 주체**가 필요했다. 안에는 계산 회로(ALU), 초고속 저장소(레지스터), 알아듣는 명령 목록(ISA)이 있다.
