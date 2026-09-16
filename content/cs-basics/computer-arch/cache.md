---
id: cache
title: 캐시 메모리
order: 3
card:
  one_line: '캐시는 자주 쓰는 데이터를 CPU 가까이 두어 메인 메모리와의 속도 차이를 메우는 작고 빠른 임시 저장소다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: cpu, reason: 메모리가 너무 느려서 }
  next: { id: main-memory, reason: 캐시에 못 담는 나머지 }
checked: '2026-09-16'
sources:
  - 'Patterson & Hennessy, Computer Organization and Design (5판) 5장 Large and Fast: Exploiting Memory Hierarchy'
  - 'Intel 64 and IA-32 Optimization Reference Manual — False Sharing — https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html'
---

## 개념

CPU와 메인 메모리 사이에 두는 **작고 아주 빠른 저장소**다. CPU가 어떤 데이터를 읽으면 그 근처를 캐시에 복사해 둔다.
다음에 같은 데이터나 그 근처를 찾으면 메모리까지 가지 않고 캐시에서 바로 꺼낸다(적중). 없으면 메모리에 다녀온다(미스). 프로그램은 대개 방금 쓴 것과 그 근처를 다시 쓰기 때문에 적중률이 높다.

## 왜 나왔나

CPU 속도가 메모리보다 훨씬 빨리 발전하면서 **CPU가 메모리를 기다리는 시간**이 늘었다. **자주 쓰는 데이터를 가까이** 두면 그 대기가 줄어든다.

## 심화

### 내부 구조

- 지역성(locality)에 기댄다: 방금 쓴 데이터는 곧 또 쓰고(시간 지역성), 그 근처 데이터도 곧 쓴다(공간 지역성).
- L1(가장 작고 빠름) → L2 → L3(코어끼리 공유) 계층으로 되어 있고, 모두 없으면(캐시 미스) 메인 메모리까지 간다.
- 데이터는 1바이트씩이 아니라 캐시 라인(보통 64바이트) 단위로 한 번에 가져온다.

### 실제 활용

- 2차원 배열을 행 방향으로 돌면 가져온 캐시 라인을 꽉 채워 써서, 열 방향으로 돌 때보다 훨씬 빠르다.
- 멀티쓰레드에서 서로 다른 변수가 같은 캐시 라인에 있으면 서로의 캐시를 계속 무효화하는 false sharing이 생겨 느려진다.

### 면접 질문

#### 캐시의 지역성이란 무엇인가요?

시간 지역성은 최근 접근한 데이터를 곧 다시 접근하는 성질, 공간 지역성은 접근한 데이터 근처를 곧 접근하는 성질입니다. 캐시는 이 두 성질 덕분에 작은 크기로도 높은 적중률을 냅니다.

- 꼬리: 2차원 배열을 행 우선과 열 우선으로 순회할 때 속도가 다른 이유는?
- 꼬리: 멀티코어에서 캐시 일관성(coherence) 문제는 왜 생기나요?
