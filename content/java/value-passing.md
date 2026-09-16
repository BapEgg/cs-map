---
id: value-passing
title: 값 전달과 참조
order: 1
aliases: [call by value, pass by value, 참조 전달, 참조 변수, 얕은 복사, 깊은 복사]
card:
  one_line: '자바는 항상 값을 복사해 넘긴다. 기본형은 값 자체를, 참조형은 객체의 주소(참조)를 복사해 넘기므로, 메서드 안에서 객체의 내용은 바꿀 수 있지만 호출한 쪽 변수가 가리키는 객체는 바꿀 수 없다.'
  analogy: 친구에게 집 주소를 적어 주는 것 — 친구는 그 집에 가서 가구를 옮길 수 있지만(내용 변경), 친구가 자기 쪽지의 주소를 다른 집으로 고쳐 써도 내 쪽지는 그대로다(재할당)
  analogy_limit: 쪽지는 "복사본"이라는 게 눈에 보이지만 코드에서는 `= new`가 쪽지를 고치는 건지 집을 고치는 건지 안 보인다. 그 구분이 이 개념의 전부다.
  keywords: [항상 값 복사, 참조형은 주소를 복사, 내용 변경 vs 재할당]
flow:
  next: { id: string-immutability, reason: 참조를 복사해 넘기는데도 String이 안 바뀌는 이유 }
see_also: [jvm-memory, oop, equals-hashcode]
checked: '2026-09-16'
sources:
  - 'Java Language Specification §8.4.1 Formal Parameters — "the value of the actual argument is assigned to the parameter" — https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.1'
  - 'JLS §4.3.1 Objects — reference values — https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.3.1'
  - 'Oracle Java Tutorials — Passing Information to a Method(primitive vs reference data type arguments) — https://docs.oracle.com/javase/tutorial/java/javaOO/arguments.html'
---

## 개념

자바는 메서드에 인자를 넘길 때 **변수의 값을 복사해서** 넘긴다(call by value). 기본형(`int`, `double`, `boolean`…)은 값 자체가 복사되고, 참조형(객체·배열·String)은 변수가 들고 있는 **객체의 주소(참조)** 가 복사된다. 그래서 메서드 안에서 참조를 따라가 객체의 내용을 바꾸면 호출한 쪽에도 보이지만, 매개변수에 `new`로 다른 객체를 대입해도 호출한 쪽 변수는 여전히 원래 객체를 가리킨다.

"자바는 참조 전달(call by reference)이다"는 흔한 오해다. 참조 전달이라면 매개변수 재할당이 호출한 쪽 변수를 바꿔야 하는데, 자바에서는 그런 일이 없다.

#### 예시 — 내용 변경과 재할당

```java
void change(int n, List<String> list, List<String> other) {
    n = 99;                 // 복사본만 바뀜
    list.add("추가");        // 같은 객체의 내용 → 호출한 쪽에 보임
    other = new ArrayList<>(); // 복사된 참조를 바꿈 → 호출한 쪽은 그대로
    other.add("안 보임");
}

int n = 1;
List<String> a = new ArrayList<>(), b = new ArrayList<>();
change(n, a, b);
// n == 1, a == ["추가"], b == []
```

#### 작동 과정 — 스택과 힙에서 보면

- 호출: `change`의 스택 프레임에 `n`, `list`, `other` 세 칸이 생기고, 호출한 쪽의 `n` 값 1과 `a`·`b`가 가리키는 힙 주소가 각각 복사된다.
- `list.add`: 복사된 주소를 따라 힙의 그 `ArrayList` 객체에 원소를 넣는다. 호출한 쪽 `a`도 같은 주소라 같은 객체를 본다.
- `other = new ArrayList<>()`: 프레임의 `other` 칸에 새 힙 주소를 덮어쓴다. 호출한 쪽 `b` 칸은 건드린 적이 없다.
- 반환: 프레임이 사라진다. 남는 것은 힙의 변화(`a`에 원소 하나)뿐이다.

#### 비교 — 무엇이 호출한 쪽에 보이나

| 메서드 안에서 한 일 | 기본형 매개변수 | 참조형 매개변수 |
|---|---|---|
| 매개변수에 새 값 대입(`n = 99`, `list = new …`) | 안 보임 | 안 보임 |
| 참조를 따라 내용 변경(`list.add`, `obj.setX`) | 해당 없음 | 보임 |
| 불변 객체의 메서드 호출(`s.toUpperCase()`) | — | 새 객체를 돌려줄 뿐, 원본 안 바뀜 |

## 왜 나왔나

C에서는 포인터를 넘겨 "변수 자체"를 바꾸는 참조 전달이 가능했고, C++는 `&`로 참조 전달을 문법에 넣었다. 자바는 포인터 연산과 참조 전달을 빼고 "항상 값 복사" 하나만 남겨 메서드가 호출한 쪽 변수를 몰래 바꾸는 일을 없앴다. 대신 객체는 힙에 있고 변수는 그 주소만 들고 있으므로, 복사된 주소로 같은 객체를 고치는 것은 가능하다 — 그것이 "참조 전달처럼 보이는" 이유다.

