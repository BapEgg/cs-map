---
id: cors
title: 동일 출처 정책과 CORS
order: 3
aliases: [CORS, 동일 출처 정책, Same-Origin Policy, 프리플라이트, preflight, Origin, Access-Control-Allow-Origin]
card:
  one_line: '동일 출처 정책은 브라우저가 다른 출처(스킴·호스트·포트)의 응답을 스크립트가 읽지 못하게 막는 규칙이고, CORS는 서버가 응답 헤더로 "이 출처는 읽어도 된다"고 허락하는 방식이며, 위험한 요청은 브라우저가 먼저 OPTIONS로 물어본다(프리플라이트).'
  analogy: 아파트 방문 규칙 — 다른 동(출처) 사람이 우리 집 우편물을 보려면 집주인이 "이 사람은 봐도 됨"이라고 경비실(브라우저)에 미리 말해 둬야 한다. 특이한 방문(커스텀 헤더·PUT)은 경비가 먼저 인터폰으로 물어본다
  analogy_limit: 경비실은 아파트 밖 사람에게는 아무 힘이 없다 — CORS는 브라우저만 지키는 규칙이라 curl·서버 간 호출·Postman에는 적용되지 않는다. CORS는 서버를 지키는 장치가 아니라 사용자의 브라우저를 지키는 장치다.
  keywords: [브라우저가 막고 서버가 허락, 출처 = 스킴+호스트+포트, 프리플라이트는 OPTIONS]
flow:
  prev: { id: auth, reason: 누구인지 확인했으니, 어느 사이트의 스크립트가 부르는지도 }
  next: { id: xss-csrf, reason: 출처를 속이거나 스크립트를 심는 공격 }
see_also: [http, cookie-session-jwt, auth, proxy, mvc-request-flow]
checked: '2026-09-16'
sources:
  - 'MDN — Same-origin policy — https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy'
  - 'MDN — Cross-Origin Resource Sharing (CORS), simple requests·preflighted requests — https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS'
  - 'Fetch Standard — CORS protocol — https://fetch.spec.whatwg.org/#http-cors-protocol'
  - 'Spring Framework 6 레퍼런스 — CORS(@CrossOrigin, CorsConfiguration) — https://docs.spring.io/spring-framework/reference/web/webmvc-cors.html'
  - 'Spring Security 6 레퍼런스 — CORS(Security 필터 앞에서 처리) — https://docs.spring.io/spring-security/reference/servlet/integrations/cors.html'
---

## 개념

**출처(origin)** 는 스킴·호스트·포트의 조합이다. `https://shop.example:443`와 `https://api.shop.example`는 다른 출처다. **동일 출처 정책**은 브라우저의 규칙으로, 한 출처의 페이지에서 실행되는 스크립트가 **다른 출처의 응답을 읽지 못하게** 막는다. 이게 없으면 악성 사이트의 스크립트가 로그인된 은행 사이트 API를 대신 불러 잔고를 읽어 갈 수 있다(쿠키가 자동으로 붙으니까).

프런트(`https://shop.example`)와 API(`https://api.shop.example`)가 다른 출처인 것은 흔하다. 이때 **CORS**로 서버가 허락한다 — 응답에 `Access-Control-Allow-Origin: https://shop.example`을 실으면 브라우저가 그 출처의 스크립트에게 응답을 읽게 해 준다. 단순 요청(GET·POST + 기본 헤더)은 일단 보내고 응답 헤더를 보고 판단하지만, `PUT`·`DELETE`·`Content-Type: application/json`·커스텀 헤더(`Authorization`)가 있으면 브라우저가 먼저 **`OPTIONS` 요청(프리플라이트)** 으로 "이런 요청 보내도 되나"를 묻고, 허락 응답을 받아야 본 요청을 보낸다.

#### 작동 과정 — 프리플라이트가 있는 요청

- 페이지 `https://shop.example`의 스크립트가 `fetch('https://api.shop.example/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer …' } })`를 부른다.
- 브라우저: JSON 본문 + `Authorization` 헤더 → 단순 요청이 아니다 → 먼저 `OPTIONS /orders`를 보낸다. 헤더: `Origin: https://shop.example`, `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: content-type, authorization`.
- 서버: `204` + `Access-Control-Allow-Origin: https://shop.example`, `Access-Control-Allow-Methods: POST`, `Access-Control-Allow-Headers: content-type, authorization`, `Access-Control-Max-Age: 3600`.
- 브라우저: 허락됨 → 본 요청 `POST /orders`를 보낸다. 응답에도 `Access-Control-Allow-Origin`이 있어야 스크립트가 읽을 수 있다.
- 결과: 왕복이 하나 늘었다. `Max-Age` 동안은 프리플라이트를 캐시해 같은 요청에 다시 안 묻는다. 서버가 허락 헤더를 안 주면 브라우저 콘솔에 "CORS policy" 오류 — **요청은 서버에 도달했을 수 있고, 응답을 브라우저가 스크립트에 안 준 것**이다.

