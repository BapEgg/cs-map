---
id: stream-optional
title: Stream과 Optional
order: 10
aliases: [스트림, Stream API, 지연 평가, 중간 연산, 최종 연산, Optional, 병렬 스트림]
card:
  one_line: 'Stream은 컬렉션을 "무엇을 할지"만 적은 파이프라인으로 처리하며 최종 연산이 불릴 때야 한 원소씩 흐르고(지연 평가), Optional은 "값이 없을 수 있음"을 타입으로 드러내 null 검사를 강제하는 상자다.'
  analogy: 스트림은 공장 컨베이어 — 검사·가공 단계(중간 연산)를 늘어놓아도 마지막 포장(최종 연산)을 켜기 전엔 아무것도 안 움직이고, 켜면 부품 하나가 전 단계를 통과한 뒤 다음 부품이 들어온다. Optional은 "비어 있을 수 있음"이라고 적힌 상자
  analogy_limit: 컨베이어는 부품을 여러 번 돌릴 수 있지만 스트림은 한 번 최종 연산을 하면 다시 못 쓴다. 상자(Optional)는 필드·매개변수에 두라고 만든 게 아니라 반환값에만 쓰라고 만든 것이다.
  keywords: [최종 연산까지 안 움직임, 부작용 없는 람다, Optional은 반환값에]
flow:
  prev: { id: lambda-functional, reason: 넘긴 동작으로 컬렉션을 흘려 처리하면 }
  next: { id: exceptions, reason: 흐름이 실패하면 어떻게 다루나 }
see_also: [lambda-functional, collections, complexity, java-threads]
checked: '2026-09-16'
sources:
  - 'Java API — java.util.stream 패키지 요약(Stream operations and pipelines, laziness, side-effects, non-interference) — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/stream/package-summary.html'
  - 'Java API — Optional(클래스 설명: "intended to provide a limited mechanism for library method return types") — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Optional.html'
  - 'Bloch, Effective Java (3판) Item 45~48 Streams, Item 55 Return optionals judiciously'
---

## 개념

**Stream**은 컬렉션·배열의 원소를 "흘려보내며" 처리하는 파이프라인이다. `filter`·`map`·`sorted` 같은 **중간 연산**은 단계를 등록만 하고, `collect`·`count`·`forEach` 같은 **최종 연산**이 불려야 실제로 원소가 흐른다(**지연 평가**). 흐를 때는 원소 하나가 모든 단계를 통과한 뒤 다음 원소가 들어온다 — 단계마다 컬렉션을 통째로 만드는 게 아니다. 그래서 `limit(3)`이 있으면 3개만 처리하고 멈출 수 있다.

**Optional**은 "값이 있거나 없거나"를 담는 상자다. `findFirst()`, `repository.findById(id)`처럼 **없을 수도 있는 결과를 돌려주는 자리**에 써서, 받는 쪽이 `null` 검사를 잊지 못하게 한다. `orElse`, `orElseThrow`, `map`, `ifPresent`로 꺼낸다. `get()`을 바로 부르면 null 검사를 안 한 것과 같다.

#### 예시 — 성인 사용자 이름 3개

```java
List<String> names = users.stream()
    .filter(u -> u.getAge() >= 20)      // 중간: 등록만
    .map(User::getName)                 // 중간
    .limit(3)                           // 중간
    .collect(Collectors.toList());      // 최종: 여기서 흐름 시작

Optional<User> first = users.stream().filter(u -> u.getAge() >= 20).findFirst();
String name = first.map(User::getName).orElse("없음");
```

#### 작동 과정 — 원소가 흐르는 순서

- `collect`가 불린다 → 파이프라인이 첫 원소 `u1`을 `filter`에 넣는다.
- `u1`이 조건을 통과하면 바로 `map` → `limit`(1개째) → 결과 리스트에 추가. 통과 못 하면 `u1`은 여기서 끝, 다음 원소.
- `u2`, `u3`, … 같은 식. `limit`이 3개를 채우는 순간 파이프라인이 **멈춘다** — 뒤의 원소는 `filter`조차 안 거친다.
- 결과: 사용자가 100만 명이어도 성인 3명을 찾는 즉시 끝난다. 단계별로 리스트를 만들었다면 100만 개를 필터링한 뒤 3개를 잘랐을 것이다.

