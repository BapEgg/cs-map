---
id: lambda-functional
title: 람다와 함수형 인터페이스
order: 9
aliases: [람다, 함수형 인터페이스, 메서드 참조, Function, Predicate, Supplier, Consumer, 클로저]
card:
  one_line: '람다는 메서드 하나짜리 인터페이스(함수형 인터페이스)의 구현을 이름 없이 그 자리에 적는 문법이고, 밖의 변수는 사실상 final인 것만 붙잡을 수 있다.'
  analogy: 정식 계약서(클래스) 대신 메모 한 장(람다)으로 "이 일 하나만 해 달라"고 넘기는 것 — 받는 쪽은 메모가 어떤 양식(함수형 인터페이스)인지로 뜻을 알아듣는다
  analogy_limit: 메모는 어디든 써서 넘길 수 있지만 람다는 "메서드 하나짜리 인터페이스"가 받는 자리에만 쓸 수 있다. 양식이 없으면 메모도 못 쓴다.
  keywords: [함수형 인터페이스의 구현, 타입은 문맥에서, 캡처는 effectively final]
flow:
  prev: { id: generics, reason: 타입을 매개변수로 넘겼으니 이제 동작을 넘기려면 }
  next: { id: stream-optional, reason: 넘긴 동작으로 컬렉션을 흘려 처리하면 }
see_also: [interface-abstract, stream-optional, collections, thread-pool]
checked: '2026-09-16'
sources:
  - 'JLS §15.27 Lambda Expressions, §15.27.2 effectively final — https://docs.oracle.com/javase/specs/jls/se17/html/jls-15.html#jls-15.27'
  - 'JLS §9.8 Functional Interfaces — https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html#jls-9.8'
  - 'Java API — java.util.function 패키지 — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/function/package-summary.html'
  - 'JEP 126 Lambda Expressions & Virtual Extension Methods(구현 방식: invokedynamic) — https://openjdk.org/jeps/126'
---

## 개념

정렬 기준, 필터 조건, 스레드가 할 일처럼 **"동작"을 인자로 넘기고 싶을 때**, Java 7까지는 인터페이스를 구현한 익명 클래스를 그 자리에 썼다. 람다는 그 익명 클래스를 `(인자) -> 본문`으로 줄인 것이다. 단, 아무 데나 쓸 수 있는 게 아니라 **추상 메서드가 하나뿐인 인터페이스(함수형 인터페이스)** 를 받는 자리에서만 쓸 수 있다 — 어느 메서드를 구현하는지가 자명해야 하니까.

람다의 타입은 람다 자신이 아니라 **문맥**이 정한다. `Comparator<User> c = (a, b) -> …`에서는 `Comparator.compare`, `Runnable r = () -> …`에서는 `Runnable.run`. 자주 쓰는 모양은 `java.util.function`에 있다 — `Function<T,R>`(변환), `Predicate<T>`(참/거짓), `Consumer<T>`(소비), `Supplier<T>`(공급). 메서드 이름만 넘기는 **메서드 참조** `User::getName`은 `u -> u.getName()`의 줄임이다.

#### 예시 — 익명 클래스에서 람다로

```java
// Java 7
users.sort(new Comparator<User>() {
    public int compare(User a, User b) { return a.getAge() - b.getAge(); }
});
// 람다
users.sort((a, b) -> a.getAge() - b.getAge());
// 메서드 참조 + 헬퍼
users.sort(Comparator.comparingInt(User::getAge));
```

#### 작동 과정 — 밖의 변수를 붙잡으면(캡처)

- `int min = 20; Predicate<User> adult = u -> u.getAge() >= min;` — 람다가 지역 변수 `min`을 캡처한다.
- 람다 객체는 `min`의 **값을 복사**해 갖는다. 그래서 `min`은 이후 바뀌면 안 된다 — 바뀌면 람다가 본 값과 밖의 값이 달라지므로 컴파일러가 막는다(effectively final).
- `min++`를 뒤에 쓰면 컴파일 오류. 바뀌는 값이 필요하면 배열·`AtomicInteger`·필드로 두되, 그러면 동시성 문제를 스스로 진다.
- 결과: 람다는 만들어질 때의 값을 들고 다니는 작은 객체다. 인스턴스 필드는 `this`를 캡처하므로 나중 값이 보인다.

#### 비교 — 익명 클래스와 람다

| | 익명 클래스 | 람다 |
|---|---|---|
| `this` | 익명 클래스 자신 | 바깥 클래스의 `this` |
| 클래스 파일 | `Outer$1.class` 생성 | 없음(`invokedynamic`으로 실행 시 생성) |
| 쓸 수 있는 곳 | 어떤 인터페이스·추상 클래스든 | 함수형 인터페이스만 |
| 상태(필드) | 가질 수 있음 | 없음(캡처만) |

## 왜 나왔나

컬렉션을 "어떻게 순회할지"가 아니라 "무엇을 할지"만 적고 싶었다 — `for`문 대신 `filter(조건).map(변환)`. 그러려면 조건과 변환을 값처럼 넘겨야 하는데 익명 클래스는 다섯 줄이 필요해 아무도 안 썼다. Java 8이 람다·함수형 인터페이스·스트림을 함께 넣은 이유다. 멀티코어에서 병렬 처리를 라이브러리가 맡으려면 "동작"을 데이터처럼 넘길 수 있어야 했던 것도 배경이다.

## 확인 질문

- 설명해 보기: 람다를 쓸 수 있는 자리의 조건은?
  답: 추상 메서드가 하나뿐인 인터페이스(함수형 인터페이스)를 받는 자리. 그래야 람다가 어느 메서드의 구현인지 정해진다.