## 확인 질문

- 설명해 보기: "자바는 call by value"라는 말을 참조형 인자에 대해 설명해 보세요.
  답: 변수가 들고 있는 것은 객체의 주소이고, 그 주소가 복사돼 넘어간다. 주소로 객체 내용은 바꿀 수 있지만 호출한 쪽 변수가 가리키는 대상은 못 바꾼다.
- 다음 상태 예측: `void reset(int[] arr) { arr = new int[3]; }`를 `int[] a = {1,2,3}`로 부르면 `a`는?
  답: 그대로 `{1,2,3}`. 매개변수 `arr`의 복사된 참조만 새 배열로 바뀌었다. `arr[0] = 0`이었다면 `a[0]`이 0이 된다.
- 다음 상태 예측: `void up(String s) { s = s.toUpperCase(); }`를 `String t = "a"`로 부르면 `t`는?
  답: `"a"`. `toUpperCase`는 새 String을 만들어 `s`에 대입했을 뿐이고, String은 불변이라 원본은 어차피 안 바뀐다.

## 심화

### 방어적 복사

가변 객체(List, Date, 배열)를 받아 필드에 그대로 저장하면 호출한 쪽이 나중에 그 객체를 고쳐 내 객체의 상태가 바뀐다. 생성자·세터에서 `new ArrayList<>(list)`처럼 복사해 두고, getter도 복사본이나 `Collections.unmodifiableList`를 돌려준다. 불변 객체(`record`, `String`, `LocalDate`)를 쓰면 이 걱정이 사라진다.

### 얕은 복사와 깊은 복사

객체를 복사할 때 필드의 참조만 복사하면(얕은 복사) 두 객체가 같은 내부 객체를 공유한다. 내부 객체까지 새로 만들어야 깊은 복사다. `clone()`은 기본이 얕은 복사라 잘 안 쓰고, 복사 생성자나 정적 팩토리를 직접 만든다. 컬렉션의 `new ArrayList<>(src)`도 원소는 공유하는 얕은 복사다.

### 매개변수로 "결과를 돌려주기"

C 스타일로 "출력 매개변수"를 쓰려고 배열이나 홀더 객체를 넘겨 그 안을 채우는 코드가 있다. 동작은 하지만 읽는 사람이 부작용을 예상하지 못한다. 반환값(여러 개면 `record`)으로 돌려주는 것이 자바답다.

### 실무에서는

- 메서드가 인자 객체를 수정한다면 이름에 드러낸다(`fillDefaults(order)`). 아니면 새 객체를 반환한다.
- DTO·엔티티에 컬렉션을 담을 땐 생성자에서 복사하고 getter는 읽기 전용 뷰를 준다.
- `record`와 불변 컬렉션(`List.of`)을 기본으로 쓰면 "누가 바꿨지"를 찾는 일이 사라진다.

### 면접 질문

#### 자바는 call by value인가요, call by reference인가요?

call by value입니다. 기본형은 값이, 참조형은 객체의 주소가 복사되어 넘어갑니다.
JLS가 매개변수는 "실제 인자의 값이 대입된다"고 정의하기 때문이고, 참조형 변수의 값은 객체 자체가 아니라 객체를 가리키는 참조입니다.
그래서 메서드 안에서 `list.add()`는 호출한 쪽에 보이지만 `list = new ArrayList<>()`는 안 보입니다. 한계는 이 구분이 코드에 잘 안 보여서 가변 객체를 넘기면 의도치 않은 수정이 생기고, 그래서 방어적 복사나 불변 객체가 필요하다는 점입니다.

- 오답: "객체는 참조로 넘어가니까 call by reference다" — 참조 전달이라면 매개변수 재할당이 호출한 쪽 변수를 바꿔야 하는데 자바는 그렇지 않다.
- 꼬리: 메서드 안에서 인자로 받은 객체를 다른 객체로 바꿔치기할 수 있나요?
- 꼬리: 왜 String은 참조형인데 메서드 안에서 바꿔도 원본이 안 바뀌나요?

#### 생성자에서 받은 List를 그대로 필드에 저장하면 어떤 문제가 있고 어떻게 고치나요?

호출한 쪽이 그 List를 계속 들고 있다가 나중에 원소를 추가·삭제하면 내 객체의 상태가 밖에서 바뀝니다. 생성자에서 `List.copyOf(list)`나 `new ArrayList<>(list)`로 복사해 저장하고, getter는 복사본이나 수정 불가 뷰를 돌려줍니다.
참조가 복사되어 넘어오므로 같은 객체를 양쪽이 공유하기 때문입니다.
예를 들어 `Order(List<Item> items)`에 넘긴 리스트를 밖에서 `clear()`하면 주문의 항목이 사라집니다. 한계는 복사 비용이 들고, 원소 자체가 가변이면 원소까지 복사해야(깊은 복사) 완전히 안전하다는 점입니다.

- 오답: "final로 선언하면 안전하다" — `final`은 변수 재할당만 막고 리스트 내용 변경은 막지 못한다.
- 꼬리: `List.copyOf`와 `Collections.unmodifiableList`의 차이는?
