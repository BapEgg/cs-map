---
id: string-immutability
title: String 불변성과 문자열 풀
order: 2
aliases: [String Pool, 문자열 풀, 불변 객체, StringBuilder, intern]
card:
  one_line: 'String은 만들어진 뒤 내용을 바꿀 수 없는 불변 객체라 안전하게 공유·캐시할 수 있고, 리터럴은 문자열 풀에 하나만 두고 재사용하며, 내용 비교는 ==가 아니라 equals로 한다.'
  analogy: 인쇄된 책 — 한 번 찍은 책은 글자를 못 고치고, 고치려면 새 판을 찍는다. 같은 책은 도서관(풀)에 한 권만 두고 모두가 빌려 본다
  analogy_limit: 도서관의 책은 "같은 책"이면 늘 한 권이지만, `new String("a")`처럼 명시적으로 찍으면 내용이 같아도 다른 객체가 생긴다. 그래서 ==로 비교하면 틀린다.
  keywords: [바꾸면 새 객체, 리터럴은 풀에 하나, == 말고 equals]
flow:
  prev: { id: value-passing, reason: 참조를 복사해 넘기는데도 String이 안 바뀌는 이유 }
  next: { id: static-final, reason: 바뀌지 않는 것을 어디에 어떻게 두나 }
see_also: [value-passing, equals-hashcode, jvm-memory, hash]
checked: '2026-09-16'
sources:
  - 'JLS §3.10.5 String Literals — 리터럴은 같은 String 객체를 가리킨다(interned) — https://docs.oracle.com/javase/specs/jls/se17/html/jls-3.html#jls-3.10.5'
  - 'Java API — String(immutable), String.intern() — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/String.html'
  - 'JEP 280 Indify String Concatenation(Java 9+ 문자열 결합) — https://openjdk.org/jeps/280'
---

## 개념

`String`은 한 번 만들어지면 **내용을 바꿀 수 없다**(불변). `s.toUpperCase()`, `s + "x"`, `s.replace(...)`는 원본을 고치는 게 아니라 **새 String을 만들어 돌려준다**. 원본을 가리키던 다른 변수들은 영향을 안 받는다. 그래서 String은 여러 스레드가 공유해도 안전하고, 해시코드를 한 번 계산해 캐시해 두어 `HashMap` 키로 빠르다.

`"hello"`처럼 코드에 적은 리터럴은 JVM이 **문자열 풀**에 하나만 두고, 같은 리터럴은 같은 객체를 가리킨다. 반면 `new String("hello")`는 풀과 별개의 새 객체다. 그래서 내용이 같아도 `==`(같은 객체인가)는 거짓일 수 있고, 내용 비교는 항상 `equals`로 한다.

#### 예시 — == 와 equals

```java
String a = "hello";
String b = "hello";            // 풀의 같은 객체
String c = new String("hello"); // 힙에 새 객체
String d = c.intern();          // 풀의 객체를 돌려줌

a == b        // true  (같은 풀 객체)
a == c        // false (다른 객체)
a.equals(c)   // true  (내용 같음)
a == d        // true
```

#### 작동 과정 — 반복문에서 문자열을 이어 붙이면

- `String s = ""; for (...) s += x;` — 매 반복마다 새 String이 생기고 이전 것은 쓰레기가 된다. n번이면 O(n²) 복사.
- `StringBuilder sb = new StringBuilder(); for (...) sb.append(x); sb.toString();` — 내부 배열에 이어 붙이고 마지막에 한 번 String으로. O(n).
- 결과: 한 줄짜리 `a + b + c`는 컴파일러가 알아서 효율적으로 처리하므로(Java 9+ `invokedynamic`) 그냥 써도 되지만, 반복문 안의 `+=`는 `StringBuilder`로.

#### 비교 — String과 StringBuilder

| | String | StringBuilder |
|---|---|---|
| 내용 변경 | 불가(새 객체 생성) | 가능(내부 배열 수정) |
| 스레드 안전 | 안전(불변) | 아님(`StringBuffer`는 동기화됨) |
| 쓰는 곳 | 값 보관·전달·키 | 반복 결합·긴 문자열 조립 |

## 왜 나왔나

문자열은 프로그램에서 가장 많이 만들어지고 가장 많이 공유된다 — 설정 키, 클래스 이름, 사용자 입력, 맵의 키. 이것이 가변이면 한 곳에서 바꾼 것이 예상 못 한 곳에 퍼지고, 해시코드가 바뀌어 `HashMap`에서 못 찾고, 보안 검사 뒤에 값이 바뀔 수 있다. 불변으로 못 박으면 공유와 캐시가 안전해지고, 같은 리터럴을 한 객체로 합쳐 메모리도 아낀다. 대가는 "바꿀 때마다 새 객체"라 반복 결합이 비싸다는 것이고, 그 자리에 `StringBuilder`를 뒀다.

## 확인 질문

- 설명해 보기: `String`이 불변이라는 말의 뜻을 `toUpperCase()`로 설명해 보세요.
  답: `toUpperCase()`는 원본을 바꾸지 않고 대문자로 된 새 String을 돌려준다. 결과를 변수에 담지 않으면 사라진다.
- 다음 상태 예측: `String a = "ab"; String b = "a" + "b"; a == b`는?
  답: `true`. 상수끼리의 결합은 컴파일 시점에 `"ab"` 리터럴로 접혀 풀의 같은 객체를 가리킨다. 변수가 섞이면(`"a" + x`) 실행 시 새 객체라 `false`.
