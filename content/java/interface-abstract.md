---
id: interface-abstract
title: 인터페이스와 추상 클래스
order: 5
aliases: [인터페이스, 추상 클래스, default 메서드, 다중 구현, abstract]
card:
  one_line: '인터페이스는 "무엇을 할 수 있나"만 약속하고 여러 개를 구현할 수 있으며, 추상 클래스는 공통 상태·구현을 물려주되 하나만 상속할 수 있다. 타입(역할)이 필요하면 인터페이스, 공통 구현을 공유하는 뼈대가 필요하면 추상 클래스다.'
  analogy: 인터페이스는 자격증(할 수 있는 일의 목록, 여러 개 가질 수 있음), 추상 클래스는 가업(부모의 도구와 방식을 물려받되 한 집안만)
  analogy_limit: 자격증은 능력만 증명하지만 Java 8+ 인터페이스는 default 메서드로 구현도 조금 줄 수 있다. 그래도 필드(상태)는 못 준다 — 그것이 남은 경계다.
  keywords: [인터페이스 = 역할·다중 구현, 추상 클래스 = 공통 뼈대·단일 상속, 상태를 공유하나]
flow:
  prev: { id: oop, reason: 다형성을 어떤 형태로 선언하나 }
  next: { id: equals-hashcode, reason: 객체를 "같다"고 볼 기준이 필요해서 }
see_also: [oop, ioc-di, generics, collections]
checked: '2026-09-16'
sources:
  - 'JLS §9 Interfaces(default·static·private 메서드), §8.1.1.1 abstract Classes — https://docs.oracle.com/javase/specs/jls/se17/html/jls-9.html'
  - 'Oracle Java Tutorials — Abstract Methods and Classes(인터페이스와 추상 클래스 비교 절) — https://docs.oracle.com/javase/tutorial/java/IandI/abstract.html'
  - 'Bloch, Effective Java (3판) Item 20 Prefer interfaces to abstract classes, Item 21 Design interfaces for posterity'
---

## 개념

**인터페이스**는 메서드 시그니처의 목록이다 — "이 타입은 이런 일을 할 수 있다"는 약속만 있고 상태(필드)는 없다. 클래스는 인터페이스를 **여러 개** 구현할 수 있다. `List`, `Comparable`, `Runnable`이 인터페이스다. **추상 클래스**는 일부 메서드를 구현해 두고 일부는 `abstract`로 비워 둔 클래스다. 필드와 생성자를 가질 수 있고, 자식은 **하나만** 상속한다. `AbstractList`, `HttpServlet`이 추상 클래스다.

고르는 기준은 "무엇을 공유하나"다. **역할(타입)** 을 정의해 서로 무관한 클래스들이 같은 방식으로 다뤄지게 하려면 인터페이스. 관련 있는 클래스들이 **공통 상태와 구현**을 나눠 갖는 뼈대가 필요하면 추상 클래스. 둘을 같이 쓰는 것도 흔하다 — 인터페이스로 역할을 정하고, 추상 클래스로 기본 구현을 주고(`List` ← `AbstractList` ← `ArrayList`).

#### 예시 — 결제 수단

```java
interface Payment {                       // 역할: 결제할 수 있다
    Receipt pay(Money amount);
    default boolean supports(Currency c) { return c == Currency.KRW; } // Java 8+
}

abstract class CardPayment implements Payment {   // 카드 결제의 공통 뼈대
    protected final CardGateway gateway;          // 상태
    CardPayment(CardGateway g) { gateway = g; }
    public Receipt pay(Money amount) {            // 공통 절차
        gateway.authorize(amount);
        return capture(amount);
    }
    protected abstract Receipt capture(Money amount); // 카드사마다 다른 부분
}

class KakaoPay implements Payment { … }           // 카드가 아니라 뼈대 안 씀
class ShinhanCard extends CardPayment { … }       // 뼈대 재사용
```

