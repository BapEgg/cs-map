---
id: bean-lifecycle
title: 빈 생명주기
order: 2
aliases: [빈 스코프, 싱글턴 빈, PostConstruct, BeanPostProcessor]
card:
  one_line: '빈 생명주기는 컨테이너가 빈을 만들고 의존을 넣고 초기화 콜백을 부른 뒤 쓰다가 종료 때 소멸 콜백을 부르는 순서이고, 기본 스코프는 싱글턴이다.'
  analogy: 직원 채용 — 뽑고(생성), 장비를 지급하고(주입), 교육하고(초기화), 일하다가, 퇴사 절차(소멸)를 밟는다. 대부분 정규직 한 명(싱글턴)이 모든 요청을 맡는다
  analogy_limit: 직원은 자기 일을 기억하지만 싱글턴 빈이 요청 내용을 기억하면 다음 요청과 섞인다. 빈은 "상태 없는 직원"이어야 한다.
  keywords: [생성 → 주입 → 초기화 → 소멸, 싱글턴 기본, 프록시가 끼는 시점]
flow:
  prev: { id: ioc-di, reason: 컨테이너가 만든 객체는 언제 생기고 사라지나 }
  next: { id: boot-config, reason: 그 많은 빈을 누가 등록하나 }
see_also: [ioc-di, aop-proxy, thread]
checked: '2026-09-16'
sources:
  - 'Spring Framework 6 레퍼런스 — Bean Scopes(singleton 기본, prototype, request, session) — https://docs.spring.io/spring-framework/reference/core/beans/factory-scopes.html'
  - 'Spring Framework 6 레퍼런스 — Customizing the Nature of a Bean(초기화·소멸 콜백, 순서) — https://docs.spring.io/spring-framework/reference/core/beans/factory-nature.html'
  - 'Spring Framework 6 레퍼런스 — Container Extension Points(BeanPostProcessor) — https://docs.spring.io/spring-framework/reference/core/beans/factory-extension.html'
---

## 개념

빈은 컨테이너가 정해진 순서로 다룬다. **생성**(생성자 호출) → **의존 주입**(생성자·필드·세터) → **초기화 콜백**(`@PostConstruct`, `InitializingBean`) → 사용 → 컨테이너 종료 때 **소멸 콜백**(`@PreDestroy`). 초기화 콜백은 "의존이 다 들어온 뒤"에 불리므로 주입받은 것을 써서 준비 작업(캐시 미리 채우기, 연결 확인)을 할 자리다.

빈이 몇 개 만들어지느냐가 **스코프**다. 기본 **싱글턴**은 컨테이너에 하나를 만들어 모두가 공유한다. `prototype`은 요청할 때마다 새로, 웹에서는 `request`·`session` 스코프도 있다. 싱글턴이 기본이므로 빈에 요청별 상태를 두면 안 된다.

`@Service class ExchangeRateService`가 뜨는 과정을 따라가 보자.

- 생성: 컨테이너가 생성자를 부른다. 이때 `RateClient client`가 생성자로 들어온다(주입).
- 초기화: `@PostConstruct void warmUp() { cache = client.fetchAll(); }`가 불린다. 주입이 끝난 뒤라 `client`를 쓸 수 있다.
- 사용: 모든 요청 스레드가 이 하나의 객체를 쓴다. `cache`는 공유되므로 읽기 전용이거나 동시성 안전해야 한다.
- 종료: 애플리케이션이 내려갈 때 `@PreDestroy void close()`가 불려 연결을 정리한다.
- 결과: 생성자에서 `client`를 쓰려 했다면 아직 안 들어와 `null`이었을 것이다(필드 주입인 경우). 초기화 작업은 `@PostConstruct`에.

## 왜 나왔나

객체를 컨테이너가 만들면 "언제 만들어지고 언제 의존이 들어오고 언제 준비 작업을 할 수 있나"를 컨테이너가 정해 줘야 했다. 그래서 단계마다 끼어들 자리(콜백)를 두었다. 스코프는 "객체 하나를 모두가 쓸까, 요청마다 만들까"를 선언으로 정하게 한 것이고, 서버 요청 처리에서는 상태 없는 싱글턴이 가장 싸고 단순해 기본이 됐다.

## 확인 질문

- 설명해 보기: `@PostConstruct`가 생성자와 다른 점은?
  답: 생성자는 의존 주입 전(생성자 주입이면 그 안에서 받지만 필드 주입은 아직)이고, `@PostConstruct`는 모든 주입이 끝난 뒤 불린다. 주입받은 것을 쓰는 준비 작업은 후자에.
- 다음 상태 예측: 싱글턴 빈에 `private List<String> log = new ArrayList<>()` 필드를 두고 요청마다 `add`하면?
  답: 모든 요청이 같은 리스트에 쌓는다. 요청끼리 섞이고 메모리도 계속 는다.
- 다음 상태 예측: 싱글턴 빈이 `prototype` 빈을 생성자로 주입받으면 prototype은 몇 번 만들어지나?
  답: 한 번. 싱글턴이 만들어질 때 한 번 주입되고 끝이다. 매번 새 것이 필요하면 `ObjectProvider`로 그때 꺼낸다.

## 심화

