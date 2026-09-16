---
id: ioc-di
title: IoC/DI
order: 1
aliases: [IoC, DI, 의존성 주입, 제어의 역전, 빈, 컨테이너]
card:
  one_line: 'IoC/DI는 객체가 필요한 것을 직접 new 하지 않고 컨테이너가 만들어 넣어 주게 해서, 구현을 바꿔 끼우고 테스트에서 대체할 수 있게 하는 방식이다.'
  analogy: 요리사가 재료를 직접 사 오지 않고 주방장이 준비해 준 재료를 받아 쓰는 것 — 재료 공급처를 바꿔도 요리법은 그대로
  analogy_limit: 주방장은 사람이라 필요한 재료를 알아서 짐작하지만 컨테이너는 선언(생성자·어노테이션)된 것만 넣어 준다. 안 적으면 안 온다.
  keywords: [new를 안 한다, 인터페이스에 의존, 생성자 주입]
flow:
  next: { id: bean-lifecycle, reason: 컨테이너가 만든 객체는 언제 생기고 사라지나 }
see_also: [oop, spring-test, aop-proxy]
checked: '2026-09-16'
sources:
  - 'Spring Framework 6 레퍼런스 — The IoC Container, Dependency Injection — https://docs.spring.io/spring-framework/reference/core/beans.html'
  - 'Spring Framework 레퍼런스 — Constructor-based vs Setter-based DI(생성자 주입 권장) — https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html'
  - 'Fowler, Inversion of Control Containers and the Dependency Injection pattern (2004) — https://martinfowler.com/articles/injection.html'
---

## 개념

`OrderService`가 결제를 하려면 `Payment` 구현이 필요하다. 직접 `new CardPayment()`를 하면 `OrderService`는 카드 결제에 묶이고, 테스트에서 실제 결제를 피할 수 없다. **DI**(의존성 주입)는 필요한 것을 **밖에서 넣어 주는** 방식이다 — 생성자 매개변수로 받는다. **IoC**(제어의 역전)는 "누가 객체를 만들고 연결하나"의 주도권이 내 코드에서 컨테이너로 넘어갔다는 뜻이다.

스프링 컨테이너는 `@Component`·`@Service` 등이 붙은 클래스를 찾아 객체(빈)를 만들고, 생성자가 요구하는 타입의 빈을 찾아 넣어 준다. 기본적으로 클래스당 하나(싱글턴)를 만들어 모든 곳에 같은 객체를 준다.

주문 서비스가 만들어지는 과정을 따라가 보자.

- 선언: `@Service class OrderService { OrderService(Payment payment, OrderRepository repo) {…} }`, `@Component class CardPayment implements Payment`.
- 시작: 컨테이너가 클래스패스를 훑어 빈 정의를 모은다. `OrderService`를 만들려면 `Payment`와 `OrderRepository`가 필요함을 생성자에서 읽는다.
- 주입: `Payment` 타입의 빈 `CardPayment`를 먼저 만들고(없으면 만들고), `OrderService` 생성자에 넣어 만든다.
- 결과: `OrderService`는 `Payment`가 무엇인지 모른다. 테스트에서는 `new OrderService(new FakePayment(), fakeRepo)`로 컨테이너 없이도 만든다.

## 왜 나왔나

객체가 자기 의존 대상을 직접 만들면 구현에 묶이고, 의존 관계가 깊어질수록 `new`의 사슬이 온 코드에 퍼지며, 테스트에서 실제 DB·결제를 떼어 낼 수 없었다. "만드는 책임을 바깥으로 빼자"는 것이 IoC, "필요한 것은 밖에서 넣어 주자"가 DI다. 스프링은 이것을 컨테이너로 자동화해, 개발자는 클래스와 생성자만 쓰면 되게 했다.

## 확인 질문

- 설명해 보기: DI가 없을 때와 있을 때 테스트가 어떻게 달라지나?
  답: 없으면 `OrderService` 안의 `new CardPayment()` 때문에 실제 결제 없이 테스트할 수 없다. 있으면 생성자에 가짜 `Payment`를 넣어 돌린다.
- 다음 상태 예측: `Payment` 구현 빈이 둘(`CardPayment`, `BankPayment`)이면 주입은?
  답: 실패한다(`NoUniqueBeanDefinitionException`). `@Primary`나 `@Qualifier`로 골라 줘야 한다.
- 다음 상태 예측: 싱글턴 빈 `OrderService`를 세 컨트롤러가 주입받으면 객체는 몇 개?
  답: 하나. 셋 다 같은 객체를 받는다. 그래서 빈에 요청별 상태를 필드로 두면 안 된다.

## 심화

### 주입 방법 — 생성자 주입을 쓴다

