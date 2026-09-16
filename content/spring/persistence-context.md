---
id: persistence-context
title: 영속성 컨텍스트
order: 7
aliases: [JPA, 1차 캐시, 변경 감지, 지연 로딩, 플러시, 엔티티 매니저]
card:
  one_line: '영속성 컨텍스트는 트랜잭션 동안 JPA가 엔티티를 담아 두는 작업 공간으로, 같은 ID는 한 객체로 유지하고(1차 캐시) 바뀐 것을 알아서 UPDATE하며(변경 감지) 연관 객체는 필요할 때 불러온다(지연 로딩).'
  analogy: 편집 중인 문서의 작업 사본 — 열어 둔 동안 같은 행은 하나로 다루고, 고친 곳은 저장(커밋) 때 한꺼번에 반영되며, 첨부 파일은 클릭할 때 열린다
  analogy_limit: 작업 사본은 닫아도 다시 열 수 있지만 영속성 컨텍스트는 트랜잭션이 끝나면 사라진다. 그 뒤 첨부(지연 로딩 연관)를 열려 하면 오류(LazyInitializationException)다.
  keywords: [1차 캐시·동일성, 변경 감지·플러시, 지연 로딩과 그 경계]
flow:
  prev: { id: spring-transaction, reason: 트랜잭션 안에서 엔티티는 어떻게 관리되나 }
  next: { id: jpa-relations, reason: 엔티티 하나를 관리하는 법을 알았으니 둘 사이의 관계 }
see_also: [transaction-acid, equals-hashcode, cache, n-plus-one]
checked: '2026-09-16'
sources:
  - 'Jakarta Persistence 3.1 명세 §3 Entity Operations(managed·detached, flush) — https://jakarta.ee/specifications/persistence/3.1/'
  - 'Hibernate ORM 6 User Guide — Persistence Context, Flushing, Fetching(LAZY) — https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html'
  - 'Spring Boot 3 — spring.jpa.open-in-view 기본 true와 경고 — https://docs.spring.io/spring-boot/appendix/application-properties/index.html'
---

## 개념

JPA로 `orderRepository.findById(42)`를 하면 `Order` 객체가 온다. 이 객체는 그냥 값 덩어리가 아니라 **영속성 컨텍스트**라는 작업 공간에 등록된 **관리되는 엔티티**다. 컨텍스트는 보통 트랜잭션과 함께 열리고 닫히며 세 가지를 한다.

**1차 캐시·동일성**: 같은 트랜잭션에서 ID 42를 두 번 조회하면 두 번째는 DB에 안 가고 **같은 객체**를 준다. **변경 감지**: 관리되는 엔티티의 필드를 바꾸면 커밋 직전(플러시)에 스냅숏과 비교해 바뀐 것만 UPDATE를 만든다 — `save`를 부르지 않아도. **지연 로딩**: `order.getItems()`처럼 연관된 것은 처음 접근할 때 쿼리로 가져온다 — 그전엔 프록시다.

주문 상태를 바꾸는 트랜잭션을 따라가 보자.

- `@Transactional cancel(42)` 시작 → 컨텍스트 열림.
- `Order o = repo.findById(42)` → `SELECT` 1회, `o`가 컨텍스트에 등록되고 스냅숏이 찍힌다.
- `o.cancel()` → 필드 `status = CANCELED`. 쿼리 없음. 같은 트랜잭션에서 `repo.findById(42)`를 다시 하면 쿼리 없이 같은 `o`.
- `o.getItems().size()` → 여기서야 `SELECT … FROM order_items WHERE order_id = 42`.
- 메서드 끝 → 플러시: 스냅숏과 비교해 `UPDATE orders SET status = 'CANCELED' WHERE id = 42` → 커밋 → 컨텍스트 닫힘. 이후 `o.getItems()`를 처음 건드리면 `LazyInitializationException`.
- 결과: SQL을 한 줄도 안 썼는데 조회·갱신이 됐다. 대신 "언제 쿼리가 나가는지"를 모르면 성능·오류의 원인을 못 찾는다.

## 왜 나왔나

JDBC로는 조회 결과를 객체에 옮기고, 바뀐 필드를 골라 UPDATE를 짜고, 연관 표를 조인하는 코드를 매번 썼다. ORM은 "객체를 다루면 SQL은 내가 만든다"로 그 반복을 없앴고, 그 약속을 지키려면 "지금 어떤 객체를 알고 있고 무엇이 바뀌었나"를 기억하는 공간이 필요했다 — 영속성 컨텍스트다. 편리함의 대가로 SQL이 보이지 않게 됐고, 그래서 이 장과 다음 장(N+1)이 필요하다.

## 확인 질문

- 설명해 보기: 1차 캐시가 보장하는 "동일성"이란?
  답: 같은 트랜잭션(컨텍스트) 안에서 같은 ID의 엔티티는 같은 자바 객체다(`==`가 참). DB 재조회도 안 한다.
- 다음 상태 예측: `@Transactional` 메서드에서 엔티티 필드만 바꾸고 `save()`를 안 불렀다. 커밋 때?
  답: 변경 감지로 UPDATE가 나간다. `save()`는 새 엔티티를 등록할 때 필요하고, 관리 중인 엔티티에는 없어도 된다.
- 다음 상태 예측: 컨트롤러가 트랜잭션 밖에서 `order.getItems()`를 처음 접근하면?
  답: 컨텍스트가 닫혀 있으면 `LazyInitializationException`. 스프링 부트 기본(`open-in-view=true`)이면 요청 끝까지 컨텍스트가 열려 있어 쿼리가 나간다.

