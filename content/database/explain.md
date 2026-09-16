---
id: explain
title: 실행 계획
order: 5
aliases: [EXPLAIN, 옵티마이저, 쿼리 플랜]
card:
  one_line: '실행 계획은 DB 옵티마이저가 쿼리를 어떤 순서로 어떤 인덱스를 써서 몇 행을 읽을지 정한 결과이고, EXPLAIN으로 미리 본다.'
  analogy: 내비게이션이 보여 주는 경로 — 어느 길(인덱스)로, 몇 km(행 수)를, 어떤 순서로 갈지
  analogy_limit: 내비는 실제 교통을 보지만 옵티마이저는 통계(추정)를 본다. 통계가 낡으면 자신 있게 잘못된 길을 고른다. EXPLAIN ANALYZE로 실제 값과 대조해야 한다.
  keywords: [type·key·rows, 추정 vs 실제, 통계]
flow:
  prev: { id: db-index, reason: 인덱스를 진짜 타는지 보려면 }
  next: { id: transaction-acid, reason: 빨리 찾는 건 됐고, 여럿이 고칠 때 }
see_also: [db-index, sql-join, n-plus-one]
checked: '2026-09-16'
sources:
  - 'MySQL 8.0 Reference — EXPLAIN Output Format (type·key·rows·Extra) — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html'
  - 'MySQL 8.0 Reference — EXPLAIN ANALYZE (8.0.18+) — https://dev.mysql.com/doc/refman/8.0/en/explain.html#explain-analyze'
  - 'PostgreSQL 16 문서 — Using EXPLAIN — https://www.postgresql.org/docs/16/using-explain.html'
---

## 개념

SQL은 "무엇을"만 적고 "어떻게"는 DB가 정한다. 그 "어떻게"가 실행 계획이다 — 어느 표부터 읽을지, 인덱스를 탈지 풀 스캔할지, 조인은 어떤 방법으로, 정렬은 인덱스로 할지 따로 할지. 옵티마이저는 표의 통계(행 수, 값 분포)를 보고 예상 비용이 가장 낮은 계획을 고른다.

`EXPLAIN 쿼리`를 치면 실행하지 않고 계획만 보여 준다. 느린 쿼리를 손볼 때 첫 번째 도구다. 볼 것은 세 가지 — 접근 방식(`type`: 풀 스캔인지 인덱스인지), 쓰는 인덱스(`key`), 읽을 행 수 추정(`rows`).

`SELECT * FROM orders WHERE customer_id = 7 AND status = 'PAID'`의 계획을 보자(MySQL).

- 인덱스 없음: `type: ALL`, `key: NULL`, `rows: 1000000`. 표 전체를 읽고 조건을 대조한다.
- `(customer_id)` 인덱스 추가: `type: ref`, `key: idx_customer`, `rows: 120`. 고객 7의 주문 120건만 읽고 그중 status를 대조.
- `(customer_id, status)` 인덱스: `type: ref`, `rows: 15`. 인덱스에서 둘 다 걸러 15건만 표로 간다.
- 결과: 같은 쿼리, 읽는 행 수가 100만 → 120 → 15. `rows`가 곧 비용이다.

## 왜 나왔나

쿼리가 느릴 때 "인덱스가 있는데 왜?"를 짐작으로 풀 수는 없었다. 옵티마이저가 실제로 무엇을 골랐는지 보여 주는 창이 필요했고, 그것이 EXPLAIN이다. 계획은 통계에 기대므로 "통계가 실제와 다르면 계획이 틀린다"는 것까지 알아야 제대로 쓴다.

## 확인 질문

- 설명해 보기: EXPLAIN에서 가장 먼저 볼 세 가지는?
  답: `type`(풀 스캔 ALL인지 인덱스 ref/range인지), `key`(어떤 인덱스), `rows`(읽을 행 수 추정).
- 다음 상태 예측: 인덱스가 있는데 `type: ALL`이 나왔다. 가능한 이유는?
  답: 조건에 함수를 씌웠거나 타입이 안 맞거나, 조건에 맞는 행이 표의 대부분이라 옵티마이저가 풀 스캔이 싸다고 봤거나, 통계가 낡았다.
- 다음 상태 예측: `rows: 100`으로 추정됐는데 실제로는 100만 행을 읽었다. 무엇을 하나?
  답: `EXPLAIN ANALYZE`로 실제 값을 확인하고 `ANALYZE TABLE`로 통계를 갱신한다. 추정이 틀리면 계획이 틀린다.

## 심화

### MySQL EXPLAIN 열 읽기