`List<Payment>`에 둘 다 담아 `pay()`를 부를 수 있다 — 역할은 인터페이스가 준다.

#### 비교 — 무엇이 다른가

| | 인터페이스 | 추상 클래스 |
|---|---|---|
| 상태(필드) | 상수(`static final`)만 | 인스턴스 필드 가능 |
| 생성자 | 없음 | 있음(자식이 `super(...)`로 호출) |
| 구현 메서드 | `default`·`static`·`private`(Java 8/9+) | 자유롭게 |
| 개수 | 여러 개 구현 | 하나만 상속 |
| 접근 제한 | 메서드는 모두 `public` | `protected` 등 가능 |
| 쓰임 | 역할·타입, 바꿔 끼우기, 테스트 대역 | 템플릿(공통 절차) + 변하는 부분만 자식이 |

## 왜 나왔나

C++의 다중 상속은 두 부모가 같은 이름의 구현을 가질 때 무엇을 물려받는지(다이아몬드 문제)가 복잡했다. 자바는 구현 상속을 하나로 제한하고, "타입"은 여러 개 가질 수 있게 인터페이스를 따로 뒀다 — 구현은 하나에서, 역할은 여럿에서. 나중에 인터페이스에 메서드를 추가하면 모든 구현체가 깨지는 문제 때문에 Java 8에 `default` 메서드가 들어왔고(`List.sort`가 그 예), 그러면서 인터페이스와 추상 클래스의 거리는 좁아졌지만 "상태를 가질 수 있나"의 경계는 남았다.

## 확인 질문

- 설명해 보기: 인터페이스와 추상 클래스 중 무엇을 고를지 한 문장으로 기준을 말해 보세요.
  답: 서로 무관한 클래스에 같은 역할을 주려면 인터페이스, 관련 클래스들이 공통 상태·절차를 나눠 가지면 추상 클래스.
- 다음 상태 예측: 인터페이스 `A`와 `B`가 같은 시그니처의 `default void run()`을 갖고 `class C implements A, B`면?
  답: 컴파일 오류. `C`가 `run()`을 직접 오버라이드해 `A.super.run()` 등으로 골라야 한다.
- 다음 상태 예측: 추상 클래스에 `abstract` 메서드가 하나도 없으면?
  답: 가능하다. `abstract`는 "인스턴스를 직접 못 만든다"는 뜻일 뿐이다. 반대로 `abstract` 메서드가 있으면 클래스도 반드시 `abstract`.

## 심화

### 템플릿 메서드와 전략

추상 클래스의 대표 쓰임은 템플릿 메서드 — 부모가 절차의 뼈대(`pay`)를 정하고 변하는 단계(`capture`)만 자식이 채운다. 같은 일을 인터페이스로 하면 전략 패턴 — 변하는 단계를 별도 객체(`CaptureStrategy`)로 만들어 주입한다. 상속 대신 조합이라 테스트·교체가 쉽고, 스프링에서는 대개 이쪽이다(객체 설계 장).

### default 메서드의 용도와 한계

기존 인터페이스에 메서드를 추가할 때 구현체를 안 깨뜨리는 것이 주 목적이다(`Collection.stream`). 편의 메서드(`Comparator.reversed`)에도 쓴다. 구현체가 있어야 할 로직을 default에 몰아넣으면 인터페이스가 "필드 없는 추상 클래스"가 되어 읽기 어렵다. `private` 메서드(Java 9+)는 default들의 공통 코드용.

### 봉인(sealed)과 record

Java 17의 `sealed interface Shape permits Circle, Square`는 구현체를 열거해 `switch`에서 빠짐없이 다루게 한다. `record`는 인터페이스를 구현할 수 있지만 추상 클래스는 상속할 수 없다(record는 암묵적으로 final이고 다른 클래스를 extends 못 함). 값 타입 + 역할은 record + 인터페이스 조합이다.

