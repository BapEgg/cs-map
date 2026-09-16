---
id: java-threads
title: 스레드와 동기화 (Java)
order: 9
aliases: [synchronized, volatile, java.util.concurrent, 가상 스레드]
card:
  one_line: 'Java의 동기화는 synchronized·Lock으로 임계 구역을 잠그고, volatile로 변경이 보이게 하며, java.util.concurrent의 원자 클래스·동시성 컬렉션·Executor로 락을 직접 쓰는 일을 줄인다.'
  analogy: 운영체제 장의 자물쇠·신호등을 자바가 상자에 담아 준 것 — 직접 만들지 않고 골라 쓴다
  analogy_limit: 상자에 담겼다고 규칙이 사라지진 않는다. 어느 락이 어느 데이터를 지키는지, 어디서 잠들 수 있는지는 여전히 코드를 짜는 사람이 정한다.
  keywords: [synchronized·Lock, volatile 가시성, Atomic·Concurrent·Executor]
flow:
  prev: { id: gc, reason: 메모리를 여러 스레드가 나눠 쓰면 }
see_also: [thread, mutex, race-condition, thread-pool, deadlock]
checked: '2026-09-16'
sources:
  - 'JLS 21 §17 Threads and Locks — happens-before, volatile — https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html'
  - 'JDK 21 API java.util.concurrent 패키지 요약 — https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html'
  - 'JEP 444 Virtual Threads (JDK 21) — https://openjdk.org/jeps/444'
  - 'Goetz 외, Java Concurrency in Practice (2006) 2~5장, 16장'
---

## 개념

운영체제 장에서 본 경쟁 상태·임계 구역·뮤텍스·세마포어·교착이 Java에서는 어떤 모양인지의 장이다. 원리는 같고 도구 이름이 다르다.

`synchronized`는 객체마다 붙은 재진입 뮤텍스를 잠그는 문법이다 — 블록을 벗어나면 예외가 나도 풀린다. `ReentrantLock`은 같은 뮤텍스에 타임아웃·공정성을 더한 클래스. `volatile`은 한 스레드의 쓰기가 다른 스레드에 **보이게**(가시성) 하지만 읽고-고치고-쓰기를 묶지는 않는다. `AtomicInteger`는 락 없이 CAS로 원자적 갱신을 해 준다. `ConcurrentHashMap`은 조회는 락 없이 하고, 갱신은 빈 버킷이면 CAS로, 이미 노드가 있는 버킷이면 그 버킷의 첫 노드만 `synchronized`로 잠가 다른 버킷과 동시에 진행한다 — "전부 CAS"가 아니다. `ExecutorService`는 스레드 풀이다.

조회수 카운터를 여러 요청 스레드가 올리는 상황을 네 가지로 짜 보자.

- `int count; count++` → 경쟁 상태. 100만 번 올려도 100만이 안 나온다.
- `volatile int count; count++` → 여전히 틀린다. 가시성만 보장하고 원자성은 없다.
- `synchronized void inc() { count++; }` → 맞다. 한 번에 한 스레드만. 경합이 심하면 대기.
- `AtomicInteger count; count.incrementAndGet()` → 맞다. 락 없이 CAS로 재시도. 이 경우 가장 싸다.
- 결과: "같은 데이터에 쓰기가 겹친다"는 문제는 같고, 도구 선택이 비용을 정한다.

## 왜 나왔나

자바는 처음부터 언어에 스레드와 `synchronized`를 넣었지만, 그것만으로는 타임아웃·공정성·락 없는 갱신·스레드 풀을 만들 수 없었다. JDK 5에서 `java.util.concurrent`(Doug Lea)가 들어와 락·원자 클래스·동시성 컬렉션·Executor를 표준으로 제공했고, 그 뒤로 "락을 직접 쓰기보다 상자에서 고르기"가 원칙이 됐다. JDK 21의 가상 스레드는 "요청당 스레드"를 다시 싸게 만들었다.

## 확인 질문

- 설명해 보기: `volatile`이 보장하는 것과 못 하는 것은?
  답: 다른 스레드가 쓴 값이 이후 읽기에 보이는 것(가시성)은 보장하지만, `count++` 같은 읽고-고치고-쓰기의 원자성은 보장하지 않는다.
- 다음 상태 예측: `synchronized` 블록 안에서 예외가 나면 락은?
  답: 풀린다. 블록을 어떤 식으로 나가든 JVM이 해제한다. `ReentrantLock`은 `finally`에서 직접 풀어야 한다.
- 다음 상태 예측: `HashMap`을 `synchronized` 메서드 안에서만 쓰면 안전한가?
  답: 모든 접근이 같은 락을 잡는다면 안전하다. 한 경로라도 락 없이 접근하면 깨진다. 그냥 `ConcurrentHashMap`이 낫다.

## 심화

### happens-before — 가시성의 규칙

CPU 캐시·컴파일러 재배치 때문에 한 스레드의 쓰기가 다른 스레드에 언제 보이는지는 보장이 없다. JLS는 `synchronized` 해제 → 획득, `volatile` 쓰기 → 읽기, `Thread.start` → 그 스레드, 스레드 종료 → `join` 같은 관계를 happens-before로 정의해 그 사이의 쓰기가 보이게 한다. 락은 상호 배제와 가시성을 둘 다 주고, `volatile`은 가시성만 준다. 락 없이 필드를 주고받으면 "왜 값이 안 바뀌지"가 생긴다.

