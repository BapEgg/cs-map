---
id: spring-test
title: 스프링 테스트
order: 10
aliases: [단위 테스트, 통합 테스트, 슬라이스 테스트, SpringBootTest, MockMvc, Testcontainers]
card:
  one_line: '스프링 테스트는 스프링 없이 도는 단위 테스트, 한 계층만 띄우는 슬라이스 테스트, 전체를 띄우는 통합 테스트를 층으로 나눠 빠른 것을 많이, 느린 것을 적게 두는 일이다.'
  analogy: 자동차 검사 — 부품 하나를 벤치에서 돌려 보고(단위), 엔진만 시동 걸어 보고(슬라이스), 마지막에 실제로 도로를 달려 본다(통합). 도로 주행만으로 검사하면 하루가 간다
  analogy_limit: 자동차는 부품이 맞으면 대체로 달리지만 소프트웨어는 단위가 다 맞아도 조립(설정·트랜잭션 경계·직렬화)에서 깨지는 일이 흔하다. 그래서 통합 테스트를 0으로 둘 수 없다.
  keywords: [단위 → 슬라이스 → 통합, 느린 것은 적게, 실제 DB로 확인]
flow:
  prev: { id: n-plus-one, reason: 이런 문제를 배포 전에 잡으려면 }
see_also: [harness, ioc-di, spring-transaction, mvc-request-flow, persistence-context]
checked: '2026-09-16'
sources:
  - 'Spring Boot 3 레퍼런스 — Testing(@SpringBootTest, 슬라이스 @WebMvcTest·@DataJpaTest, MockMvc, 컨텍스트 캐싱) — https://docs.spring.io/spring-boot/reference/testing/index.html'
  - 'Spring Framework 6 레퍼런스 — Testing, Transaction Management in tests(기본 롤백) — https://docs.spring.io/spring-framework/reference/testing/testcontext-framework/tx.html'
  - 'Testcontainers 문서 — JDBC 지원, Spring Boot 통합 — https://java.testcontainers.org/'
---

## 개념

테스트는 층으로 나눈다. **단위 테스트**는 스프링을 띄우지 않고 클래스 하나를 순수 자바로 검사한다 — 의존은 가짜(Mockito)로 넣고, 밀리초 단위다. **슬라이스 테스트**는 한 계층만 띄운다 — `@WebMvcTest`는 컨트롤러·필터·직렬화만(서비스는 `@MockBean`), `@DataJpaTest`는 JPA·리포지토리만(내장 DB 또는 Testcontainers). **통합 테스트**는 `@SpringBootTest`로 전체 컨텍스트를 띄워 요청부터 DB까지 실제로 돌린다 — 초 단위다.

비율은 아래가 넓고 위가 좁다. 단위로 로직을 촘촘히, 슬라이스로 계층 경계(요청 변환·검증, 쿼리)를, 통합으로 대표 시나리오 몇 개를.

주문 서비스의 "재고 부족이면 실패" 규칙을 테스트하는 세 층을 보자.

- 단위: `new OrderService(mockRepo, mockStock)`. `when(mockStock.available(id)).thenReturn(0)` → `place()`가 `OutOfStockException`을 던지는지. 스프링 없음, 1ms.
- 슬라이스(`@WebMvcTest(OrderController)`): `MockMvc`로 `POST /orders`에 잘못된 JSON을 보내 400과 에러 본문 형식을 확인. 서비스는 `@MockBean`. 컨텍스트가 작아 1~2초.
- 슬라이스(`@DataJpaTest`): 리포지토리의 페치 조인 쿼리가 실제 SQL로 돌아가고 결과가 맞는지. 쿼리 수도 센다.
- 통합(`@SpringBootTest` + Testcontainers MySQL): 실제 HTTP → 컨트롤러 → 서비스 → 트랜잭션 → DB. "재고 1개에 주문 2건 동시" 같은 조립 시나리오. 5~10초.
- 결과: 규칙 자체는 단위가 잡고, 400 형식은 웹 슬라이스가, 쿼리는 JPA 슬라이스가, 트랜잭션·동시성은 통합이 잡는다. 전부 통합으로 하면 한 번 돌리는 데 분 단위가 되어 아무도 안 돌린다.

## 왜 나왔나

프레임워크가 객체를 만들고 연결하는 순간, "내 클래스"를 따로 검사하기가 어려워졌다 — 컨테이너 없이는 안 떴다. 스프링이 DI를 택한 이유의 절반은 이것이다: 생성자로 의존을 받으면 테스트에서 가짜를 넣을 수 있다. 그리고 전체를 띄우는 테스트는 느리므로, 부트가 계층별로 조금만 띄우는 슬라이스 애노테이션을 만들었다. 컨텍스트를 테스트 간에 캐시하는 것도 같은 이유다.

## 확인 질문

- 설명해 보기: 단위 테스트에 `@SpringBootTest`를 붙이지 않는 이유는?
  답: 컨텍스트를 띄우는 데 초 단위가 걸리고, 검사 대상이 클래스 하나면 스프링이 필요 없다. 생성자 주입이면 `new`로 만들고 가짜를 넣으면 된다.
- 다음 상태 예측: `@WebMvcTest(OrderController)`에서 `OrderService`를 `@MockBean`으로 안 두면?
  답: 컨텍스트가 뜨지 못한다(`OrderService` 빈이 없어 컨트롤러 주입 실패). 웹 슬라이스는 서비스 빈을 만들지 않는다.
