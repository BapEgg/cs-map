# cs-map 전체 목차

> 2026-09-16 작성. 목표는 "쉬운 이해 → 내부 원리와 한계 → 면접에서 설명하기".
> 기초·심화·면접은 별도 과목이 아니라 **같은 개념의 학습 단계**다(한 파일 안에 `## 개념` → `## 심화` → `### 면접 질문`).
> 최상위 5갈래(CS 기초 / Java / Spring / 데이터베이스 / 서비스 개발)는 유지한다. 폴더 = 트리.
> 상태: ✅ 완성(개념·암기 문장·심화·면접·출처) · 🔶 기초만 · ⬜ 예정. 예정 개념은 파일을 만들지 않는다(지도에 "준비 중"이 늘어나면 읽을 것과 구분이 안 된다).
> 작성 규칙은 `docs/HANDOFF.md` 5-4, 확인 순서는 아래 "진행 순서".

## 진행 순서

1. ✅ **운영체제 — 프로세스·스레드·동시성** 10개 (2026-09-16)
2. ✅ 네트워크·웹 8개 (2026-09-16)
3. ✅ 데이터베이스 10개 (2026-09-16)
4. ✅ Java/JVM 9개 (2026-09-16)
5. ✅ Spring/JPA 8개 (2026-09-16)
6. ✅ 서비스 설계 8개 — 마지막 order-journey가 예매·주문 시나리오로 전 단원을 잇는다 (2026-09-16)
7. 🔶 운영체제 나머지 — 파일·I/O 3개와 컴퓨터 구조 데이터 표현은 ✅ (2026-09-16). 스케줄링·가상 메모리 보강, 컴퓨터 구조 나머지 보강은 남음
8. ✅ 자료구조 9개·알고리즘 3개 (2026-09-16)

한 단원을 끝낼 때마다: 사용자 한줄평 → 반영 → 다음 단원.

## 1. 컴퓨터 구조 `cs-basics/computer-arch`

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| von-neumann | 폰 노이만 구조 | 🔶 | — | |
| data-representation | 데이터 표현 | ✅ | — | 비트·바이트, 2의 보수, 오버플로, 부동소수점, 문자 인코딩 |
| cpu | CPU | 🔶 | | |
| register / alu / isa / cisc / risc | (기존) | 🔶 | | 명령어 사이클(fetch-decode-execute)을 cpu에 보강 |
| main-memory | 메인 메모리 | 🔶 | | 메모리 계층(레지스터→캐시→메모리→디스크)과 지연 시간 숫자를 보강 |
| cache | 캐시 | ✅ | main-memory | 지역성, 캐시 라인, false sharing |
| disk | 디스크 | 🔶 | | SSD·HDD 지연 시간 |

