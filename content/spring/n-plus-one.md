---
id: n-plus-one
title: N+1 문제
order: 9
aliases: [N+1, 페치 조인, fetch join, batch size, EntityGraph]
card:
  one_line: 'N+1 문제는 목록 하나를 1번 조회한 뒤 각 행의 연관 객체를 N번 더 조회해 쿼리가 N+1개 나가는 것으로, 페치 조인·배치 크기로 한두 번에 가져오게 고친다.'
  analogy: 학생 명단(1번)을 받고 학생마다 담임 이름을 교무실에 따로 물어보는(N번) 것 — 명단에 담임 열을 같이 뽑거나(조인) 담임을 한 번에 묶어 물으면(배치) 끝난다
  analogy_limit: 교무실 왕복은 눈에 띄지만 쿼리 N번은 코드 한 줄(`getTeacher()`)에 숨는다. 데이터 10건에서는 아무 문제 없다가 운영 1만 건에서 터진다.
  keywords: [지연 로딩 × 반복문, 페치 조인, default_batch_fetch_size]
flow:
  prev: { id: jpa-relations, reason: 연관을 걸었더니 생기는 쿼리 문제 }
  next: { id: spring-test, reason: 이런 문제를 배포 전에 잡으려면 }
see_also: [persistence-context, sql-join, db-index, cache, explain]
checked: '2026-09-16'
sources:
  - 'Hibernate ORM 6 User Guide — Fetching(fetch join, @BatchSize, subselect) — https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#fetching'
  - 'Jakarta Persistence 3.1 — JPQL FETCH JOIN, Entity Graphs — https://jakarta.ee/specifications/persistence/3.1/'
  - 'Spring Data JPA 레퍼런스 — @EntityGraph — https://docs.spring.io/spring-data/jpa/reference/jpa/entity-graph.html'
---

## 개념

주문 100건을 조회해 각 주문의 회원 이름을 찍는다. `orderRepository.findAll()`이 `SELECT * FROM orders`(1번)를 실행하고, 반복문에서 `order.getMember().getName()`을 부를 때마다 지연 로딩이 `SELECT * FROM member WHERE id = ?`를 실행한다(100번). 총 101번 — **N+1**이다. 문제는 쿼리 수가 데이터 수에 비례한다는 것이라, 개발 DB에서는 안 보이고 운영에서 느려진다.

고치는 방법은 셋이다. **페치 조인**: `SELECT o FROM Order o JOIN FETCH o.member`로 한 쿼리에 회원까지 가져온다. **배치 크기**: `default_batch_fetch_size=100`이면 지연 로딩 때 `WHERE id IN (?, ?, …)`으로 100개씩 묶어 가져온다(1 + N/100). **DTO 직접 조회**: 필요한 열만 `SELECT new …`나 QueryDSL로 뽑는다.

주문 목록 API를 따라가 보자.

- `findAll()` → `SELECT … FROM orders` 1회, 주문 100개. 각 주문의 `member`는 프록시.
- 반복문 첫 주문 `getMember().getName()` → `SELECT … FROM member WHERE id = 7`. 두 번째 주문 → `id = 12`. … 100회.
- 같은 회원이 여러 주문에 있으면 1차 캐시에 있어 그만큼은 줄지만, 여전히 회원 수만큼 나간다.
- 페치 조인으로 바꿈: `SELECT o FROM Order o JOIN FETCH o.member` → 조인 1회로 끝.
- 결과: 101 → 1. 응답 시간은 DB 왕복 수에 비례하므로 100배 가까이 빨라진다.

## 왜 나왔나

ORM이 "연관은 접근할 때 가져온다"(지연 로딩)를 기본으로 택한 것은 필요 없는 것을 미리 가져오지 않기 위해서였다. 그 선택이 반복문과 만나면 행마다 쿼리가 된다. 즉 N+1은 버그가 아니라 지연 로딩의 자연스러운 결과이고, "이 화면에서 무엇이 필요한지"를 쿼리에 미리 알려 주는 것이 해결이다. 반대로 전부 EAGER로 두면 안 쓰는 것까지 늘 가져온다 — `find(id)`는 조인으로, JPQL 목록 조회는 조인이 아니라 행마다 별도 쿼리로 가져와 오히려 N+1이 되고, 컬렉션이 둘 이상이면 곱집합이 생긴다.

## 확인 질문

- 설명해 보기: N+1에서 1과 N은 각각 무엇인가?
  답: 1은 목록 조회 쿼리, N은 목록의 각 행이 연관 객체를 지연 로딩할 때 나가는 쿼리 수(행 수).
- 다음 상태 예측: `default_batch_fetch_size=100`을 켜고 주문 250건의 회원을 순회하면 쿼리는?
  답: 목록 1번 + 회원 `IN` 쿼리 3번(100·100·50) = 4번.
- 다음 상태 예측: `Order`에 `items`(컬렉션)와 `coupons`(컬렉션) 둘을 한 JPQL에서 모두 페치 조인하면?
  답: 하이버네이트가 `MultipleBagFetchException`을 던진다(List 둘). 하나만 페치 조인하고 나머지는 배치 크기로 가져온다.

## 심화

### 어디서 알아채나