#### 비교 — 단순 요청과 프리플라이트 요청

| | 단순 요청 | 프리플라이트 요청 |
|---|---|---|
| 조건 | GET·HEAD·POST, 헤더는 기본만, `Content-Type`은 form·text만 | 그 외 전부(PUT·DELETE·PATCH, JSON 본문, `Authorization` 등) |
| 흐름 | 바로 보냄 → 응답 헤더로 읽기 허용 판단 | `OPTIONS`로 묻고 허락받은 뒤 본 요청 |
| 서버에 도달 | 항상(허락 안 해도 요청은 처리됨) | 프리플라이트가 거부되면 본 요청은 안 감 |
| 쿠키 포함 | `credentials: 'include'` + 서버 `Allow-Credentials: true` + 출처를 `*`가 아닌 명시로 | 같음 |

## 왜 나왔나

브라우저는 요청에 쿠키를 자동으로 붙인다. 악성 페이지가 `fetch('https://bank.example/balance')`를 부르면 사용자의 은행 쿠키가 실려 가고, 응답을 스크립트가 읽을 수 있다면 잔고가 새어 나간다. 그래서 브라우저가 "다른 출처의 응답은 스크립트에 안 준다"를 기본으로 뒀다(1995년 Netscape). 그런데 정당하게 다른 출처의 API를 부르는 앱이 늘자, 서버가 "이 출처는 괜찮다"고 선언하는 통로가 필요했고 그게 CORS(2009년 W3C 초안)다. 프리플라이트는 CORS 이전의 서버(허락 헤더를 모르는)가 PUT·DELETE 같은 요청을 예상치 못하게 받지 않도록 먼저 묻게 한 것이다.

## 확인 질문

- 설명해 보기: CORS 오류가 났을 때 "서버가 요청을 거부한 것"이라는 설명이 왜 틀릴 수 있나요?
  답: CORS는 브라우저가 응답을 스크립트에 넘길지의 규칙이다. 단순 요청은 서버가 이미 처리했을 수 있고, 브라우저가 응답 헤더에 허락이 없어 스크립트에 안 준 것이다. 서버 로그를 보면 200이 찍혀 있다.
- 다음 상태 예측: `https://shop.example`에서 `http://shop.example/api`를 부르면?
  답: 스킴이 달라 다른 출처. CORS 허락이 없으면 응답을 못 읽는다(혼합 콘텐츠 정책으로 아예 막힐 수도 있다).
- 다음 상태 예측: 서버가 `Access-Control-Allow-Origin: *`을 주고 프런트가 `credentials: 'include'`로 쿠키를 보내면?
  답: 브라우저가 거부한다. 자격 증명을 포함할 때는 `*`가 아니라 출처를 명시해야 하고 `Access-Control-Allow-Credentials: true`도 필요하다.

## 심화

### CORS가 지키는 것과 안 지키는 것

CORS는 **사용자의 브라우저 안에서** 다른 출처의 스크립트가 내 API 응답을 읽는 것을 막는다. 서버 자체를 지키지 않는다 — curl, 다른 서버, Postman, 모바일 앱은 CORS와 무관하게 요청하고 응답을 읽는다. 그래서 "CORS를 잠갔으니 API가 안전하다"는 틀렸고, 인증·인가는 별도다. 반대로 `Allow-Origin: *`을 열어도 인증이 있으면 자격 증명 없는 요청만 통과한다.

### 스프링에서

`@CrossOrigin(origins = "https://shop.example")`을 컨트롤러에, 또는 `WebMvcConfigurer.addCorsMappings`로 전역 설정. Spring Security를 쓰면 **Security 필터 체인이 프리플라이트 `OPTIONS`를 인증 없이 통과시켜야** 하므로 `http.cors(Customizer.withDefaults())`와 `CorsConfigurationSource` 빈으로 Security 쪽에 설정한다 — MVC 설정만 하면 `OPTIONS`가 401로 막혀 "CORS 오류"처럼 보인다. 허용 출처는 환경별(개발 `localhost:3000`, 운영 실제 도메인)로 프로파일에 둔다.

### 프리플라이트 줄이기

`Access-Control-Max-Age`로 캐시(브라우저마다 상한 있음, Chrome 2시간). 같은 출처로 합치는 게 근본 해결 — 프런트와 API를 같은 도메인 아래 두고 리버스 프록시(`/api/*` → API 서버)로 라우팅하면 CORS 자체가 사라진다. 프리플라이트 하나가 왕복 하나이므로, 모바일 환경의 첫 요청 지연에 영향이 있다.