`type`은 좋은 순으로 `const`(PK 한 건) → `eq_ref`(조인에서 PK/UNIQUE) → `ref`(비유니크 인덱스 등호) → `range`(범위) → `index`(인덱스 전체 스캔) → `ALL`(풀 스캔). `possible_keys`는 후보, `key`는 실제 선택. `rows`는 추정 행 수, `filtered`는 그중 조건을 통과할 비율. `Extra`의 `Using index`는 커버링(표 안 감), `Using filesort`는 정렬을 따로 함, `Using temporary`는 임시 표, `Using index condition`은 인덱스에서 조건을 먼저 거름.

### 추정과 실제 — EXPLAIN ANALYZE

`EXPLAIN`은 추정, `EXPLAIN ANALYZE`(MySQL 8.0.18+, PostgreSQL)는 실제로 실행해 실제 행 수와 시간을 보여 준다. 추정 `rows`와 실제가 크게 다르면 통계 문제다. 실제 실행이므로 운영 DB에서 UPDATE에 쓰면 안 된다(SELECT만).

### 옵티마이저가 풀 스캔을 고르는 이유

인덱스로 찾은 뒤 표로 가는 것은 행마다 임의 접근이라, 조건에 맞는 행이 표의 상당 부분(경험적으로 수십 %)이면 순서대로 전부 읽는 풀 스캔이 더 싸다. 성별 같은 선택도 낮은 열의 인덱스가 안 쓰이는 이유다. 옵티마이저가 맞을 때가 많지만, 틀리면 통계 갱신 → 인덱스 설계 → 힌트 순으로 손본다.

### 실무에서는

- 슬로 쿼리 로그(`long_query_time`)로 느린 쿼리를 모으고, 각각 EXPLAIN. JPA는 `spring.jpa.show-sql`로 실제 SQL을 뽑아 붙인다.
- 개발 DB는 데이터가 적어 계획이 다르다. 운영과 비슷한 양의 데이터에서 봐야 한다.
- 계획이 갑자기 바뀌어 느려지는 일(통계 변화, 데이터 분포 변화)이 있다. 운영에서 느려졌다면 "쿼리가 바뀌었나"보다 "계획이 바뀌었나"를 먼저 본다.
- PostgreSQL은 `EXPLAIN (ANALYZE, BUFFERS)`로 실제 페이지 읽기까지 본다.

### 면접 질문

#### 실행 계획이 무엇이고, 느린 쿼리를 볼 때 무엇을 확인하나요?

실행 계획은 옵티마이저가 통계를 보고 정한 "어느 표를 어떤 인덱스로 몇 행 읽고 어떻게 조인·정렬할지"이며, EXPLAIN으로 봅니다. 확인할 것은 접근 방식(`type`이 ALL이면 풀 스캔), 선택된 인덱스(`key`), 읽을 행 수(`rows`), 그리고 `Extra`의 `Using filesort`·`Using temporary`입니다.
계획은 추정이므로 `EXPLAIN ANALYZE`로 실제 행 수·시간과 대조해 추정이 틀렸으면 통계를 갱신합니다.
예를 들어 인덱스가 있는데 `ALL`이면 조건에 함수를 씌웠거나 타입이 달라 못 타는 것이고, `rows`가 크면 인덱스 열 순서나 선택도를 다시 봅니다. 한계는 계획이 데이터 분포에 따라 바뀌므로 개발 DB의 계획이 운영과 다를 수 있다는 점입니다.

- 꼬리: `type: index`와 `type: range`의 차이는?
- 꼬리: `Using filesort`가 뜨면 반드시 문제인가요?

#### 어제까지 빠르던 쿼리가 오늘 갑자기 느려졌습니다. 쿼리는 안 바꿨습니다.

실행 계획이 바뀌었을 가능성이 큽니다. 데이터 양·분포가 바뀌어 옵티마이저가 다른 인덱스나 풀 스캔을 골랐거나, 통계가 낡아 추정이 어긋난 것입니다.
쿼리는 같아도 계획은 통계에 따라 달라지므로, 행이 급증했거나 특정 값이 몰렸거나 대량 삭제 뒤 통계가 안 맞으면 어제와 다른 계획이 나옵니다.
지금 EXPLAIN ANALYZE로 계획과 실제를 보고, 추정이 틀렸으면 `ANALYZE TABLE`로 통계를 갱신하고, 분포 자체가 바뀌었으면 인덱스(열 순서·복합)를 다시 설계합니다. 급하면 힌트로 이전 계획을 강제할 수 있지만 원인을 고친 뒤 뺍니다.

- 꼬리: 통계는 언제 자동으로 갱신되나요?
- 꼬리: 힌트를 오래 두면 왜 위험한가요?
