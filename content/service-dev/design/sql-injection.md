---
id: sql-injection
title: SQL 인젝션과 파라미터 바인딩
order: 5
aliases: [SQL 인젝션, SQL Injection, 파라미터 바인딩, PreparedStatement, 바인드 변수, 동적 쿼리]
card:
  one_line: 'SQL 인젝션은 사용자 입력을 SQL 문자열에 이어 붙여 입력이 SQL 코드로 실행되는 것이고, 방어는 값을 문자열 결합이 아니라 파라미터 바인딩(PreparedStatement의 ?)으로 넘겨 DB가 "이건 코드가 아니라 값"으로 다루게 하는 것이다.'
  analogy: '서식이 인쇄된 신청서 — 빈칸(?)에 무엇을 써도 서식 자체는 안 바뀐다. 반면 백지에 "다음 문장을 실행하시오: …"라고 쓰면 칸에 적은 내용이 지시문이 된다'
  analogy_limit: 신청서는 칸이 정해져 있지만 정렬 열·테이블 이름처럼 칸으로 만들 수 없는 자리가 SQL에는 있다. 거기는 바인딩이 안 되므로 허용 목록으로 막아야 한다.
  keywords: [입력이 코드가 된다, 값은 ?로 바인딩, 식별자는 허용 목록]
flow:
  prev: { id: xss-csrf, reason: 입력이 코드가 되는 또 하나의 자리 }
  next: { id: redis-cache, reason: 안전해졌으니 매번 DB에 안 가는 법 }
see_also: [sql-join, db-index, persistence-context, xss-csrf, auth]
checked: '2026-09-16'
sources:
  - 'OWASP — SQL Injection, SQL Injection Prevention Cheat Sheet(Prepared Statements, allow-list for identifiers) — https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html'
  - 'Java API — java.sql.PreparedStatement — https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/PreparedStatement.html'
  - 'MySQL 8.0 Reference — Prepared Statements(서버 측 준비 문, 바인드 파라미터) — https://dev.mysql.com/doc/refman/8.0/en/sql-prepared-statements.html'
  - 'Spring Framework 6 레퍼런스 — JdbcTemplate, NamedParameterJdbcTemplate — https://docs.spring.io/spring-framework/reference/data-access/jdbc/core.html'
---

## 개념

로그인 쿼리를 문자열로 만든다고 하자. `"SELECT * FROM users WHERE name = '" + name + "' AND pw = '" + pw + "'"`. 사용자가 이름에 `admin' --`를 넣으면 SQL은 `… WHERE name = 'admin' --' AND pw = '…'`가 된다. `--` 뒤는 주석이라 비밀번호 검사가 사라지고 admin으로 로그인된다. 이것이 **SQL 인젝션** — 입력이 값이 아니라 **SQL 코드의 일부**로 해석된 것이다. 데이터 유출·변조·삭제(`'; DROP TABLE users; --`)까지 간다.

방어는 **파라미터 바인딩**이다. `SELECT * FROM users WHERE name = ? AND pw = ?`처럼 SQL 구조를 먼저 보내고, 값은 따로 넘긴다. DB(또는 드라이버)는 `?` 자리를 **값**으로만 채우므로 `admin' --`는 그냥 그런 문자열을 가진 이름을 찾는 것이 된다 — 구조는 절대 바뀌지 않는다. JDBC의 `PreparedStatement`, JPA의 `:name`, MyBatis의 `#{name}`이 전부 이것이다. 이스케이프(따옴표를 `\'`로)는 DB·문자셋에 따라 빠지는 경우가 있어 방어의 주축이 아니다.

#### 예시 — 같은 쿼리, 결합과 바인딩

```java
// 취약: 입력이 SQL의 일부가 됨
String sql = "SELECT * FROM users WHERE name = '" + name + "'";
stmt.executeQuery(sql);

// 안전: 구조와 값을 분리
PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE name = ?");
ps.setString(1, name);   // name이 "admin' --"여도 그런 이름을 찾을 뿐
ps.executeQuery();

// JPA / Spring Data
@Query("SELECT u FROM User u WHERE u.name = :name")
List<User> find(@Param("name") String name);
```

#### 작동 과정 — 바인딩이 값을 코드로 만들지 않는 이유

