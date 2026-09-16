---
id: mvc-request-flow
title: MVC 요청 흐름
order: 4
aliases: [DispatcherServlet, 디스패처 서블릿, 필터, 인터셉터, 컨트롤러]
card:
  one_line: 'MVC 요청 흐름은 HTTP 요청이 필터 → 디스패처 서블릿 → 핸들러 매핑 → 컨트롤러 → 서비스 → 응답 변환 → 필터를 거쳐 돌아오는 길이다.'
  analogy: 우체국 — 접수 창구(필터)에서 받아 분류 담당(디스패처)이 주소를 보고(핸들러 매핑) 담당자(컨트롤러)에게 넘기고, 답장은 같은 길로 포장(메시지 컨버터)되어 나간다
  analogy_limit: 우체국은 담당자가 여럿이지만 요청 처리는 한 스레드가 처음부터 끝까지 맡는다. 그래서 그 스레드가 DB를 기다리면 그 요청의 모든 단계가 함께 기다린다.
  keywords: [필터 → 디스패처 → 컨트롤러, 메시지 컨버터, 예외 처리 위치]
flow:
  prev: { id: boot-config, reason: 등록된 빈들 사이로 요청이 지나는 길 }
  next: { id: aop-proxy, reason: 그 길 중간에 공통 일을 끼우려면 }
see_also: [http, thread-pool, api, exceptions, request-journey]
checked: '2026-09-16'
sources:
  - 'Spring Framework 6 레퍼런스 — DispatcherServlet, Processing(요청 처리 순서) — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html'
  - 'Spring Framework 6 레퍼런스 — HandlerInterceptor, HttpMessageConverter — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet/handlermapping-interceptor.html'
  - 'Jakarta Servlet 6.0 — Filter — https://jakarta.ee/specifications/servlet/6.0/'
  - 'Spring Boot 3 레퍼런스 — 내장 Tomcat, server.tomcat.threads.max — https://docs.spring.io/spring-boot/reference/web/servlet.html'
---

## 개념

브라우저의 요청이 `@GetMapping` 메서드에 닿기까지 여러 단계를 지난다. Tomcat이 연결을 받아 스레드 풀의 스레드 하나에 요청을 맡기면, 그 스레드가 **필터**(서블릿 규격, 인증·로깅·CORS) → **디스패처 서블릿**(스프링 MVC의 입구 하나) → **핸들러 매핑**(URL·메서드로 어느 컨트롤러 메서드인지 찾기) → **인터셉터**(컨트롤러 전후) → **컨트롤러**(요청 본문을 객체로 변환해 서비스 호출) → 반환값을 **메시지 컨버터**가 JSON으로 → 다시 인터셉터·필터를 거쳐 응답으로 나간다.

전 과정을 스레드 하나가 맡는다. 예외는 어느 단계에서 났느냐에 따라 잡는 자리가 다르다.

`POST /orders`(JSON 본문)가 처리되는 과정을 따라가 보자.

- Tomcat: 연결을 받고 요청 스레드 `http-nio-8080-exec-3`에 맡긴다.
- 필터: 인증 필터가 토큰을 검사해 `SecurityContext`에 사용자를 둔다. 실패면 여기서 401로 끝(컨트롤러까지 안 감).
- 디스패처 서블릿 → 핸들러 매핑: `POST /orders` → `OrderController.create(OrderRequest)`.
- 인터셉터 `preHandle` → 컨트롤러: `@RequestBody`가 JSON을 `OrderRequest`로 변환(Jackson), `@Valid` 검증, `orderService.place(req)` 호출 → 반환 `OrderResponse`.
- 메시지 컨버터: `OrderResponse`를 JSON으로 직렬화, `201 Created`. 인터셉터 `afterCompletion`, 필터 체인 역순, 응답 전송.
- 결과: 검증 실패는 `MethodArgumentNotValidException`으로 `@ExceptionHandler`가 400으로, 서비스의 도메인 예외는 같은 자리에서 409로. 필터의 예외는 디스패처 밖이라 `@ExceptionHandler`가 못 잡는다.

## 왜 나왔나

서블릿 하나가 요청 하나를 맡던 시절엔 URL마다 서블릿을 등록하고 매개변수 파싱·응답 작성을 손으로 했다. 스프링 MVC는 입구를 디스패처 서블릿 하나로 모으고, "어느 메서드가 맡나"(매핑), "본문을 객체로"(컨버터), "전후 공통 처리"(필터·인터셉터), "예외를 응답으로"(어드바이스)를 각각 끼울 자리로 나눴다. 컨트롤러는 순수한 자바 메서드가 됐다.

## 확인 질문

- 설명해 보기: 필터와 인터셉터의 위치 차이는?
  답: 필터는 디스패처 서블릿 앞(서블릿 컨테이너 단계), 인터셉터는 디스패처 안에서 컨트롤러 전후. 필터는 스프링 MVC를 몰라도 되고, 인터셉터는 어느 핸들러인지 안다.
- 다음 상태 예측: 인증 필터에서 예외를 던졌다. `@RestControllerAdvice`의 `@ExceptionHandler`가 잡나?
  답: 못 잡는다. 어드바이스는 디스패처 서블릿 안에서만 동작한다. 필터 예외는 필터 안에서 응답을 쓰거나 별도 처리가 필요하다.
- 다음 상태 예측: 컨트롤러가 DB를 3초 기다리면 그 요청 스레드는?
  답: 3초 동안 묶인다. Tomcat 스레드 풀(기본 200)의 하나가 대기 상태다. 이런 요청이 200개면 풀 고갈.

## 심화

### 단계별 담당

