---
id: source-control
title: 소스 관리
order: 4
card:
  one_line: '소스 관리는 Git으로 변경 이력을 남겨 여러 명이 고치고 되돌릴 수 있게 하는 일이다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: development, reason: 코드를 쌓아가며 }
  next: { id: deploy, reason: 정리된 코드를 서버에 }
---

## 개념

코드의 **변경 이력을 남기고 되돌릴 수 있게** 하는 일이다. Git이 이력을 관리하고 GitHub가 그걸 여럿이 나눠 갖게 한다.
개발용 가지와 운영용 가지를 나눠(브랜치 전략) 만드는 중인 코드가 운영에 섞이지 않게 한다.

## 왜 나왔나

여러 명이 동시에 고치고, 잘못되면 되돌리려면 변경 이력을 관리해야 한다.