#### 비교 — for문과 스트림, 언제 무엇을

| | for/if 문 | 스트림 |
|---|---|---|
| 읽기 | "어떻게" 순회하는지가 보임 | "무엇을" 하는지가 보임 |
| 상태 변경·조기 종료·인덱스 | 자연스러움 | 어색함(부작용 금지, `break` 없음) |
| 예외 | 그대로 던짐 | 검사 예외를 람다 안에서 못 던짐 |
| 병렬 | 직접 스레드 관리 | `parallel()` 한 줄 — 단, 조건 있음 |

## 왜 나왔나

"목록에서 조건에 맞는 것을 골라 변환해 모은다"를 `for`문으로 쓰면 반복·조건·임시 리스트가 섞여 의도가 묻힌다. 함수형 언어의 `map/filter/reduce`를 자바에 들이면서, 컬렉션을 복사하지 않고 한 원소씩 흘리는 지연 파이프라인으로 만들어 큰 데이터와 무한 스트림(`Stream.iterate`)도 다룰 수 있게 했다. 부작용 없는 람다만 넘기면 라이브러리가 병렬 실행을 대신할 수 있다는 것도 설계 목표였다. `Optional`은 "반환값이 null일 수 있다"는 사실이 시그니처에 안 보여 생기던 `NullPointerException`을 타입으로 드러내려고 같이 들어왔다.

## 확인 질문

- 설명해 보기: 스트림의 "지연 평가"를 `limit`으로 설명해 보세요.
  답: 중간 연산은 등록만 하고 최종 연산 때 원소가 하나씩 전 단계를 통과한다. `limit(3)`이 3개를 채우면 나머지 원소는 처리하지 않고 끝난다.
- 다음 상태 예측: `Stream<String> s = list.stream(); s.count(); s.forEach(...)`는?
  답: 두 번째 호출에서 `IllegalStateException`. 스트림은 최종 연산을 한 번만 할 수 있다. 다시 쓰려면 `list.stream()`을 새로.
- 다음 상태 예측: `Optional<User> u = repo.findById(id); u.get().getName()`에서 사용자가 없으면?
  답: `NoSuchElementException`. `orElseThrow(() -> new NotFoundException(id))`로 의도를 담은 예외를 던지거나 `map(...).orElse(...)`로 꺼낸다.

## 심화

### 부작용과 비간섭

스트림 API의 약속은 "람다는 부작용이 없고, 파이프라인 도중 원본을 바꾸지 않는다"이다. `forEach` 안에서 바깥 리스트에 `add`하면 순차 실행에서는 우연히 되지만 병렬에서는 경쟁 상태이고, 원본을 순회 중 수정하면 `ConcurrentModificationException`이다. 모으는 것은 `collect`, 누적은 `reduce`로 — 상태를 스트림 안에 둔다.

### 병렬 스트림의 조건

`parallel()`은 공용 `ForkJoinPool`에서 원소를 나눠 처리한다. 이득이 나려면 원소가 많고(수만 이상), 원소당 일이 충분히 크며, 소스가 잘 쪼개지고(`ArrayList`·배열은 좋고 `LinkedList`·`iterate`는 나쁨), 람다에 부작용이 없어야 한다. 웹 서버에서는 요청 스레드들이 공용 풀 하나를 두고 경쟁해 오히려 느려지거나 다른 요청을 막을 수 있어, 대개 쓰지 않는다. I/O가 섞인 일은 병렬 스트림이 아니라 스레드 풀·비동기로.

### 자주 하는 실수

`stream().filter(...).count()`를 "있는지" 확인에 쓰면 전부 세고 나서 판단한다 — `anyMatch`면 첫 발견에서 멈춘다. `sorted()` 뒤에 `filter`를 두면 전부 정렬한 뒤 거른다 — 순서를 바꾸면 덜 정렬한다. `map(...).collect(toList())`를 그냥 `for`문에 돌려 `add`하는 것보다 느릴 때가 있다(원소가 적고 람다가 자잘하면) — 성능보다 읽기가 목적이다.