### 다른 출처 정책들

`<img>`·`<script>`·`<form>`은 동일 출처 정책의 예외로 다른 출처에 요청을 **보낼 수는** 있다(응답을 스크립트가 못 읽을 뿐). 이 예외가 CSRF의 통로다(다음 장). `SameSite` 쿠키 속성이 "다른 사이트에서 시작된 요청에 쿠키를 붙일지"를 정해 이 구멍을 좁힌다. `Cross-Origin-Opener-Policy`·`Cross-Origin-Resource-Policy`는 더 세밀한 격리 헤더다.

### 실무에서는

- 허용 출처는 정확한 목록으로. `*`이나 요청의 `Origin`을 그대로 반사하는 설정은 인증 있는 API에서 금물.
- "CORS 오류"가 나면 먼저 네트워크 탭에서 `OPTIONS` 응답 상태와 헤더를 본다. 401·403이면 Security가 막은 것, 200인데 헤더가 없으면 설정 누락.
- 게이트웨이·Nginx가 있으면 CORS 헤더를 한 곳(게이트웨이)에서만 붙인다. 두 곳에서 붙이면 헤더가 중복돼 브라우저가 거부한다.
- 로컬 개발은 프런트 개발 서버의 프록시(Vite `server.proxy`)로 같은 출처처럼 만들어 CORS를 피한다.

### 면접 질문

#### 동일 출처 정책과 CORS를 설명해 주세요. 프리플라이트는 언제 발생하나요?

동일 출처 정책은 브라우저가 스킴·호스트·포트가 다른 출처의 응답을 스크립트가 읽지 못하게 하는 규칙이고, CORS는 서버가 `Access-Control-Allow-Origin` 등의 응답 헤더로 특정 출처에 읽기를 허락하는 방식입니다. 프리플라이트는 PUT·DELETE, JSON 본문, `Authorization` 같은 커스텀 헤더처럼 "단순 요청"이 아닌 경우 브라우저가 본 요청 전에 `OPTIONS`로 허락을 묻는 절차입니다.
브라우저가 쿠키를 자동으로 붙이기 때문에 다른 출처의 스크립트가 로그인된 사이트의 응답을 읽어 가는 것을 막아야 했고, 정당한 교차 출처 호출은 서버가 명시적으로 열게 한 것입니다.
예를 들어 `shop.example`에서 `api.shop.example`로 JSON POST를 보내면 `OPTIONS` → 허락 → `POST` 순으로 갑니다. 한계는 CORS가 브라우저만 지키는 규칙이라 curl이나 서버 간 호출에는 무관하고, 단순 요청은 허락 없이도 서버에 도달해 처리되므로 서버 보호 수단이 아니라는 점입니다.

- 오답: "CORS 오류는 서버가 요청을 차단한 것이다" — 단순 요청은 서버가 처리했고 브라우저가 응답을 스크립트에 안 준 것이다.
- 오답: "`Allow-Origin: *`로 열면 해결된다" — 쿠키·인증 헤더가 있는 요청은 `*`로는 안 되고, 인증 API를 모든 출처에 여는 것도 위험하다.
- 꼬리: 출처를 이루는 세 요소는? `shop.example`과 `api.shop.example`은 같은 출처인가요?
- 꼬리: `<img>` 태그는 다른 출처에 요청을 보낼 수 있는데 왜 문제가 안 되나요?

#### Spring Security를 붙였더니 프런트에서 CORS 오류가 납니다. 어디를 보나요?

먼저 네트워크 탭에서 프리플라이트 `OPTIONS` 응답을 봅니다. 401·403이면 Security 필터가 `OPTIONS`를 인증 요구로 막은 것이라 `http.cors()`를 켜고 `CorsConfigurationSource` 빈에 허용 출처·메서드·헤더를 두며, 200인데 `Access-Control-Allow-*` 헤더가 없으면 MVC 쪽 설정만 있고 Security 쪽이 빠진 것입니다.
Security 필터 체인이 디스패처 서블릿보다 앞에 있어 MVC의 `@CrossOrigin`이 실행되기 전에 요청이 막히기 때문입니다.
`credentials: 'include'`를 쓰면 출처를 `*`가 아닌 명시로, `Allow-Credentials: true`를 함께 둡니다. 한계는 게이트웨이나 Nginx가 이미 CORS 헤더를 붙이고 있으면 서버 쪽 설정과 중복되어 오히려 거부되므로, 헤더를 붙이는 지점을 하나로 정해야 한다는 점입니다.

- 오답: "컨트롤러에 `@CrossOrigin`을 붙이면 된다" — Security가 앞에서 `OPTIONS`를 막으면 컨트롤러까지 안 온다.
- 꼬리: 프리플라이트 왕복을 줄이는 방법은?
