---
id: mvcc
title: MVCC
order: 8
aliases: [다중 버전 동시성 제어, 스냅숏 읽기, undo 로그]
card:
  one_line: 'MVCC는 행을 고칠 때 옛 버전을 남겨 두어, 읽는 쪽은 락 없이 자기 시점의 버전을 보고 쓰는 쪽만 최신을 잠그게 하는 방식이다.'
  analogy: 문서 버전 기록 — 누가 고치는 중이어도 나는 내가 연 시점의 판본을 그대로 읽는다
  analogy_limit: 버전 기록은 무한히 쌓이지만 DB는 옛 버전을 언젠가 지워야 한다. 오래 열린 트랜잭션은 그 청소를 막아 저장 공간과 성능을 갉아먹는다.
  keywords: [읽기는 안 기다림, 버전·스냅숏, undo·VACUUM]
flow:
  prev: { id: isolation-level, reason: 안 보이게 하면서 안 기다리려면 }
  next: { id: db-lock, reason: 그래도 쓰기끼리는 }
see_also: [isolation-level, db-lock, virtual-memory]
checked: '2026-09-16'
sources:
  - 'MySQL 8.0 Reference — InnoDB Multi-Versioning (undo 로그, 롤백 세그먼트) — https://dev.mysql.com/doc/refman/8.0/en/innodb-multi-versioning.html'
  - 'MySQL 8.0 Reference — Consistent Nonlocking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-consistent-read.html'
  - 'PostgreSQL 16 문서 — MVCC 개요, VACUUM — https://www.postgresql.org/docs/16/mvcc-intro.html'
---

## 개념

격리를 락으로만 하면 누가 쓰는 동안 읽는 쪽이 전부 기다린다. MVCC(다중 버전 동시성 제어)는 **행을 고칠 때 옛 버전을 남겨 두는** 방식이다. 읽는 트랜잭션은 "내가 시작한 시점에 커밋돼 있던 버전"을 찾아 읽으므로 기다리지 않고, 쓰는 트랜잭션은 최신 버전만 잠근다. 읽기와 쓰기가 서로를 막지 않는다.

REPEATABLE READ의 "시작 시점 스냅숏"과 READ COMMITTED의 "문장 시작 시점 스냅숏"이 이렇게 구현된다.

잔액 100인 행을 T2가 70으로 고치는 동안 T1이 읽는다.

- 시작: 행 버전 v1(잔액 100, 커밋됨).
- T2 UPDATE: 새 버전 v2(70, T2가 쓰는 중)를 만들고 v1은 옛 버전으로 남긴다. T2는 이 행에 쓰기 락을 쥔다.
- T1 SELECT: T1의 스냅숏 시점에 커밋된 버전은 v1 → 100을 읽는다. T2의 락을 기다리지 않는다.
- T2 COMMIT 뒤 새 트랜잭션 T3 SELECT: v2 → 70. v1은 아무도 안 보게 되면 청소된다.
- 결과: 읽기는 한 번도 안 기다렸다. 그 대신 v1을 한동안 보관하는 비용이 들었다.

## 왜 나왔나

읽기가 대부분인 서비스에서 쓰기 하나가 읽기 수백 개를 세우는 것은 감당이 안 됐다. "읽는 쪽에는 잠깐 옛날 사진을 보여 주면 된다"는 발상으로 버전을 남기게 했고, 이것이 오늘의 관계형 DB(InnoDB, PostgreSQL, Oracle) 대부분의 기본 방식이 됐다. 대신 옛 버전을 어디에 두고 언제 지우느냐가 새 과제가 됐다.

## 확인 질문

- 설명해 보기: MVCC가 "읽기는 기다리지 않는다"를 어떻게 만드나?
  답: 쓰기가 새 버전을 만들고 옛 버전을 남기므로, 읽기는 자기 시점에 맞는 옛 버전을 읽으면 되어 락을 기다릴 필요가 없다.
- 다음 상태 예측: T2가 UPDATE 중일 때 T3도 같은 행을 UPDATE하려 하면?
  답: 기다린다. MVCC는 읽기-쓰기 충돌만 없앤다. 쓰기-쓰기는 여전히 락이다.
- 다음 상태 예측: 어떤 트랜잭션이 3시간째 열려 있다. 옛 버전들은?
  답: 그 트랜잭션이 볼 수도 있으므로 지우지 못한다. undo(MySQL)·죽은 튜플(PostgreSQL)이 쌓여 저장 공간과 성능을 갉아먹는다.

## 심화

### 두 제품의 구현