### Optional의 자리

반환 타입에만. 필드·매개변수·컬렉션 원소에 두면 `Optional`이 `null`일 수 있다는 이중 문제가 생기고 직렬화도 안 된다(Effective Java Item 55). 컬렉션을 돌려줄 땐 `Optional<List>`가 아니라 빈 리스트. `isPresent()` 뒤 `get()`은 null 검사와 같으니 `map`·`orElseGet`·`ifPresentOrElse`로. `orElse(expensive())`는 값이 있어도 `expensive()`가 실행된다 — 비싸면 `orElseGet(() -> …)`.

### 실무에서는

- 스프링 데이터의 `findById`는 `Optional`, 서비스에서 `orElseThrow(() -> new EntityNotFoundException(...))`로 받는 것이 관례.
- DTO 변환은 `stream().map(Dto::from).toList()`(Java 16+ `toList()`는 수정 불가 리스트).
- 그룹핑·집계는 `Collectors.groupingBy`, `counting`, `summingInt` — SQL의 `GROUP BY`를 메모리에서. 단, 데이터가 크면 DB에서 하는 게 맞다.
- 파이프라인이 5단계를 넘거나 람다에 분기가 많으면 `for`문이 더 읽기 쉽다. 섞어 쓴다.

### 면접 질문

#### 스트림의 지연 평가란 무엇이고, 왜 중요한가요?

중간 연산(`filter`·`map`)은 단계를 등록만 하고 최종 연산(`collect`·`count`)이 불릴 때 원소가 하나씩 전 단계를 통과하는 방식이며, 단계마다 중간 컬렉션을 만들지 않아 메모리를 아끼고 `limit`·`findFirst`·`anyMatch` 같은 단락 연산에서 필요한 만큼만 처리하고 멈출 수 있어 중요합니다.
파이프라인을 "무엇을 할지"의 선언으로 두고 실행 방식은 라이브러리가 정하게 한 설계라, 같은 코드가 순차·병렬로 돌 수 있습니다.
예를 들어 100만 명 중 성인 3명을 `filter().limit(3)`으로 찾으면 3명을 찾는 즉시 끝납니다. 한계는 최종 연산이 없으면 아무 일도 안 일어나 "왜 안 돌지"가 되고, 스트림은 한 번만 소비할 수 있으며, `sorted` 같은 상태 연산은 전부 모아야 해서 지연의 이득이 없다는 점입니다.

- 오답: "`filter`가 먼저 전부 돌고 그 결과에 `map`이 돈다" — 원소 하나가 전 단계를 통과한 뒤 다음 원소가 들어온다.
- 꼬리: 스트림을 두 번 최종 연산하면 어떻게 되나요?
- 꼬리: `count()`와 `anyMatch()` 중 "존재 확인"에 무엇을 쓰나요?

#### Optional을 어디에 쓰고 어디에 쓰지 말아야 하나요? `get()`은 왜 피하나요?

"없을 수 있는 결과"를 돌려주는 메서드의 반환 타입에만 쓰고, 필드·매개변수·컬렉션 원소에는 쓰지 않습니다. `get()`은 비어 있으면 예외를 던져 null 검사를 안 한 것과 같으므로 `orElse`·`orElseThrow`·`map`·`ifPresent`로 꺼냅니다.
Optional의 목적이 "null일 수 있음"을 시그니처에 드러내 받는 쪽이 처리를 강제받게 하는 것인데, 필드에 두면 Optional 자체가 null일 수 있어 이중이 되고 직렬화도 안 됩니다.
예를 들어 `repo.findById(id).orElseThrow(() -> new NotFoundException(id))`가 관례이고, 컬렉션은 Optional 대신 빈 컬렉션을 돌려줍니다. 한계는 Optional을 만드는 비용이 있어 성능이 민감한 반복문 안에서는 피하고, 기본형은 `OptionalInt` 등을 쓴다는 점입니다.

- 오답: "매개변수를 Optional로 받으면 null 안전하다" — 호출 쪽이 `Optional.empty()`를 만들어 넘겨야 해 번거롭고, 오버로딩이 더 명확하다.
- 꼬리: `orElse`와 `orElseGet`의 차이는?
