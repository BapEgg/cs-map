---
id: spring-transaction
title: 스프링 트랜잭션
order: 6
aliases: ['@Transactional', 전파, 롤백 규칙, readOnly]
card:
  one_line: '@Transactional은 프록시가 메서드 앞에서 트랜잭션을 열고 정상 종료면 커밋, RuntimeException이면 롤백하게 하며, 전파 옵션으로 안팎 트랜잭션을 합칠지 나눌지 정한다.'
  analogy: 메서드 전체를 하나의 봉투에 넣어 보내는 것 — 봉투 안 어느 장이 잘못되면 봉투째 반송(롤백)되고, 봉투 안에서 또 봉투를 만들지(REQUIRES_NEW)는 옵션이다
  analogy_limit: 봉투는 눈에 보이지만 트랜잭션 경계는 코드에 안 보인다. 프록시를 안 거친 호출, checked 예외, 삼킨 예외에서 봉투가 없거나 반송이 안 되는데 코드만 봐선 모른다.
  keywords: [프록시 경계, 롤백은 RuntimeException, REQUIRED vs REQUIRES_NEW]
flow:
  prev: { id: aop-proxy, reason: 끼워 넣는 것 중 가장 중요한 것 }
  next: { id: persistence-context, reason: 트랜잭션 안에서 엔티티는 어떻게 관리되나 }
see_also: [transaction-acid, isolation-level, aop-proxy, exceptions, db-lock]
checked: '2026-09-16'
sources:
  - 'Spring Framework 6 레퍼런스 — Declarative Transaction Management, Rolling Back(기본: RuntimeException·Error) — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html'
  - 'Spring Framework 6 레퍼런스 — Transaction Propagation(REQUIRED 기본, REQUIRES_NEW) — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html'
  - 'Spring Framework 6 API — @Transactional(readOnly, isolation, timeout, rollbackFor) — https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/transaction/annotation/Transactional.html'
---

## 개념

DB 장의 트랜잭션(BEGIN → 쓰기들 → COMMIT/ROLLBACK)을 코드에서 매번 열고 닫으면 빠뜨리기 쉽다. `@Transactional`을 메서드에 붙이면 **프록시가 메서드 시작에 트랜잭션을 열고, 정상 종료면 커밋, `RuntimeException`이나 `Error`가 나오면 롤백**한다. 메서드 안의 모든 DB 작업이 같은 연결·같은 트랜잭션에서 돈다.

트랜잭션 메서드가 다른 트랜잭션 메서드를 부르면 어떻게 할지가 **전파**다. 기본 `REQUIRED`는 "이미 있으면 거기 합류, 없으면 새로". `REQUIRES_NEW`는 "항상 새로 열고 바깥은 잠시 멈춤" — 바깥이 롤백돼도 안쪽은 남는다(감사 로그).

주문 생성과 재고 차감을 한 트랜잭션으로 묶어 보자.

- `@Transactional place()` 호출 → 프록시가 트랜잭션 시작, 연결 하나를 잡아 스레드에 묶는다.
- 안에서 `orderRepository.save(order)` → `stockService.decrease(id, qty)`(`@Transactional`, REQUIRED) → 같은 트랜잭션에 합류. 재고 부족이면 `OutOfStockException`(RuntimeException) 던짐.
- 예외가 `place()`를 빠져나와 프록시에 닿음 → 롤백. 저장했던 주문도 취소된다.
- 결과: "주문은 남았는데 재고는 안 줄어든" 상태가 생기지 않는다. 만약 `decrease`가 REQUIRES_NEW였다면 재고만 별도 트랜잭션이라 주문 롤백과 무관하게 커밋됐을 것이다.

## 왜 나왔나

JDBC로 트랜잭션을 쓰려면 연결을 얻고, 자동 커밋을 끄고, try/catch/finally로 커밋·롤백·반납을 매번 써야 했고, 서비스 메서드가 서로를 부를 때 같은 연결을 넘기는 것도 손으로 했다. 스프링은 트랜잭션 경계를 선언으로 바꾸고(AOP), 연결을 스레드에 묶어 안쪽 호출이 자동으로 합류하게 했다. 기술(JDBC·JPA·JMS)이 달라도 같은 애노테이션으로 통일한 것도 목적이었다.

## 확인 질문

- 설명해 보기: `@Transactional` 메서드가 커밋되는 조건과 롤백되는 조건은?
  답: 예외 없이 끝나면 커밋, `RuntimeException`·`Error`가 메서드 밖으로 나가면 롤백. checked 예외는 기본 커밋.
- 다음 상태 예측: `place()`(REQUIRED) 안에서 `audit.log()`(REQUIRES_NEW)를 부른 뒤 `place()`가 예외로 롤백되면 감사 로그는?
  답: 남는다. 별도 트랜잭션으로 이미 커밋됐다.
- 다음 상태 예측: `@Transactional` 메서드 안에서 `IOException`을 던지면?
  답: 롤백되지 않고 커밋된다. `@Transactional(rollbackFor = Exception.class)`를 붙여야 롤백.

## 심화

### 롤백 규칙

기본은 unchecked(`RuntimeException`, `Error`)만 롤백. checked는 "복구 가능한 실패"로 보아 커밋한다는 EJB 시절의 관례다. 도메인 예외를 unchecked로 두거나 `rollbackFor`를 명시한다. 안쪽 REQUIRED 메서드에서 예외가 났는데 바깥이 잡아 삼키면, 트랜잭션은 이미 rollback-only로 표시돼 바깥 커밋 시 `UnexpectedRollbackException`이 난다 — "잡았는데 왜 실패하지"의 정체.