### 도구 고르기

| 상황 | 도구 |
|---|---|
| 단순 카운터·플래그 갱신 | `AtomicInteger`·`AtomicLong`·`LongAdder`(경합 심할 때) |
| 상태 플래그 읽기(쓰기는 한 곳) | `volatile boolean` |
| 공유 맵·큐 | `ConcurrentHashMap`, `ConcurrentLinkedQueue`, `BlockingQueue` |
| 여러 필드를 함께 바꾸는 임계 구역 | `synchronized` 또는 `ReentrantLock` |
| 타임아웃·공정성·조건 여러 개 | `ReentrantLock` + `Condition` |
| 읽기 압도적 | `ReadWriteLock`, `StampedLock` |
| 개수 제한·순서 대기 | `Semaphore`, `CountDownLatch`, `CyclicBarrier` |
| 스레드 만들기 | 직접 `new Thread` 대신 `ExecutorService` |

### 가상 스레드 (JDK 21)

`Thread.ofVirtual()` 또는 `Executors.newVirtualThreadPerTaskExecutor()`. 커널 스레드에 1:1로 묶이지 않고 JVM이 소수의 캐리어 스레드 위에서 돌린다. I/O로 블로킹되면 캐리어를 놓아 다른 가상 스레드가 쓴다. 수십만 개를 만들 수 있어 "요청당 스레드"를 풀 없이 다시 쓸 수 있다. 주의: CPU 계산에는 이득 없음, JDK 21에서는 `synchronized` 블록 안에서 블로킹하면 캐리어에 고정(pinning, JDK 24에서 해소), `ThreadLocal`은 스레드 수만큼 늘어난다.

### 실무에서는

- 스프링 싱글턴 빈의 필드에 요청 상태를 두지 않는다(스레드 장). 필요하면 지역 변수·매개변수.
- `@Async`·`@Scheduled`의 풀 설정을 명시하고, 작업이 던진 예외를 `Future`로 확인한다.
- 동기화된 컬렉션(`Collections.synchronizedX`)보다 동시성 컬렉션. `get` 뒤 `put`은 `compute`·`merge`로.
- 교착·풀 고갈 진단은 스레드 덤프(`jstack`) — `BLOCKED`(모니터 대기), `WAITING`(신호 대기)을 읽는다.
- 스프링 부트 3.2+에서 `spring.threads.virtual.enabled=true`로 Tomcat 요청 처리에 가상 스레드를 쓸 수 있다. JDBC 같은 블로킹 호출이 많은 서비스에서 스레드 수 제약이 풀린다.

### 면접 질문

#### `synchronized`와 `volatile`의 차이는 무엇인가요?

`synchronized`는 임계 구역을 한 번에 한 스레드만 실행하게 하는 상호 배제와, 락 해제 전의 쓰기가 다음 획득자에게 보이는 가시성을 둘 다 보장합니다. `volatile`은 그 변수에 대한 쓰기가 다른 스레드의 이후 읽기에 보이는 가시성(과 재배치 금지)만 보장하고 원자성은 주지 않습니다.
그래서 `volatile int count`에 `count++`를 하면 여전히 경쟁 상태이고, "쓰는 곳은 하나, 읽는 곳은 여럿"인 종료 플래그 같은 데만 `volatile`이 맞습니다.
카운터는 `AtomicInteger`, 여러 필드를 함께 바꾸는 구간은 `synchronized`나 `Lock`입니다. 한계는 `synchronized`는 타임아웃이 없어 영영 기다릴 수 있고, 어느 객체를 락으로 쓰는지(`this`·클래스·별도 객체)에 따라 범위가 달라 실수하기 쉽다는 점입니다.

- 꼬리: happens-before란 무엇인가요?
- 꼬리: `AtomicInteger`는 락 없이 어떻게 원자성을 얻나요? `ConcurrentHashMap`의 갱신도 전부 락이 없나요?

#### 가상 스레드를 도입하면 스레드 풀 튜닝이 필요 없어지나요?

요청 처리 스레드 수의 제약은 거의 사라지지만, 뒷단 자원의 한도는 그대로라 그쪽 튜닝은 여전히 필요합니다.
가상 스레드는 I/O 대기 중 커널 스레드를 점유하지 않아 수십만 개를 띄울 수 있으므로 "스레드가 모자라 요청을 못 받는" 문제는 풀리지만, DB 커넥션 풀·외부 API 동시 호출 수·메모리는 늘어나지 않습니다. 오히려 스레드가 무제한이라 커넥션 풀 대기가 폭증할 수 있습니다.
그래서 동시 진행 상한은 세마포어나 커넥션 풀 크기로 명시하고, CPU 계산 위주 작업은 이득이 없으며, JDK 21에서는 `synchronized` 안 블로킹의 고정과 `ThreadLocal` 증가를 살펴야 합니다. Tomcat 스레드 풀 크기 고민은 줄고 뒷단 자원 상한 고민은 남습니다.

- 꼬리: 가상 스레드에서 `synchronized`가 문제 되는 이유(JDK 21)는?
- 꼬리: 이벤트 루프(WebFlux)와 가상 스레드 중 무엇을 고르나요?
