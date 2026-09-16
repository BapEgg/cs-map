---
id: isolation-level
title: 격리 수준
order: 7
aliases: [트랜잭션 격리 수준, READ COMMITTED, REPEATABLE READ, SERIALIZABLE, 더티 리드, 팬텀 리드]
card:
  one_line: '격리 수준은 동시에 도는 트랜잭션이 서로의 변경을 얼마나 보게 할지 정한 4단계로, 높일수록 이상 현상은 줄고 동시성은 준다.'
  analogy: 공유 문서를 여럿이 고칠 때, 남이 저장 안 한 글자까지 보이게 할지, 저장한 것만 보이게 할지, 내가 문서를 연 순간의 판본만 보게 할지
  analogy_limit: 문서 공유는 "보이느냐"만 정하지만 격리 수준은 락과 버전으로 구현돼 "기다리느냐"까지 정한다. 높은 수준은 남을 기다리게 하거나 내 트랜잭션을 실패시킨다.
  keywords: [더티·반복 불가·팬텀, MySQL RR vs PostgreSQL RC, 트레이드오프]
flow:
  prev: { id: transaction-acid, reason: 동시에 돌 때 서로 얼마나 보이나 }
  next: { id: mvcc, reason: 안 보이게 하면서 안 기다리려면 }
see_also: [mvcc, db-lock, race-condition, spring-transaction]
checked: '2026-09-16'
sources:
  - 'MySQL 8.0 Reference — Transaction Isolation Levels (기본 REPEATABLE READ, 갭 락) — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html'
  - 'PostgreSQL 16 문서 — Transaction Isolation (기본 READ COMMITTED, RR에서 팬텀 없음) — https://www.postgresql.org/docs/16/transaction-iso.html'
  - 'ANSI/ISO SQL-92 — 격리 수준과 이상 현상 정의'
  - 'Kleppmann, Designing Data-Intensive Applications (2017) 7장 — Weak Isolation Levels'
---

## 개념

트랜잭션 둘이 같은 행을 동시에 만지면 서로의 변경이 언제 보이느냐가 문제다. 완전히 안 보이게(한 번에 하나씩) 하면 안전하지만 느리다. 격리 수준은 **얼마나 보이게 허용할지**를 네 단계로 정한 것이다.

낮은 순으로 **READ UNCOMMITTED**(커밋 안 된 것도 보임 — 더티 리드), **READ COMMITTED**(커밋된 것만 보임, 같은 트랜잭션 안에서 두 번 읽으면 값이 바뀔 수 있음 — 반복 불가 읽기), **REPEATABLE READ**(트랜잭션 시작 시점의 값을 계속 봄, 새로 삽입된 행은 보일 수 있음 — 팬텀), **SERIALIZABLE**(한 번에 하나씩 돈 것과 같은 결과). MySQL InnoDB 기본은 REPEATABLE READ, PostgreSQL 기본은 READ COMMITTED다.

계좌 잔액 100을 두고 T1은 두 번 읽고, T2는 그 사이에 70으로 바꾸고 커밋하는 상황이다.

- READ UNCOMMITTED: T1 첫 읽기 100 → T2가 70으로 UPDATE(아직 커밋 전) → T1 두 번째 읽기 **70**. T2가 롤백하면 T1은 있지도 않았던 값을 본 것이다(더티 리드).
- READ COMMITTED: T1 100 → T2 UPDATE+COMMIT → T1 두 번째 읽기 **70**. 커밋된 값이지만 같은 트랜잭션 안에서 답이 바뀌었다(반복 불가 읽기).
- REPEATABLE READ: T1 100 → T2 UPDATE+COMMIT → T1 두 번째 읽기 **100**. T1은 자기가 시작한 시점의 스냅숏을 본다.
- 결과: 수준이 오를수록 T1이 보는 세계가 안정되지만, 그만큼 DB가 옛 버전을 유지하거나 락으로 막아야 한다.

## 왜 나왔나

완전한 격리(직렬 실행)는 안전하지만 동시 요청이 많은 서비스에선 감당이 안 됐다. 그래서 "어떤 이상 현상까지 허용할지"를 단계로 나누어 애플리케이션이 고르게 했다. 대부분의 서비스는 READ COMMITTED나 REPEATABLE READ에서 돌고, 돈·재고처럼 정확해야 하는 곳만 락이나 더 높은 수준으로 보강한다.

## 확인 질문

- 설명해 보기: 더티 리드와 반복 불가 읽기의 차이는?
  답: 더티 리드는 커밋 안 된 값을 보는 것(롤백되면 없던 값), 반복 불가 읽기는 커밋된 값이지만 같은 트랜잭션 안에서 두 번 읽은 값이 다른 것.
- 다음 상태 예측: MySQL 기본(REPEATABLE READ)에서 T1이 `SELECT COUNT(*)`를 두 번 하는 사이 T2가 행을 삽입·커밋했다. 두 번째 COUNT는?
  답: 첫 번째와 같다. InnoDB의 RR은 스냅숏 읽기로 새 행도 안 보인다(일반 SELECT 기준). PostgreSQL RR도 같다.
- 다음 상태 예측: 같은 상황을 READ COMMITTED에서 하면?
  답: 두 번째 COUNT가 1 크다. 문장마다 최신 커밋을 본다.

## 심화

### 이상 현상 정리