## 2. 운영체제 `cs-basics/os`

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| **process-and-thread/** | 프로세스와 스레드 | | | |
| program | 프로그램 | 🔶 | — | |
| process | 프로세스 | ✅ | program, 메모리 영역 | PCB, 상태 전이, fork |
| thread | 스레드 | ✅ | process | 공유하는 것/안 하는 것, 커널 vs 사용자 스레드 |
| context-switch | 문맥 교환 | ✅ | thread | 비용의 정체(캐시·TLB) |
| thread-pool | 스레드 풀 | ✅ | thread, 큐 | Java ThreadPoolExecutor, Tomcat maxThreads |
| **concurrency/** | 동시성과 동기화 | | | |
| concurrency-vs-parallelism | 동시성과 병렬성 | ✅ | thread | |
| race-condition | 경쟁 상태 | ✅ | thread | counter++ 예시 |
| critical-section | 임계 구역 | ✅ | race-condition | 상호 배제·진행·유한 대기 |
| mutex | 뮤텍스 | ✅ | critical-section | 스핀 vs 잠들기, futex, synchronized |
| semaphore | 세마포어 | ✅ | mutex | 개수 제한, 순서 맞추기 |
| deadlock | 교착상태 | ✅ | mutex | 4조건, 예방·회피·탐지, 라이브락 |
| **cpu-scheduling/** | CPU 스케줄링 | 🔶 | context-switch | 기존 8개. 심화는 RR·MLFQ만 있음 |
| **memory-management/** | 메모리 관리 | 🔶 | | 기존 9개. 페이징·가상 메모리·LRU는 ✅ |
| **disk-scheduling/** | 디스크 스케줄링 | 🔶 | | 기존 5개 |
| **file-io/** | 파일과 I/O | ✅ | | 파일 디스크립터, 버퍼, 블로킹/논블로킹, I/O 멀티플렉싱(select·epoll), 시스템 호출 비용 |

## 3. 자료구조·알고리즘 `cs-basics/data-structure`, `cs-basics/algorithm`

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| complexity | 시간·공간 복잡도 | ✅ | — | O(1)·O(log n)·O(n)·O(n²), 입력 크기와 실제 시간 |
| array / linked-list | 배열 · 연결 리스트 | ✅ | 메모리 영역 | 캐시 친화성(cache와 연결) |
| stack / queue | 스택 · 큐 | ✅ | | 호출 스택(process), 준비 큐(cpu-scheduling), 작업 큐(thread-pool) |
| hash | 해시 | ✅ | array | 충돌, 적재율 → Java HashMap, DB 해시 인덱스 |
| tree / heap / graph | 트리 · 힙 · 그래프 | ✅ | | B-tree(인덱스), 우선순위 큐(스케줄링) |
| search / sort | 탐색 · 정렬 | ✅ | complexity | 이진 탐색, 퀵·병합·힙 정렬(시각화 대상) |
| bfs-dfs | BFS/DFS | ✅ | graph, queue, stack | |
| recursion-backtracking | 재귀·백트래킹 | ✅ | stack, bfs-dfs | 선택→재귀→되돌리기, 가지치기 (2026-09-17) |
| dp | 동적 계획법 | ✅ | recursion-backtracking | 상태·점화식, 하향/상향, 그리디와 비교 (2026-09-17) |
| greedy | 그리디 | ✅ | dp, sort | 그리디 선택 속성·교환 논증, 틀리는 예 (2026-09-17) |
| two-pointer-window-prefix | 투 포인터·슬라이딩 윈도우·누적 합 | ✅ | array, sort | 단조성 조건, 음수일 때 대안 (2026-09-17) |

## 4. 네트워크·웹 `cs-basics/network`

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| network-layers | 네트워크 계층과 라우팅 | ✅ | — | 4계층/OSI, 라우팅 표·다음 홉, NAT·사설 IP (2026-09-17) |
| ip-port-dns | IP·포트·DNS | ✅ | — | 주소 → 문 → 이름 |
| tcp-udp | TCP/UDP | ✅ | ip-port-dns | 3-way handshake, 순서·재전송, 흐름·혼잡 제어 |
| http | HTTP | ✅ | tcp-udp | 메서드·상태 코드·헤더, HTTP/1.1 vs 2 vs 3(버전 차이 명시) |
| https-tls | HTTPS/TLS | ✅ | http | 대칭·비대칭 키, 인증서 |
| cookie-session-jwt | 쿠키·세션·JWT | ✅ | http | 무상태에서 상태를 기억하는 세 방법 |
| http-cache | HTTP 캐시 | ✅ | http | Cache-Control, ETag, CDN |
| proxy | 프록시·로드밸런서 | ✅ | http | 포워드/리버스 |
| sse-websocket | 폴링·SSE·WebSocket | ✅ | http | 서버가 먼저 말하는 방법 |

## 5. 데이터베이스 `database`

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| relational-model | 관계·키 | ✅ | — | 기본키·외래키·제약 |
| sql-join | SQL·JOIN | ✅ | relational-model | INNER/LEFT, 실행 순서 |
| normalization | 정규화 | ✅ | relational-model | 1·2·3NF, 역정규화 |
| db-index | 인덱스 | ✅ | tree(B-tree), disk | 클러스터드/논클러스터드, 복합 인덱스, 커버링 |
| explain | 실행 계획 | ✅ | index | EXPLAIN 읽기(MySQL 기준, 버전 명시) |
| transaction-acid | 트랜잭션·ACID | ✅ | — | 로그(Redo/Undo)까지 |
| isolation-level | 격리 수준 | ✅ | transaction-acid | 4단계, 이상 현상 |
| mvcc | MVCC | ✅ | isolation-level | InnoDB vs PostgreSQL 차이 |
| db-lock | 락 | ✅ | mutex, isolation-level | 비관적/낙관적, 갭 락, 교착(deadlock 연결) |
| replication-sharding | 복제·샤딩 | ✅ | transaction-acid | 읽기/쓰기 분리, 샤드 키 |

## 6. Java/JVM `java`

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| value-passing | 값 전달과 참조 | ✅ | jvm-memory | call by value, 내용 변경 vs 재할당, 방어적 복사 (2026-09-17) |
| string-immutability | String 불변성과 문자열 풀 | ✅ | value-passing | ==/equals, intern, StringBuilder (2026-09-17) |
| static-final | static과 final | ✅ | | 클래스 멤버, 상수, 공유 상태의 위험 (2026-09-17) |
| oop | 객체 지향 | ✅ | class, object(program-dev) | 캡슐화·상속·다형성 + 오버로딩/오버라이딩 절 (2026-09-17 보강) |
| interface-abstract | 인터페이스와 추상 클래스 | ✅ | oop | 역할 vs 뼈대, default 메서드, 선택 기준 (2026-09-17) |
| equals-hashcode | equals/hashCode | ✅ | hash | HashMap이 왜 둘 다 필요로 하는가 |
| collections | 컬렉션 | ✅ | array, linked-list, hash | ArrayList/LinkedList/HashMap 내부 |
| generics | 제네릭 | ✅ | collections | 타입 소거 |
| lambda-functional | 람다와 함수형 인터페이스 | ✅ | interface-abstract | 함수형 인터페이스, effectively final, invokedynamic (2026-09-17) |
| stream-optional | Stream과 Optional | ✅ | lambda-functional, collections | 지연 평가·부작용·병렬 조건, Optional 자리 (2026-09-17) |
| exceptions | 예외 | ✅ | | checked/unchecked, try-with-resources |
| jvm-execution | JVM 실행 | ✅ | 바이트코드 | 클래스 로딩, JIT |
| jvm-memory | JVM 메모리 | ✅ | 메모리 영역, process | 힙·스택·메타스페이스 ↔ OS 메모리 영역 |
| gc | GC | ✅ | jvm-memory, lru | 세대별, G1/ZGC(버전 명시), STW |
| java-threads | 스레드와 동기화 | ✅ | thread, mutex | synchronized·volatile·java.util.concurrent, 가상 스레드(21+) |
| java-thread-pool | 스레드 풀(Executor) | — | thread-pool | java-threads의 심화(Executor·가상 스레드)로 합쳤다. 별도 파일 없음 |

## 7. Spring/JPA `spring`

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| ioc-di | IoC/DI | ✅ | oop | 왜 new를 안 하나 |
| bean-lifecycle | 빈 생명주기 | ✅ | ioc-di | 스코프, 초기화/소멸 |
| boot-config | 부트 자동 설정과 프로파일 | ✅ | bean-lifecycle | 조건부 자동 설정, 설정 우선순위, 프로파일·비밀 (2026-09-17) |
| mvc-request-flow | MVC 요청 흐름 | ✅ | http, thread-pool | 필터 → 디스패처 서블릿 → 컨트롤러 → … (시각화 대상) |
| aop-proxy | AOP·프록시 | ✅ | ioc-di | 자기 호출 함정 |
| spring-transaction | 트랜잭션 | ✅ | transaction-acid, aop-proxy | 전파, 롤백 규칙 |
| persistence-context | 영속성 컨텍스트 | ✅ | spring-transaction | 1차 캐시, 변경 감지, 플러시 |
| jpa-relations | 연관관계의 주인과 cascade | ✅ | persistence-context, relational-model | mappedBy, cascade/orphanRemoval, 편의 메서드 (2026-09-17) |
| n-plus-one | N+1 | ✅ | persistence-context, sql-join | fetch join, batch size |
| spring-test | 테스트 | ✅ | harness | 단위/슬라이스/통합 |

## 8. 서비스 설계 `service-dev/design` (id: service-design)

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| request-journey | 요청의 전체 여정 | ✅ | dns, tcp, http, mvc-request-flow | 브라우저 → DNS → LB → 서버 → DB → 응답 |
| auth | 인증·인가 | ✅ | cookie-session-jwt | 401 vs 403 |
| cors | 동일 출처 정책과 CORS | ✅ | http, auth | 출처, 프리플라이트, 브라우저만 지킴, Security와 순서 (2026-09-17) |
| xss-csrf | XSS와 CSRF | ✅ | cookie-session-jwt, cors | 출력 이스케이프·CSP·HttpOnly / SameSite·CSRF 토큰 (2026-09-17) |
| sql-injection | SQL 인젝션과 파라미터 바인딩 | ✅ | sql-join | PreparedStatement 원리, 식별자는 허용 목록 (2026-09-17) |
| redis-cache | Redis·캐시 | ✅ | cache, lru, hash | 캐시 전략, 키 설계, 만료 |
| message-queue | MQ | ✅ | queue, thread-pool | 비동기, 순서, 재처리 |
| idempotency-retry-timeout | 멱등성·재시도·타임아웃 | ✅ | http, transaction-acid | 두 번 결제 방지 |
| observability-deploy | 관측·배포 | ✅ | deploy(stages) | 로그·메트릭·트레이스, 무중단 배포 |
| monolith-msa | 모놀리스/MSA | ✅ | 전부 | 모듈러 모놀리스 |
| order-journey | 주문 요청 하나가 끝까지 | ✅ | 위 전부 | 예매·주문 시나리오로 전 단원을 잇는 마지막 개념 |

## 9. 프로그램 개발 보강 `service-dev/program-dev`

| id | 제목 | 상태 | 선수 | 비고 |
|---|---|---|---|---|
| object-design | 객체 설계 원칙 | ✅ | object, oop | 응집·결합, SOLID, 전략·팩토리 선택 이유 (2026-09-17) |

## 10. 기존 챕터 보강 (2026-09-17)

- context-switch: "시스템 호출·모드 전환은 문맥 교환이 아니다" 절 + 면접 질문.
- oop: 오버로딩/오버라이딩 절 + 면접 질문.
- monolith-msa: "티어와 레이어" 절(물리 vs 논리) + 면접 질문. auth: "보안의 세 요소"(기밀성·무결성·가용성, AAA) 절 + 면접 질문.
- 정확성 교정: java-threads·collections(ConcurrentHashMap 갱신 경로), db-index(복합 인덱스 앞 열 없을 때), tcp-udp(handshake 뒤 전송 시점), n-plus-one(EAGER+JPQL), volatile "즉시", 인덱스 "공짜" 등 — 근거는 각 파일 sources.

## 11. 아직 없는 것 (신입 백엔드 기준, 우선순위 순)

- SQL vs NoSQL 선택 기준, CQRS, 서비스 디스커버리, Docker/VM — 백엔드 심화.
- Redis Pub/Sub·Streams·트랜잭션 — 선택 확장.
- 컴퓨터 구조·OS 🔶 항목 보강(1·2장), 지연 시간 숫자표.
- **과목 전체 충분성 검토는 아직이다.** 위 표의 ✅는 "파일 작성 완료(형식·출처·면접 질문 포함)"이지 "그 과목을 신입 면접 기준으로 빠짐없이 다뤘다"가 아니다. 충분성은 사용자 검토와 실제 면접 질문 대조 뒤에 표시한다.

## 참고 자료

- 재생목록 "개발자 개념 장착"(코딩하는기술사, 49편) — **제목·URL만 확인(2026-09-17 oEmbed), 내용은 미확인.** 편별 대응은 `docs/VIDEO-MAP.md`.
  목차를 짜는 데 참고했고, 본문 사실 확인은 교재·공식 문서로 한다. 개별 개념의 `sources`에는 확인한 것만 적는다.
- 운영체제: OSTEP(무료, https://pages.cs.wisc.edu/~remzi/OSTEP/), Silberschatz 외 Operating System Concepts 10판
- Java: JDK 21 API 문서, Java Concurrency in Practice
- Spring: spring.io 레퍼런스(버전 명시)
- DB: MySQL 8.0 / PostgreSQL 16 공식 문서(제품·버전 차이 명시)
