---
id: jpa-relations
title: 연관관계의 주인과 cascade
order: 8
aliases: [연관관계의 주인, mappedBy, 양방향 연관관계, cascade, orphanRemoval, '@ManyToOne', '@OneToMany', 외래키]
card:
  one_line: 'JPA 양방향 연관관계에서 외래키를 실제로 갱신하는 쪽(보통 @ManyToOne)이 주인이고 반대쪽(mappedBy)은 읽기 전용이며, cascade는 부모의 persist·remove를 자식에게 전파하고 orphanRemoval은 컬렉션에서 빠진 자식을 삭제한다.'
  analogy: 주문서와 품목 — 품목 종이에 "주문번호" 칸(외래키)이 있으므로 품목이 주인이다. 주문서에 품목 목록을 적어 두는 건 보기 편하라고 있는 사본이라, 거기만 고쳐서는 DB가 안 바뀐다. cascade는 주문서를 버리면 품목도 같이 버리는 규칙
  analogy_limit: 종이는 두 장이지만 DB에는 외래키 한 열뿐이다. 두 종이가 어긋나면 어느 쪽이 진실인지 JPA는 "주인 쪽"으로 정했을 뿐, 사람은 양쪽을 맞추는 코드를 직접 써야 한다.
  keywords: [외래키 있는 쪽이 주인, mappedBy는 읽기, cascade·orphanRemoval은 부모-자식에만]
flow:
  prev: { id: persistence-context, reason: 엔티티 하나를 관리하는 법을 알았으니 둘 사이의 관계 }
  next: { id: n-plus-one, reason: 연관을 걸었더니 생기는 쿼리 문제 }
see_also: [persistence-context, relational-model, sql-join, n-plus-one, spring-transaction]
checked: '2026-09-16'
sources:
  - 'Jakarta Persistence 3.1 §2.9 Entity Relationships(mappedBy, 관계의 owning side), §3.2.2 Persisting(cascade) — https://jakarta.ee/specifications/persistence/3.1/'
  - 'Hibernate ORM 6 User Guide — Associations(@ManyToOne, @OneToMany bidirectional, orphanRemoval) — https://docs.jboss.org/hibernate/orm/6.4/userguide/html_single/Hibernate_User_Guide.html#associations'
  - 'Vlad Mihalcea, The best way to map a @OneToMany relationship with JPA and Hibernate — https://vladmihalcea.com/the-best-way-to-map-a-onetomany-association-with-jpa-and-hibernate/'
---

## 개념

DB에서 주문(`orders`)과 품목(`order_items`)의 관계는 **품목 표의 외래키 열 `order_id` 하나**로 표현된다. 객체에서는 `OrderItem.order`(품목 → 주문)와 `Order.items`(주문 → 품목 목록) 두 방향을 둘 수 있다. 참조는 둘인데 외래키는 하나이므로 JPA는 **어느 쪽이 외래키를 관리하는지**를 정해야 한다 — 그것이 **연관관계의 주인**이다. 외래키가 있는 표의 엔티티, 즉 `@ManyToOne` 쪽이 주인이고, 반대쪽 `@OneToMany(mappedBy = "order")`는 "나는 주인이 아니고 저쪽 필드를 거울처럼 본다"는 뜻으로 **읽기 전용**이다. `order.getItems().add(item)`만 하고 `item.setOrder(order)`를 안 하면 DB에 아무것도 안 써진다.

**cascade**는 부모에 한 작업을 자식에게 전파한다. `@OneToMany(cascade = ALL)`이면 `em.persist(order)`가 품목들도 저장하고 `em.remove(order)`가 품목들도 지운다. **orphanRemoval = true**는 부모의 컬렉션에서 **빠진** 자식(고아)을 DELETE한다. 둘 다 "자식이 부모 없이는 의미가 없는" 관계(주문-품목)에만 쓴다. 회원-주문처럼 자식이 독립적인 관계에 걸면 회원을 지울 때 주문이 사라진다.

#### 예시 — 매핑과 편의 메서드

```java
@Entity class Order {
    @Id @GeneratedValue Long id;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    List<OrderItem> items = new ArrayList<>();

    void addItem(OrderItem item) {   // 양쪽을 함께 맞추는 편의 메서드
        items.add(item);
        item.order = this;           // 주인 쪽을 반드시 설정
    }
}

@Entity class OrderItem {
    @Id @GeneratedValue Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")   // 외래키 → 주인
    Order order;
}
```

#### 작동 과정 — 저장할 때 무엇이 DB로 가나

