---
id: db-index
title: 인덱스
order: 4
aliases: [DB 인덱스, B-tree 인덱스, 복합 인덱스, 클러스터드 인덱스, 커버링 인덱스]
card:
  one_line: '인덱스는 열의 값을 정렬해 둔 별도 구조(B-tree)로, 표 전체를 훑지 않고 O(log n)에 행을 찾게 하되 쓰기마다 함께 갱신해야 한다.'
  analogy: 책 뒤의 찾아보기 — 낱말이 가나다순으로 있어 페이지를 바로 찾지만, 책을 고칠 때마다 찾아보기도 고쳐야 한다
  analogy_limit: 찾아보기는 낱말 하나로 찾지만 복합 인덱스는 "성, 이름" 순으로 정렬된 명부라 이름만으로는 못 찾는다. 열 순서가 곧 쓸모를 정한다.
  keywords: [B-tree·정렬, 맨 왼쪽 접두, 쓰기 비용]
flow:
  prev: { id: normalization, reason: 나눈 표에서 빨리 찾으려면 }
  next: { id: explain, reason: 인덱스를 진짜 타는지 보려면 }
see_also: [tree, hash, search, disk]
checked: '2026-09-16'
sources:
  - 'MySQL 8.0 Reference — Clustered and Secondary Indexes — https://dev.mysql.com/doc/refman/8.0/en/innodb-index-types.html'
  - 'MySQL 8.0 Reference — Multiple-Column Indexes(맨 왼쪽 접두) — https://dev.mysql.com/doc/refman/8.0/en/multiple-column-indexes.html'
  - 'MySQL 8.0 Reference — Index Skip Scan Access Method(8.0.13+) — https://dev.mysql.com/doc/refman/8.0/en/range-optimization.html#range-access-skip-scan'
  - 'MySQL 8.0 Reference — How MySQL Uses Indexes — https://dev.mysql.com/doc/refman/8.0/en/mysql-indexes.html'
  - 'PostgreSQL 16 문서 — Index Types, Index-Only Scans — https://www.postgresql.org/docs/16/indexes-types.html'
---

## 개념

인덱스는 **열의 값을 정렬해 B-tree로 따로 저장해 둔 것**이다. 정렬돼 있으니 이진 탐색처럼 O(log n)에 찾고, 찾은 자리에서 행의 위치를 알아 표로 간다. 인덱스가 없으면 DB는 표의 모든 행을 읽어 조건과 비교한다(풀 스캔, O(n)).

대가가 있다. 행을 넣고 고치고 지울 때마다 인덱스도 함께 고쳐야 하고, 인덱스만큼 디스크를 더 쓴다. 그래서 "자주 찾는 조건"에만 건다.

#### 비교 — 같은 조회, 인덱스 없음과 있음

`users(id, email, name, created_at)` 100만 행에서 이메일로 한 사람을 찾는다.

```sql
SELECT * FROM users WHERE email = 'a@b.c';
```

아래 한 줄을 실행하기 전과 후를 비교한다.

```sql
CREATE INDEX idx_users_email ON users (email);
```

| | 인덱스 없음 | 인덱스 있음 |
|---|---|---|
| 읽는 방법 | 첫 행부터 끝까지 비교(풀 스캔) | B-tree 뿌리 → 중간 → 잎에서 값을 찾고, 그 행의 PK로 표에서 행을 읽음 |
| 읽는 페이지 | 수천 개 | 4~5개 |
| 걸리는 시간 | 수백 ms | 1ms 아래 |
| 쓰기 비용 | 없음 | 회원 가입(INSERT)마다 B-tree에 한 칸 끼움, 디스크 추가 |

## 왜 나왔나

표가 커지자 조건에 맞는 행 몇 개를 찾으려고 전체를 읽는 것이 감당이 안 됐다. 정렬해 두면 이진 탐색이 되지만 표 자체를 정렬 상태로 유지하기는 어려워, 열 값과 행 위치만 따로 뽑아 정렬된 트리로 둔 것이 인덱스다. 디스크 페이지 단위에 맞춰 노드를 크게 만든 B-tree가 표준이 됐다.