- 애플리케이션이 `SELECT … WHERE name = ?`를 DB에 보낸다(또는 드라이버가 준비). DB는 이 시점에 SQL을 **파싱**해 구조(어느 표, 어느 조건)를 확정한다.
- 값 `admin' --`를 파라미터로 보낸다. DB는 파싱을 다시 하지 않고 `?` 자리에 값을 **데이터로** 넣는다. 따옴표·주석 기호는 문자일 뿐이다.
- 실행: `name` 열이 정확히 `admin' --`인 행을 찾는다. 없다.
- 결과: 구조가 파싱된 뒤에 값이 들어오므로 값이 구조를 바꿀 길이 없다. 같은 준비 문을 값만 바꿔 반복 실행하면 파싱 비용도 아낀다.

#### 비교 — 바인딩이 되는 자리와 안 되는 자리

| 자리 | 바인딩 | 안전한 방법 |
|---|---|---|
| 조건 값(`WHERE x = ?`), `LIKE ?`, `IN (?, ?)` | 된다 | 바인딩 |
| 테이블·열 이름(`ORDER BY ?`) | 안 된다(식별자는 값이 아님) | 허용 목록에서 골라 붙이기(`Map.of("name", "name", "date", "created_at")`) |
| 정렬 방향(`ASC`/`DESC`), `LIMIT` 개수 | 방향은 안 됨, 개수는 DB에 따라 | 열거형·정수로 검증 후 붙이기 |
| 동적 조건 조합 | 조건 골격은 코드가 만들고 값만 바인딩 | QueryDSL·Criteria·MyBatis `<if>` + `#{}` |

## 왜 나왔나

SQL은 텍스트다. 프로그램이 텍스트를 조립해 DB에 보내는 방식이 가장 단순했고, 그 텍스트에 사용자 입력을 섞으면 입력과 코드의 경계가 사라진다 — XSS와 같은 뿌리(데이터와 코드가 같은 텍스트)다. 1998년에 공개적으로 알려진 뒤 20년 넘게 OWASP Top 10에 남아 있는 이유는 "문자열 결합이 너무 쉽고 눈에 안 띄기" 때문이다. 준비 문(prepared statement)은 원래 반복 실행의 파싱 비용을 아끼려고 있었는데, 구조와 값을 분리한다는 성질이 그대로 방어가 됐다.

## 확인 질문

- 설명해 보기: 파라미터 바인딩이 인젝션을 막는 원리를 "파싱"이라는 말로 설명해 보세요.
  답: SQL 구조가 먼저 파싱되어 확정되고 값은 그 뒤에 데이터로 들어가므로, 값에 무엇이 있든 구조를 바꿀 수 없다.
- 다음 상태 예측: `@Query("SELECT u FROM User u WHERE u.name = '" + name + "'")`처럼 JPQL을 결합하면?
  답: JPA를 써도 인젝션이다. ORM이 아니라 바인딩(`:name`)이 방어다. 네이티브 쿼리도 같다.
- 다음 상태 예측: 정렬 열을 사용자가 고르는 API에서 `ORDER BY :column`으로 바인딩하면?
  답: 열 이름은 값이 아니라 식별자라 바인딩되지 않는다(오류거나 문자열 상수로 정렬돼 무의미). 허용된 열 이름 목록에서 골라 붙인다.

## 심화

### 인젝션이 뚫리면 무엇까지 되나

인증 우회(`' OR 1=1 --`), 다른 표 읽기(`UNION SELECT card_no FROM payments`), 결과가 안 보여도 참/거짓 응답 차이나 지연(`SLEEP(5)`)으로 한 글자씩 뽑기(블라인드), 변조·삭제, DB 계정 권한에 따라 파일 읽기·OS 명령까지. 그래서 앱의 DB 계정은 필요한 권한만(최소 권한) 주고, 오류 메시지에 SQL을 노출하지 않는다.

### ORM을 써도 남는 자리

JPA·Spring Data의 메서드 이름 쿼리와 `:param` 바인딩은 안전하다. 위험한 곳은 동적 정렬·필터를 문자열로 조립하는 코드, `@Query(nativeQuery = true)`에 결합, `EntityManager.createQuery("… " + input)`, MyBatis의 `${}`(문자열 치환, `#{}`가 바인딩). QueryDSL·Criteria API는 조건을 객체로 조립해 값이 바인딩되므로 동적 쿼리에 안전한 길이다.

### 이차 인젝션과 저장된 입력