- `Order order = new Order(); order.addItem(new OrderItem(...)); orderRepository.save(order);`
- `persist(order)` → cascade ALL이라 `persist(item)`도 호출된다. 둘 다 영속 상태.
- 플러시: `INSERT INTO orders`, 그다음 `INSERT INTO order_items (…, order_id) VALUES (…, 1)`. `order_id` 값은 **`item.order`**(주인 쪽)에서 온다.
- 만약 `addItem` 대신 `order.items.add(item)`만 했다면: `item.order`가 `null` → `order_id`가 NULL로 INSERT(또는 NOT NULL 제약 위반). `Order.items`에 넣은 것은 DB에 반영되지 않는다.
- 결과: 외래키 값은 주인이 정한다. 반대쪽 컬렉션은 "조회했을 때 어떻게 보이나"만 담당한다.

#### 비교 — cascade와 orphanRemoval

| | cascade = REMOVE | orphanRemoval = true |
|---|---|---|
| 자식이 지워지는 때 | 부모를 `remove`할 때 | 부모 컬렉션에서 자식을 뺄 때(+ 부모 remove 때) |
| `order.items.remove(item)`만 하면 | 아무 일 없음(DB에 남음) | `DELETE FROM order_items` |
| 뜻 | "부모 지우면 자식도" | "부모에서 떨어진 자식은 존재 못 함" |
| 쓰는 관계 | 부모-자식 소유 | 부모-자식 소유, 컬렉션 교체가 잦을 때 |

## 왜 나왔나

관계형 모델의 관계는 한 방향(외래키)뿐인데 객체 그래프는 양방향으로 탐색하고 싶었다. 양쪽에 참조를 두면 "둘이 어긋났을 때 무엇이 진실인가"가 생기고, JPA는 그 결정을 외래키를 가진 쪽에 고정해 SQL 생성을 결정적으로 만들었다. cascade는 "주문을 저장하면 품목도 당연히"처럼 객체 그래프 단위로 다루려는 요구를 SQL 여러 줄로 풀어 주는 장치이고, orphanRemoval은 컬렉션 조작이 곧 삭제가 되게 해서 "지우는 코드"를 따로 안 쓰게 한 것이다. 편의의 대가는 "어디까지 전파되나"를 모르면 의도치 않은 삭제가 난다는 것이다.

## 확인 질문

- 설명해 보기: 연관관계의 주인을 정하는 기준과 `mappedBy`의 뜻은?
  답: 외래키가 있는 표의 엔티티(`@ManyToOne`)가 주인. `mappedBy = "order"`는 "이 컬렉션은 저쪽의 `order` 필드가 관리하는 관계의 반대쪽 뷰"라는 선언으로, 여기에 넣고 빼도 외래키는 안 바뀐다.
- 다음 상태 예측: `Member`에 `@OneToMany(mappedBy="member", cascade=ALL) List<Order> orders`가 있고 회원을 `remove`하면?
  답: 회원의 주문이 전부 삭제된다. 주문은 회원 없이도 기록으로 남아야 하는 독립 엔티티이므로 여기에 cascade REMOVE를 두면 안 된다.
- 다음 상태 예측: `orphanRemoval = true`인 `order.items`를 `order.setItems(newList)`로 통째로 바꾸면?
  답: 하이버네이트가 "컬렉션 참조를 교체하면 안 된다"는 예외(`A collection with cascade=all-delete-orphan was no longer referenced`)를 낸다. `items.clear(); items.addAll(newList)`로 안을 바꾼다.

## 심화

### 단방향으로 충분한가

`@ManyToOne` 단방향(품목 → 주문)만 있어도 저장·조회는 된다. `Order.items`가 필요한 이유는 "주문에서 품목을 탐색·cascade"하려는 것뿐이다. 양방향은 편의 메서드·`toString`·JSON 직렬화의 무한 재귀·`equals` 순환 같은 관리 비용이 따르므로, 필요할 때만 연다. `@OneToMany` 단방향(`@JoinColumn`을 One 쪽에)은 자식 INSERT 뒤 UPDATE로 외래키를 채우는 추가 쿼리가 나가 권하지 않는다.

### 컬렉션 타입과 삭제 쿼리

`List`(bag)에서 원소 하나를 빼면 하이버네이트는 그 행 하나만 DELETE한다(ID 기준). `@OrderColumn`이 붙은 List나 옛 버전의 bag은 전체 DELETE 후 재INSERT를 하기도 했다. `Set`은 `equals`/`hashCode`가 필요하고 `@Id` 기반이면 영속 전엔 ID가 없어 문제 — 자연 키나 UUID로 정의한다.

### 다대다는 풀어서

