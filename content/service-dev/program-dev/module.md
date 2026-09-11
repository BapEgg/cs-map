---
id: module
title: 모듈
order: 4
card:
  one_line: '모듈은 관련 있는 코드를 한 파일에 모아 둔 단위다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: object, reason: 파일로 나누려고 }
  next: { id: package, reason: 모듈이 많아져서 }
---

## 개념

**관련 있는 코드를 한 파일**에 모아 둔 단위다. 파일 하나가 모듈 하나다.
다른 파일에서 가져다(import) 쓴다. 이름이 겹치지 않게 경계를 만들어 준다.

## 왜 나왔나

한 파일에 모든 걸 쓰면 관리가 안 돼서, **기능별로 파일을 나누고** 필요한 것만 가져다 쓰게 했다.
