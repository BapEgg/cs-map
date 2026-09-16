---
id: db-lock
title: DB 락
order: 9
aliases: [비관적 락, 낙관적 락, 행 락, 갭 락, FOR UPDATE]
card:
  one_line: 'DB 락은 같은 행을 동시에 고치지 못하게 막는 장치로, 비관적 락은 먼저 잠그고 낙관적 락은 잠그지 않고 저장할 때 버전을 대조해 충돌을 잡는다.'
  analogy: 비관적 락은 회의실을 예약해 두고 쓰는 것, 낙관적 락은 그냥 들어갔다가 남이 먼저 쓰고 있으면 나오는 것
  analogy_limit: 회의실은 예약자가 잊고 안 오면 관리자가 정리하지만, DB 락은 트랜잭션이 끝나야만 풀린다. 트랜잭션이 길면 락도 길다.
  keywords: [쓰기끼리의 충돌, 비관적 vs 낙관적, 락 범위와 교착]
flow:
  prev: { id: mvcc, reason: 그래도 쓰기끼리는 }
  next: { id: replication-sharding, reason: 한 대로 부족하면 }
see_also: [mutex, deadlock, isolation-level, race-condition, spring-transaction]
checked: '2026-09-16'
sources:
  - 'MySQL 8.0 Reference — InnoDB Locking (행 락, 갭 락, 넥스트 키 락) — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html'
  - 'MySQL 8.0 Reference — Locking Reads (FOR UPDATE / FOR SHARE) — https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html'
  - 'Jakarta Persistence 3.1 — @Version 낙관적 락, LockModeType — https://jakarta.ee/specifications/persistence/3.1/'
  - 'PostgreSQL 16 문서 — Explicit Locking — https://www.postgresql.org/docs/16/explicit-locking.html'
---

## 개념

MVCC로 읽기는 안 기다리지만, 같은 행을 둘이 **고치려** 하면 한쪽은 기다려야 한다. DB 락은 그 기다림을 만드는 장치다. 두 가지 태도가 있다. **비관적 락**은 "충돌할 것"이라 보고 읽을 때부터 행을 잠근다(`SELECT … FOR UPDATE`). 다른 쪽은 잠금이 풀릴 때까지 기다린다. **낙관적 락**은 "충돌은 드물다"고 보고 잠그지 않은 채 버전 번호를 함께 읽었다가, 저장할 때 `WHERE version = 읽은 값`으로 갱신하고 영향 행이 0이면 남이 먼저 바꿨다고 판단해 재시도한다.

재고 1개인 상품에 주문 A·B가 동시에 들어온다.

- 비관적: A가 `SELECT qty FROM stock WHERE id = 7 FOR UPDATE` → 행 잠김. B가 같은 문장을 실행하면 A가 끝날 때까지 기다린다. A가 `UPDATE qty = 0`, 커밋 → B가 깨어나 qty 0을 읽고 품절 처리.
- 낙관적: A·B가 각자 `(qty=1, version=5)`를 읽는다. A가 `UPDATE stock SET qty=0, version=6 WHERE id=7 AND version=5` → 1행 성공. B가 같은 UPDATE → `version=5`인 행이 없어 0행 → 충돌로 판단, 다시 읽어 qty 0 → 품절.
- 결과: 둘 다 재고가 −1이 되는 것을 막았다. 비관적은 B가 기다렸고, 낙관적은 B가 한 번 실패하고 다시 했다.

## 왜 나왔나

격리 수준을 올려도 "읽고 계산해서 쓰기"의 갱신 손실은 안 막혔다. 읽는 순간부터 쓰는 순간까지를 하나로 묶어 줄 장치가 필요했고, 그것이 잠금 읽기(비관적)다. 그런데 충돌이 드문 곳에서 매번 잠그면 대기만 늘어서, 잠그지 않고 저장 때 확인하는 낙관적 방식이 함께 쓰이게 됐다.

## 확인 질문

- 설명해 보기: 비관적 락과 낙관적 락의 차이를 "언제 충돌을 잡느냐"로.
  답: 비관적은 읽을 때 잠가 충돌 자체를 미리 막고, 낙관적은 저장할 때 버전을 대조해 충돌을 뒤늦게 잡아 재시도한다.
- 다음 상태 예측: 낙관적 락에서 같은 상품에 동시 주문 100건이 들어오면?
  답: 1건 성공, 99건 충돌 → 재시도 → 또 1건 성공… 재시도 폭풍. 충돌이 잦은 곳에는 맞지 않는다.
- 다음 상태 예측: `FOR UPDATE`로 잠근 트랜잭션이 외부 결제 API를 5초 기다리면?
  답: 그 5초 동안 같은 행을 원하는 모든 트랜잭션이 기다린다. 락은 커밋·롤백까지 유지된다.

## 심화

### InnoDB의 락 종류

행 락(레코드 락)은 인덱스 레코드에 걸린다 — 인덱스가 없는 열로 `UPDATE … WHERE`를 하면 옵티마이저가 풀 스캔하며 **표의 모든 행**을 잠글 수 있다. 갭 락은 인덱스 사이의 빈 구간을 잠가 REPEATABLE READ에서 팬텀 삽입을 막고, 넥스트 키 락은 레코드 + 갭이다. 공유 락(`FOR SHARE`)은 읽기끼리는 겹치고 쓰기는 막는다. 표 락은 DDL이나 `LOCK TABLES`에서.