| 이상 현상 | 뜻 | 막히는 수준 |
|---|---|---|
| 더티 리드 | 커밋 안 된 변경을 읽음 | READ COMMITTED부터 |
| 반복 불가 읽기 | 같은 행을 두 번 읽었는데 값이 다름 | REPEATABLE READ부터 |
| 팬텀 리드 | 같은 조건으로 두 번 읽었는데 행 수가 다름 | 표준상 SERIALIZABLE (MySQL·PostgreSQL은 RR에서도 대부분 막음) |
| 갱신 손실 | 둘이 읽고 각자 쓰면 한쪽이 덮임 | 수준만으로 안 막힘 — 락·원자적 UPDATE·낙관적 락 필요 |

갱신 손실은 격리 수준을 올려도 READ COMMITTED·RR에서 안 막힌다는 점이 중요하다. "재고 읽고 −1 해서 쓰기"는 `UPDATE … SET qty = qty - 1`처럼 한 문장으로 하거나 `FOR UPDATE`로 잠근다.

### 제품마다 다르다

MySQL InnoDB의 REPEATABLE READ는 스냅숏 읽기로 팬텀도 대체로 막고, 쓰기 쪽은 갭 락(범위 잠금)으로 막는다 — 대신 갭 락 때문에 교착이 늘 수 있다. PostgreSQL은 기본이 READ COMMITTED이고 RR은 스냅숏 격리라 팬텀이 없으며, 쓰기 충돌이 나면 트랜잭션을 실패시킨다(`could not serialize access`). SERIALIZABLE은 PostgreSQL이 SSI로 구현해 실패 재시도를 전제하고, MySQL은 읽기에도 락을 건다.

### 어느 수준을 쓰나

READ COMMITTED는 문장 단위로 최신을 보고 락이 짧아 동시성이 좋다 — 대부분의 웹 서비스에 충분. REPEATABLE READ는 한 트랜잭션 안에서 여러 번 읽어 계산할 때(리포트·정산) 일관된 스냅숏이 필요할 때. SERIALIZABLE은 정말 직렬성이 필요한 곳에 재시도와 함께. 수준을 올리는 것보다 해당 구간에만 락을 거는 것이 보통 낫다.

### 실무에서는

- Spring `@Transactional(isolation = …)`으로 트랜잭션마다 바꿀 수 있다. 기본 `DEFAULT`는 DB 기본을 따른다 — MySQL이면 RR, PostgreSQL이면 RC.
- "읽고 계산해서 쓰기"는 어느 수준에서도 갱신 손실이 난다. `UPDATE … SET qty = qty - 1 WHERE qty > 0` 한 문장, `SELECT … FOR UPDATE`, `@Version` 낙관적 락 중 하나.
- MySQL RR에서 배치가 범위를 UPDATE하면 갭 락이 넓게 걸려 동시 INSERT가 막히거나 교착이 난다. 배치는 RC로 내리는 것을 검토한다.
- 격리 수준 문제는 부하가 걸린 운영에서만 드러난다. 동시성 테스트(스레드 여러 개로 같은 행 갱신)를 미리 한다.

### 면접 질문

#### 트랜잭션 격리 수준 4단계와 각 단계가 막는 이상 현상을 설명해 주세요.

READ UNCOMMITTED는 커밋 안 된 변경까지 보여 더티 리드가 나고, READ COMMITTED는 커밋된 것만 보여 더티 리드를 막지만 같은 행을 두 번 읽으면 값이 바뀔 수 있으며(반복 불가 읽기), REPEATABLE READ는 트랜잭션 시작 시점 스냅숏을 보여 그것도 막지만 표준상 새 행(팬텀)은 보일 수 있고, SERIALIZABLE은 직렬 실행과 같은 결과를 보장합니다.
높일수록 안전하지만 DB가 옛 버전을 유지하거나 락으로 막아야 해 동시성이 줄고 교착·실패가 늘어납니다.
MySQL InnoDB 기본은 REPEATABLE READ(스냅숏 + 갭 락으로 팬텀도 대체로 막음), PostgreSQL 기본은 READ COMMITTED입니다. 한계는 어느 수준도 "읽고 계산해 쓰기"의 갱신 손실은 못 막아 락이나 원자적 UPDATE가 따로 필요하다는 점입니다.

- 꼬리: MySQL과 PostgreSQL의 기본 격리 수준이 다른데 실무에서 어떤 차이가 나나요?
- 꼬리: 갱신 손실은 왜 격리 수준으로 안 막히나요?

#### 재고 1개인 상품에 동시 주문 2건이 들어와 둘 다 성공했습니다. 격리 수준을 올리면 해결되나요?

READ COMMITTED에서 REPEATABLE READ로 올려도 해결되지 않습니다. 둘 다 재고 1을 읽고 각자 0으로 쓰는 갱신 손실은 스냅숏 격리로는 막히지 않기 때문입니다.
두 트랜잭션이 각자 자기 스냅숏에서 1을 보고 UPDATE하면 나중 것이 덮어쓰고, PostgreSQL RR은 쓰기 충돌을 감지해 한쪽을 실패시키지만 MySQL RR은 그러지 않습니다.
해결은 확인과 차감을 한 문장으로(`UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0`, 영향 행 0이면 품절), 또는 `SELECT … FOR UPDATE`로 행을 잠근 뒤 차감, 또는 버전 열로 낙관적 락입니다. SERIALIZABLE로 올리면 막히지만 실패·재시도가 늘고 처리량이 떨어져 이 문제엔 과합니다.

- 꼬리: `FOR UPDATE`와 낙관적 락 중 어느 쪽이 이 상황에 맞나요?
- 꼬리: MySQL에서 `SELECT`는 스냅숏인데 `UPDATE`는 최신 행을 보는 이유는?