## 확인 질문

- 설명해 보기: 인덱스가 조회를 빠르게 하는 원리는?
  답: 열 값을 정렬된 B-tree로 따로 두어 이진 탐색처럼 O(log n)에 찾고, 거기서 행 위치를 얻어 표로 간다.
- 다음 상태 예측: 인덱스를 열 10개에 걸면 INSERT는?
  답: 행 하나 넣을 때 B-tree 10개를 갱신한다. 쓰기가 눈에 띄게 느려지고 디스크도 더 쓴다.
- 다음 상태 예측: 복합 인덱스 `(last_name, first_name)`가 있을 때 `WHERE first_name = '철수'`는?
  답: 그 인덱스로 바로 찾아가지는 못한다. 성으로 먼저 정렬돼 있어 이름만으로는 어디 있는지 모른다(맨 왼쪽 접두 규칙). 옵티마이저는 보통 풀 스캔을 고르고, 필요한 열이 인덱스 안에 다 있으면 인덱스 전체를 훑기도 한다(인덱스 풀 스캔). MySQL 8.0.13+는 성의 종류가 적을 때 성마다 이름을 찾는 Skip Scan을 쓸 수 있다.

## 심화

### 클러스터드 인덱스와 보조 인덱스 (InnoDB)

InnoDB는 표 자체를 PK 순서의 B+tree로 저장한다(클러스터드 인덱스). 잎에 행 전체가 있다. 다른 열의 인덱스(보조 인덱스)는 잎에 그 열 값과 **PK**를 두므로, 보조 인덱스로 찾은 뒤 PK로 클러스터드 인덱스를 한 번 더 탄다. 그래서 PK가 크면(UUID 36자) 모든 보조 인덱스가 커지고, PK가 무작위면 삽입 위치가 흩어져 페이지 분할이 잦다. PostgreSQL은 힙 표 + 별도 인덱스 구조라 다르다.

### 복합 인덱스와 맨 왼쪽 접두

`(a, b, c)` 인덱스는 a로 정렬하고 같은 a 안에서 b, 다시 c로 정렬한 것이다. `WHERE a = ?`, `a = ? AND b = ?`, `a = ? AND b = ? AND c = ?`는 정렬을 그대로 써서 찾아간다(효율적 탐색). `b = ?`만으로는 정렬을 이용해 찾아갈 수 없다 — 그렇다고 "인덱스를 못 탄다"고 단정하면 틀린다. 옵티마이저는 풀 스캔, 필요한 열이 인덱스에 다 있으면 인덱스 전체를 순서대로 읽는 인덱스 풀 스캔, MySQL 8.0.13+에서는 a의 값 종류가 적을 때 a마다 b를 찾는 Skip Scan(실행 계획 `Using index for skip scan`) 중에서 비용이 싼 것을 고른다. 셋 다 `a = ?`가 있을 때보다 느리므로 설계는 여전히 맨 왼쪽 접두를 기준으로 한다. 범위 조건(`a > ?`) 뒤의 열은 인덱스 정렬을 못 쓴다 — 등호 조건 열을 앞에, 범위 열을 뒤에 둔다. `ORDER BY a, b`도 같은 인덱스로 정렬 없이 읽는다.

### 커버링 인덱스

쿼리가 필요로 하는 열이 전부 인덱스 안에 있으면 표로 가지 않는다(실행 계획 `Using index`). `SELECT id, email FROM users WHERE email = ?`는 `(email)` 인덱스만으로 끝난다. `SELECT *`는 이 기회를 버린다.

### 인덱스를 못 타는 조건