InnoDB는 표에 최신 버전만 두고 옛 버전은 **undo 로그**에 둔다. 읽기가 옛 버전을 원하면 undo를 거슬러 재구성한다. 옛 버전이 필요 없어지면 퍼지 스레드가 undo를 지운다. PostgreSQL은 옛 버전(죽은 튜플)을 **표 안에** 그대로 두고 새 버전을 옆에 쓴다. 그래서 UPDATE가 곧 새 행 삽입이고, 죽은 튜플을 **VACUUM**이 회수해야 표가 비대해지지 않는다(autovacuum).

### 스냅숏의 단위

REPEATABLE READ는 트랜잭션의 첫 읽기 시점 스냅숏을 끝까지 쓰고, READ COMMITTED는 문장마다 새 스냅숏을 잡는다. 같은 MVCC 위에서 스냅숏을 언제 찍느냐만 다르다. 단, `SELECT … FOR UPDATE`와 UPDATE는 스냅숏이 아니라 **최신 커밋 버전**을 잠그고 본다(잠금 읽기) — 그래서 MySQL RR에서 "SELECT로는 안 보이던 행이 UPDATE에는 영향을 준다"가 생긴다.

### 비용

버전 보관 공간, 재구성 비용, 청소 작업. 오래 열린 트랜잭션(배치, 커밋 안 하고 붙들고 있는 연결)이 청소를 막아 InnoDB는 undo가 비대해지고 PostgreSQL은 표 팽창(bloat)과 트랜잭션 ID 회전 문제(wraparound)가 생긴다. "트랜잭션은 짧게"가 MVCC에서도 규칙이다.

### 실무에서는

- 긴 리포트 쿼리가 운영 표를 락으로 막지 않는 것은 MVCC 덕이다. 대신 그 쿼리가 도는 동안 옛 버전이 유지된다.
- PostgreSQL 표가 비대해지면 `pg_stat_user_tables`의 죽은 튜플 수와 autovacuum 동작을 본다. 대량 UPDATE 뒤 특히.
- 커넥션을 트랜잭션 열린 채 붙들고 있는 애플리케이션(Open Session in View + 긴 처리)은 MVCC 청소를 막는다.
- "읽기는 안 기다린다"고 쓰기까지 안 기다리는 건 아니다. 재고 차감 같은 쓰기 경합은 락 장에서.

### 면접 질문

#### MVCC란 무엇이고 무엇을 해결하나요?

행을 고칠 때 옛 버전을 남겨 두어, 읽는 트랜잭션은 자기 시점에 커밋된 버전을 락 없이 읽고 쓰는 트랜잭션만 최신 버전을 잠그게 하는 동시성 제어 방식입니다. 읽기와 쓰기가 서로를 기다리는 문제를 해결합니다.
격리를 락으로만 하면 쓰기 하나가 읽기 전부를 세우지만, MVCC에서는 읽기가 옛 버전을 보므로 기다리지 않습니다. REPEATABLE READ의 스냅숏이 이 위에서 구현됩니다.
InnoDB는 옛 버전을 undo 로그에, PostgreSQL은 표 안에 두어 VACUUM으로 회수합니다. 한계는 쓰기끼리는 여전히 락이고, 오래 열린 트랜잭션이 옛 버전 청소를 막아 저장 공간·성능 문제를 일으킨다는 점입니다.

- 꼬리: InnoDB와 PostgreSQL의 옛 버전 보관 방식 차이는?
- 꼬리: `SELECT … FOR UPDATE`는 스냅숏을 보나요?

#### PostgreSQL 표 크기가 데이터 양보다 훨씬 큽니다. 원인과 대응은?

MVCC로 UPDATE·DELETE가 남긴 죽은 튜플을 VACUUM이 제때 회수하지 못해 표가 팽창(bloat)한 것입니다.
PostgreSQL은 UPDATE를 새 버전 삽입으로 처리하고 옛 버전을 표 안에 남기므로, autovacuum이 밀리거나 오래 열린 트랜잭션이 옛 버전을 붙들면 공간이 회수되지 않습니다.
`pg_stat_user_tables`에서 죽은 튜플 수와 마지막 autovacuum 시각을 보고, 오래 열린 트랜잭션(`pg_stat_activity`의 idle in transaction)을 정리하며, autovacuum 임계값을 그 표에 맞게 낮춥니다. 이미 팽창한 표는 `VACUUM FULL`(표 잠금)이나 `pg_repack`으로 되돌립니다. 한계는 대량 갱신이 잦은 표는 구조적으로 팽창하므로 파티셔닝이나 갱신 패턴 자체를 바꾸는 것까지 고려해야 한다는 점입니다.

- 꼬리: `idle in transaction` 연결은 왜 생기나요?
- 꼬리: MySQL에서는 같은 문제가 어디에 나타나나요?