생성자 주입은 의존이 `final`로 고정되고, 없으면 객체를 만들 수도 없어 빠뜨림이 시작 때 드러나며, 순환 참조가 시작 시점에 오류로 잡히고, 테스트에서 `new`로 만들기 쉽다. 필드 주입(`@Autowired` 필드)은 편하지만 `final`이 안 되고 컨테이너 없이 만들 수 없어 스프링 팀도 생성자 주입을 권한다. 생성자가 하나면 `@Autowired`를 생략해도 된다.

### 빈 등록 방법

컴포넌트 스캔(`@Component`, `@Service`, `@Repository`, `@Controller`)은 내 코드에, `@Configuration` + `@Bean` 메서드는 외부 라이브러리 객체나 조건부 생성에 쓴다. 스프링 부트의 자동 설정은 클래스패스와 설정 값에 따라 `@Bean`을 조건부(`@ConditionalOnMissingBean` 등)로 등록한 것이다 — 내가 같은 타입 빈을 만들면 자동 설정이 물러난다.

### 인터페이스에 의존하기

DI의 이득은 "인터페이스에 의존할 때" 난다. `CardPayment`를 직접 주입받으면 바꿔 끼울 수 없다. 다만 구현이 하나뿐이고 바꿀 계획이 없는 리포지토리·서비스까지 인터페이스를 미리 만드는 것은 과하다 — 두 번째 구현이나 테스트 대체가 필요할 때 뽑는다.

### 순환 참조

A가 B를, B가 A를 생성자로 요구하면 만들 수 없다. 스프링 부트 2.6+는 기본으로 거부한다. 해결은 설계를 고치는 것(공통 부분을 C로 빼기, 한쪽을 이벤트로)이고, `@Lazy`는 증상만 늦춘다. 그래프 장의 순환 탐지가 컨테이너 시작 때 일어나는 셈이다.

### 실무에서는

- 클래스에 `private final` 필드 + 생성자(Lombok `@RequiredArgsConstructor`)가 표준형.
- `@Transactional`·`@Cacheable`은 프록시로 동작하므로 빈으로 주입받은 객체를 통해 불러야 한다(AOP 장). `new`로 만든 객체엔 안 붙는다.
- 테스트는 단위(생성자로 직접 조립) → 슬라이스(`@WebMvcTest`) → 통합(`@SpringBootTest`) 순으로 가볍게. 전부 `@SpringBootTest`면 느리다.
- 빈이 너무 많은 것을 주입받으면(생성자 매개변수 8개↑) 책임이 과한 신호다.

### 면접 질문

#### IoC와 DI는 무엇이고 왜 쓰나요?

IoC는 객체를 만들고 연결하는 주도권이 내 코드에서 컨테이너로 넘어간 것이고, DI는 객체가 필요한 것을 직접 만들지 않고 밖에서(생성자로) 받는 것입니다. 구현에 묶이지 않게 하고 테스트에서 대체할 수 있게 하려고 씁니다.
객체가 `new`로 의존을 만들면 그 구현에 고정되고 테스트에서 실제 DB·결제를 떼어 낼 수 없지만, 인터페이스를 생성자로 받으면 컨테이너가 실제 구현을, 테스트가 가짜를 넣습니다.
예를 들어 `OrderService(Payment payment)`는 운영에선 `CardPayment`, 테스트에선 `FakePayment`를 받습니다. 한계는 구현이 하나뿐인데 인터페이스를 남발하면 간접 계층만 늘고, 컨테이너가 만든 프록시를 우회하면(`new`, 자기 호출) `@Transactional` 같은 부가 기능이 안 붙는다는 점입니다.

- 꼬리: 생성자 주입을 권하는 이유 세 가지는?
- 꼬리: 같은 타입의 빈이 둘이면 어떻게 고르나요?

#### 순환 참조 오류로 애플리케이션이 안 뜹니다. 어떻게 하나요?

두 빈이 서로를 생성자로 요구하는 설계 문제이므로, 공통 책임을 제3의 빈으로 빼거나 한쪽 호출을 이벤트·콜백으로 바꿔 순환을 끊습니다.
생성자 주입은 순환이면 어느 쪽도 먼저 만들 수 없어 시작 때 실패하는데, 이것이 오히려 이점입니다 — 필드 주입이나 `@Lazy`로 넘기면 실행 중에야 드러나는 문제를 덮게 됩니다.
예를 들어 `OrderService`가 `PaymentService`를, `PaymentService`가 주문 상태 갱신을 위해 `OrderService`를 부른다면, 결제 완료를 이벤트(`ApplicationEventPublisher`)로 알리고 주문 쪽이 듣게 하면 한 방향이 됩니다. 한계는 이벤트로 바꾸면 흐름이 눈에 덜 보이므로 이름과 문서로 드러내야 한다는 점입니다.

- 꼬리: `@Lazy`로 푸는 것은 왜 임시방편인가요?
- 꼬리: 스프링 부트가 순환 참조를 기본으로 막는 버전은?
