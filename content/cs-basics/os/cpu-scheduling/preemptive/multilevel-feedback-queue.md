---
id: multilevel-feedback-queue
title: 다단계 피드백 큐
order: 4
card:
  one_line: '다단계 피드백 큐는 작업이 어떻게 행동하는지 보고 큐 사이를 옮겨 다니게 하는 방식이다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: multilevel-queue, reason: 큐를 못 옮겨 굶는 작업 때문에 }
checked: '2026-09-16'
sources:
  - 'OSTEP 8장 Scheduling: The Multi-Level Feedback Queue — https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched-mlfq.pdf'
  - 'Silberschatz 외, Operating System Concepts (10판) 5.3.6 Multilevel Feedback Queue, 5.7.2 Windows Scheduling'
---

## 개념

우선순위가 다른 큐를 여러 개 두고, **작업이 어떻게 행동하느냐에 따라 큐를 옮긴다.**
CPU를 오래 쓰는 작업은 아래 큐로 내려가고, 입출력을 자주 하는 작업은 위에 남는다. 실행 시간을 미리 몰라도 되고, 대화형 작업의 반응이 좋아진다.

## 왜 나왔나

다단계 큐는 한번 정해진 큐를 못 옮겨 낮은 큐가 굶었다. **CPU를 오래 쓰면 아래로, 오래 기다리면 위로** 옮겨 균형을 맞춘다.

## 심화

### 내부 구조

- 새 작업은 가장 높은 우선순위 큐에서 시작한다.
- 주어진 시간을 다 쓰면 한 단계 아래 큐로 내려간다(CPU를 오래 쓰는 작업으로 판단).
- 시간을 다 쓰기 전에 I/O 등으로 스스로 양보하면 그 큐에 머문다(대화형 작업으로 판단).
- 일정 주기마다 모든 작업을 맨 위로 올려(priority boost) 굶는 작업을 막는다.

### 실제 활용

- 실행 시간을 미리 몰라도 짧은 작업·대화형 작업을 먼저 처리하게 되어, Windows를 비롯한 여러 운영체제 스케줄러의 기본 발상이 됐다.

### 면접 질문

#### 작업의 실행 시간을 모를 때 SJF에 가깝게 동작시키려면 어떻게 하나요?

MLFQ처럼 작업의 과거 행동을 관찰해 우선순위를 조정합니다. CPU를 오래 쓰는 작업은 점점 낮은 큐로, 짧게 쓰고 양보하는 작업은 높은 큐에 남겨서 결과적으로 짧은 작업이 먼저 처리됩니다.

- 꼬리: 퀀텀 직전에 일부러 I/O를 해서 높은 큐에 머무는 꼼수는 어떻게 막나요?
- 꼬리: priority boost가 없으면 어떤 문제가 생기나요?