### 전체 순서

빈 정의 읽기 → `BeanFactoryPostProcessor`(정의 수정, 프로퍼티 치환) → 빈 인스턴스화 → 의존 주입 → `Aware` 인터페이스(`BeanNameAware` 등) → `BeanPostProcessor.postProcessBeforeInitialization` → `@PostConstruct` → `InitializingBean.afterPropertiesSet` → `@Bean(initMethod)` → `BeanPostProcessor.postProcessAfterInitialization`(**여기서 AOP 프록시로 감싸짐**) → 사용 → `@PreDestroy` → `DisposableBean.destroy` → `@Bean(destroyMethod)`.

### BeanPostProcessor — 프록시가 끼는 곳

`@Transactional`·`@Async`·`@Cacheable`은 초기화 뒤 `BeanPostProcessor`가 원본 빈을 프록시로 감싸 컨테이너에 등록하면서 동작한다. 그래서 `@PostConstruct` 안에서 자기 `@Transactional` 메서드를 불러도 트랜잭션이 안 걸린다(아직 프록시 전). `@Autowired`·`@Value` 처리도 `BeanPostProcessor`다.

### 스코프

| 스코프 | 개수 | 쓰는 곳 |
|---|---|---|
| singleton (기본) | 컨테이너당 1 | 서비스·리포지토리·설정 — 상태 없이 |
| prototype | 요청할 때마다 새로 | 상태를 가진 객체. 소멸 콜백은 컨테이너가 안 부름 |
| request / session | HTTP 요청·세션당 1 | 요청 정보 보관. 싱글턴에 주입하려면 프록시 모드 |

`request` 스코프 빈을 싱글턴에 주입하면 스프링이 프록시를 넣어 호출 때마다 현재 요청의 것으로 위임한다(`proxyMode = TARGET_CLASS`).

### 실무에서는

- 시작 때 무거운 준비(캐시 로드)는 `@PostConstruct`보다 `ApplicationRunner`나 `@EventListener(ApplicationReadyEvent)`가 낫다 — 모든 빈이 뜬 뒤라 순서 문제가 없고, 실패해도 컨텍스트가 뜬 상태에서 처리할 수 있다.
- 종료 때 진행 중 작업을 마무리하려면 `@PreDestroy`와 graceful shutdown(`server.shutdown=graceful`)을 함께.
- 싱글턴 빈의 필드는 `final`이거나 동시성 안전한 것만. 요청 상태는 매개변수·지역 변수·`request` 스코프.
- 빈 초기화 순서에 의존하는 코드는 `@DependsOn`보다 설계로 푼다(필요한 것을 주입받으면 순서는 자동).

### 면접 질문

#### 스프링 빈의 생명주기를 설명해 주세요.

컨테이너가 빈 정의를 읽고 인스턴스를 만들어 의존을 주입한 뒤, `BeanPostProcessor` 전처리 → `@PostConstruct`(초기화 콜백) → 후처리(여기서 AOP 프록시로 감싸짐) 순으로 준비하고, 사용하다가 컨테이너 종료 때 `@PreDestroy`를 부릅니다.
단계마다 끼어들 자리를 둔 이유는 "의존이 다 들어온 뒤"에만 할 수 있는 준비 작업과 "종료 직전" 정리 작업을 컨테이너가 보장하기 위해서입니다.
예를 들어 캐시를 미리 채우는 일은 주입이 끝난 `@PostConstruct`에서 하고, 연결 정리는 `@PreDestroy`에서 합니다. 한계는 `@PostConstruct` 시점엔 아직 프록시가 아니라 자기 `@Transactional` 메서드를 불러도 트랜잭션이 안 걸리고, 다른 빈이 다 떴다는 보장도 없다는 점입니다 — 그런 일은 `ApplicationReadyEvent`에서.

- 꼬리: `@PostConstruct` 안에서 `@Transactional` 메서드를 부르면 왜 안 되나요?
- 꼬리: `BeanPostProcessor`는 무엇을 하나요?

#### 싱글턴 빈은 여러 스레드가 동시에 쓰는데 왜 기본이고, 어떻게 안전하게 쓰나요?

객체 하나를 모든 요청이 공유하면 생성 비용이 없고 메모리가 작으며 주입 그래프가 단순해 기본이고, 안전하게 쓰는 방법은 빈을 상태 없이(필드는 `final` 의존만) 만드는 것입니다.
요청마다 다른 값은 메서드 매개변수와 지역 변수(스레드별 스택)에 두면 섞이지 않고, 정말 요청 단위 상태가 필요하면 `request` 스코프 빈이나 `ThreadLocal`을 씁니다.
예를 들어 `OrderService`에 `private Order current` 같은 필드를 두면 요청 A의 주문을 B가 덮어씁니다. 한계는 캐시처럼 의도적으로 공유하는 필드는 `ConcurrentHashMap` 등 동시성 안전한 구조여야 하고, `ThreadLocal`은 스레드 풀에서 요청 끝에 지워야 한다는 점입니다.

- 꼬리: prototype 빈을 싱글턴에서 매번 새로 받으려면?
- 꼬리: `request` 스코프 빈을 싱글턴에 주입하면 어떻게 동작하나요?
