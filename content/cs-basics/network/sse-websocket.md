---
id: sse-websocket
title: 폴링·SSE·WebSocket
order: 8
aliases: [SSE, WebSocket, 폴링, 롱 폴링, 실시간 통신]
card:
  one_line: '서버가 먼저 말하려면 클라이언트가 주기적으로 묻거나(폴링), 답이 생길 때까지 붙들거나(롱 폴링), 응답을 열어 두고 흘려보내거나(SSE), 양방향 통로를 열어 둔다(WebSocket).'
  analogy: 폴링은 "왔어요?"를 계속 묻기, 롱 폴링은 올 때까지 창구에 서 있기, SSE는 방송 수신, WebSocket은 전화 통화
  analogy_limit: 전화(WebSocket)는 끊기면 다시 걸어야 하고 교환원(프록시)이 통화를 오래 두는 걸 싫어한다. 재연결과 프록시 설정이 실무의 절반이다.
  keywords: [요청-응답의 한계, 단방향 SSE, 양방향 WebSocket]
flow:
  prev: { id: proxy, reason: 요청-응답 말고 서버가 먼저 말하려면 }
see_also: [http, tcp-udp, io-multiplexing, message-queue]
checked: '2026-09-16'
sources:
  - 'WHATWG HTML Living Standard — Server-sent events (EventSource, text/event-stream) — https://html.spec.whatwg.org/multipage/server-sent-events.html'
  - 'RFC 6455 The WebSocket Protocol — HTTP Upgrade handshake, 프레임 — https://www.rfc-editor.org/rfc/rfc6455'
  - 'RFC 8441 Bootstrapping WebSockets with HTTP/2 — https://www.rfc-editor.org/rfc/rfc8441'
  - 'Spring Framework 레퍼런스 — SseEmitter, WebSocket 지원 — https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-async.html'
---

## 개념

HTTP는 클라이언트가 물어야 서버가 답한다. 새 알림·채팅·주문 상태 변화처럼 **서버 쪽에서 먼저 생기는 일**을 전하려면 네 가지 중 하나를 쓴다.

**폴링**은 클라이언트가 몇 초마다 "새거 있어?"를 묻는다. 단순하지만 대부분 빈손이고 지연이 주기만큼 있다. **롱 폴링**은 물었을 때 서버가 답이 생길 때까지 응답을 미룬다 — 지연은 없지만 연결을 붙든다. **SSE**는 HTTP 응답을 닫지 않고 서버가 이벤트를 한 줄씩 흘려보낸다(서버 → 클라이언트만). **WebSocket**은 HTTP로 시작해 양방향 통로로 바꿔(Upgrade) 서로 아무 때나 보낸다.

주문 상태가 "결제 완료 → 배송 중"으로 바뀌는 것을 화면에 전하는 네 방법을 보자.

- 폴링: 5초마다 `GET /orders/42`. 바뀐 직후 최대 5초 뒤 화면 갱신. 안 바뀐 동안의 요청은 전부 낭비.
- 롱 폴링: `GET /orders/42/changes`를 보내면 서버가 바뀔 때까지(최대 30초) 안 답한다. 바뀌면 즉시 응답, 클라이언트는 다시 요청.
- SSE: `GET /orders/42/events`를 열어 두면 서버가 `data: 배송 중` 한 줄을 보낸다. 연결은 계속 열려 있고 다음 변화도 같은 통로로.
- WebSocket: 통로를 연 뒤 서버가 `{"status":"배송 중"}`을 밀어 넣는다. 클라이언트도 같은 통로로 "취소 요청"을 보낼 수 있다.
- 결과: 넷 다 화면이 바뀐다. 지연·낭비·복잡도·양방향 여부가 다르다.

## 왜 나왔나

HTTP의 요청-응답은 "서버가 먼저 말할 수 없다"는 구조적 한계가 있었다. 처음엔 자주 묻는 것(폴링)으로 버텼고, 낭비를 줄이려 답이 생길 때까지 미루는 롱 폴링이 나왔다. 그래도 매번 연결을 다시 맺으니 응답을 열어 두는 SSE가, 클라이언트도 실시간으로 보내야 하는 채팅·게임을 위해 양방향 WebSocket이 표준이 됐다.

## 확인 질문

- 설명해 보기: SSE와 WebSocket의 가장 큰 차이는?
  답: 방향. SSE는 서버 → 클라이언트만(HTTP 그대로), WebSocket은 양방향(별도 프로토콜로 전환).
- 다음 상태 예측: 폴링 주기를 1초로 줄이면 무엇이 좋아지고 나빠지나?
  답: 지연이 최대 1초로 준다. 대신 사용자 1만 명이면 초당 1만 요청이 대부분 빈손으로 서버를 때린다.
- 다음 상태 예측: SSE로 연결한 클라이언트 5천 명이 있는 서버가 요청당 스레드 모델이면?
  답: 스레드 5천 개가 응답을 열어 둔 채 묶인다. Spring MVC의 `SseEmitter`처럼 비동기 응답이나 이벤트 루프(WebFlux)가 필요하다.

## 심화

### 네 방법 비교

