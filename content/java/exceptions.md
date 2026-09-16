---
id: exceptions
title: 예외
order: 5
aliases: [checked 예외, unchecked 예외, try-with-resources, 예외 처리]
card:
  one_line: '예외는 실패를 반환값이 아닌 별도 흐름으로 던져 올리는 장치로, checked는 호출자가 처리를 강제받고 unchecked는 그렇지 않다.'
  analogy: 공장 라인의 비상 정지 버튼 — 문제가 생기면 그 자리에서 라인을 멈추고, 처리할 줄 아는 곳(catch)까지 신호가 올라간다
  analogy_limit: 비상 정지는 누르면 무조건 멈추지만 예외는 아무 곳에서나 catch로 삼켜 버릴 수 있다. 삼킨 예외는 라인이 멈춘 척도 안 하고 잘못된 결과를 계속 만든다.
  keywords: [checked vs unchecked, 복구 가능성, 자원 정리]
flow:
  prev: { id: generics, reason: 타입은 잡았고, 실패는 어떻게 다루나 }
  next: { id: jvm-execution, reason: 이 코드를 실제로 누가 어떻게 돌리나 }
see_also: [spring-transaction, file-descriptor, thread]
checked: '2026-09-16'
sources:
  - 'JLS 21 §11 Exceptions — checked/unchecked 구분 — https://docs.oracle.com/javase/specs/jls/se21/html/jls-11.html'
  - 'JLS 21 §14.20.3 try-with-resources — https://docs.oracle.com/javase/specs/jls/se21/html/jls-14.html#jls-14.20.3'
  - 'Bloch, Effective Java (3판) Item 69~77 — 예외는 예외 상황에만, 복구 가능하면 checked, 예외 무시 금지'
  - 'Spring Framework 레퍼런스 — @Transactional 롤백 규칙(기본: RuntimeException·Error) — https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html'
---

## 개념

함수가 실패했을 때 "-1을 돌려준다"로 알리면 호출자가 확인을 잊기 쉽고 실패 이유도 묻힌다. 예외는 **실패를 별도 흐름으로 던져** 처리할 줄 아는 곳까지 호출 스택을 거슬러 올라가게 한다. 중간의 함수들은 실패를 몰라도 된다.

자바는 예외를 둘로 나눈다. **checked**(`Exception` 하위, `IOException` 등)는 던지는 메서드가 `throws`로 선언하고 호출자가 잡거나 다시 선언해야 컴파일된다 — "호출자가 대응할 수 있는 실패". **unchecked**(`RuntimeException` 하위, `NullPointerException`·`IllegalArgumentException` 등)는 선언·처리를 강제하지 않는다 — "프로그래밍 오류나 어차피 복구 못 하는 실패".

주문 서비스에서 재고 부족을 다뤄 보자.

- `Stock.decrease(3)`이 재고 2에서 호출됨 → `throw new OutOfStockException(productId)`(unchecked).
- 호출 스택: `Stock.decrease` → `OrderService.place` → `OrderController.post`. 앞의 둘은 잡지 않아 그대로 올라간다. `OrderService.place`가 `@Transactional`이면 unchecked 예외에 롤백된다.
- `@ExceptionHandler(OutOfStockException.class)`가 잡아 `409 Conflict`와 메시지로 응답한다.
- 결과: 실패 지점과 처리 지점이 떨어져 있어도 신호가 닿았고, 중간 코드는 깔끔하다. 잡지 않았다면 500으로 나갔을 것이다.

## 왜 나왔나

반환 코드 방식은 확인을 빠뜨리기 쉽고 정상 값과 오류 값이 섞였다. 실패를 타입으로 만들고 스택을 따라 전파하게 한 것이 예외이고, 자바는 여기에 "호출자가 꼭 알아야 할 실패는 컴파일러가 강제하자"는 checked 예외를 더했다. 그런데 checked가 남발되면 던지고 받는 코드가 온 데 퍼져, 스프링 같은 프레임워크는 대부분을 unchecked로 감싸는 쪽을 택했다.

## 확인 질문

- 설명해 보기: checked와 unchecked의 차이를 "컴파일러"로 말해 보세요.
  답: checked는 잡거나 `throws`로 선언하지 않으면 컴파일 오류, unchecked는 강제하지 않는다.
- 다음 상태 예측: `catch (Exception e) { }`로 빈 채 잡으면?
  답: 실패가 사라진다. 프로그램은 성공한 것처럼 이어 가며 잘못된 결과를 만들고, 원인은 로그에도 없다.
- 다음 상태 예측: `@Transactional` 메서드가 checked `IOException`을 던지면 롤백되나?
  답: 기본 설정에서는 안 된다. 스프링은 `RuntimeException`과 `Error`만 롤백한다. `rollbackFor = Exception.class`를 붙여야 한다.

## 심화

### 언제 checked, 언제 unchecked

