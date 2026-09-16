---
id: static-final
title: static과 final
order: 3
aliases: [static, final, 정적 멤버, 상수, 클래스 변수, 유틸리티 클래스]
card:
  one_line: 'static은 객체가 아니라 클래스에 하나만 있는 것(모든 객체가 공유), final은 한 번 정해지면 다시 대입할 수 없는 것이며, 둘을 합친 static final이 상수다.'
  analogy: 학교의 게시판(static — 학급 전체가 하나를 봄)과 학생증의 학번(final — 발급 뒤 못 바꿈)
  analogy_limit: 학번은 못 바꾸지만 학생의 소지품은 바뀌듯, `final` 참조 변수도 가리키는 객체의 내용은 바뀔 수 있다. "변수가 final"과 "객체가 불변"은 다른 말이다.
  keywords: [static = 클래스에 하나, final = 재대입 금지, 공유 상태는 위험]
flow:
  prev: { id: string-immutability, reason: 바뀌지 않는 것을 어디에 어떻게 두나 }
  next: { id: oop, reason: 객체 단위로 상태와 행동을 묶으면 }
see_also: [jvm-memory, bean-lifecycle, java-threads, string-immutability]
checked: '2026-09-16'
sources:
  - 'JLS §8.3.1.1 static Fields, §8.3.1.2 final Fields — https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.3.1'
  - 'JLS §4.12.4 final Variables, §12.4 Initialization of Classes(정적 초기화 시점) — https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.4'
  - 'Oracle Java Tutorials — Understanding Class Members — https://docs.oracle.com/javase/tutorial/java/javaOO/classvars.html'
---

## 개념

**`static`** 이 붙은 필드·메서드는 객체가 아니라 **클래스에 속한다**. 객체를 몇 개 만들든 하나뿐이고, 객체 없이 `클래스명.멤버`로 쓴다. 객체마다 다른 값(이름, 잔고)은 인스턴스 필드에, 모든 객체가 공유하는 값(생성된 개수, 설정)이나 객체 상태와 무관한 함수(`Math.max`)는 `static`에 둔다.

**`final`** 이 붙은 변수는 **한 번 대입하면 다시 대입할 수 없다**. 기본형이면 값이 고정되고, 참조형이면 가리키는 객체가 고정된다 — 그 객체의 내용까지 고정되는 건 아니다. 클래스에 붙으면 상속 금지, 메서드에 붙으면 오버라이딩 금지.

둘을 합친 `static final`이 **상수**다. 클래스에 하나, 바뀌지 않음. 이름은 `MAX_RETRY`처럼 대문자로 쓴다.

#### 예시 — 어디에 두나

```java
class Account {
    static int created = 0;                 // 모든 계좌가 공유
    static final int MAX_DAILY = 1_000_000; // 상수
    final String id;                        // 계좌마다 다르지만 발급 뒤 불변
    long balance;                           // 계좌마다 다르고 바뀜

    Account(String id) { this.id = id; created++; }
    static boolean isValid(String id) { return id.length() == 12; } // 객체 없이 호출
}
```

#### 비교 — static과 인스턴스

| | 인스턴스 멤버 | static 멤버 |
|---|---|---|
| 개수 | 객체마다 하나 | 클래스에 하나 |
| 접근 | `obj.x` | `Class.x` |
| `this` 사용 | 가능 | 불가(객체가 없음) |
| 메모리 | 힙(객체 안) | 메타스페이스/힙의 클래스 데이터 |
| 생기는 때 | `new` 할 때 | 클래스가 처음 쓰일 때 한 번 |

## 왜 나왔나

"객체와 무관하게 하나만 있으면 되는 것"을 매 객체에 복사해 두는 건 낭비이고, 객체 없이 쓰는 함수(수학 함수, 팩토리)를 위해 객체를 만드는 것도 어색했다. 그래서 클래스 단위 멤버를 두었다. `final`은 "바뀌지 않는다"를 컴파일러가 보장하게 해서, 읽는 사람이 "이 값은 어딘가에서 바뀔 수 있나"를 추적하지 않아도 되게 한다. 불변 객체·상수·스레드 안전의 출발점이다.

## 확인 질문

- 설명해 보기: `static` 메서드 안에서 `this`를 쓸 수 없는 이유는?
  답: `static` 메서드는 객체 없이 클래스로 호출되므로 "지금 이 객체"가 없다. 인스턴스 필드도 직접 못 읽는다.
- 다음 상태 예측: `final List<String> list = new ArrayList<>(); list.add("a"); list = new ArrayList<>();`
  답: `add`는 된다(객체 내용 변경). 마지막 줄은 컴파일 오류(재대입). `final`은 참조를 고정할 뿐 리스트를 불변으로 만들지 않는다.
- 다음 상태 예측: 웹 서버에서 `static Map<String, User> cache = new HashMap<>()`에 요청마다 `put`하면?
  답: 모든 요청 스레드가 하나의 `HashMap`을 동기화 없이 고쳐 경쟁 상태가 난다. `ConcurrentHashMap`이거나, 아예 static 공유 상태를 두지 않는다.

## 심화

### 정적 초기화 순서