### 낙관적 락의 구현

JPA `@Version` 열(정수나 타임스탬프)을 두면 UPDATE에 `AND version = ?`가 자동으로 붙고, 0행이면 `OptimisticLockException`이 난다. 이 예외를 잡아 재시도하는 것은 애플리케이션 몫이다(트랜잭션 밖에서 새 트랜잭션으로). 화면에서 "다른 사람이 먼저 수정했습니다"를 띄우는 것도 같은 원리다.

### 어느 쪽을 쓰나

| | 비관적 (`FOR UPDATE`) | 낙관적 (`@Version`) |
|---|---|---|
| 충돌 빈도 | 잦을 때 | 드물 때 |
| 실패 방식 | 기다림(타임아웃·교착 가능) | 예외 후 재시도 |
| 트랜잭션 길이 | 짧아야 함(락 유지) | 길어도 됨(사용자 편집 화면) |
| 예 | 인기 상품 재고, 계좌 이체 | 게시글 편집, 설정 변경 |

### 교착과 타임아웃

락이 둘 이상이면 교착이 난다(교착상태 장). InnoDB는 탐지해 한쪽을 롤백하고, 락 대기는 `innodb_lock_wait_timeout`(기본 50초)까지다. 같은 여러 행을 갱신하는 트랜잭션은 PK 순서로 정렬해 잠그고, 락 대기 예외와 교착 예외는 재시도한다.

### 실무에서는

- `UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0` 한 문장은 행 락을 문장 안에서만 잡고 끝나 가장 싸다. 읽어서 계산할 필요가 없으면 이것이 첫 선택.
- JPA는 `@Lock(LockModeType.PESSIMISTIC_WRITE)`가 `FOR UPDATE`, `@Version`이 낙관적 락.
- 인기 상품 하나에 주문이 몰리면 행 락 대기가 병목이 된다. Redis 카운터로 선점하거나 큐로 직렬화한다.
- 락을 잡은 트랜잭션 안의 외부 호출·긴 계산은 대기를 연쇄시킨다. 락 구간은 DB 쓰기만.
- 서버가 여러 대여도 DB 락은 DB에 있으므로 한 곳에서 동작한다 — JVM `synchronized`와 다른 점.

### 면접 질문

#### 비관적 락과 낙관적 락의 차이와 각각 언제 쓰나요?

비관적 락은 읽을 때부터 행을 잠가(`FOR UPDATE`) 다른 트랜잭션을 기다리게 해 충돌을 미리 막고, 낙관적 락은 잠그지 않고 버전을 함께 읽었다가 저장 때 `WHERE version = ?`로 대조해 남이 먼저 바꿨으면 실패시키고 재시도합니다.
충돌이 잦고 트랜잭션이 짧으면 비관적(재고 차감·이체), 충돌이 드물고 트랜잭션이 길면 낙관적(편집 화면·설정)입니다. 낙관적은 충돌이 잦으면 재시도 폭풍이 나고, 비관적은 락을 오래 잡으면 대기가 연쇄됩니다.
예를 들어 재고는 `FOR UPDATE`나 원자적 `UPDATE … WHERE qty > 0`로, 게시글 수정은 `@Version`으로 "다른 사람이 먼저 수정했습니다"를 띄웁니다. 한계는 어느 쪽도 락을 잡은 트랜잭션이 길어지는 것(외부 호출)에는 답이 아니라는 점입니다.

- 꼬리: 낙관적 락 실패는 어디서 어떻게 재시도하나요?
- 꼬리: 인덱스 없는 열로 UPDATE하면 락은 어디에 걸리나요?

#### `UPDATE`가 락 대기 타임아웃으로 실패합니다. 어떻게 접근하나요?

누가 그 행의 락을 오래 쥐고 있는지부터 찾습니다 — `performance_schema.data_locks`·`SHOW ENGINE INNODB STATUS`로 잠근 트랜잭션과 그 SQL을 보고, 그 트랜잭션이 왜 안 끝나는지(외부 호출, 긴 처리, 커밋 누락)를 봅니다.
락은 트랜잭션이 끝나야 풀리므로, 대기의 원인은 대개 "짧아야 할 트랜잭션이 긴 것"이지 락 자체가 아닙니다. 인덱스 없는 조건으로 UPDATE해 표 전체가 잠기는 경우도 흔합니다.
대응은 잠근 쪽 트랜잭션을 짧게 만들고(외부 호출 분리), UPDATE 조건에 인덱스를 두고, 여러 행을 갱신할 땐 순서를 통일하며, 애플리케이션은 락 대기·교착 예외를 잡아 재시도합니다. 타임아웃 값을 늘리는 것은 증상만 늦춥니다.

- 꼬리: 교착이 나면 InnoDB는 어느 트랜잭션을 희생시키나요?
- 꼬리: 갭 락 때문에 INSERT가 막히는 경우는 언제인가요?
