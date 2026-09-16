---
id: http-cache
title: HTTP 캐시
order: 6
aliases: [Cache-Control, ETag, CDN, 브라우저 캐시]
card:
  one_line: 'HTTP 캐시는 응답에 "얼마나 오래 재사용해도 되는지"와 "바뀌었는지 확인하는 표"를 붙여, 브라우저·CDN이 서버에 다시 안 가게 하는 약속이다.'
  analogy: 냉장고 우유의 유통기한(max-age)과, 기한이 지나면 마트에 "이 로트 번호 아직 그대로예요?"(ETag) 물어보는 것
  analogy_limit: 우유는 기한이 지나면 버리지만 캐시는 기한이 지나도 서버에 확인해 "그대로"면 다시 쓴다(304). 그리고 기한 안에는 서버가 바꿔도 못 알아챈다.
  keywords: [max-age, ETag·304, CDN]
flow:
  prev: { id: cookie-session-jwt, reason: 매번 가져오지 않으려면 }
  next: { id: proxy, reason: 중간에서 나눠 받고 대신 답하려면 }
see_also: [cache, redis-cache, proxy, lru]
checked: '2026-09-16'
sources:
  - 'RFC 9111 HTTP Caching — Cache-Control, 신선도, 검증 — https://www.rfc-editor.org/rfc/rfc9111'
  - 'RFC 9110 §8.8 Validator Fields — ETag, Last-Modified, If-None-Match — https://www.rfc-editor.org/rfc/rfc9110#section-8.8'
  - 'MDN HTTP caching — https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching'
---

## 개념

같은 이미지·스크립트·API 응답을 매번 서버에서 받아 오면 느리고 서버도 바쁘다. HTTP 캐시는 응답에 헤더를 붙여 **받는 쪽(브라우저·CDN·프록시)이 얼마 동안 다시 안 물어봐도 되는지** 정한다. `Cache-Control: max-age=3600`이면 1시간 동안 서버에 안 간다.

기한이 지나면 통째로 다시 받는 대신 "바뀌었나"만 묻는다. 응답에 붙은 `ETag`(내용의 식별자)를 `If-None-Match`로 보내면, 서버는 같으면 본문 없이 `304 Not Modified`만 돌려준다.

로고 이미지 요청을 따라가 보자.

- 첫 요청: `GET /logo.png` → `200 OK`, `Cache-Control: max-age=86400`, `ETag: "a1b2"`. 브라우저가 저장한다.
- 1시간 뒤 같은 페이지: 브라우저가 서버에 가지 않고 저장본을 쓴다. 요청 자체가 없다.
- 하루 뒤: 기한 만료. `GET /logo.png`, `If-None-Match: "a1b2"` → 서버는 파일이 그대로면 `304`(본문 없음). 브라우저가 저장본을 다시 쓰고 기한을 갱신한다.
- 결과: 하루 동안 요청 0번, 그 뒤엔 본문 없는 왕복 한 번. 로고가 바뀌면 ETag가 달라져 `200`으로 새 파일이 온다.

## 왜 나왔나

웹 페이지 하나에 리소스가 수십 개고 대부분은 어제와 같다. 매번 받으면 대역폭·서버·응답 시간이 낭비였다. 그래서 "재사용해도 되는 기간"과 "바뀌었는지 싸게 확인하는 방법"을 HTTP 자체에 넣었다. 이 규칙 덕에 CDN이 전 세계 가까운 곳에서 대신 답할 수 있다.

## 확인 질문

- 설명해 보기: `max-age`와 `ETag`는 각각 언제 쓰이나?
  답: `max-age` 동안은 서버에 안 간다. 지나면 `ETag`로 "바뀌었나"만 물어 안 바뀌었으면 304로 본문을 아낀다.
- 다음 상태 예측: `max-age=3600`인 응답을 받은 지 10분 뒤 서버가 내용을 바꿨다. 브라우저는?
  답: 50분 동안 옛 내용을 쓴다. 기한 안에는 서버에 가지 않는다. 그래서 바뀌는 리소스는 파일명에 해시를 붙여 URL 자체를 바꾼다.
- 다음 상태 예측: `Cache-Control: no-store`가 붙은 응답은?
  답: 아무 데도 저장하지 않는다. 개인 정보·결제 화면에 쓴다. `no-cache`는 "저장하되 쓸 때마다 서버에 확인"이라 다르다.

## 심화

### 핵심 지시자