클래스는 처음 쓰일 때(인스턴스 생성, static 멤버 접근, `Class.forName`) 한 번 초기화된다. static 필드 초기화와 `static {}` 블록이 적힌 순서대로 실행되고, 그다음에야 인스턴스가 만들어진다. 정적 초기화에서 예외가 나면 `ExceptionInInitializerError`가 나고 그 클래스는 이후에도 못 쓴다(`NoClassDefFoundError`). 두 클래스가 서로의 static을 참조하면 초기화 순서에 따라 `null`을 보는 순환 문제가 생긴다.

### final과 불변 객체

모든 필드가 `final`이고, 클래스가 `final`이며, 가변 필드를 밖에 노출하지 않으면 불변 객체다. `record`가 이 셋을 자동으로 해 준다(필드 `final`, 클래스 `final`). 불변 객체는 스레드 안전이고 방어적 복사가 필요 없다. `final` 필드는 생성자가 끝난 뒤 다른 스레드에서도 초기화된 값이 보인다는 JMM 보장(final field semantics)도 있다.

### static의 함정 — 공유 상태와 테스트

`static` 가변 필드는 프로세스 전체의 전역 변수다. 웹 서버에서는 모든 요청이 공유하므로 동시성 문제가 생기고, 테스트에서는 테스트끼리 상태가 새어 순서에 따라 결과가 달라진다. 스프링에서 "싱글턴 빈에 상태를 두지 말라"는 것과 같은 이유. 유틸리티 클래스(`static` 메서드만)는 괜찮지만, 의존이 필요한 로직을 static으로 두면 가짜로 바꿔 끼울 수 없어 테스트가 어렵다 — 그래서 빈으로 만든다.

### static 중첩 클래스와 내부 클래스

`static class Inner`는 바깥 객체 없이 만들 수 있고 바깥 인스턴스 참조를 안 갖는다. `static` 없는 내부 클래스는 바깥 객체의 참조를 숨겨 갖고 있어 메모리 누수(바깥 객체가 못 죽음)의 원인이 되기도 한다. 바깥 인스턴스가 필요 없으면 `static`을 붙인다.

### 실무에서는

- 상수는 `static final` + 대문자, 관련 상수가 여럿이면 `enum`.
- 지역 변수·매개변수·필드에 가능하면 `final`. 재대입이 없다는 사실이 읽기를 돕고, 람다에서 캡처할 수 있다(effectively final).
- `static` 가변 필드는 두지 않는다. 캐시가 필요하면 빈으로 만들고 동시성 안전한 구조를 쓴다.
- 스프링 빈에 `static` 필드 주입(`@Autowired static`)은 동작하지 않는다 — 주입은 인스턴스에 한다.

### 면접 질문

#### static과 final은 각각 무엇이고, static final은 무엇인가요?

`static`은 객체가 아니라 클래스에 속해 하나만 존재하는 멤버이고, `final`은 한 번 대입하면 재대입할 수 없는 변수(클래스면 상속 금지, 메서드면 오버라이딩 금지)이며, `static final`은 클래스에 하나이고 바뀌지 않는 상수입니다.
객체마다 복사할 필요 없는 것과 객체 없이 쓰는 함수를 위해 `static`이, "바뀌지 않는다"를 컴파일러가 보장하게 하려고 `final`이 있습니다.
예를 들어 `Math.PI`는 `static final`, `Math.max`는 `static` 메서드, 계좌 번호는 인스턴스 `final` 필드입니다. 한계는 `final` 참조 변수라도 가리키는 객체의 내용은 바뀔 수 있고, `static` 가변 필드는 전역 공유 상태라 동시성·테스트 문제를 만든다는 점입니다.

- 오답: "final 컬렉션은 수정할 수 없다" — 재대입만 막힌다. `add`·`remove`는 된다.
- 꼬리: `static` 메서드에서 인스턴스 필드를 못 쓰는 이유는?
- 꼬리: 클래스의 static 초기화는 언제 일어나나요?

#### 웹 애플리케이션에서 static 변수를 캐시로 쓰면 어떤 문제가 있나요?

모든 요청 스레드가 하나의 변수를 공유하므로 동기화 없이 쓰면 경쟁 상태로 값이 깨지고, 프로세스가 사는 동안 계속 커져 메모리 누수가 되며, 서버가 여러 대면 서버마다 다른 값을 갖고, 테스트 간에 상태가 새어 순서에 따라 결과가 달라집니다.
`static`은 클래스당 하나라는 뜻이지 "요청당 하나"나 "안전하게 공유되는 하나"가 아니기 때문입니다.
고치려면 캐시를 빈으로 만들어 `ConcurrentHashMap`이나 Caffeine처럼 동시성·만료가 있는 구조를 쓰고, 서버가 여럿이면 Redis로 뺍니다. 한계는 진짜 상수(설정값, 룩업 테이블)는 `static final`로 두는 것이 맞으므로, "바뀌는가"가 기준이라는 점입니다.

- 오답: "synchronized를 붙이면 된다" — 경쟁은 막아도 무한 성장·서버 간 불일치·테스트 오염은 그대로다.
- 꼬리: 스프링 싱글턴 빈의 필드와 static 필드는 무엇이 다른가요?
