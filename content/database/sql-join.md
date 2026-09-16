---
id: sql-join
title: SQL과 JOIN
order: 2
aliases: [SQL, JOIN, INNER JOIN, LEFT JOIN, 조인]
card:
  one_line: 'SQL은 "어떤 표에서 어떤 조건의 행을 어떤 열로 달라"고 적는 질문 언어이고, JOIN은 키가 같은 행끼리 두 표를 옆으로 이어 붙이는 것이다.'
  analogy: 주문서와 고객 명부를 나란히 놓고 고객 번호가 같은 줄끼리 맞춰 한 줄로 읽는 것
  analogy_limit: 사람은 한 줄씩 맞추지만 DB는 어느 표를 먼저 읽고 어떻게 맞출지(조인 순서·방법)를 스스로 고른다. 그 선택이 실행 계획이고 속도를 정한다.
  keywords: [SELECT의 실행 순서, INNER vs LEFT, 조인 조건과 필터의 차이]
flow:
  prev: { id: relational-model, reason: 표를 묻고 이으려면 }
  next: { id: normalization, reason: 이을 표를 어떻게 나눌지 }
see_also: [n-plus-one, explain, db-index]
checked: '2026-09-16'
sources:
  - 'MySQL 8.0 Reference — JOIN Clause — https://dev.mysql.com/doc/refman/8.0/en/join.html'
  - 'MySQL 8.0 Reference — Nested-Loop Join Algorithms, Hash Join(8.0.18+) — https://dev.mysql.com/doc/refman/8.0/en/nested-loop-joins.html'
  - 'PostgreSQL 16 문서 — Table Expressions, JOIN 종류 — https://www.postgresql.org/docs/16/queries-table-expressions.html'
---

## 개념

SQL은 "무엇을 어떻게 가져올지"를 적는 언어다. 절차가 아니라 결과를 적는다 — `SELECT 열 FROM 표 WHERE 조건`. DB가 알아서 방법을 정한다. **JOIN**은 두 표를 키가 같은 행끼리 옆으로 이어 한 줄로 만든다. 정규화로 나눠 둔 표를 읽을 때 다시 합치는 수단이다.

JOIN의 종류는 "짝이 없는 행을 어떻게 하나"로 갈린다. **INNER JOIN**은 양쪽에 짝이 있는 행만, **LEFT JOIN**은 왼쪽 표의 행은 짝이 없어도 남기고 오른쪽 열을 NULL로 채운다.

고객과 주문을 이어 보자. 고객 `1 김, 2 이, 3 박`, 주문 `(101, 고객 1), (102, 고객 1), (103, 고객 2)`.

- INNER: `customers c JOIN orders o ON c.id = o.customer_id` → 3줄: 김-101, 김-102, 이-103. 주문 없는 박은 빠진다.
- LEFT: `customers c LEFT JOIN orders o ON …` → 4줄: 김-101, 김-102, 이-103, 박-NULL. 박이 남는다.
- 결과: "주문한 고객만"은 INNER, "모든 고객과 (있다면) 주문"은 LEFT. 같은 표, 다른 질문.

## 왜 나왔나

표를 정규화해 나누면 한 가지 사실이 한 곳에만 있어 갱신이 안전하지만, 읽을 때는 여러 표를 다시 붙여야 한다. 그 "붙이기"를 매번 코드로 짜지 않고 DB에 선언하게 한 것이 JOIN이고, 표·조건·정렬·집계를 한 언어로 적게 한 것이 SQL이다. 절차를 안 적으니 DB가 인덱스·통계를 보고 가장 싼 방법을 고를 수 있다.

## 확인 질문

- 설명해 보기: INNER JOIN과 LEFT JOIN의 차이를 "짝이 없는 행"으로 말해 보세요.
  답: INNER는 짝이 없는 행을 버리고, LEFT는 왼쪽 표의 행을 남기고 오른쪽을 NULL로 채운다.
- 다음 상태 예측: `LEFT JOIN orders o … WHERE o.status = 'PAID'`로 쓰면 주문 없는 고객은?
  답: 사라진다. WHERE가 NULL 행을 걸러 사실상 INNER가 된다. 오른쪽 조건은 ON에 둬야 LEFT의 뜻이 산다.
- 다음 상태 예측: 고객 1만 명 × 주문 10만 건을 조인 조건 없이(ON 없음) 이으면 몇 줄?
  답: 10억 줄(카티션 곱). 조인 조건을 빠뜨린 실수의 전형.

## 심화

### SELECT는 적힌 순서대로 실행되지 않는다