| 단계 | 담당 | 예 |
|---|---|---|
| 서블릿 필터 | 규격 필터, 스프링 `OncePerRequestFilter` | 인증(Spring Security 필터 체인), CORS, 로깅, 요청 ID |
| 디스패처 서블릿 | 스프링 MVC 입구 하나 | 아래 전부를 조율 |
| 핸들러 매핑 | `RequestMappingHandlerMapping` | `@GetMapping` 등으로 메서드 찾기 |
| 인터셉터 | `HandlerInterceptor` | 핸들러 전후 처리, 권한 확인 |
| 인자 해석 | `HandlerMethodArgumentResolver` | `@RequestBody`, `@PathVariable`, `@AuthenticationPrincipal` |
| 컨트롤러 | 내 코드 | 서비스 호출 |
| 반환 처리 | `HttpMessageConverter` | 객체 → JSON(Jackson), 뷰 이름 → 템플릿 |
| 예외 | `HandlerExceptionResolver`, `@ExceptionHandler` | 예외 → 상태 코드·본문 |

### 스레드 관점

Tomcat NIO 커넥터가 연결 수신·대기는 소수의 스레드로 하고, 요청 처리는 워커 풀(기본 200)의 스레드에 맡긴다. 컨트롤러·서비스·JDBC 호출이 전부 그 스레드에서 순서대로 돈다(요청당 스레드). 느린 외부 호출은 풀을 고갈시키므로 타임아웃·격리(스레드 풀 장). 스프링 부트 3.2+는 가상 스레드로 이 풀을 대체할 수 있다.

### 예외가 잡히는 자리

컨트롤러·서비스에서 난 예외는 `@ExceptionHandler`(컨트롤러 안) → `@RestControllerAdvice`(전역) 순. 인자 변환·검증 실패도 여기(`MethodArgumentNotValidException`). 필터에서 난 예외는 디스패처 밖이라 어드바이스가 못 잡고, Spring Security는 자기 필터 안에 `AuthenticationEntryPoint`·`AccessDeniedHandler`를 둔다. 어디에서도 안 잡히면 스프링 부트의 `/error`가 500을 만든다.

### 실무에서는

- `@RestControllerAdvice` 하나에 도메인 예외 → 상태 코드 매핑을 모으고, 응답 형식(에러 코드·메시지)을 통일한다.
- 요청 ID를 필터에서 발급해 MDC에 넣으면 로그 한 요청분을 추적할 수 있다. 다른 스레드(`@Async`)로 넘어가면 MDC를 복사해야 한다.
- 컨트롤러는 얇게 — 변환·검증·서비스 호출만. 비즈니스 규칙은 서비스·도메인에.
- `@RequestBody` 변환 실패(JSON 형식 오류)는 `HttpMessageNotReadableException`으로 400. 필드 검증은 `@Valid` + Bean Validation.
- 응답 직렬화에 지연 로딩 엔티티를 그대로 넘기면 `LazyInitializationException`이나 무한 재귀가 난다. DTO로 변환해 반환한다(영속성 컨텍스트 장).

### 면접 질문

#### 스프링 MVC에서 요청이 처리되는 흐름을 설명해 주세요.

Tomcat이 요청을 워커 스레드에 맡기면, 서블릿 필터 체인 → 디스패처 서블릿 → 핸들러 매핑으로 컨트롤러 메서드를 찾고 → 인터셉터 `preHandle` → 인자 해석(`@RequestBody` JSON 변환·검증) → 컨트롤러 실행 → 반환값을 메시지 컨버터가 JSON으로 → 인터셉터 `afterCompletion` → 필터 역순 → 응답입니다.
입구를 디스패처 하나로 모으고 매핑·변환·전후 처리·예외 처리를 각각 끼울 자리로 나눈 구조라, 컨트롤러는 순수 메서드로 남습니다.
예를 들어 인증은 Security 필터에서, 검증 실패 400과 도메인 예외 409는 `@RestControllerAdvice`에서 처리됩니다. 한계는 전 과정을 한 스레드가 맡아 느린 I/O가 스레드 풀을 묶고, 필터 단계의 예외는 어드바이스가 못 잡는다는 점입니다.

- 꼬리: 필터와 인터셉터 중 인증은 어디에 두나요, 왜?
- 꼬리: `@ExceptionHandler`가 못 잡는 예외는 어떤 것인가요?

#### 특정 API의 응답이 느린데 컨트롤러 코드는 단순합니다. 어디를 보나요?

컨트롤러 앞뒤의 단계와 그 스레드가 기다리는 곳을 봅니다 — 필터(인증 서버 호출, 로깅), 인자 변환(큰 JSON), 서비스 안의 DB·외부 호출, 응답 직렬화(지연 로딩으로 인한 추가 쿼리, 큰 객체 그래프), 그리고 스레드 풀 대기(큐)입니다.
요청 처리 전 과정이 한 스레드에서 순서대로 돌기 때문에 어느 단계든 느리면 응답에 그대로 더해지고, 컨트롤러 코드에는 안 보입니다.
스레드 덤프로 그 요청 스레드가 어디서 `WAITING`인지 보고, 요청 ID로 로그 시간을 잇고, SQL 로그로 N+1을 확인합니다. 스레드 풀 큐에서 기다린 시간은 애플리케이션 로그에 안 찍히므로 Tomcat 지표(busy threads)를 같이 봅니다. 한계는 프록시·로드밸런서 구간의 지연은 여기서 안 보여 그쪽 로그가 따로 필요하다는 점입니다.

- 꼬리: 응답 직렬화 중에 쿼리가 나가는 이유는?
- 꼬리: 요청 하나를 로그에서 끝까지 따라가려면?
