---
id: package
title: 패키지
order: 5
card:
  one_line: '패키지는 여러 모듈을 묶어 배포하는 단위다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: module, reason: 모듈이 많아져서 }
  next: { id: component, reason: 독립적으로 재사용하려고 }
---

## 개념

**여러 모듈을 묶어 이름을 붙이고 배포하는** 단위다. 남이 만든 패키지를 받아다 쓰고, 내 것도 패키지로 내놓는다.
npm, Maven 같은 저장소에서 패키지를 주고받는다.

## 왜 나왔나

모듈이 수십 개가 되자 묶어서 이름을 붙이고, npm·pip처럼 설치해 쓰는 단위가 필요해졌다.