| | 지연 | 서버 부담 | 방향 | 구현 |
|---|---|---|---|---|
| 폴링 | 주기만큼 | 빈 요청 다수 | 클 → 서 | 가장 단순 |
| 롱 폴링 | 거의 없음 | 연결 붙듦, 재요청 반복 | 클 → 서 | HTTP 그대로 |
| SSE | 거의 없음 | 연결 1개 유지 | 서 → 클 | HTTP, 브라우저 `EventSource`가 재연결·마지막 ID 자동 |
| WebSocket | 거의 없음 | 연결 1개 유지 | 양방향 | 별도 프로토콜, 재연결·하트비트 직접 |

### SSE의 생김새

응답 `Content-Type: text/event-stream`, 본문은 `data: …` 줄과 빈 줄의 반복. `id:`를 붙이면 끊겼다 다시 연결할 때 브라우저가 `Last-Event-ID`를 보내 이어받는다. HTTP/1.1에서는 브라우저의 도메인당 연결 수(6개) 제한에 걸리고, HTTP/2에서는 한 연결의 스트림이라 괜찮다.

### WebSocket의 생김새

`GET` 요청에 `Upgrade: websocket` 헤더로 시작해 서버가 `101 Switching Protocols`로 답하면 그 TCP 연결이 프레임 단위 양방향 통로가 된다. 이후는 HTTP가 아니라 프록시·로드밸런서가 업그레이드 헤더를 넘기고 긴 유휴 연결을 허용하도록 설정해야 한다. 하트비트(ping/pong)로 죽은 연결을 감지하고, 끊기면 클라이언트가 지수 백오프로 재연결한다.

### 서버 여러 대와 메시지 전파

연결은 특정 서버에 붙어 있다. 서버 A에서 생긴 이벤트를 서버 B에 붙은 클라이언트에게 주려면 서버들 사이에 pub/sub(Redis, MQ)이 필요하다. "누가 어느 서버에 붙어 있나"를 관리하거나, 전 서버에 브로드캐스트한다.

### 실무에서는

- 알림·진행률·대시보드처럼 서버 → 클라이언트만이면 SSE가 단순하고 프록시·인증(쿠키 그대로)이 편하다. 채팅·협업 편집·게임처럼 양방향이면 WebSocket.
- Spring MVC에서 SSE는 `SseEmitter`(요청 스레드를 반환하고 이벤트 때만 씀), WebSocket은 `spring-websocket` + STOMP. 연결 수가 많으면 WebFlux 쪽이 스레드를 아낀다.
- 로드밸런서 유휴 타임아웃(ALB 기본 60초)이 SSE·WebSocket을 끊는다. 주기적으로 빈 이벤트·ping을 보내거나 타임아웃을 늘린다.
- 모바일은 앱이 백그라운드로 가면 연결이 끊긴다. 확실히 전달해야 하면 푸시 알림(FCM/APNs)을 병행한다.

### 면접 질문

#### 폴링, 롱 폴링, SSE, WebSocket의 차이와 선택 기준은?

폴링은 주기적으로 묻고, 롱 폴링은 답이 생길 때까지 응답을 미루며, SSE는 HTTP 응답을 열어 두고 서버가 이벤트를 흘려보내고, WebSocket은 HTTP를 양방향 통로로 전환합니다.
지연을 줄이려면 폴링을 벗어나야 하고, 서버 → 클라이언트만이면 SSE가 HTTP 위라 프록시·인증·재연결이 쉬우며, 클라이언트도 실시간으로 보내야 하면 WebSocket입니다.
예를 들어 주문 상태·알림·진행률은 SSE, 채팅·실시간 협업은 WebSocket, 변화가 드물고 정확한 실시간이 필요 없으면 30초 폴링이 가장 단순합니다. 한계는 SSE·WebSocket 모두 연결을 오래 유지하므로 요청당 스레드 서버에서는 스레드가 묶이고, 서버가 여러 대면 이벤트를 서버 간에 전파할 pub/sub이 필요하다는 점입니다.

- 꼬리: SSE가 HTTP/1.1에서 겪는 제약은?
- 꼬리: WebSocket 연결이 끊기면 클라이언트는 어떻게 해야 하나요?

#### WebSocket 서버를 2대로 늘렸더니 채팅 메시지가 같은 방 사용자 일부에게만 갑니다. 왜, 어떻게 하나요?

연결이 서버별로 붙어 있어서, 서버 A에 온 메시지를 A에 붙은 사용자에게만 보냈기 때문입니다.
WebSocket 연결은 특정 프로세스의 소켓이라 다른 서버는 그 연결을 모릅니다. 메시지를 받은 서버가 "다른 서버에 붙은 사람"에게도 전하려면 서버 사이의 전파 통로가 필요합니다.
Redis pub/sub이나 메시지 브로커에 방 단위 채널을 두고, 각 서버가 구독해 자기에게 붙은 사용자에게 전달하게 합니다(Spring의 STOMP 브로커 릴레이가 이 구조). 한계는 전파 지연이 조금 생기고 브로커가 새 단일 지점이 되므로 이중화가 필요하다는 점입니다.

- 꼬리: sticky session으로 해결할 수는 없나요?
- 꼬리: 메시지 순서를 방 안에서 보장하려면?