열에 함수·연산을 씌우면(`WHERE YEAR(created_at) = 2026`, `WHERE price * 1.1 > ?`) 정렬된 값과 비교할 수 없어 못 탄다 — `created_at >= '2026-01-01' AND < '2027-01-01'`로 바꾼다. `LIKE '%abc'`(앞 와일드카드), 타입이 다른 비교(문자 열에 숫자), `OR`로 이어진 다른 열, `!=`는 못 타거나 옵티마이저가 풀 스캔을 고른다. 선택도가 낮은 열(성별)은 인덱스가 있어도 풀 스캔이 싸다고 판단한다.

### 실무에서는

- FK 열, WHERE·JOIN·ORDER BY에 자주 오는 열에 건다. "혹시 몰라" 거는 인덱스는 쓰기만 느리게 한다. 사용률 통계(`sys.schema_unused_indexes`)로 정리한다.
- 페이지네이션 `OFFSET 100000`은 인덱스가 있어도 10만 건을 건너뛴다. 마지막 값 기준(`WHERE id > ? LIMIT 20`)으로.
- 대용량 표에 인덱스 추가는 표를 잠글 수 있다. MySQL 8.0 `ALGORITHM=INPLACE`, PostgreSQL `CREATE INDEX CONCURRENTLY`.
- 통계가 낡으면 옵티마이저가 인덱스를 안 탄다. `ANALYZE TABLE`.
- 인덱스 힌트(`FORCE INDEX`)는 최후 수단. 데이터가 바뀌면 힌트가 독이 된다.

### 면접 질문

#### 인덱스는 어떻게 동작하고, 왜 많이 걸면 안 되나요?

인덱스는 열 값을 정렬한 B-tree를 따로 두어 O(log n)에 행 위치를 찾게 하는 구조이고, 행을 쓸 때마다 모든 인덱스를 함께 갱신해야 하므로 많이 걸면 쓰기가 느려지고 디스크를 더 씁니다.
100만 행 표에서 이메일 조회는 풀 스캔 대신 페이지 4~5개 읽기로 끝나지만, 인덱스 10개면 INSERT마다 B-tree 10개에 삽입이 일어납니다.
그래서 WHERE·JOIN·ORDER BY에 자주 쓰이는 열에만 걸고, 선택도가 낮은 열(성별)은 인덱스가 있어도 풀 스캔이 싸서 안 씁니다. 한계는 인덱스가 있어도 열에 함수를 씌우거나 앞 와일드카드 LIKE를 쓰면 정렬을 이용한 탐색이 안 되고, 복합 인덱스는 맨 왼쪽 열 조건이 없으면 효율적 탐색이 아니라 풀 스캔·인덱스 풀 스캔·조건부 Skip Scan 중 하나가 된다는 점입니다.

- 꼬리: 클러스터드 인덱스와 보조 인덱스의 차이는?
- 꼬리: 커버링 인덱스란?

#### `(status, created_at)` 복합 인덱스가 있는데 `WHERE created_at > ? AND status = 'PAID' ORDER BY created_at` 쿼리가 느립니다.

인덱스는 탈 수 있지만 열 순서가 이 쿼리에 맞습니다 — 등호 조건 `status`가 앞, 범위 조건 `created_at`이 뒤이므로 `status = 'PAID'`인 구간 안에서 `created_at` 범위를 정렬된 채로 읽고 ORDER BY에 정렬 단계가 들지 않습니다. 그래도 느리다면 다른 원인입니다.
확인할 것은 실행 계획에서 실제로 이 인덱스를 타는지(`type: range`, `Using index condition`), `PAID` 행이 표의 대부분이라 옵티마이저가 풀 스캔을 골랐는지, `SELECT *`로 매 행 표를 다시 읽는지(커버링 불가), 통계가 낡았는지입니다.
반대로 인덱스가 `(created_at, status)` 순이었다면 범위 열이 앞이라 `status` 필터는 인덱스 정렬을 못 쓰고 범위 안을 다 읽으며, 이때는 열 순서를 바꾸는 게 답입니다.

- 꼬리: 등호 조건을 앞에, 범위 조건을 뒤에 두는 이유는?
- 꼬리: 실행 계획의 `rows` 추정이 실제와 크게 다르면 무엇을 하나요?