## 심화

### 엔티티 상태

new(컨텍스트 밖의 새 객체) → `persist`/`save` → managed(관리됨) → 트랜잭션 종료 → detached(준영속, 변경 감지 없음). `remove`면 removed. detached 객체를 다시 관리하려면 `merge`(복사본을 만들어 관리 — 반환값을 써야 한다). 스프링 데이터의 `save`는 새 엔티티면 `persist`, 아니면 `merge`다.

### 플러시 — 언제 SQL이 나가나

컨텍스트는 변경을 모아 두었다가(쓰기 지연) 커밋 직전이나 JPQL 쿼리 직전에 플러시한다. 그래서 "바꾼 직후 같은 트랜잭션의 네이티브 SQL로 읽으면 안 보인다"가 생길 수 있다(JPQL은 자동 플러시). `flush()`를 직접 부르는 것은 드물게. 순서는 INSERT → UPDATE → DELETE 묶음.

### 지연 로딩과 그 경계

`@ManyToOne`·`@OneToOne`은 기본 EAGER, `@OneToMany`·`@ManyToMany`는 기본 LAZY다. 실무에서는 전부 LAZY로 두고 필요한 곳에서 페치 조인·`@EntityGraph`로 가져온다(다음 장). LAZY 프록시를 컨텍스트 밖에서 건드리면 예외이므로, 컨트롤러에 엔티티를 넘기지 말고 서비스 안에서 DTO로 변환한다. 스프링 부트의 `open-in-view=true`는 요청 끝까지 컨텍스트를 열어 두어 편하지만 DB 연결도 그만큼 오래 붙들고 "어디서 쿼리가 나가는지" 모르게 만들어, 끄는 것을 권한다.

### 1차 캐시는 캐시가 아니다

트랜잭션 하나 안에서만 사는 아주 짧은 캐시라 여러 요청의 조회를 아끼지 못한다. 그 용도는 2차 캐시(Hibernate·Ehcache)나 Redis다. 1차 캐시의 값어치는 성능보다 "같은 객체 하나"라는 동일성이다.

### 실무에서는

- 연관은 전부 LAZY. `@ManyToOne(fetch = LAZY)`를 명시한다.
- 서비스 메서드 안에서 DTO로 변환해 반환하고 `open-in-view=false`. 그러면 지연 로딩 오류가 서비스 안에서 드러나 고치기 쉽다.
- 대량 갱신은 변경 감지(행마다 UPDATE)보다 JPQL `UPDATE … WHERE`(벌크)로. 벌크 뒤엔 컨텍스트가 낡으므로 `clearAutomatically`.
- 엔티티에 세터를 열지 말고 의도 메서드(`cancel()`)로. 변경 감지가 그 안의 변경을 잡는다.
- 배치로 수만 건을 `persist`하면 컨텍스트가 커져 메모리와 플러시 비용이 는다. 일정 건마다 `flush()`+`clear()`.

### 면접 질문

#### 영속성 컨텍스트가 무엇이고 무엇을 해 주나요?

트랜잭션 동안 JPA가 엔티티를 관리하는 작업 공간으로, 같은 ID를 한 객체로 유지하고(1차 캐시·동일성), 바뀐 필드를 커밋 직전에 찾아 UPDATE를 만들며(변경 감지·플러시), 연관 엔티티를 접근 시점에 가져옵니다(지연 로딩).
"객체만 다루면 SQL은 JPA가 만든다"는 약속을 지키려면 무엇을 알고 있고 무엇이 바뀌었는지 기억하는 곳이 필요하기 때문입니다.
예를 들어 `findById` 뒤 `order.cancel()`만 해도 커밋 때 UPDATE가 나가고 `save()`는 필요 없습니다. 한계는 SQL이 보이지 않아 언제 쿼리가 나가는지 모르면 N+1과 `LazyInitializationException`이 생기고, 1차 캐시는 트랜잭션 안에서만 살아 요청 간 캐시가 아니라는 점입니다.

- 꼬리: 준영속(detached) 엔티티를 수정하면 반영되나요?
- 꼬리: `save()`는 언제 필요하고 언제 불필요한가요?

#### `open-in-view`를 끄자는 의견이 있습니다. 무엇이 바뀌고 어떻게 대비하나요?

끄면 영속성 컨텍스트와 DB 연결이 트랜잭션(서비스 메서드) 범위에서만 살아, 컨트롤러·뷰에서 지연 로딩을 건드리면 `LazyInitializationException`이 납니다. 대신 DB 연결을 요청 끝까지 붙들지 않아 커넥션 풀 효율이 오르고, 쿼리가 나가는 자리가 서비스 안으로 한정됩니다.
켜 두면 편하지만 응답 직렬화 중에 쿼리가 나가고(성능 문제가 컨트롤러 밖에 숨음), 느린 외부 호출이 있는 요청은 그동안 연결을 점유합니다.
대비는 서비스 메서드 안에서 필요한 연관을 페치 조인·`@EntityGraph`로 가져오고 DTO로 변환해 반환하는 것입니다. 한계는 기존 코드가 컨트롤러에서 엔티티를 그대로 쓰고 있다면 그 지점들을 전부 찾아 고쳐야 하므로, 끄기 전에 테스트 프로파일에서 먼저 꺼서 예외가 나는 곳을 찾습니다.

- 꼬리: `LazyInitializationException`을 EAGER로 바꿔 해결하면 무슨 문제가 생기나요?
- 꼬리: 커넥션 풀 관점에서 open-in-view의 비용은?
