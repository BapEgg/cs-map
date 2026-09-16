---
id: boot-config
title: 부트 자동 설정과 프로파일
order: 3
aliases: [스프링 부트, 자동 설정, AutoConfiguration, application.yml, 프로파일, '@ConfigurationProperties', 스타터, Conditional]
card:
  one_line: '스프링 부트는 클래스패스에 무엇이 있는지 보고(조건) 필요한 빈을 자동으로 등록하며, 설정값은 application.yml·환경 변수·인자에서 우선순위대로 읽고, 프로파일로 환경(local·prod)마다 설정을 갈아 끼운다.'
  analogy: 조립 PC 매장의 기본 세트 — 부품(의존성)을 고르면 맞는 드라이버(자동 설정)를 알아서 깔아 주고, 내가 직접 깐 드라이버가 있으면 그건 건드리지 않는다. 프로파일은 "집용·사무실용" 설정 프리셋
  analogy_limit: 매장은 뭘 깔았는지 알려 주지만 부트는 조용히 깐다. 어떤 빈이 왜 생겼는지는 `--debug`나 actuator의 conditions 보고서를 봐야 안다 — 편리함의 대가는 "안 보임"이다.
  keywords: [클래스패스 조건으로 빈 등록, 내 빈이 있으면 물러남, 설정은 우선순위·프로파일]
flow:
  prev: { id: bean-lifecycle, reason: 그 많은 빈을 누가 등록하나 }
  next: { id: mvc-request-flow, reason: 등록된 빈들 사이로 요청이 지나는 길 }
see_also: [ioc-di, bean-lifecycle, observability-deploy, spring-test]
checked: '2026-09-16'
sources:
  - 'Spring Boot 3 레퍼런스 — Auto-configuration(@EnableAutoConfiguration, 조건, 대체·제외) — https://docs.spring.io/spring-boot/reference/using/auto-configuration.html'
  - 'Spring Boot 3 레퍼런스 — Externalized Configuration(PropertySource 우선순위, 프로파일별 파일, @ConfigurationProperties) — https://docs.spring.io/spring-boot/reference/features/external-config.html'
  - 'Spring Boot 3 레퍼런스 — Profiles — https://docs.spring.io/spring-boot/reference/features/profiles.html'
  - 'Spring Boot 3 레퍼런스 — Creating Your Own Auto-configuration(AutoConfiguration.imports, @Conditional*) — https://docs.spring.io/spring-boot/reference/features/developing-auto-configuration.html'
---

## 개념

스프링 프레임워크만 쓰면 `DataSource`, 트랜잭션 매니저, `EntityManagerFactory`, 디스패처 서블릿, Jackson 변환기를 전부 직접 빈으로 등록해야 했다. **스프링 부트의 자동 설정**은 "클래스패스에 H2 드라이버가 있고, 사용자가 `DataSource` 빈을 안 만들었으면, 내가 하나 만든다"처럼 **조건부로 빈을 등록**한다. `spring-boot-starter-data-jpa` 같은 **스타터**는 그 조건을 만족시킬 의존성 묶음이다. 내가 같은 타입의 빈을 직접 등록하면 자동 설정은 물러난다(`@ConditionalOnMissingBean`).

**설정값**은 코드 밖에 둔다. `application.yml`에 적고, 같은 키가 환경 변수·명령행 인자·시스템 속성에 있으면 **우선순위가 높은 쪽이 이긴다**(명령행 > 환경 변수 > `application-{profile}.yml` > `application.yml`). **프로파일**은 환경마다 설정을 나누는 이름표 — `application-local.yml`은 `local` 프로파일이 켜질 때만 읽히고, `@Profile("prod")` 빈은 `prod`에서만 뜬다.

#### 예시 — DataSource가 생기는 조건

```yaml
# application.yml (공통)
spring:
  jpa:
    open-in-view: false
# application-local.yml
spring:
  datasource:
    url: jdbc:h2:mem:shop
# application-prod.yml
spring:
  datasource:
    url: ${DB_URL}          # 환경 변수에서
    hikari.maximum-pool-size: 20
```

```bash
java -jar app.jar --spring.profiles.active=prod --server.port=8081
```

#### 작동 과정 — 기동 때 무슨 일이