| 지시자 | 뜻 |
|---|---|
| `max-age=N` | N초 동안 신선함 — 서버에 안 감 |
| `no-cache` | 저장은 하되 쓸 때마다 서버에 검증(304 가능) |
| `no-store` | 저장 금지 |
| `private` / `public` | 브라우저만 / 중간 캐시(CDN·프록시)도 |
| `immutable` | 기한 안에는 새로고침해도 검증 안 함 |
| `stale-while-revalidate=N` | 기한 지나도 N초 동안 옛 것을 주고 뒤에서 갱신 |

`ETag`는 내용 해시나 버전, `Last-Modified`는 수정 시각이다. 둘 다 있으면 ETag가 우선이다.

### 두 가지 전략

바뀌지 않는 정적 파일은 URL에 내용 해시를 넣고(`app.3f9c.js`) `max-age=31536000, immutable` — 1년간 안 물어보고, 바뀌면 URL이 바뀌니 새로 받는다. 바뀔 수 있는 HTML·API는 `no-cache` + `ETag` — 매번 확인하되 본문은 아낀다. 이 둘을 섞는 것이 대부분의 웹 배포다.

### CDN

CDN은 전 세계 엣지 서버에 캐시를 두고 사용자 가까이에서 답한다. 같은 `Cache-Control`을 따르며, 원본 서버는 캐시 미스 때만 맞는다. 급히 내려야 하면 CDN API로 무효화(purge)한다. 사용자별 응답(`private`, `Set-Cookie` 포함)은 CDN이 캐시하면 다른 사용자에게 새어 나가므로 반드시 `private`.

### 실무에서는

- 빌드 도구(Vite·Webpack)가 파일명 해시를 자동으로 붙인다. 이 앱의 배포 번들 `index-C0TtpRlT.js`가 그것이다.
- API 응답에 캐시 헤더가 없으면 브라우저가 휴리스틱으로 캐시할 수 있다. 개인화 API는 명시적으로 `no-store`나 `private, no-cache`.
- `ETag`를 서버가 매번 다르게 만들면(응답에 시각 포함) 검증이 항상 실패해 캐시가 무의미해진다.
- 서버 쪽 캐시(Redis)는 다른 층이다. HTTP 캐시는 클라이언트·CDN이 서버에 안 오게, Redis는 서버가 DB에 안 가게.

### 면접 질문

#### 브라우저 캐시는 어떻게 동작하고, 리소스가 바뀌면 어떻게 갱신되나요?

응답의 `Cache-Control: max-age`가 정한 기간 동안은 서버에 가지 않고 저장본을 쓰고, 기간이 지나면 `ETag`/`Last-Modified`로 "바뀌었나"만 물어 안 바뀌었으면 304로 본문 없이 재사용합니다.
기간 안에 서버가 바꿔도 브라우저는 모르므로, 자주 바뀌는 리소스는 URL에 내용 해시를 넣어 바뀔 때마다 새 URL이 되게 하고 긴 `max-age`를 줍니다. HTML처럼 URL을 못 바꾸는 것은 `no-cache`로 매번 검증합니다.
예를 들어 `app.3f9c.js`는 1년 캐시, `index.html`은 매번 검증하는 조합이 흔합니다. 한계는 검증도 왕복 한 번이라 완전히 공짜는 아니고, 개인화 응답을 잘못 `public`으로 두면 CDN이 다른 사용자에게 줄 수 있다는 점입니다.

- 꼬리: `no-cache`와 `no-store`의 차이는?
- 꼬리: 304 응답이 200보다 나은 점은?

#### 배포했는데 사용자가 옛 화면을 봅니다. 원인과 대응은?

HTML이나 자바스크립트가 `max-age`로 캐시돼 있어 브라우저·CDN이 서버에 안 가기 때문입니다.
대응은 두 층입니다 — 정적 파일은 빌드 때 파일명에 해시를 붙여 URL을 바꾸고, 그 URL을 참조하는 HTML은 `no-cache`(매번 검증)로 두어 배포 즉시 새 HTML이 새 파일을 가리키게 합니다. CDN이 HTML을 캐시 중이면 배포 스크립트에서 무효화(purge)합니다.
한계는 이미 열려 있는 탭은 새로고침 전까지 옛 코드를 돌리므로, 옛 프론트가 새 API를 부를 때의 호환성(버전 필드, 하위 호환 API)을 따로 챙겨야 한다는 점입니다.

- 꼬리: 서비스 워커가 있으면 캐시 문제가 어떻게 달라지나요?
- 꼬리: API 응답도 CDN에 캐시할 수 있나요? 조건은?