- 다음 상태 예측: `int count = 0; list.forEach(x -> count++);`는?
  답: 컴파일 오류. `count`가 람다 안에서 바뀌므로 effectively final이 아니다. 세려면 `stream().count()`나 `AtomicInteger`.
- 다음 상태 예측: 람다 안의 `this`는 무엇을 가리키나?
  답: 람다를 감싼 바깥 객체. 익명 클래스와 달리 람다는 자기 자신을 가리키는 `this`가 없다.

## 심화

### 함수형 인터페이스 고르기

| 이름 | 시그니처 | 뜻 |
|---|---|---|
| `Supplier<T>` | `() -> T` | 만들어 준다(지연 생성, 기본값) |
| `Consumer<T>` | `T -> void` | 받아서 처리(로그, 저장) |
| `Function<T,R>` | `T -> R` | 변환 |
| `Predicate<T>` | `T -> boolean` | 조건 |
| `UnaryOperator<T>` / `BinaryOperator<T>` | `T -> T` / `(T,T) -> T` | 같은 타입 변환·결합 |
| `Runnable` / `Callable<V>` | `() -> void` / `() -> V` | 스레드·비동기 작업 |

기본형용(`IntFunction`, `ToIntFunction`, `IntPredicate`)은 박싱을 피한다. 세 개 이상 인자나 특별한 의미가 있으면 직접 정의하고 `@FunctionalInterface`를 붙인다.

### 람다는 어떻게 만들어지나

컴파일러는 람다 본문을 바깥 클래스의 `private static` 메서드로 뽑고, 호출 자리에 `invokedynamic`을 둔다. 처음 실행될 때 `LambdaMetafactory`가 그 메서드를 부르는 작은 클래스를 만들어 붙인다. 캡처가 없는 람다는 객체가 한 번만 만들어져 재사용되고, 캡처가 있으면 실행마다 새 객체다. 익명 클래스보다 클래스 파일이 안 늘고 시작이 가볍다.

### 검사 예외와 람다

`Function`의 `apply`는 검사 예외를 던지지 않으므로 람다 안에서 `IOException`이 나는 코드를 그대로 못 쓴다. 안에서 잡아 unchecked로 감싸거나, 예외를 던지는 자체 함수형 인터페이스를 만든다. 스트림 파이프라인에 검사 예외가 섞이면 코드가 지저분해지는 이유다(예외 장).

### 실무에서는

- 람다는 한두 줄. 길어지면 이름 있는 메서드로 빼고 메서드 참조로 넘긴다 — 디버깅 스택에 이름이 남는다.
- 스프링에서 `@Bean`으로 `Function`·`Supplier`를 등록하거나, `TransactionTemplate.execute(status -> …)`, `RestClient`의 콜백처럼 "동작을 넘기는 API"가 흔하다.
- 람다에서 바깥 가변 상태를 고치지 않는다. 병렬 스트림·비동기에서 경쟁 상태가 된다.
- `Comparator.comparing(...).thenComparing(...)`, `Predicate.not(...)`, `Function.andThen(...)`처럼 합성해서 쓴다.

### 면접 질문

#### 람다와 함수형 인터페이스는 무엇이고, 익명 클래스와 무엇이 다른가요?

함수형 인터페이스는 추상 메서드가 하나뿐인 인터페이스이고, 람다는 그 인터페이스의 구현을 `(인자) -> 본문`으로 그 자리에 적는 문법입니다. 익명 클래스와 달리 `this`가 바깥 객체를 가리키고, 별도 클래스 파일 없이 `invokedynamic`으로 만들어지며, 함수형 인터페이스에만 쓸 수 있습니다.
동작을 값처럼 넘기는 코드(정렬 기준, 필터, 콜백)를 짧게 쓰기 위해 Java 8에 스트림과 함께 들어왔습니다.
예를 들어 `users.sort(Comparator.comparingInt(User::getAge))`는 익명 클래스 다섯 줄을 한 줄로 만듭니다. 한계는 바깥 지역 변수는 effectively final만 캡처할 수 있고, 검사 예외를 던지는 코드는 그대로 못 쓰며, 람다가 길어지면 이름이 없어 디버깅이 어렵다는 점입니다.

- 오답: "람다는 익명 클래스의 문법 설탕이다" — `this`의 뜻과 생성 방식(클래스 파일 없음, invokedynamic)이 다르다.
- 꼬리: 람다가 캡처하는 변수가 effectively final이어야 하는 이유는?
- 꼬리: `Supplier`와 `Callable`의 차이는?

#### 람다 안에서 바깥 변수를 증가시키려는데 컴파일이 안 됩니다. 왜 그렇고 어떻게 하나요?

람다는 바깥 지역 변수의 값을 복사해 갖기 때문에, 그 변수가 나중에 바뀌면 람다가 본 값과 실제 값이 달라집니다. 그래서 자바는 캡처되는 지역 변수를 사실상 final(effectively final)로 제한하고, 안에서 바꾸는 코드를 컴파일 오류로 막습니다.
람다가 다른 스레드에서 나중에 실행될 수도 있어 "지역 변수를 공유한다"는 뜻으로 두면 스택이 사라진 뒤의 참조나 경쟁 상태가 생깁니다.
세는 것이 목적이면 `stream().filter(...).count()`처럼 결과를 반환하게 바꾸고, 정말 누적이 필요하면 `AtomicInteger`나 `reduce`를 씁니다. 한계는 `AtomicInteger`·배열로 우회하면 컴파일은 되지만 병렬 실행에서의 정확성은 스스로 책임져야 한다는 점입니다.

- 오답: "배열로 감싸면 되니까 그렇게 하면 된다" — 컴파일은 되지만 부작용 있는 람다가 되어 병렬 스트림에서 틀린다.
- 꼬리: 인스턴스 필드는 왜 람다 안에서 바꿀 수 있나요?