- `@SpringBootApplication` = `@Configuration` + `@ComponentScan`(내 빈) + `@EnableAutoConfiguration`(부트 빈).
- 컴포넌트 스캔이 내 `@Service`·`@Repository`·`@Configuration`을 먼저 등록한다.
- `AutoConfiguration.imports` 파일에 나열된 자동 설정 클래스 100여 개를 읽고, 각각의 `@ConditionalOnClass`·`@ConditionalOnMissingBean`·`@ConditionalOnProperty`를 평가한다. `DataSourceAutoConfiguration`은 "JDBC 클래스 있음 + 내 `DataSource` 없음"이면 `spring.datasource.*` 값으로 HikariCP를 만든다.
- 프로퍼티는 여러 소스를 우선순위 순으로 겹친 `Environment`에서 읽는다. `--server.port=8081`은 yml의 `server.port`를 덮는다.
- 결과: 내가 쓴 코드는 서비스·컨트롤러뿐인데 DB 풀·JPA·MVC·Jackson이 전부 떠 있다. 내가 `@Bean DataSource`를 만들면 부트의 것은 안 생긴다. 무엇이 왜 떴는지는 `--debug`의 CONDITIONS EVALUATION REPORT.

#### 비교 — 설정을 두는 곳

| 자리 | 언제 | 주의 |
|---|---|---|
| `application.yml` | 모든 환경 공통 기본값 | 비밀은 넣지 않는다 |
| `application-{profile}.yml` | 환경별 차이(DB URL, 로그 레벨) | 프로파일 활성화 필요 |
| 환경 변수·명령행 | 배포 환경이 주입하는 비밀·포트 | 우선순위 최상 |
| `@ConfigurationProperties` 클래스 | 설정 묶음을 타입 있는 객체로 | `@Validated`로 기동 때 검증 |
| `@Value("${...}")` | 값 한두 개 | 흩어지면 추적 어려움 |

## 왜 나왔나

스프링은 유연했지만 프로젝트마다 같은 XML·자바 설정을 수백 줄 복사했고, 라이브러리 버전 궁합을 맞추는 데 며칠이 갔다. 부트(2014)는 "합리적인 기본값을 자동으로, 바꾸고 싶으면 프로퍼티나 내 빈으로"라는 관례 우선 방식으로 이 반복을 없앴고, 스타터로 버전 궁합을 대신 맞췄다. 설정을 코드 밖으로 빼는 것(12-Factor "Config")은 같은 빌드를 여러 환경에 올리는 배포 방식의 전제다 — 환경마다 다시 빌드하면 "테스트한 것과 배포한 것이 다르다".

## 확인 질문

- 설명해 보기: 자동 설정이 내 빈과 충돌하지 않는 원리는?
  답: 자동 설정 빈에 `@ConditionalOnMissingBean`이 있어 같은 타입의 빈을 사용자가 등록했으면 자기 것을 만들지 않는다. 사용자 빈이 먼저 등록되도록 순서도 정해져 있다.
- 다음 상태 예측: `application.yml`에 `server.port: 8080`, 환경 변수 `SERVER_PORT=9090`, 인자 `--server.port=7070`이면?
  답: 7070. 명령행 인자 > 환경 변수 > 파일. 환경 변수는 `SERVER_PORT`가 `server.port`로 느슨하게 매핑된다.
- 다음 상태 예측: `prod` 프로파일로 띄웠는데 `application-local.yml`의 H2 설정이 적용됐다면?
  답: 프로파일 파일이 잘못 읽혔거나 `spring.profiles.include`로 `local`이 포함됐거나, 공통 `application.yml`에 H2 설정이 들어 있는 것. `Environment`의 활성 프로파일과 실제 `DataSource` URL을 기동 로그·actuator `/env`에서 확인.

## 심화

### 조건 애노테이션

