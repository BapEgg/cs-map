# 영상 대응표 — 코딩하는기술사 "개발자 개념 장착"

> 2026-09-17 작성. 재생목록 `PLhS_f8MeNY1nAE7iGvt6H6evycD_NRC4H`(49편)의 **제목·URL은 YouTube oEmbed로 확인**했다.
> **영상 본문·자막은 이 세션에서 볼 수단이 없어 전부 미검증이다.** 아래 "연결 상태"는 *제목이 가리키는 주제를 다루는 챕터가 있는가*이지
> "영상 내용이 반영됐다"가 아니다. 본문의 기술적 사실은 각 챕터 `sources`의 공식 문서·교재로 확인했고, 영상 문구는 옮기지 않았다.
>
> 연결 상태: **챕터 있음**(제목 주제가 한 챕터의 주제) · **일부 절**(다른 챕터의 절 하나로 다룸) · **없음** · **범위 제외**(신입 백엔드 CS 학습 범위 밖)
> 구분: **공통 필수**(신입 백엔드 면접·실무 공통) · **백엔드 심화**(MSA·대규모 설계) · **선택 확장**(도구·언어·역사)

## 표

| # | 영상(제목 기준 핵심 주제) | 연결 챕터 | 연결 상태 | 내용 확인 | 구분 |
|---|---|---|---|---|---|
| 1 | [메모리구조 관점에서 프로세스와 쓰레드](https://youtu.be/gQ4c6IzhU9Q) | process, thread, jvm-memory | 챕터 있음 | 미검증 | 공통 필수 |
| 2 | [동시성과 병렬성](https://youtu.be/qCW-N-B7Mgc) | concurrency-vs-parallelism | 챕터 있음 | 미검증 | 공통 필수 |
| 3 | [라이브 락 — 락은 데드락만 있는 게 아니다](https://youtu.be/vS1orC3pmZU) | deadlock(라이브락·기아 절), glossary 라이브락 | 일부 절 | 미검증 | 공통 필수 |
| 4 | [비동기는 왜 사용하나요?](https://youtu.be/SI5CLk-fXFU) | blocking-io, io-multiplexing, message-queue | 챕터 있음 | 미검증 | 공통 필수 |
| 5 | [트랜잭션 격리수준 4단계](https://youtu.be/yWO13BNyuw4) | isolation-level | 챕터 있음 | 미검증 | 공통 필수 |
| 6 | [트랜잭션 ACID](https://youtu.be/Jh8kG0aDG3c) | transaction-acid | 챕터 있음 | 미검증 | 공통 필수 |
| 7 | [DB 복구 메커니즘 Redo·Undo](https://youtu.be/bhYE4hZY-NE) | transaction-acid(로그 절), mvcc(undo) | 일부 절 | 미검증 | 공통 필수 |
| 8 | [비관적 락 vs 낙관적 락](https://youtu.be/oJrVl6QKzHw) | db-lock | 챕터 있음 | 미검증 | 공통 필수 |
| 9 | [8분만에 이해하는 1,2,3 정규화](https://youtu.be/tyBSrMhJtDY) | normalization | 챕터 있음 | 미검증 | 공통 필수 |
| 10 | [RDB 정규화 정리](https://youtu.be/KDkPizapEAA) | normalization | 챕터 있음 | 미검증 | 공통 필수 |
| 11 | [파티셔닝과 샤딩](https://youtu.be/lVRJv4qVWFo) | replication-sharding | 챕터 있음(파티셔닝은 절 하나) | 미검증 | 백엔드 심화 |
| 12 | [샤딩과 리플리케이션](https://youtu.be/_N8THUCBX_w) | replication-sharding | 챕터 있음 | 미검증 | 백엔드 심화 |
| 13 | [SQL vs NoSQL 선택](https://youtu.be/ge5duJS0tms) | sql-vs-nosql | 챕터 있음 (2026-09-17 추가) | 미검증 | 백엔드 심화 |
| 14 | [JOIN이 안 되는 순간, CQRS](https://youtu.be/FIZpKju2qLk) | cqrs | 챕터 있음 (2026-09-17 추가) | 미검증 | 백엔드 심화 |
| 15 | [ORM? SP? 영원한 난제](https://youtu.be/B6GcNoZtkkk) | persistence-context, n-plus-one | 일부 절(SP 비교 없음) | 미검증 | 선택 확장 |
| 16 | [쿠키·세션·JWT 변천사](https://youtu.be/lggnXKm-RyY) | cookie-session-jwt, auth | 챕터 있음 | 미검증 | 공통 필수 |
| 17 | [폴링–롱폴링–SSE–WebSocket](https://youtu.be/Xq3PmcK52vI) | sse-websocket | 챕터 있음 | 미검증 | 공통 필수 |
| 18 | [로그인 했는데 왜 403?](https://youtu.be/jpA5XIF-etA) | auth(401 vs 403) | 챕터 있음 | 미검증 | 공통 필수 |
| 19 | [인터넷 vs 웹](https://youtu.be/zQPegnx3HRI) | network-layers, http | 일부 절 | 미검증 | 선택 확장 |
| 20 | [웹은 누가, 왜 만들었나](https://youtu.be/bWmDAXiubbw) | http(왜 나왔나) | 일부 절 | 미검증 | 선택 확장 |
| 21 | [사라진 웹 기술들](https://youtu.be/L-A-zIEM5UE) | — | 범위 제외(역사) | 미검증 | 선택 확장 |
| 22 | [Cache와 MQ](https://youtu.be/dVCB5jQAYMA) | redis-cache, message-queue | 챕터 있음 | 미검증 | 공통 필수 |
| 23 | [브라우저 캐시부터 Redis까지 구간별 최적화](https://youtu.be/sdIfMnxALuY) | http-cache, cache, redis-cache, request-journey | 챕터 있음(여러 챕터에 분산) | 미검증 | 공통 필수 |
| 24 | [멱등성 키 — 두 번 결제 방지](https://youtu.be/lkc2JhJivGo) | idempotency-retry-timeout | 챕터 있음 | 미검증 | 공통 필수 |
| 25 | [모놀리스냐 MSA냐](https://youtu.be/ZRqFd7Rwjcg) | monolith-msa | 챕터 있음 | 미검증 | 백엔드 심화 |
| 26 | [모듈러 모놀리스로 시작하세요](https://youtu.be/3UJhhMultL4) | monolith-msa(모듈러 모놀리스 절) | 일부 절 | 미검증 | 백엔드 심화 |
| 27 | [서킷 브레이커](https://youtu.be/_Xi6EZZmnhM) | idempotency-retry-timeout(서킷 브레이커·격리 절), glossary | 일부 절 | 미검증 | 백엔드 심화 |
| 28 | [API 게이트웨이 설계](https://youtu.be/CVQy7G--49k) | proxy, auth(게이트웨이 언급), monolith-msa | 일부 절 — 게이트웨이 전용 챕터 없음 | 미검증 | 백엔드 심화 |
| 29 | [Service Discovery](https://youtu.be/5i6HSpxKCqA) | monolith-msa | **없음** | 미검증 | 백엔드 심화 |
| 30 | [Docker와 VM](https://youtu.be/0ToqmwZ-n3M) | observability-deploy, deploy | **없음** — 컨테이너·VM 챕터 없음 | 미검증 | 백엔드 심화 |
| 31 | [티어와 레이어 구분](https://youtu.be/tLQ9xr0SyYc) | monolith-msa(티어와 레이어 절) | 일부 절 (2026-09-17 추가) | 미검증 | 공통 필수 |
| 32 | [대규모 분산시스템 일관성 설계](https://youtu.be/UsTPRQ-nahY) | monolith-msa(사가), message-queue(최종 일관성), replication-sharding | 일부 절 — CAP·합의 없음 | 미검증 | 백엔드 심화 |
| 33 | [키 설계 잘못하면 Redis가 뻗습니다](https://youtu.be/gTCgEFnoi6U) | redis-cache(무엇을 캐시하나·실무 절) | 일부 절 | 미검증 | 백엔드 심화 |
| 34 | [Redis 메시징(Pub/Sub·Streams)](https://youtu.be/wiHhZih5qNg) | redis-cache(다른 쓰임 절), message-queue | **없음** — Pub/Sub·Streams 미작성 | 미검증 | 선택 확장 |
| 35 | [여러 명령을 한방에 안전하게(Redis 트랜잭션·Lua)](https://youtu.be/z3T9pwRseK0) | redis-cache | **없음** | 미검증 | 선택 확장 |
| 36 | [Redis for VS Code](https://youtu.be/T77WihA5CmU) | — | 범위 제외(도구) | 미검증 | 선택 확장 |
| 37 | [O(N²)이에요](https://youtu.be/YUM6PYeI5cc) | complexity, two-pointer-window-prefix | 챕터 있음 | 미검증 | 공통 필수 |
| 38 | [메모리·SSD·HDD 레이턴시](https://youtu.be/jNwI1ABWmbQ) | main-memory(🔶), disk(🔶), request-journey(구간 지연) | 일부 절 — 지연 시간 숫자표 보강 예정(CURRICULUM 1장) | 미검증 | 공통 필수 |
| 39 | [바이브코딩 시대, 개발자가 알아야 할 숫자](https://youtu.be/WbzMtyyOQpM) | request-journey, complexity | 일부 절 | 미검증 | 공통 필수 |
| 40 | [INT 오버플로우](https://youtu.be/KTPNTWn-uKE) | data-representation | 챕터 있음 | 미검증 | 공통 필수 |
| 41 | [보안의 3요소](https://youtu.be/2Px26HdAm34) | auth(보안의 세 요소 절) | 일부 절 (2026-09-17 추가) | 미검증 | 공통 필수 |
| 42 | [일반화와 추상화의 차이](https://youtu.be/kyerFnx8ngg) | oop, interface-abstract, object-design | 일부 절 | 미검증 | 공통 필수 |
| 43 | [읽기 성능과 쓰기 성능](https://youtu.be/LGlsqP-dOGU) | db-index(쓰기 비용), replication-sharding(읽기/쓰기 분리), redis-cache | 일부 절 | 미검증 | 공통 필수 |
| 44 | [속도와 용량 혼동](https://youtu.be/63_ApTsEHhU) | complexity, request-journey | 일부 절 | 미검증 | 공통 필수 |
| 45 | [핵심 개념 몰아보기(연속재생)](https://youtu.be/xmPFiNto_e8) | (모음) | 모음 영상 | 미검증 | — |
| 46 | [튜플은 왜 있을까 #파이썬](https://youtu.be/pVXYni2YbhU) | — | 범위 제외(파이썬) | 미검증 | 선택 확장 |
| 47 | [List 잘못 쓰면 성능 #파이썬](https://youtu.be/xe7ufckTpkQ) | collections(자바 쪽 대응) | 범위 제외(파이썬) | 미검증 | 선택 확장 |
| 48 | [지금 당장 이렇게 하세요](https://youtu.be/RGrHiGhzHwU) | — | 제목만으로 주제 불명 | 미검증 | — |
| 49 | [나.. 때문인가?](https://youtu.be/GIROipUolls) | — | 제목만으로 주제 불명 | 미검증 | — |

## 집계

- 챕터 있음 21 · 일부 절 17 · 없음 4 · 범위 제외 4 · 불명·모음 3 (49편).
- **없음(누락 후보)** — 신입 필수인지 판단과 함께:
  - ~~티어/레이어(#31), 보안 3요소(#41)~~ — 2026-09-17 `monolith-msa`·`auth`에 절로 추가.
  - ~~SQL vs NoSQL(#13), CQRS(#14)~~ — 2026-09-17 `sql-vs-nosql`, `cqrs` 노드로 추가.
  - 서비스 디스커버리(#29), Docker/VM(#30): **백엔드 심화**. 필요해지면 `service-dev/design`에 노드.
  - Redis Pub/Sub·Streams(#34), Redis 트랜잭션·Lua(#35): **선택 확장**. `redis-cache` 심화에 절 하나씩이면 충분.
- 이 표는 채널 전체를 "신입 필수"로 넣지 않는다. 공통 필수 25 · 백엔드 심화 12 · 선택 확장 9 · 미분류 3.

## 다음에 할 일

1. 영상을 실제로 볼 수 있게 되면(자막·시청) "내용 확인" 열을 **확인**으로 바꾸고, 본문과 어긋나는 주장이 있으면 공식 문서로 어느 쪽이 맞는지 교차 확인한다. 영상이 틀릴 수도 있다.
2. 남은 누락 후보(서비스 디스커버리, Docker/VM, Redis 메시징·트랜잭션)는 사용자 우선순위에 따라.
3. `docs/CURRICULUM.md`의 참고 자료 문구("제목·URL만 확인, 내용은 미확인")는 그대로 둔다.
