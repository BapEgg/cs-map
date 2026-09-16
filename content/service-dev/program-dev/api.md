---
id: api
title: API
order: 8
card:
  one_line: 'API는 프로그램끼리 기능을 주고받기 위해 정해 둔 약속이다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: component, reason: 속을 몰라도 쓰게 }
see_also: [backend]
checked: '2026-09-16'
sources:
  - 'RFC 9110 HTTP Semantics (메서드·상태 코드·멱등성) — https://www.rfc-editor.org/rfc/rfc9110'
  - 'Fielding, Architectural Styles and the Design of Network-based Software Architectures, 5장 REST — https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm'
  - 'RFC 6749 The OAuth 2.0 Authorization Framework — https://www.rfc-editor.org/rfc/rfc6749'
---

## 개념

프로그램끼리 **기능을 주고받기 위해 정해 둔 약속**이다. "이 주소로 이렇게 요청하면 이런 답을 준다"를 정해 둔다.
안이 어떻게 만들어졌는지 몰라도 약속만 지키면 쓸 수 있다. 화면(프론트엔드)이 서버(백엔드)에 데이터를 달라고 하는 것도 API다.

## 왜 나왔나

**속을 몰라도 쓸 수 있게** 요청 방법(URL, 파라미터, 인증)과 응답 형식을 명세했다. 외부에 공개하면 OpenAPI가 된다.

## 심화

### 내부 구조

#### REST

자원을 URI로 표현하고(/users/1), 행위는 HTTP 메서드(GET 조회, POST 생성, PUT/PATCH 수정, DELETE 삭제)로, 결과는 상태 코드(200, 201, 404, 500…)로 알린다.

#### 무상태(stateless)

서버는 요청 사이에 클라이언트 상태를 기억하지 않는다(stateless). 그래서 매 요청에 인증 토큰을 담아 보낸다.
### 실제 활용

- 소셜 로그인은 OAuth 2.0으로 카카오·구글 쪽에 인증을 맡긴다.
- 공공데이터포털 같은 OpenAPI는 발급받은 인증키를 파라미터에 넣어 호출한다.

### 면접 질문

#### REST API란 무엇인가요?

HTTP를 이용해 자원을 URI로 식별하고, HTTP 메서드로 그 자원에 대한 행위를 표현하는 API 설계 방식입니다. 무상태성, 일관된 인터페이스 같은 원칙을 따릅니다.

- 꼬리: PUT과 PATCH의 차이는?
- 꼬리: 멱등성이란 무엇이고, 어떤 메서드가 멱등한가요?
- 꼬리: 401과 403의 차이는?