`@ManyToMany`는 연결 표에 다른 열(수량, 시각)을 못 넣고 삭제 시 연결 표 전체를 갈아 끼우는 쿼리가 나간다. 연결 표를 엔티티(`OrderProduct`)로 만들어 `@ManyToOne` 둘로 푼다.

### 지연 로딩과 함께

`@ManyToOne`·`@OneToOne`의 기본은 EAGER라 반드시 `fetch = LAZY`를 명시한다(영속성 컨텍스트 장). `@OneToOne`의 반대쪽(mappedBy)은 프록시를 만들 수 없어 LAZY가 안 먹는다 — 외래키가 없는 쪽은 "값이 null인지"를 표를 봐야 알기 때문. 외래키를 갖는 쪽에서만 LAZY가 된다.

### 실무에서는

- 양방향이면 `addItem`·`removeItem` 편의 메서드 하나로 양쪽을 맞추고, 컬렉션 필드는 밖에 노출하지 않는다(수정 불가 뷰).
- cascade·orphanRemoval은 소유 관계(주문-품목, 게시글-첨부)에만. 참조 관계(주문-회원, 품목-상품)에는 절대 걸지 않는다.
- `toString`·`equals`·JSON에서 양방향 필드를 제외한다(`@JsonIgnore`, `@ToString.Exclude`). 엔티티를 그대로 응답에 쓰지 않는 것이 근본.
- 대량 삭제는 cascade(행마다 DELETE)가 아니라 JPQL 벌크 `DELETE`. 단, 벌크는 영속성 컨텍스트를 안 거친다.

### 면접 질문

#### 연관관계의 주인이란 무엇이고, 왜 필요한가요?

양방향 연관관계에서 외래키를 실제로 갱신하는 쪽이 주인이고, 외래키가 있는 표의 엔티티인 `@ManyToOne` 쪽이 맡습니다. 반대쪽은 `mappedBy`로 주인을 가리키며 읽기 전용입니다.
객체는 양쪽에 참조가 있지만 DB에는 외래키 열 하나뿐이라, 둘이 어긋났을 때 무엇을 SQL로 쓸지 JPA가 하나로 정해 두어야 하기 때문입니다.
예를 들어 `order.getItems().add(item)`만 하면 DB에 아무 변화가 없고 `item.setOrder(order)`가 있어야 `order_id`가 써지므로, 둘을 함께 하는 편의 메서드를 둡니다. 한계는 반대쪽 컬렉션을 갱신하지 않아도 저장은 되지만 같은 트랜잭션 안의 조회에서 컬렉션이 비어 보이는 불일치가 생기므로 양쪽을 맞추는 습관이 필요하고, 양방향 자체가 관리 비용(순환 참조)을 만든다는 점입니다.

- 오답: "`@OneToMany` 쪽이 부모니까 주인이다" — 주인은 부모·자식이 아니라 외래키 위치로 정한다. 보통 자식(`@ManyToOne`)이 주인이다.
- 꼬리: 단방향 `@OneToMany`(One 쪽에 `@JoinColumn`)는 왜 권하지 않나요?
- 꼬리: 양방향에서 편의 메서드를 두는 이유는?

#### cascade와 orphanRemoval의 차이는 무엇이고, 어디에 걸면 안 되나요?

cascade는 부모에 한 persist·remove 같은 작업을 자식에 전파하는 것이고, orphanRemoval은 부모의 컬렉션에서 빠져 고아가 된 자식을 삭제하는 것입니다. cascade REMOVE는 부모를 지울 때만, orphanRemoval은 컬렉션에서 뺄 때도 동작합니다.
둘 다 "자식이 부모 없이는 의미가 없다"는 소유 관계를 객체 그래프 조작으로 표현하려는 장치이므로, 자식이 독립적으로 존재하는 참조 관계(회원-주문, 품목-상품)에 걸면 회원을 지울 때 주문이 사라지는 사고가 납니다.
예를 들어 주문-품목에는 `cascade = ALL, orphanRemoval = true`로 두어 `order.removeItem(item)`이 곧 DELETE가 되게 하고, 주문-회원에는 아무것도 걸지 않습니다. 한계는 orphanRemoval 컬렉션의 참조를 통째로 교체하면 예외가 나므로 `clear()` + `addAll()`로 다뤄야 하고, 행마다 DELETE가 나가 대량에는 벌크 쿼리가 맞다는 점입니다.

- 오답: "orphanRemoval은 cascade REMOVE와 같다" — 컬렉션에서 뺐을 때의 동작이 다르다.
- 꼬리: `@ManyToMany`를 연결 엔티티로 푸는 이유는?