`@ConditionalOnClass`(클래스패스에 있으면), `@ConditionalOnMissingBean`(그 타입의 빈이 없으면), `@ConditionalOnProperty`(프로퍼티 값이면), `@ConditionalOnWebApplication`. 자동 설정 클래스는 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`에 나열되고 컴포넌트 스캔 **뒤에** 처리되어 사용자 빈이 우선한다. 사내 공통 라이브러리를 스타터로 만들 때 같은 구조를 쓴다.

### 프로파일 설계

`local`(내 PC, H2·더미 외부 서비스), `test`(자동 테스트, Testcontainers), `dev`/`staging`(공용 서버), `prod`. 프로파일 이름으로 분기하는 `if (env.equals("prod"))` 코드는 두지 않는다 — 설정값으로 동작을 바꾸고 프로파일은 값만 고른다. `spring.profiles.group`으로 `prod` = `prod-db, prod-mq`처럼 묶는다. 활성 프로파일이 없으면 `default`.

### 비밀 관리

DB 비밀번호·API 키는 yml에 넣지 않는다(저장소에 남는다). 환경 변수·시크릿 매니저(Vault, AWS Secrets Manager, K8s Secret)에서 주입하고 yml에는 `${DB_PASSWORD}` 자리만 둔다. 로그·actuator `/env`에 비밀이 찍히지 않게 `management.endpoint.env.show-values`는 기본 마스킹.

### 설정 검증과 타입

`@ConfigurationProperties(prefix = "shop.payment")` + `record`/클래스 + `@Validated`로 기동 때 필수값·범위를 검사한다. 잘못된 설정으로 기동한 뒤 첫 요청에서 죽는 것보다 기동 실패가 낫다. `Duration`·`DataSize` 타입은 `30s`, `10MB` 표기를 그대로 받는다.

### 실무에서는

- 자동 설정을 통째로 끄기보다 프로퍼티로 조정한다. 끌 때는 `spring.autoconfigure.exclude`에 이유를 주석으로.
- "이 빈이 왜 생겼지/안 생겼지"는 `--debug` 기동 로그의 conditions 보고서나 actuator `/actuator/conditions`.
- 같은 jar를 모든 환경에 올리고 프로파일·환경 변수만 바꾼다. 환경별 빌드는 하지 않는다.
- `@Value`가 20개 넘게 흩어지면 `@ConfigurationProperties`로 모은다.
- 부트 버전을 올릴 때 프로퍼티 이름 변경은 `spring-boot-properties-migrator`가 알려 준다.

### 면접 질문

#### 스프링 부트의 자동 설정은 어떻게 동작하나요?

`@EnableAutoConfiguration`이 `AutoConfiguration.imports`에 나열된 자동 설정 클래스들을 읽고, 각 클래스의 `@ConditionalOnClass`·`@ConditionalOnMissingBean`·`@ConditionalOnProperty` 조건을 평가해 만족하는 것만 빈으로 등록합니다. 사용자의 컴포넌트 스캔이 먼저 처리되므로 내가 같은 타입의 빈을 만들면 자동 설정은 물러납니다.
"클래스패스에 있으면 쓰려는 것이고, 사용자가 직접 만들었으면 그것을 존중한다"는 관례 우선 원칙을 조건으로 구현한 것입니다.
예를 들어 `spring-boot-starter-data-jpa`를 넣으면 JPA 클래스가 있으니 `DataSource`·`EntityManagerFactory`·트랜잭션 매니저가 `spring.datasource.*`·`spring.jpa.*` 값으로 생깁니다. 한계는 무엇이 왜 등록됐는지가 코드에 안 보여 `--debug` 보고서를 봐야 하고, 두 자동 설정이 같은 타입을 두고 순서에 의존하는 경우 예상과 다른 빈이 뜰 수 있다는 점입니다.

- 오답: "부트가 모든 빈을 컴포넌트 스캔으로 찾는다" — 내 빈은 스캔, 라이브러리 빈은 imports 파일 + 조건 평가다.
- 꼬리: 내가 `DataSource` 빈을 직접 만들면 부트의 것은 어떻게 되나요?
- 꼬리: 자동 설정 하나를 끄려면?

#### 설정값의 우선순위와 프로파일을 어떻게 쓰나요? 비밀은 어디에 두나요?

명령행 인자 > 환경 변수 > `application-{profile}.yml` > `application.yml` 순으로 높은 쪽이 덮으며, 프로파일은 `spring.profiles.active`로 켜서 환경별 파일과 `@Profile` 빈을 고릅니다. 비밀은 파일에 넣지 않고 환경 변수나 시크릿 매니저에서 `${DB_PASSWORD}` 자리로 주입합니다.
같은 빌드를 모든 환경에 올리려면 설정이 코드 밖에 있어야 하고, 배포 환경이 마지막에 값을 덮을 수 있어야 하기 때문입니다.
예를 들어 공통 yml에 `open-in-view: false`, `application-prod.yml`에 풀 크기, 환경 변수에 DB URL·비밀번호를 두고 `--spring.profiles.active=prod`로 띄웁니다. 한계는 프로파일이 많아지면 어느 값이 이겼는지 추적이 어려워지므로 actuator `/env`로 확인하고, 프로파일 이름으로 코드를 분기하는 습관은 피해야 한다는 점입니다.

- 오답: "환경별로 다른 jar를 빌드한다" — 테스트한 산출물과 배포 산출물이 달라진다.
- 꼬리: `@ConfigurationProperties`와 `@Value`는 언제 무엇을 쓰나요?
