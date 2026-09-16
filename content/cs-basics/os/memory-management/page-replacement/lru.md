---
id: lru
title: LRU
order: 3
card:
  one_line: 'LRU는 가장 오랫동안 쓰지 않은 페이지를 내보내는 교체 방식이다.'
  analogy: ''
  keywords: []
flow:
  prev:
    - { id: fifo, reason: 오래됐어도 자주 쓸 수 있어서 }
    - { id: opt, reason: 미래 대신 과거로 추측 }
  next: { id: nru, reason: 정확한 기록이 비싸서 }
checked: '2026-09-16'
sources:
  - 'OSTEP 22장 Swapping: Policies — https://pages.cs.wisc.edu/~remzi/OSTEP/vm-beyondphys-policy.pdf'
  - 'Redis 문서 Key eviction (allkeys-lru) — https://redis.io/docs/latest/develop/reference/eviction/'
---

## 개념

**가장 오랫동안 쓰지 않은** 페이지를 내보낸다. 최근에 안 쓴 건 앞으로도 안 쓸 거라는 가정이다.
실제 프로그램은 방금 쓴 것을 다시 쓰는 경향이 강해서 잘 맞는다. 다만 매번 마지막 사용 시각을 기록해야 해서 비용이 든다.

## 왜 나왔나

**최근에 안 쓴 건 앞으로도 안 쓸 것**이라는 가정(지역성)으로 OPT를 흉내 낸다. 가장 널리 쓰이는 기준.

## 심화

### 내부 구조

- 소프트웨어로 구현할 땐 해시맵 + 이중 연결 리스트를 쓴다. 해시맵으로 O(1)에 찾고, 쓸 때마다 리스트 맨 앞으로 옮기고, 꽉 차면 맨 뒤를 지운다.
- 하드웨어·운영체제에선 모든 접근 시간을 기록하기 비싸서, 참조 비트를 이용한 클럭(Second Chance) 알고리즘 같은 근사 LRU를 쓴다.

### 실제 활용

- Redis의 allkeys-lru 정책, 브라우저·CDN 캐시, 리눅스 페이지 캐시(active/inactive 리스트) 등 캐시가 있는 곳 대부분.

### 면접 질문

#### LRU 캐시를 O(1)로 구현해 보세요.

키→노드를 저장하는 해시맵과 사용 순서를 담는 이중 연결 리스트를 함께 씁니다. get/put 때 해당 노드를 리스트 맨 앞으로 옮기고, 용량을 넘으면 맨 뒤 노드를 지우고 해시맵에서도 삭제합니다.

- 꼬리: 단일 연결 리스트가 아니라 이중 연결 리스트여야 하는 이유는?
- 꼬리: 여러 쓰레드가 동시에 접근하면 어떻게 하나요?
- 꼬리: LRU가 불리한 접근 패턴은? (예: 큰 데이터를 한 번 쭉 훑는 순차 스캔)
