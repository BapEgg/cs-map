---
id: generics
title: 제네릭
order: 4
aliases: [타입 소거, 와일드카드, 타입 파라미터]
card:
  one_line: '제네릭은 "어떤 타입이든 담되 무슨 타입인지는 컴파일러가 확인한다"는 장치로, 실행 시에는 타입이 지워져(소거) 컴파일 때만 안전을 잡는다.'
  analogy: 라벨이 붙은 상자 — "사과 상자"에 배를 넣으려 하면 포장 단계(컴파일)에서 걸리지만, 배송 중(실행)에는 라벨이 없다
  analogy_limit: 라벨이 배송 중에 없다는 것은 곧 "실행 중에 상자 안 타입을 물어볼 수 없다"는 뜻이다. `List<String>`인지 `List<Integer>`인지 런타임은 모른다.
  keywords: [컴파일 타임 타입 안전, 타입 소거, 와일드카드 ? extends/super]
flow:
  prev: { id: collections, reason: 그릇에 담긴 타입을 컴파일러가 알게 하려면 }
  next: { id: exceptions, reason: 타입은 잡았고, 실패는 어떻게 다루나 }
see_also: [collections, oop]
checked: '2026-09-16'
sources:
  - 'JLS 21 §4.6 Type Erasure, §4.10 Subtyping — https://docs.oracle.com/javase/specs/jls/se21/html/jls-4.html#jls-4.6'
  - 'Bloch, Effective Java (3판) Item 26~31 — raw type 금지, 와일드카드(PECS)'
  - 'Oracle Java Tutorials — Generics, Type Erasure — https://docs.oracle.com/javase/tutorial/java/generics/erasure.html'
---

## 개념

제네릭이 없던 시절의 `List`는 `Object`를 담았다. 꺼낼 때마다 `(String) list.get(0)`으로 형변환해야 했고, 잘못 넣은 것은 실행 중에야 `ClassCastException`으로 터졌다. 제네릭은 `List<String>`처럼 **담을 타입을 선언**하게 해서, 다른 타입을 넣으면 컴파일이 안 되고 꺼낼 때 형변환이 필요 없게 한다.

핵심은 이것이 **컴파일 때만** 일어난다는 것이다. 컴파일러가 확인을 끝내면 타입 정보는 지워지고(타입 소거) 실행 시에는 옛날처럼 `List`일 뿐이다. 그래서 하위 호환은 되지만 실행 중에 "이건 `List<String>`인가"를 물을 수 없다.

주문 ID 목록을 다뤄 보자.

- `List<Long> ids = new ArrayList<>(); ids.add(42L); ids.add("abc");` → 두 번째 줄에서 컴파일 오류. 실행 전에 잡혔다.
- `Long first = ids.get(0);` → 형변환 없이 바로. 컴파일러가 `Long`임을 안다.
- 실행 시: 바이트코드에는 `List`와 `Object`만 있고, `get` 결과에 컴파일러가 넣어 둔 `(Long)` 형변환이 붙어 있다.
- 결과: 타입 실수는 컴파일에서, 코드는 형변환 없이 깔끔하게. 대신 `ids instanceof List<Long>` 같은 검사는 불가능하다.

## 왜 나왔나

컬렉션이 `Object`를 담으니 무엇이 들었는지 코드만 봐서는 몰랐고, 잘못 넣은 것은 한참 뒤 다른 곳에서 터졌다. 컴파일러가 타입을 추적하게 하되 기존 바이트코드·라이브러리와 호환되도록 JDK 5에서 "컴파일 때 검사하고 실행 시 지운다"는 절충으로 넣었다. 소거 덕에 옛 코드가 그대로 돌았지만, 그 대가가 런타임 타입 정보 부재다.

## 확인 질문

- 설명해 보기: 제네릭이 잡아 주는 오류는 언제 잡히나?
  답: 컴파일 때. 실행 시에는 타입이 지워져 있어 검사하지 않는다.
- 다음 상태 예측: `List<String>`을 raw `List`로 받아 `Integer`를 넣고 다시 `List<String>`으로 꺼내 `get`하면?
  답: 컴파일은 경고만 내고 되지만, 실행 중 `String`으로 형변환하는 순간 `ClassCastException`. 소거 때문에 넣을 때는 못 막는다.
- 다음 상태 예측: `List<Integer>`를 `List<Number>` 변수에 넣을 수 있나?
  답: 없다. `Integer`가 `Number`의 하위여도 `List<Integer>`는 `List<Number>`의 하위가 아니다(불공변). 넣어 주면 `Double`을 추가할 수 있게 되기 때문.

## 심화

