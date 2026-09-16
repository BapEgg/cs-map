---
id: collections
title: 컬렉션
order: 3
aliases: [컬렉션 프레임워크, ArrayList, HashMap, List, Map, Set]
card:
  one_line: '컬렉션은 자료구조를 인터페이스(List·Set·Map)와 구현(ArrayList·HashMap 등)으로 나눠 제공해, 쓰는 쪽은 약속만 보고 구현은 상황에 맞게 고르게 한 것이다.'
  analogy: 수납 도구 진열대 — "순서대로 담기"(List), "중복 없이"(Set), "이름표로 찾기"(Map) 중 용도를 고르면 그 안의 제품(구현)은 바꿔 끼울 수 있다
  analogy_limit: 진열대 제품은 다 비슷하게 보이지만 구현마다 어떤 동작이 O(1)이고 어떤 것이 O(n)인지 다르다. 인터페이스가 같다고 성능이 같지 않다.
  keywords: [List·Set·Map, ArrayList·HashMap 내부, 동시 수정과 동시성 컬렉션]
flow:
  prev: { id: equals-hashcode, reason: 그 기준으로 담고 찾는 그릇 }
  next: { id: generics, reason: 그릇에 담긴 타입을 컴파일러가 알게 하려면 }
see_also: [array, linked-list, hash, tree, race-condition]
checked: '2026-09-16'
sources:
  - 'JDK 21 API — Collections Framework Overview — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/doc-files/coll-overview.html'
  - 'JDK 21 API ArrayList(1.5배 증가), HashMap(용량 16·적재율 0.75·트리화 8), ConcurrentHashMap — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/package-summary.html'
  - 'Bloch, Effective Java (3판) Item 64 Refer to objects by their interfaces'
---

## 개념

자바 컬렉션은 자료구조 장에서 본 배열·리스트·해시·트리를 **인터페이스와 구현으로 나눠** 준다. `List`(순서 있음, 중복 허용), `Set`(중복 없음), `Map`(키 → 값), `Queue`/`Deque`. 각 인터페이스에 구현이 여럿이다 — `List`는 `ArrayList`(배열)·`LinkedList`(연결 리스트), `Map`은 `HashMap`(해시)·`TreeMap`(정렬 트리)·`LinkedHashMap`(삽입 순서 유지).

변수 타입은 인터페이스로 두고(`List<Order> orders = new ArrayList<>()`), 구현은 필요한 성능 특성으로 고른다. 어떤 연산이 O(1)이고 어떤 것이 O(n)인지가 구현마다 다르다.

주문 목록에서 고객별 주문 수를 세어 보자.

- `Map<Long, Integer> countByCustomer = new HashMap<>()`.
- 주문마다 `countByCustomer.merge(order.customerId(), 1, Integer::sum)` — 키가 없으면 1, 있으면 +1. 각 호출은 평균 O(1).
- 결과: 주문 100만 건에 O(n). `List`에서 매번 `contains`로 찾았다면 O(n²)였다. 고객 ID로 정렬해 보고 싶으면 `TreeMap`으로 바꾸면 되고 쓰는 코드는 `Map` 그대로다.

## 왜 나왔나

자바 초기에는 `Vector`·`Hashtable` 같은 개별 클래스뿐이라 바꿔 끼울 수 없었고, 모든 메서드가 동기화돼 느렸다. JDK 1.2에서 인터페이스 계층과 여러 구현, 그리고 `Collections` 유틸을 갖춘 프레임워크로 정리했다. 이후 제네릭(타입 안전), 동시성 컬렉션(`java.util.concurrent`), 스트림 API가 그 위에 얹혔다.

## 확인 질문

- 설명해 보기: 변수를 `ArrayList`가 아니라 `List`로 선언하는 이유는?
  답: 쓰는 쪽이 인터페이스에만 의존하면 나중에 `LinkedList`나 불변 리스트로 바꿔도 코드가 안 바뀐다.
- 다음 상태 예측: `for (String s : list) { if (…) list.remove(s); }`를 실행하면?
  답: `ConcurrentModificationException`. 순회 중 구조를 바꿨다. `Iterator.remove()`나 `removeIf`를 쓴다.
- 다음 상태 예측: 여러 스레드가 같은 `HashMap`에 동시에 `put`하면?
  답: 값이 사라지거나 구조가 깨진다(옛 버전은 무한 루프). `ConcurrentHashMap`을 쓴다.

## 심화

### 구현별 특성

| 구현 | 바탕 | 빠른 것 | 느린 것·주의 |
|---|---|---|---|
| `ArrayList` | 동적 배열(1.5배 증가) | 인덱스 접근, 끝 추가, 순회 | 앞·중간 삽입/삭제 O(n) |
| `LinkedList` | 이중 연결 리스트 | 양 끝 추가/삭제 | 인덱스 접근 O(n), 메모리 큼. 큐로도 `ArrayDeque`가 낫다 |
| `HashMap` | 해시 테이블(16칸, 0.75, 버킷 8개 넘으면 트리) | get/put 평균 O(1) | 순서 없음, 스레드 안전 아님 |
| `LinkedHashMap` | 해시 + 삽입(또는 접근) 순서 리스트 | O(1) + 순서 | LRU 캐시에 쓰임 |
| `TreeMap` | 레드-블랙 트리 | 정렬·범위·최소/최대 O(log n) | 해시보다 느림 |
| `HashSet`/`TreeSet` | 내부적으로 Map | 중복 제거 | Map과 같은 특성 |
| `ArrayDeque` | 원형 배열 | 스택·큐 양 끝 O(1) | null 불가 |
| `PriorityQueue` | 이진 힙 | 최소값 O(1), 삽입/삭제 O(log n) | 순회는 정렬 순 아님 |