논리적 순서는 `FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT`다. 그래서 `SELECT`에서 붙인 별칭을 `WHERE`에서 못 쓰고(MySQL은 일부 허용), `WHERE`는 그룹 전 행을, `HAVING`은 그룹 후를 거른다. LEFT JOIN의 오른쪽 조건을 `WHERE`에 두면 NULL이 걸러지는 것도 이 순서 때문이다.

### 조인 방법 — DB가 고르는 것

중첩 루프(한 표의 행마다 다른 표를 찾음 — 안쪽 표에 인덱스가 있어야 빠름), 해시 조인(작은 표를 해시로 만들고 큰 표를 훑음, MySQL 8.0.18+), 병합 조인(둘 다 정렬돼 있을 때). 옵티마이저가 통계를 보고 고르며, 실행 계획에서 확인한다. 조인 열에 인덱스가 없으면 중첩 루프가 매 행 풀 스캔이 된다.

### 조인이 늘리는 것 — 행 수

1:N을 조인하면 1쪽 행이 N번 반복된다. 고객 한 명에 주문 100건이면 고객 정보가 100줄에 복사된다. 여기에 또 1:N을 조인하면 곱으로 는다(주문 100 × 상세 5 = 500줄). 집계(`COUNT`)가 이 때문에 틀리는 일이 흔하고, JPA에서 컬렉션 페치 조인을 둘 이상 못 하는 이유다.

### 실무에서는

- N+1 문제(주문 목록을 가져온 뒤 주문마다 고객을 따로 조회)는 조인 한 번이나 `IN` 조회로 바꾼다. JPA는 페치 조인·`@BatchSize`.
- `SELECT *`는 필요 없는 열까지 읽고 인덱스만으로 답할 기회(커버링)를 버린다. 열을 적는다.
- 큰 표끼리의 조인은 먼저 조건으로 줄인 뒤 잇는 것이 낫다. 옵티마이저가 대개 알아서 하지만 실행 계획으로 확인한다.
- ORM이 만든 SQL을 로그로 보는 습관 — JOIN이 몇 개인지, 조건이 ON에 있는지 WHERE에 있는지.

### 면접 질문

#### INNER JOIN과 LEFT JOIN의 차이와, LEFT JOIN에서 조건을 ON과 WHERE 중 어디에 두느냐가 왜 중요한가요?

INNER JOIN은 양쪽에 짝이 있는 행만 남기고, LEFT JOIN은 왼쪽 표 행을 모두 남기며 짝이 없으면 오른쪽 열을 NULL로 채웁니다.
LEFT JOIN에서 오른쪽 표의 조건을 WHERE에 두면 짝이 없어 NULL인 행이 조건에서 걸러져 결과가 INNER JOIN과 같아집니다. WHERE는 조인 뒤에 실행되기 때문입니다. 오른쪽 조건은 ON에 둬야 "왼쪽은 다 남기되 오른쪽은 조건에 맞는 것만 붙인다"가 됩니다.
예를 들어 "모든 고객과 그들의 결제 완료 주문"은 `LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'PAID'`이고, WHERE에 `o.status = 'PAID'`를 두면 주문 없는 고객이 사라집니다.

- 꼬리: SELECT 문의 논리적 실행 순서를 말해 보세요.
- 꼬리: 1:N 조인 뒤 COUNT가 부풀려지는 이유와 해결은?

#### 조인 쿼리가 느립니다. 어디부터 보나요?

실행 계획에서 조인 열에 인덱스를 타는지, 어느 표를 먼저 읽는지, 행 수 추정이 실제와 맞는지를 봅니다.
조인 열에 인덱스가 없으면 중첩 루프가 바깥 표 행마다 안쪽 표를 풀 스캔해 곱으로 느려지고, 조건이 조인 뒤(WHERE)에만 걸려 있으면 큰 중간 결과를 만든 뒤 버립니다.
조인 열(대개 FK)에 인덱스를 두고, 필터 조건이 인덱스를 타게 하며, 필요한 열만 SELECT합니다. 그래도 느리면 표를 조건으로 먼저 줄인 서브쿼리나 집계를 미리 계산한 표를 고려합니다. 한계는 실행 계획이 통계에 기대므로 통계가 낡으면 옵티마이저가 잘못 고르고, 그때는 통계 갱신이 먼저입니다.

- 꼬리: 실행 계획에서 `type: ALL`은 무슨 뜻인가요?
- 꼬리: 해시 조인은 언제 중첩 루프보다 유리한가요?