### 실무에서는

- 스프링 서비스·리포지토리는 인터페이스에 의존하게 하고 구현을 주입한다. 다만 구현이 하나뿐이고 테스트 대역도 Mockito로 만들 수 있으면 인터페이스를 미리 뽑지 않는다(oop 장).
- 공통 절차가 정말 있을 때만 추상 클래스(`BaseEntity`의 생성·수정 시각 같은 공통 필드). `BaseService` 같은 신 클래스는 피한다.
- 함수형 인터페이스(메서드 하나)는 람다로 구현한다(람다 장). `@FunctionalInterface`로 표시.
- 인터페이스에 상수를 모아 두는 "상수 인터페이스"는 안티패턴(Effective Java Item 22) — 구현체의 공개 API가 상수로 오염된다.

### 면접 질문

#### 인터페이스와 추상 클래스의 차이는 무엇이고, 언제 무엇을 쓰나요?

인터페이스는 상태 없이 메서드 시그니처(와 default 구현)만 정하는 역할의 약속으로 여러 개 구현할 수 있고, 추상 클래스는 필드·생성자·구현을 가진 뼈대로 하나만 상속합니다. 서로 무관한 클래스에 같은 타입을 주거나 바꿔 끼우려면 인터페이스, 관련 클래스들이 공통 상태와 절차를 공유하면 추상 클래스입니다.
자바가 구현 상속을 하나로 제한하고 타입은 여럿 가질 수 있게 나눈 것이라, "상태를 공유하나"가 실질적 경계입니다.
예를 들어 `Payment`는 인터페이스로 두어 카카오페이와 카드가 같은 목록에 들어가게 하고, 카드사들의 공통 승인 절차는 `CardPayment` 추상 클래스로 둡니다. 한계는 Java 8+ default 메서드로 인터페이스도 구현을 가질 수 있어 경계가 흐려졌고, 추상 클래스의 템플릿 메서드는 상속이라 조합(전략 주입)보다 테스트·교체가 어렵다는 점입니다.

- 오답: "인터페이스는 구현이 전혀 없다" — Java 8부터 default·static, 9부터 private 메서드로 구현을 가질 수 있다. 못 갖는 건 인스턴스 필드다.
- 오답: "추상 클래스는 abstract 메서드가 있어야 한다" — 없어도 된다. 인스턴스화를 막는 것이 abstract의 뜻이다.
- 꼬리: default 메서드가 왜 도입됐나요?
- 꼬리: 두 인터페이스의 default 메서드가 충돌하면?

#### 결제 수단이 카드·계좌이체·간편결제로 늘어납니다. 어떻게 설계하나요?

`Payment` 인터페이스로 "결제한다"는 역할을 정하고 수단마다 구현체를 두어, 주문 서비스는 `Payment`에만 의존하고 스프링이 수단별 빈을 주입하게 합니다. 카드사들처럼 공통 절차가 있는 묶음만 추상 클래스로 뼈대를 공유합니다.
새 수단이 생겨도 기존 코드를 고치지 않고 구현체 하나를 추가하면 되기 때문입니다(개방-폐쇄).
예를 들어 `Map<PaymentType, Payment>`로 빈들을 모아 요청의 결제 타입으로 고르고, 테스트에서는 가짜 `Payment`를 넣습니다. 한계는 수단마다 입력 정보가 다르면(카드 번호 vs 계좌) 인터페이스 시그니처가 억지로 넓어지므로, 요청 객체를 수단별 타입으로 나누거나 검증을 각 구현체 안에 두어야 한다는 점입니다.

- 오답: "`if (type == CARD) … else if (type == BANK) …`로 분기한다" — 수단이 늘 때마다 모든 분기를 고쳐야 하고 테스트가 얽힌다.
- 꼬리: 스프링에서 같은 인터페이스의 빈이 여럿일 때 어떻게 고르나요?