### 동시성

`HashMap`·`ArrayList`는 스레드 안전이 아니다. `Collections.synchronizedMap`은 메서드마다 락이라 경합이 크고 순회는 따로 잠가야 한다. `ConcurrentHashMap`은 버킷 단위로 나눠 잠가 동시 읽기·쓰기가 빠르고 `compute`·`merge`가 원자적이다. `CopyOnWriteArrayList`는 쓸 때마다 복사하므로 읽기 압도적·쓰기 드문 목록(리스너)에만.

### 불변과 뷰

`List.of(...)`, `Map.of(...)`(JDK 9+)는 불변이고 null을 거부한다. `Collections.unmodifiableList`는 원본이 바뀌면 같이 바뀌는 뷰다. `Arrays.asList`는 크기 고정에 `set`은 됨. 반환값을 불변으로 주면 호출자가 내부 상태를 못 건드린다.

### 실무에서는

- 반복문 안 `list.contains`·`remove(Object)`는 O(n) → 전체 O(n²). `Set`이나 `Map`으로.
- `HashMap` 키 클래스는 `equals`/`hashCode`를 갖추고 불변으로(앞 장).
- 크기를 알면 `new ArrayList<>(n)`, `new HashMap<>(n / 0.75 + 1)`로 리사이즈를 없앤다.
- 스트림 `collect(Collectors.toList())`의 결과 타입은 보장이 없다. 불변이 필요하면 `toUnmodifiableList()`/`toList()`(JDK 16+, 불변).
- 캐시 용도면 `LinkedHashMap(accessOrder=true)` + `removeEldestEntry` 또는 Caffeine.

### 면접 질문

#### `ArrayList`와 `LinkedList`의 차이와 실제로 어느 쪽을 쓰나요?

`ArrayList`는 배열이라 인덱스 접근 O(1)·끝 추가 상환 O(1)·순회가 캐시 친화적이지만 중간 삽입/삭제가 O(n)이고, `LinkedList`는 이중 연결 리스트라 양 끝 삽입/삭제가 O(1)이지만 인덱스 접근이 O(n)이고 노드마다 메모리를 더 씁니다.
실무에서는 거의 항상 `ArrayList`입니다. `LinkedList`의 중간 삽입 O(1)은 그 위치까지 가는 O(n)이 빠진 말이고, 큐·덱이 필요할 때도 원형 배열인 `ArrayDeque`가 더 빠릅니다.
예를 들어 주문 목록을 담고 순회·인덱스 접근하는 일반적 용도는 `ArrayList`, 앞뒤에서 넣고 빼는 작업 큐는 `ArrayDeque`입니다. `LinkedList`가 이기는 경우는 반복자로 순회하며 그 자리에서 삽입·삭제를 반복할 때 정도입니다.

- 꼬리: `ArrayList`가 꽉 차면 내부에서 무슨 일이 일어나나요?
- 꼬리: 순회 중 삭제는 어떻게 안전하게 하나요?

#### `HashMap`과 `ConcurrentHashMap`의 차이는 무엇이고, `Collections.synchronizedMap`은 왜 잘 안 쓰나요?

`HashMap`은 스레드 안전이 아니라 동시 쓰기에 값이 사라지거나 구조가 깨지고, `ConcurrentHashMap`은 조회(`get`)는 락 없이 volatile 읽기로 하고, 갱신은 빈 버킷이면 CAS로 노드를 넣고 노드가 있는 버킷이면 그 버킷의 첫 노드만 `synchronized`로 잠가(Java 8+) 다른 버킷의 갱신과 동시에 진행하며, `compute`·`merge` 같은 키 단위 원자적 갱신을 제공합니다.
`synchronizedMap`은 모든 메서드를 하나의 락으로 감싸 스레드가 많을수록 경합이 심하고, `get` 뒤 `put` 같은 복합 연산은 여전히 원자적이지 않으며 순회 시 직접 잠가야 합니다.
예를 들어 요청 스레드 200개가 같은 캐시 맵을 갱신하면 `ConcurrentHashMap`은 서로 다른 버킷을 동시에 처리하지만 `synchronizedMap`은 한 번에 하나만 들어갑니다. 한계는 `ConcurrentHashMap`의 `size()`·순회가 순간 스냅숏이 아니라는 점, 여전히 "여러 키에 걸친 원자성"은 제공하지 않는다는 점, 그리고 같은 키에 쓰기가 몰리면 그 버킷의 락에서 경합이 생긴다는 점입니다.

- 꼬리: `ConcurrentHashMap.computeIfAbsent`가 원자적이라는 건 무슨 뜻인가요?
- 꼬리: `CopyOnWriteArrayList`는 언제 쓰나요?
