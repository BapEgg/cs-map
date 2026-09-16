---
id: aop-proxy
title: AOP와 프록시
order: 4
aliases: [AOP, 프록시, 자기 호출, CGLIB, 관점 지향]
card:
  one_line: 'AOP는 트랜잭션·로깅처럼 여러 메서드에 걸치는 공통 일을 별도로 떼어 두고, 스프링이 빈을 프록시로 감싸 메서드 호출 앞뒤에 끼워 넣는 방식이다.'
  analogy: 비서 — 사장(원본 빈)에게 가는 모든 방문을 비서(프록시)가 먼저 받아 기록하고 안내한 뒤 넘기는 것. 사장이 자기 방 안에서 스스로를 부르면 비서는 모른다
  analogy_limit: 비서는 사람이라 방 안 일도 눈치채지만 프록시는 "밖에서 들어온 호출"만 본다. 같은 클래스 안의 호출은 프록시를 안 거친다 — 자기 호출 문제.
  keywords: [프록시가 감싼다, 밖에서 온 호출만, 자기 호출·private·final]
flow:
  prev: { id: mvc-request-flow, reason: 그 길 중간에 공통 일을 끼우려면 }
  next: { id: spring-transaction, reason: 끼워 넣는 것 중 가장 중요한 것 }
see_also: [ioc-di, bean-lifecycle, spring-transaction, oop]
checked: '2026-09-16'
sources:
  - 'Spring Framework 6 레퍼런스 — Aspect Oriented Programming with Spring, Proxying Mechanisms(JDK 동적 프록시 vs CGLIB) — https://docs.spring.io/spring-framework/reference/core/aop/proxying.html'
  - 'Spring Framework 6 레퍼런스 — Understanding AOP Proxies(자기 호출 문제) — https://docs.spring.io/spring-framework/reference/core/aop/proxying.html#aop-understanding-aop-proxies'
  - 'Spring Boot 3 — spring.aop.proxy-target-class 기본 true(CGLIB) — https://docs.spring.io/spring-boot/appendix/application-properties/index.html'
---

## 개념

트랜잭션 시작·커밋, 실행 시간 로깅, 권한 확인은 수십 개 메서드에 똑같이 들어간다. 매번 쓰면 비즈니스 코드가 묻힌다. AOP는 이런 **공통 관심사를 한 곳(애스펙트)에 쓰고, "어떤 메서드 앞뒤에 끼울지"만 지정**하게 한다. `@Transactional`이 그 대표다.

스프링은 이것을 **프록시**로 구현한다. 컨테이너가 원본 빈 대신 그것을 감싼 가짜 객체를 주입하고, 가짜의 메서드가 불리면 앞뒤 일을 한 뒤 원본에 위임한다. 그래서 프록시를 거치지 않는 호출(같은 객체 안에서 자기 메서드 호출, `new`로 만든 객체)에는 아무것도 안 붙는다.

`@Transactional`이 붙은 `OrderService.place()`를 컨트롤러가 부르는 과정을 따라가 보자.

- 시작: 컨테이너가 `OrderService`를 만든 뒤 `@Transactional`을 보고 CGLIB로 하위 클래스 프록시를 만들어 컨트롤러에는 **프록시**를 주입한다.
- 호출: 컨트롤러가 `orderService.place()` → 프록시의 `place()`가 먼저 실행 → 트랜잭션 시작 → 원본 `place()` 호출 → 정상 반환이면 커밋, 예외면 롤백.
- 자기 호출: 원본 `place()` 안에서 `this.notify()`(역시 `@Transactional(REQUIRES_NEW)`)를 부르면 `this`는 원본이라 프록시를 안 거친다 → 새 트랜잭션이 안 열린다.
- 결과: 밖에서 온 호출에는 붙고, 안에서 자기를 부른 것에는 안 붙는다. 이것이 "왜 `@Transactional`이 안 먹지"의 1순위 원인이다.

## 왜 나왔나

로깅·트랜잭션·보안 같은 일은 특정 클래스의 책임이 아니라 여러 클래스를 가로지른다(횡단 관심사). 각 메서드에 흩어 놓으면 중복되고 빠뜨리기 쉬웠다. 그것을 한 곳에 모으고 선언으로 붙이는 것이 AOP이고, 자바에서 바이트코드를 바꾸지 않고 하려면 객체를 감싸는 프록시가 가장 단순했다. 스프링 트랜잭션 관리가 이 위에 서 있다.

## 확인 질문

- 설명해 보기: 프록시가 부가 기능을 끼워 넣는 조건은?
  답: 호출이 프록시를 거쳐야 한다. 즉 컨테이너가 주입한 빈 객체를 통해 밖에서 불러야 한다.
- 다음 상태 예측: 같은 클래스 안에서 `public void a() { b(); }`, `@Transactional b()`일 때 `a()`를 밖에서 부르면 `b`에 트랜잭션이 걸리나?
  답: 안 걸린다. `a` 안의 `b()`는 `this.b()`라 프록시를 안 거친다.
