---
id: equals-hashcode
title: equals/hashCode
order: 2
aliases: [equals, hashCode, 동등성, 동일성]
card:
  one_line: 'equals는 두 객체가 "같은 값"인지 정하는 규칙이고, hashCode는 그 값을 숫자로 요약한 것이라 equals가 같으면 hashCode도 같아야 HashMap이 제대로 찾는다.'
  analogy: 도서관에서 책을 찾을 때 서가 번호(hashCode)로 먼저 가고, 그 서가에서 제목(equals)으로 확인한다 — 같은 책인데 서가 번호가 다르면 영영 못 찾는다
  analogy_limit: 서가 번호는 사서가 붙이지만 hashCode는 클래스를 짠 사람이 정한다. 기본값은 "메모리 주소"라 값이 같아도 다른 서가로 간다.
  keywords: [동일성 vs 동등성, 계약, HashMap 키]
flow:
  prev: { id: oop, reason: 객체를 "같다"고 볼 기준이 필요해서 }
  next: { id: collections, reason: 그 기준으로 담고 찾는 그릇 }
see_also: [hash, oop, persistence-context]
checked: '2026-09-16'
sources:
  - 'JDK 21 API Object.equals / Object.hashCode 계약 — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html#hashCode()'
  - 'Bloch, Effective Java (3판) Item 10 Obey the general contract when overriding equals, Item 11 Always override hashCode when you override equals'
  - 'JDK 21 API HashMap — 버킷 결정에 hashCode, 비교에 equals — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html'
---

## 개념

`==`는 두 변수가 **같은 객체**를 가리키는지(동일성) 본다. `equals`는 **같은 값**인지(동등성) 본다. `new Money(100)`을 두 번 만들면 `==`는 거짓이지만, `equals`를 "금액이 같으면 같다"로 정의하면 참이다. 기본 `Object.equals`는 `==`와 같으므로 값으로 비교하려면 재정의해야 한다.

`hashCode`는 객체를 정수 하나로 요약한 것이다. `HashMap`·`HashSet`은 이 숫자로 칸(버킷)을 고른 뒤 그 칸 안에서 `equals`로 확인한다. 그래서 규칙이 하나 있다 — **`equals`가 참이면 `hashCode`도 같아야 한다.** 이걸 어기면 값이 같은 키를 넣고도 못 찾는다.

`Money`를 `HashSet`에 넣고 찾아 보자.

- `equals`만 재정의하고 `hashCode`는 기본(주소 기반)인 경우: `set.add(new Money(100))` → 버킷 37에 저장. `set.contains(new Money(100))` → 새 객체의 hashCode는 주소가 달라 버킷 12를 봄 → 없음. `equals`는 부를 기회도 없었다.
- 둘 다 재정의(금액 기준)한 경우: 두 객체의 hashCode가 같아 같은 버킷 → 그 안에서 `equals` → 있음.
- 결과: `HashMap`은 "hashCode로 어디, equals로 맞는지"를 순서대로 쓰므로 둘이 짝을 이뤄야 한다.

## 왜 나왔나

객체를 "값"으로 다루려면 같음의 기준이 필요했고, 해시 기반 자료구조가 객체를 키로 쓰려면 그 값을 숫자로 요약하는 방법이 필요했다. 두 메서드를 `Object`에 두고 계약(같으면 같은 해시)을 문서로 못 박은 것이 자바의 답이다. 계약을 컴파일러가 강제하지 못하므로 사람이 지켜야 한다.

## 확인 질문

- 설명해 보기: `==`와 `equals`의 차이는?
  답: `==`는 같은 객체를 가리키는지(동일성), `equals`는 같은 값인지(동등성). 기본 `equals`는 `==`와 같다.
- 다음 상태 예측: `equals`는 금액 기준으로 재정의했는데 `hashCode`는 안 했다. `HashSet`에 `Money(100)`을 넣고 다른 `Money(100)`으로 `contains`하면?
  답: 거짓. hashCode가 달라 다른 버킷을 본다.
- 다음 상태 예측: 가변 객체를 `HashMap` 키로 넣은 뒤 그 객체의 필드를 바꿨다.
  답: hashCode가 바뀌어 원래 버킷에서 못 찾는다. 키는 불변이어야 한다.

## 심화

### 계약