### 타입 소거가 만드는 제약

`new T()`, `new T[]`, `T.class`, `instanceof T`가 안 된다 — 실행 시 T가 없다. `List<String>`과 `List<Integer>`는 같은 클래스라 오버로드로 구분할 수 없다. 정적 필드는 타입 파라미터별로 나뉘지 않는다. 런타임에 타입이 필요하면 `Class<T>`를 인자로 받는다(`objectMapper.readValue(json, Order.class)`). 중첩 제네릭(`List<Order>`)은 `TypeReference`로 넘긴다 — Jackson이 이래서 그렇게 생겼다.

### 와일드카드 — PECS

`List<? extends Number>`는 "Number나 그 하위 무엇인가의 리스트" — 읽기(Number로)는 되지만 넣기는 못 한다(무슨 타입인지 몰라서). `List<? super Integer>`는 "Integer나 그 상위의 리스트" — Integer를 넣을 수 있지만 읽으면 Object다. 생산자(꺼내 쓰는 쪽)는 `extends`, 소비자(넣는 쪽)는 `super` — Effective Java의 PECS. `Collections.copy(List<? super T> dest, List<? extends T> src)`가 전형.

### 제네릭 메서드와 한정

`<T extends Comparable<T>> T max(List<T> list)`처럼 메서드 자체에 타입 파라미터를 두고 상한을 걸면 "비교 가능한 것만" 받는다. 재귀적 한정(`T extends Comparable<T>`)은 "자기 자신과 비교 가능"이라는 뜻이다.

### 실무에서는

- raw 타입(`List` 그대로)은 쓰지 않는다. 경고를 끄지 말고 원인을 고친다.
- API 반환·매개변수에 와일드카드를 적절히 두면 호출자가 편하다. 반환 타입에 와일드카드는 피한다(호출자가 다루기 어려움).
- Jackson·Gson으로 `List<Order>`를 역직렬화할 때 `Order[].class`나 `TypeReference<List<Order>>`를 넘긴다. 그냥 `List.class`면 `LinkedHashMap` 목록이 나온다.
- Spring의 `ResponseEntity<T>`, `Optional<T>`, `Repository<T, ID>`가 모두 제네릭이다. `JpaRepository<Order, Long>`의 두 파라미터가 엔티티와 ID 타입.

### 면접 질문

#### 제네릭은 무엇이고, 타입 소거란 무엇인가요?

제네릭은 클래스·메서드가 다룰 타입을 파라미터로 받아 컴파일러가 타입 안전을 검사하게 하는 장치이고, 타입 소거는 그 타입 정보가 컴파일 뒤 지워져 실행 시에는 raw 타입과 같아지는 것입니다.
JDK 5에서 기존 바이트코드·라이브러리와 호환되도록 "컴파일 때 검사, 실행 시 소거"로 설계했기 때문이며, 그 덕에 하위 호환은 됐지만 실행 중에 `List<String>`인지 알 수 없습니다.
예를 들어 `List<Long>`에 문자열을 넣는 실수는 컴파일에서 잡히지만, `new T()`·`instanceof List<String>`은 불가능하고 JSON 역직렬화에 `TypeReference`가 필요합니다. 한계는 raw 타입을 섞어 쓰면 검사가 뚫려 실행 중 `ClassCastException`이 엉뚱한 곳에서 난다는 점입니다.

- 꼬리: `List<Integer>`가 `List<Number>`의 하위 타입이 아닌 이유는?
- 꼬리: Jackson에서 `List<Order>`를 받으려면 왜 `TypeReference`가 필요한가요?

#### `? extends T`와 `? super T`는 언제 각각 쓰나요?

값을 꺼내 쓰기만 하는 생산자 매개변수에는 `? extends T`, 값을 넣기만 하는 소비자 매개변수에는 `? super T`를 씁니다(PECS).
`List<? extends Number>`는 안에 무슨 하위 타입이 있는지 모르므로 넣을 수는 없지만 `Number`로 읽을 수 있고, `List<? super Integer>`는 `Integer`를 넣기엔 안전하지만 읽으면 `Object`입니다.
예를 들어 `double sum(List<? extends Number> nums)`는 `List<Integer>`도 `List<Double>`도 받고, `void fill(List<? super Integer> dest)`는 `List<Number>`·`List<Object>`에 넣을 수 있습니다. 한계는 반환 타입에 와일드카드를 쓰면 호출자가 다루기 어려워지므로 매개변수에만 쓰는 것입니다.

- 꼬리: `List<?>`와 raw `List`의 차이는?
- 꼬리: `Comparable<T>`에서 재귀적 한정은 무엇을 뜻하나요?