한 번 안전하게 저장된 값(`O'Brien`)을 나중에 다른 쿼리에서 문자열로 결합하면 그때 터진다. "이미 DB에 있는 값이니 안전하다"는 틀린 가정 — 모든 쿼리가 바인딩이어야 한다. 입력 검증(길이·형식)은 보조이고, `'`를 금지하는 식의 검증은 정상 이름을 막는다.

### 실무에서는

- 문자열 결합 SQL을 코드 리뷰·정적 분석(SpotBugs, Semgrep)에서 잡는다. `"SELECT … " +`가 보이면 일단 의심.
- `IN (?)`에 목록을 넣을 땐 개수만큼 `?`를 만들거나 `NamedParameterJdbcTemplate`의 컬렉션 바인딩.
- `LIKE`는 값에 `%`·`_`가 들어오면 와일드카드로 동작한다 — 인젝션은 아니지만 의도 밖 매칭이므로 이스케이프한다.
- DB 오류를 그대로 응답에 내보내지 않는다(에러 기반 인젝션의 정보원). 일반 메시지 + 서버 로그.
- 앱 계정에 `DROP`·`FILE` 권한을 주지 않는다. 읽기 전용 API는 읽기 전용 계정.

### 면접 질문

#### SQL 인젝션은 무엇이고, PreparedStatement가 왜 막아 주나요?

SQL 인젝션은 사용자 입력을 SQL 문자열에 이어 붙여 입력이 SQL 코드로 실행되는 취약점이고, `PreparedStatement`는 SQL 구조를 먼저 DB에 보내 파싱하게 한 뒤 값을 파라미터로 따로 넘기므로 값에 따옴표나 주석이 있어도 데이터로만 다뤄져 구조를 바꿀 수 없습니다.
데이터와 코드가 같은 텍스트에 섞이는 것이 원인이므로, 둘을 전송 단계에서 분리하는 것이 방어입니다.
예를 들어 이름에 `admin' --`를 넣으면 결합 SQL은 비밀번호 검사가 주석 처리되지만, 바인딩하면 그런 이름을 찾을 뿐입니다. 한계는 테이블·열 이름·정렬 방향 같은 식별자는 바인딩할 수 없어 허용 목록으로 막아야 하고, JPA·MyBatis를 써도 문자열 결합(`+`, `${}`)을 하면 똑같이 뚫린다는 점입니다.

- 오답: "ORM을 쓰면 인젝션이 없다" — 방어는 ORM이 아니라 바인딩이다. JPQL·네이티브 쿼리 결합은 그대로 취약하다.
- 오답: "따옴표를 이스케이프하면 된다" — 문자셋·DB별 예외가 있어 주 방어가 못 된다. 바인딩이 우선이고 이스케이프는 보조다.
- 꼬리: `ORDER BY` 열을 사용자가 고르는 기능은 어떻게 안전하게 만드나요?
- 꼬리: MyBatis의 `#{}`와 `${}`의 차이는?

#### 검색 조건이 수십 개인 동적 쿼리를 안전하게 만들려면 어떻게 하나요?

조건의 골격(어느 열에 어떤 연산자)은 코드가 정해진 선택지에서 조립하고, 값은 전부 바인딩합니다. JPA면 QueryDSL이나 Criteria API로 `BooleanBuilder`에 조건을 쌓고, MyBatis면 `<if>`·`<where>`로 골격을 만들되 값은 `#{}`로, JDBC면 `NamedParameterJdbcTemplate`에 `MapSqlParameterSource`를 씁니다. 정렬 열은 허용 목록 맵에서 골라 붙입니다.
바인딩은 값에만 되고 식별자·구조에는 안 되므로, 구조는 사용자 입력이 아니라 코드의 분기로만 바뀌게 하는 것이 원칙입니다.
예를 들어 `sort=name`이 오면 `Map.of("name","u.name","date","u.created_at")`에서 찾고, 없으면 기본값이나 400입니다. 한계는 조건이 많아지면 인덱스를 못 타는 조합이 생기므로 실행 계획을 함께 보고, 자유 텍스트 검색은 DB `LIKE '%…%'`가 아니라 전문 검색(FULLTEXT, Elasticsearch)으로 옮겨야 한다는 점입니다.

- 오답: "입력에서 특수문자를 제거하면 된다" — `O'Brien` 같은 정상 입력을 깨뜨리고, 우회 방법이 많다.
- 꼬리: 이차(second-order) 인젝션은 무엇인가요?