`equals`는 반사적(a.equals(a)), 대칭적(a.equals(b) ⇔ b.equals(a)), 추이적, 일관적이어야 하고 null과는 거짓이다. `hashCode`는 같은 객체에서 늘 같은 값, `equals`가 같으면 같은 값, 다르면 되도록 다른 값(필수는 아니지만 성능). 상속에서 대칭성을 지키기 어렵다 — `Point`와 `ColorPoint`의 `equals`가 서로 다르게 판단하는 고전 사례(Effective Java Item 10).

### 무엇을 기준으로 삼나

값 객체(`Money`, `Email`)는 모든 값 필드. 엔티티(사용자, 주문)는 식별자(ID) 하나. 식별자가 DB에서 생성돼 저장 전엔 null인 JPA 엔티티는 저장 전후로 hashCode가 바뀌어 `Set`에서 사라지는 문제가 있어, 비즈니스 키(주문 번호)나 UUID를 미리 만들어 쓴다. `record`는 모든 컴포넌트로 `equals`/`hashCode`를 자동 생성한다.

### 구현

IDE 생성이나 `Objects.equals`/`Objects.hash(...)`. Lombok `@EqualsAndHashCode`는 편하지만 JPA 엔티티에 연관 필드까지 포함하면 지연 로딩과 순환 참조로 사고가 난다. `String`·`Integer` 같은 표준 클래스는 이미 값 기준으로 구현돼 있다 — `String`을 `==`로 비교하는 버그는 문자열 풀 때문에 가끔 참이 되어 더 위험하다.

### 실무에서는

- DTO·값 객체는 `record`로 만들면 계약이 자동으로 지켜진다.
- JPA 엔티티의 `equals`는 ID 기준 + ID가 null이면 거짓(Hibernate 권고), hashCode는 상수나 클래스 기준으로 두어 저장 전후 변화를 피하는 방식도 있다.
- `HashMap` 키·`HashSet` 원소로 쓰는 클래스는 반드시 둘 다 재정의하고 불변으로.
- 테스트에서 `assertEquals(expected, actual)`이 객체를 비교하려면 `equals`가 값 기준이어야 한다. 안 하면 "같아 보이는데 실패".

### 면접 질문

#### `equals`를 재정의하면 왜 `hashCode`도 재정의해야 하나요?

`HashMap`·`HashSet`이 `hashCode`로 버킷을 고른 뒤 그 안에서만 `equals`를 부르기 때문에, `equals`가 같은데 `hashCode`가 다르면 다른 버킷을 보게 되어 넣은 키를 못 찾습니다.
`Object`의 계약이 "`equals`가 참이면 `hashCode`도 같아야 한다"이고, 기본 `hashCode`는 객체 주소 기반이라 값이 같아도 다릅니다.
예를 들어 금액 기준 `equals`만 둔 `Money(100)`을 `HashSet`에 넣고 새 `Money(100)`으로 `contains`하면 거짓입니다. `Objects.hash(amount)`로 `hashCode`를 맞추거나 `record`를 쓰면 됩니다. 한계는 가변 필드를 기준으로 삼으면 키로 넣은 뒤 값이 바뀔 때 못 찾게 되므로 키는 불변이어야 한다는 점입니다.

- 꼬리: `hashCode`가 같은데 `equals`가 다른 건 허용되나요?
- 꼬리: `String`을 `==`로 비교하면 왜 가끔 참이 되나요?

#### JPA 엔티티의 `equals`/`hashCode`는 어떻게 구현하나요?

식별자(ID) 기준으로 `equals`를 두되 ID가 null(저장 전)이면 거짓으로 하고, `hashCode`는 저장 전후로 바뀌지 않게 상수나 클래스 기반으로 두거나 미리 생성하는 비즈니스 키·UUID를 기준으로 합니다.
자동 생성 ID는 저장 전엔 null이라 그 시점의 hashCode로 `Set`에 넣으면 저장 뒤 hashCode가 바뀌어 `contains`가 실패하고, 모든 필드를 기준으로 하면 지연 로딩 연관을 건드려 쿼리가 나가거나 순환 참조가 납니다.
그래서 Lombok `@EqualsAndHashCode`를 엔티티에 그대로 붙이지 않고, 같은 영속성 컨텍스트 안에서는 어차피 같은 ID면 같은 인스턴스라는 점(동일성 보장)을 활용합니다. 한계는 상수 hashCode는 해시 자료구조에서 성능이 떨어지므로 엔티티를 `HashSet`에 대량으로 넣는 설계 자체를 피하는 것입니다.

- 꼬리: 영속성 컨텍스트가 보장하는 동일성이란?
- 꼬리: `record`를 엔티티로 쓸 수 없는 이유는?