- 다음 상태 예측: `@Transactional`을 `private` 메서드에 붙이면?
  답: 동작하지 않는다. CGLIB 프록시는 하위 클래스라 `private`을 재정의할 수 없다. `final` 클래스·메서드도 마찬가지.

## 심화

### 두 가지 프록시

JDK 동적 프록시는 인터페이스를 구현한 가짜 객체를 만든다 — 인터페이스가 있어야 하고, 인터페이스 타입으로만 주입받을 수 있다. CGLIB 프록시는 원본 클래스를 상속한 하위 클래스를 만든다 — 인터페이스가 없어도 되지만 `final` 클래스·메서드와 `private`은 못 감싼다. 스프링 부트는 기본으로 CGLIB(`proxyTargetClass=true`)를 쓴다. 생성자에서 부가 로직이 도는 클래스는 프록시 생성 때 한 번 더 도는 점에 주의.

### 자기 호출 해결

세 방향 중 고른다 — 트랜잭션이 필요한 메서드를 다른 빈으로 분리(가장 깔끔), 자기 자신을 빈으로 주입받아(`@Lazy` 또는 `ObjectProvider`) 그 참조로 호출, `TransactionTemplate`으로 프로그램적으로 트랜잭션을 연다. `AopContext.currentProxy()`는 설정이 필요하고 코드가 AOP에 의존하게 되어 권하지 않는다.

### 애스펙트 직접 쓰기

`@Aspect` 클래스에 `@Around("execution(* com.shop.service..*(..))")`처럼 포인트컷을 두고 `ProceedingJoinPoint.proceed()` 앞뒤에 로직을 둔다. 실행 시간 측정, 재시도(`@Retryable`), 캐시(`@Cacheable`), 권한(`@PreAuthorize`)이 모두 이 구조다. 애스펙트가 여럿이면 `@Order`로 순서를 정한다(트랜잭션보다 캐시가 바깥인지 안인지가 동작을 바꾼다).

### 실무에서는

- "`@Transactional`이 안 먹는다" → 자기 호출, private, `new`로 만든 객체, 다른 스레드(`@Async`, 스트림 병렬) 중 하나다.
- `@Async`·`@Cacheable`·`@Retryable`도 같은 프록시라 같은 제약을 받는다.
- 프록시 객체의 클래스는 `OrderService$$SpringCGLIB$$0` 같은 이름이다. `getClass()`로 원본을 기대하는 코드(리플렉션, 로그)에서 놀라지 않도록.
- 컨트롤러에 `@Transactional`을 두는 것보다 서비스에 두어 요청 처리 시간 전체가 트랜잭션이 되지 않게 한다.

### 면접 질문

#### 스프링 AOP는 어떻게 동작하고, 왜 자기 호출에는 적용되지 않나요?

컨테이너가 빈을 만든 뒤 `@Transactional` 같은 부가 기능이 필요한 빈을 프록시(JDK 동적 프록시 또는 CGLIB 하위 클래스)로 감싸 그 프록시를 주입하고, 프록시의 메서드가 불릴 때 앞뒤 로직을 실행한 뒤 원본에 위임합니다.
같은 객체 안에서 `this.method()`로 부르면 원본 객체의 메서드를 직접 부르는 것이라 프록시를 거치지 않으므로 아무 부가 기능도 붙지 않습니다.
예를 들어 `place()` 안에서 `this.notify()`(REQUIRES_NEW)를 불러도 새 트랜잭션은 열리지 않습니다. 해결은 다른 빈으로 분리하거나 자기 자신을 주입받아 프록시 참조로 호출하는 것입니다. 한계는 `private`·`final`도 CGLIB가 감쌀 수 없고, `new`로 만든 객체나 다른 스레드에서의 호출에도 적용되지 않는다는 점입니다.

- 꼬리: JDK 동적 프록시와 CGLIB의 차이는?
- 꼬리: `@Transactional`을 `private` 메서드에 붙이면 어떻게 되나요?

#### `@Transactional`을 붙였는데 롤백이 안 됩니다. 어떤 순서로 확인하나요?

프록시를 거쳤는지부터 봅니다 — 같은 클래스 안 자기 호출인지, `private`/`final`인지, `new`로 만든 객체인지, `@Async`나 병렬 스트림으로 다른 스레드에서 도는지. 그다음 예외 종류를 봅니다 — checked 예외는 기본으로 롤백하지 않으며(`rollbackFor` 필요), 예외를 안에서 잡아 삼키면 정상 종료로 보여 커밋됩니다.
프록시는 밖에서 온 호출에만 붙고, 롤백 판단은 프록시가 예외를 "보는" 경우에만 일어나기 때문입니다.
마지막으로 트랜잭션 매니저가 그 데이터소스에 맞는지, 여러 데이터소스면 어느 매니저가 쓰였는지, JPA면 플러시 시점을 확인합니다. `logging.level.org.springframework.transaction=DEBUG`로 트랜잭션이 실제로 열리는지 로그로 확인하는 것이 빠릅니다.

- 꼬리: 예외를 catch한 뒤 롤백만 시키려면?
- 꼬리: `@Async` 메서드 안의 `@Transactional`은 어떻게 동작하나요?