- 다음 상태 예측: 반복문 1만 번에서 `s += "x"`를 하면?
  답: 1만 개의 중간 String이 만들어졌다 버려진다. `StringBuilder.append`로 바꾸면 배열 하나에 이어 붙인다.

## 심화

### 불변이 주는 것

스레드 안전(동기화 없이 공유), 해시코드 캐시(`hashCode()`를 한 번 계산해 필드에 저장), 안전한 키(`HashMap`·`Set`에 넣은 뒤 값이 안 바뀜), 보안(클래스 로딩·파일 경로·네트워크 주소를 검사한 뒤 바뀌지 않음). `String`은 `final` 클래스라 상속으로 가변으로 만들 수도 없다.

### 문자열 풀의 위치와 intern

풀은 Java 7부터 힙에 있다(그 전엔 PermGen). 리터럴과 컴파일 시 상수 결합 결과는 자동으로 풀에 들어가고, 실행 중 만들어진 문자열은 `intern()`을 불러야 풀에 들어간다(이미 있으면 그것을 돌려줌). 같은 값이 수백만 개 생기는 상황(파싱)이 아니면 `intern()`을 직접 쓸 일은 드물고, 쓰면 풀 조회 비용이 든다.

### 문자열 결합의 내부

`a + b`는 Java 8까지 컴파일러가 `StringBuilder`로 바꿨고, Java 9부터는 `invokedynamic`으로 실행 시 최적 전략을 고른다(JEP 280). 어느 쪽이든 한 식 안의 결합은 효율적이다. 문제는 반복문 — 반복마다 식이 새로 평가되어 `StringBuilder`가 매번 생기므로, 바깥에서 하나를 만들어 `append`한다.

### Java 9+ compact strings

Latin-1 문자만 있으면 `byte[]`에 1바이트씩, 아니면 UTF-16으로 2바이트씩 저장한다(`coder` 필드). 한글 문자열은 후자다. 메모리 계산할 때 "문자당 2바이트"가 늘 맞지는 않다.

### 실무에서는

- 문자열 비교는 `equals`, 대소문자 무시는 `equalsIgnoreCase`. `==`는 리터럴끼리도 믿지 말고 안 쓴다.
- 로그·SQL·JSON을 조립할 땐 `StringBuilder`나 `String.format`/`formatted`, 더 좋은 건 파라미터 바인딩(SQL 인젝션 장).
- 비밀번호·토큰을 `String`에 두면 풀·힙에 남아 덤프에 찍힐 수 있다. `char[]`로 받아 쓰고 지우는 API(`Console.readPassword`)가 그래서 있다.
- `switch (str)`은 내부에서 `hashCode` + `equals`로 동작한다. `null`이면 NPE.

### 면접 질문

#### String이 불변인 이유와 그로 인한 장단점은 무엇인가요?

String은 생성 후 내용을 바꿀 수 없는 불변 클래스이고, 이유는 가장 많이 공유되는 객체를 안전하게 공유·캐시하기 위해서입니다.
불변이면 여러 스레드가 동기화 없이 써도 되고, 해시코드를 한 번 계산해 캐시할 수 있어 `HashMap` 키로 빠르며, 같은 리터럴을 풀에 하나만 두어 메모리를 아끼고, 검사한 뒤 값이 바뀌는 보안 문제가 없습니다.
단점은 바꿀 때마다 새 객체가 생겨 반복 결합이 O(n²)가 되는 것이고, 그 자리에 `StringBuilder`를 씁니다. 한계는 불변이라도 참조는 바꿀 수 있으므로 "변수가 안 바뀐다"는 뜻은 아니라는 점입니다.

- 오답: "String은 final이라서 불변이다" — `final` 클래스는 상속만 막는다. 불변은 내부 `byte[]`를 밖에 노출하지 않고 변경 메서드가 없기 때문이다.
- 꼬리: 문자열 풀은 어디에 있고 `intern()`은 무엇을 하나요?
- 꼬리: `"a" + "b" == "ab"`가 true인 이유는?

#### 두 String을 비교할 때 ==와 equals의 차이, 그리고 리터럴은 왜 ==가 true가 되기도 하나요?

`==`는 두 변수가 같은 객체를 가리키는지, `equals`는 내용이 같은지 비교합니다. 내용 비교는 항상 `equals`를 써야 합니다.
리터럴은 JVM이 문자열 풀에 하나만 두고 같은 리터럴은 같은 객체를 가리키게 하므로 `"a" == "a"`가 true지만, `new String("a")`나 실행 중 만들어진 문자열은 풀과 별개의 객체라 `==`가 false입니다.
예를 들어 사용자 입력 `request.getParameter("q") == "all"`은 내용이 같아도 false입니다. 한계는 `==`가 우연히 true인 경우가 있어 테스트에서 안 잡히다가 운영에서 틀리므로, 정적 분석기가 String `==`를 경고로 잡게 둡니다.

- 오답: "리터럴끼리는 ==를 써도 된다" — 컴파일 시 상수가 아닌 결합(`"a" + x`)은 새 객체라 리터럴처럼 보여도 false다.
- 꼬리: `switch`문의 String 비교는 내부에서 어떻게 동작하나요?