`spring.jpa.show-sql`이나 `p6spy`로 쿼리를 세어 본다. 테스트에서 "이 메서드가 쿼리 몇 번을 내는가"를 단언하면(하이버네이트 `Statistics`, `getPrepareStatementCount`) 회귀를 막는다. 응답 직렬화 중에 나가는 N+1은 컨트롤러 밖이라 놓치기 쉽다 — `open-in-view=false`면 그 자리에서 예외로 드러난다.

### 페치 조인의 제약

페치 조인은 조인 결과를 엔티티로 조립한다. 컬렉션 페치 조인은 부모 행이 자식 수만큼 늘어나므로 **페이징(`setFirstResult`)과 함께 쓰면** 하이버네이트가 메모리에서 페이징한다(경고 로그, 전체 로드). 컬렉션 페치 조인은 둘 이상 못 한다(List). 페이징이 필요한 목록은 부모만 페치 조인·페이징하고 컬렉션은 배치 크기로.

### 배치 크기

`spring.jpa.properties.hibernate.default_batch_fetch_size`를 전역으로 100~1000 사이에 둔다. 지연 로딩 시 같은 타입의 프록시들을 모아 `IN`으로 가져오므로 코드 변경 없이 N+1이 1 + N/크기로 준다. 페치 조인이 "이 쿼리는 이걸 쓴다"를 명시하는 것이라면 배치 크기는 안전망이다. 둘 다 쓴다.

### EntityGraph·DTO

`@EntityGraph(attributePaths = "member")`는 리포지토리 메서드에 붙여 페치 조인과 같은 효과를 낸다(LEFT OUTER JOIN). 화면이 엔티티 전체를 안 쓰면 처음부터 DTO 프로젝션으로 필요한 열만 조회하는 것이 가장 가볍다 — 영속성 컨텍스트에 안 올라가 변경 감지 비용도 없다.

### 실무에서는

- 배치 크기를 전역으로 켜 두고, 자주 쓰는 목록 쿼리는 페치 조인·EntityGraph를 명시한다.
- 목록 API는 DTO로. 엔티티를 그대로 JSON으로 만들면 N+1에 무한 재귀(양방향)까지 따라온다.
- 쿼리 수를 세는 테스트를 대표 API에 둔다. "이 API는 쿼리 3번"이 깨지면 리뷰에서 걸린다.
- N+1을 EAGER로 고치지 않는다 — `find(id)`에는 안 쓰는 조인이 붙고, JPQL 목록 조회에서는 행마다 별도 쿼리가 나가 N+1이 그대로다.
- 조인이 많아지면 실행 계획(EXPLAIN)을 본다. 페치 조인이 늘 이기지는 않는다(큰 자식 컬렉션 × 큰 부모).

### 면접 질문

#### N+1 문제가 무엇이고 어떻게 해결하나요?

목록을 한 번 조회한 뒤 각 행의 연관 객체를 지연 로딩하면서 행 수만큼 추가 쿼리가 나가 총 N+1개가 되는 문제로, 페치 조인(`JOIN FETCH`, `@EntityGraph`)으로 한 쿼리에 가져오거나 `default_batch_fetch_size`로 `IN` 묶음 조회하게 하거나 DTO로 필요한 열만 직접 조회해 해결합니다.
지연 로딩이 "접근할 때 가져온다"이기 때문에 반복문 안의 접근이 그대로 쿼리가 되는 것이라, 이 화면이 무엇을 쓰는지 쿼리에 미리 알리는 것이 해법입니다.
예를 들어 주문 100건의 회원 이름을 찍으면 101번이 나가고, `JOIN FETCH o.member`로 1번이 됩니다. 한계는 컬렉션 페치 조인은 페이징과 함께 쓰면 메모리 페이징이 되고 둘 이상 못 하므로, 그 경우 배치 크기로 보완하며, EAGER로 바꾸는 것은 해결이 아닙니다.

- 꼬리: 페치 조인과 페이징을 같이 쓰면 무슨 일이 생기나요?
- 꼬리: `default_batch_fetch_size`는 정확히 어떤 쿼리를 만드나요?

#### 운영에서 어떤 API가 느린데 N+1이 의심됩니다. 어떻게 확인하고 고치나요?

SQL 로그(p6spy)나 APM에서 그 요청 하나에 같은 형태의 `SELECT … WHERE id = ?`가 반복되는지 세어 봅니다. 반복 수가 목록 크기와 같으면 N+1입니다. 그다음 그 접근이 서비스 안인지 응답 직렬화 중인지 봅니다.
데이터가 적은 개발 환경에선 안 보이고 쿼리 수가 행 수에 비례하기 때문에, 코드 리뷰보다 실제 쿼리 수를 세는 것이 확실합니다.
고칠 때는 목록 쿼리에 페치 조인·EntityGraph를 명시하고, 전역 배치 크기를 켜서 남은 지연 로딩도 묶이게 하며, 가능하면 DTO 프로젝션으로 바꿉니다. 그리고 그 API의 쿼리 수를 단언하는 테스트를 남깁니다. 한계는 페치 조인이 곱집합을 만들어 오히려 느려질 수 있으므로 EXPLAIN과 응답 시간을 전후로 비교해야 한다는 점입니다.

- 꼬리: 응답 직렬화 중에 쿼리가 나가는 것을 어떻게 막나요?
- 꼬리: 쿼리 수를 테스트로 어떻게 단언하나요?