### 전파 옵션

| 옵션 | 바깥 트랜잭션이 있을 때 | 없을 때 |
|---|---|---|
| REQUIRED (기본) | 합류 | 새로 시작 |
| REQUIRES_NEW | 바깥을 멈추고 새로(연결 하나 더) | 새로 시작 |
| SUPPORTS | 합류 | 트랜잭션 없이 |
| MANDATORY | 합류 | 예외 |
| NOT_SUPPORTED | 바깥을 멈추고 트랜잭션 없이 | 없이 |
| NEVER | 예외 | 없이 |
| NESTED | 세이브포인트(JDBC만) | 새로 시작 |

REQUIRES_NEW는 연결을 하나 더 잡으므로 커넥션 풀이 작으면 자기 자신을 기다리는 교착이 난다(교착상태 장의 커넥션 풀 교착).

### readOnly·timeout·isolation

`readOnly = true`는 JPA에 플러시 생략을 알리고(변경 감지 비용 절감), 드라이버에 힌트를 주며, 읽기 복제본 라우팅의 기준으로 쓴다. 쓰기를 막는 것은 DB·드라이버에 따라 다르다. `timeout`은 지정 초를 넘기면 롤백. `isolation`은 DB 기본(MySQL RR, PostgreSQL RC)을 바꿀 때만.

### 경계를 어디에 두나

서비스 메서드가 표준이다. 컨트롤러에 두면 요청 처리 전체(직렬화 포함)가 트랜잭션이 되고, 리포지토리에 두면 여러 리포지토리 호출이 묶이지 않는다. 트랜잭션 안에서 외부 API·메일 발송을 하면 응답 시간만큼 락과 연결이 묶이고 롤백도 안 되므로 밖으로 뺀다(`@TransactionalEventListener(AFTER_COMMIT)`가 그 자리).

### 실무에서는

- 조회 메서드에 `readOnly = true`. 변경 감지를 안 하니 JPA에서 눈에 띄게 가볍다.
- 트랜잭션 안에서 `Thread.sleep`, 외부 HTTP, 큰 파일 처리 금지 — 연결·락을 붙든다.
- 이벤트 기반 후속 처리(알림·색인)는 `AFTER_COMMIT` 리스너에서. 리스너 안에서 DB를 쓰려면 `REQUIRES_NEW`.
- 테스트의 `@Transactional`은 메서드 끝에 롤백해 DB를 깨끗이 두지만, 그 때문에 운영에서 나는 플러시·지연 로딩 문제가 테스트에선 안 나기도 한다.
- `logging.level.org.springframework.orm.jpa=DEBUG` / `…transaction=DEBUG`로 경계를 눈으로 확인한다.

### 면접 질문

#### `@Transactional`은 어떻게 동작하고, 전파 속성은 무엇인가요?

프록시가 메서드 호출 앞에서 트랜잭션을 열어 연결을 스레드에 묶고, 정상 종료면 커밋, `RuntimeException`·`Error`가 나오면 롤백합니다. 전파 속성은 트랜잭션 메서드가 다른 트랜잭션 메서드를 부를 때 합칠지 나눌지의 규칙으로, 기본 REQUIRED는 합류하고 REQUIRES_NEW는 바깥을 멈추고 새로 엽니다.
연결을 스레드에 묶어 두므로 안쪽 리포지토리 호출들이 같은 트랜잭션에서 돌고, 그래서 주문 저장과 재고 차감이 함께 롤백됩니다.
감사 로그처럼 바깥이 실패해도 남아야 하는 것은 REQUIRES_NEW로 분리합니다. 한계는 프록시를 거치지 않는 자기 호출·private에는 적용되지 않고, checked 예외는 기본 롤백이 아니며, REQUIRES_NEW는 연결을 하나 더 써 풀이 작으면 교착이 날 수 있다는 점입니다.

- 꼬리: `UnexpectedRollbackException`은 언제 나나요?
- 꼬리: `readOnly = true`는 정확히 무엇을 하나요?

#### 주문 생성 트랜잭션 안에서 알림 메일을 보내는데, 롤백돼도 메일이 나갑니다. 어떻게 고치나요?

메일 발송을 트랜잭션 밖, 정확히는 커밋 뒤로 옮깁니다 — `ApplicationEventPublisher`로 "주문 생성됨" 이벤트를 발행하고 `@TransactionalEventListener(phase = AFTER_COMMIT)`에서 보냅니다.
외부 시스템은 DB 롤백에 따라오지 않으므로, 트랜잭션 안에서 부르면 "DB는 취소됐는데 메일은 나간" 상태가 생기고, 메일 서버 응답을 기다리는 동안 DB 연결과 락도 묶입니다.
AFTER_COMMIT 리스너는 커밋이 확정된 뒤에만 돌아 이 문제가 사라지고, 리스너 안에서 DB를 써야 하면 `REQUIRES_NEW`를 붙입니다. 확실히 전달해야 하면 아웃박스 표에 이벤트를 같은 트랜잭션으로 넣고 별도 워커가 보냅니다. 한계는 메일 발송 자체가 실패했을 때의 재시도는 리스너가 아니라 큐·워커가 맡아야 한다는 점입니다.

- 꼬리: AFTER_COMMIT 리스너 안에서 `@Transactional`이 기본으로 동작하지 않는 이유는?
- 꼬리: 아웃박스 패턴은 무엇을 보장하나요?