호출자가 합리적으로 복구할 수 있는 실패(파일 없음 → 다른 경로 시도)는 checked, 프로그래밍 오류(null, 잘못된 인자)나 복구 불가(DB 다운)는 unchecked가 원칙(Effective Java Item 70). 현실에서는 checked가 호출 사슬 전체에 `throws`를 퍼뜨리고 람다·스트림과 어울리지 않아, 도메인 예외를 `RuntimeException` 기반으로 두고 API 경계에서 한 번에 처리하는 구조가 흔하다.

### 자원 정리 — try-with-resources

파일·소켓·DB 연결은 예외가 나도 닫혀야 한다. `try (var in = new FileInputStream(f)) { … }`는 블록을 어떻게 나가든 `close()`를 부르고, 닫는 중 난 예외는 원래 예외에 억제(suppressed)로 붙는다. `finally`에서 직접 닫는 옛 방식은 순서와 중첩 예외를 틀리기 쉽다. 파일 디스크립터 누수의 표준 해법이다.

### 예외 번역과 원인 보존

하위 계층의 예외(`SQLException`)를 상위 의미(`OrderNotFoundException`)로 바꿔 던질 때 원인을 `new X(msg, cause)`로 넘긴다. 원인을 버리면 스택 트레이스가 끊겨 디버깅이 안 된다. 스프링 데이터 접근 예외 계층(`DataAccessException`)이 JDBC·JPA 예외를 unchecked로 번역하는 것이 이 패턴이다.

### 흐름 제어에 쓰지 않기

예외 생성은 스택 트레이스를 채우므로 일반 반환보다 훨씬 비싸다. "없으면 예외"보다 `Optional`이나 null 확인이 맞는 자리가 있다. 반복문 안에서 예외로 루프를 끝내는 코드는 느리고 읽기 어렵다.

### 실무에서는

- 컨트롤러마다 try/catch 대신 `@RestControllerAdvice` + `@ExceptionHandler`로 한곳에서 HTTP 상태와 응답 형식을 정한다.
- 예외를 잡아 로그만 남기고 다시 던지면 같은 오류가 계층마다 찍힌다. 잡았으면 처리하거나, 처리 못 하면 그냥 올린다.
- `@Transactional`은 checked 예외에 롤백하지 않는다. 도메인 예외를 unchecked로 두거나 `rollbackFor`를 명시한다.
- 스레드 풀 작업에서 던진 unchecked 예외는 스레드만 죽이고 조용히 사라질 수 있다. `Future.get()`으로 확인하거나 `UncaughtExceptionHandler`를 둔다.

### 면접 질문

#### checked 예외와 unchecked 예외의 차이와 언제 각각 쓰나요?

checked는 `Exception`의 하위로 호출자가 잡거나 선언하지 않으면 컴파일이 안 되고, unchecked는 `RuntimeException` 하위로 강제되지 않습니다. 원칙은 호출자가 복구할 수 있는 실패는 checked, 프로그래밍 오류나 복구 불가는 unchecked입니다.
checked는 "이 실패에 대응하라"를 컴파일러가 알려 주는 장점이 있지만 호출 사슬 전체에 `throws`가 퍼지고 람다·스트림과 어울리지 않아, 실무에서는 도메인 예외를 unchecked로 두고 API 경계(`@ExceptionHandler`)에서 처리하는 구조가 많습니다.
예를 들어 재고 부족은 `RuntimeException` 기반 `OutOfStockException`으로 던져 컨트롤러 어드바이스가 409로 바꿉니다. 한계는 unchecked는 처리를 잊어도 컴파일이 되므로 문서와 테스트로 챙겨야 한다는 점입니다.

- 꼬리: 스프링이 `SQLException`을 unchecked로 감싸는 이유는?
- 꼬리: `@Transactional`에서 checked 예외는 왜 기본 롤백이 안 되나요?

#### `catch (Exception e) { log.error(e); }`로 끝나는 코드가 많습니다. 무엇이 문제인가요?

실패가 로그 한 줄로 끝나고 호출자는 성공한 줄 알게 되어, 잘못된 상태로 다음 단계가 진행됩니다. 트랜잭션도 예외가 삼켜져 롤백되지 않고 커밋됩니다.
예외는 처리할 수 있는 곳에서 처리하거나 위로 올려야 하는데, 중간에서 삼키면 전파가 끊기고, `Exception`으로 넓게 잡으면 `NullPointerException` 같은 버그까지 "처리된 것"으로 위장됩니다.
고치는 방향은 복구할 수 있으면 그 자리에서 대체 동작을 하고, 없으면 잡지 않거나 의미 있는 예외로 번역해(원인 포함) 다시 던지며, 로깅은 경계(어드바이스)에서 한 번만 하는 것입니다. 한계는 배치처럼 "한 건 실패해도 계속"이 필요한 곳도 있으므로 그때는 실패 건을 따로 모아 보고해야 한다는 점입니다.

- 꼬리: 예외를 번역할 때 원인(cause)을 넘기지 않으면 무슨 일이 생기나요?
- 꼬리: 스레드 풀에서 삼켜지는 예외는 어떻게 잡나요?