- 다음 상태 예측: `@SpringBootTest` 테스트 메서드에 `@Transactional`을 붙이면 메서드 끝에 DB 상태는?
  답: 롤백된다. 테스트 트랜잭션은 기본이 롤백이라 DB가 깨끗이 남는다. 단, 그래서 커밋 뒤에만 나는 문제(AFTER_COMMIT 리스너, 지연 로딩 예외)는 안 보인다.

## 심화

### 컨텍스트 캐싱

같은 설정(애노테이션·프로퍼티·MockBean 조합)의 테스트 클래스들은 컨텍스트를 한 번만 띄워 재사용한다. `@MockBean`을 클래스마다 다르게 두거나 `@TestPropertySource`를 흩뿌리면 조합마다 새로 떠서 전체 시간이 늘어난다. 통합 테스트는 공통 베이스 클래스로 설정을 통일한다.

### 실제 DB로

내장 H2는 MySQL·PostgreSQL과 SQL 방언·락 동작이 달라 통과했는데 운영에서 깨지는 일이 있다. Testcontainers로 도커 컨테이너의 실제 DB를 띄운다(`@ServiceConnection`으로 부트 3.1+에서 설정 자동). 컨테이너는 JVM당 한 번 띄워 재사용(싱글턴 컨테이너 패턴).

### 테스트 트랜잭션의 함정

테스트에 `@Transactional`을 붙이면 서비스 메서드가 그 트랜잭션에 합류해 실제 경계(REQUIRES_NEW, 커밋 시점, 플러시)가 사라진다. 트랜잭션 경계 자체를 검사하는 테스트는 붙이지 말고 데이터를 직접 정리한다(`@Sql`, `TRUNCATE`). 지연 로딩도 테스트 트랜잭션 안에선 항상 성공해 운영의 `LazyInitializationException`이 안 보인다.

### 무엇을 가짜로 두나

내 코드 안의 협력자는 단위 테스트에서 Mockito로. 외부 시스템(결제 API, 메일)은 통합 테스트에서도 가짜(WireMock, 테스트용 구현 빈)로 — 실제 호출은 느리고 비결정적이며 비용이 든다. DB는 가짜로 두지 않는다 — 쿼리가 맞는지가 검사 대상이다.

### 실무에서는

- 서비스는 단위 테스트, 컨트롤러는 `@WebMvcTest`, 리포지토리의 복잡한 쿼리는 `@DataJpaTest`, 대표 시나리오 5~10개는 `@SpringBootTest`.
- 테스트 이름은 "상황 → 기대"로(`재고가_0이면_주문은_실패한다`). 실패 메시지가 곧 명세가 된다.
- 시간(`Clock`)·난수·UUID는 주입해서 테스트가 고정값을 넣게 한다.
- CI에서 전체 테스트 시간을 지표로 본다. 5분을 넘기면 병렬화·슬라이스 전환.
- AI가 쓴 코드는 테스트가 통과했는지가 유일한 검증이다(하네스 장). "동작한다"는 말 대신 초록 테스트.

### 면접 질문

#### 스프링 애플리케이션의 테스트를 어떻게 구성하나요?

세 층으로 나눕니다 — 스프링 없이 클래스 하나를 검사하는 단위 테스트(Mockito), 한 계층만 띄우는 슬라이스 테스트(`@WebMvcTest`, `@DataJpaTest`), 전체 컨텍스트에 실제 DB(Testcontainers)를 붙이는 통합 테스트(`@SpringBootTest`)입니다. 아래가 넓고 위가 좁게 둡니다.
이유는 컨텍스트를 띄우는 비용이 초 단위라 전부 통합으로 하면 느려서 안 돌리게 되고, 반대로 단위만 있으면 설정·직렬화·트랜잭션 경계·실제 SQL에서 나는 문제를 못 잡기 때문입니다.
예를 들어 재고 규칙은 단위, 400 응답 형식은 웹 슬라이스, 페치 조인 쿼리는 JPA 슬라이스, 동시 주문은 통합에서 봅니다. 한계는 테스트 `@Transactional`이 롤백해 주는 대신 실제 트랜잭션 경계와 지연 로딩 문제를 가리므로, 경계를 검사하는 테스트는 따로 둔다는 점입니다.

- 꼬리: `@MockBean`과 Mockito `@Mock`의 차이는?
- 꼬리: H2 대신 Testcontainers를 쓰는 이유는?

#### 테스트는 다 통과했는데 운영에서 `LazyInitializationException`이 났습니다. 왜 테스트가 못 잡았나요?

테스트 메서드에 `@Transactional`이 붙어 있어 테스트 전체가 하나의 트랜잭션·영속성 컨텍스트 안에서 돌았기 때문입니다. 그 안에서는 지연 로딩이 항상 성공하지만, 운영에서는 서비스 메서드가 끝나 컨텍스트가 닫힌 뒤 컨트롤러·직렬화가 연관을 건드립니다.
테스트 트랜잭션은 DB를 깨끗이 되돌리려고 붙이는 것인데, 그 부작용으로 실제 경계(트랜잭션 종료·플러시·커밋 뒤 동작)가 사라집니다.
고치려면 그 시나리오의 테스트에서 `@Transactional`을 떼고 데이터 정리를 `@Sql`로 하거나, `open-in-view=false` 상태로 실제 HTTP 요청을 보내는 통합 테스트(`TestRestTemplate`)를 둡니다. 근본적으로는 서비스 안에서 DTO로 변환해 엔티티가 트랜잭션 밖으로 나가지 않게 합니다. 한계는 이런 통합 테스트는 느리므로 대표 API 몇 개에만 둔다는 점입니다.

- 꼬리: `MockMvc`와 `TestRestTemplate`은 무엇이 다른가요?
- 꼬리: 테스트에서 커밋 뒤 이벤트(AFTER_COMMIT)를 검증하려면?
