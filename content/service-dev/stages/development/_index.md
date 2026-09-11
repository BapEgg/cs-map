---
id: development
title: 개발
order: 3
card:
  one_line: '개발은 프론트엔드·백엔드·DB를 각각 만들고 연결하는 단계다.'
  analogy: ''
  keywords: []
flow:
  prev: { id: design, reason: 설계대로 }
  next: { id: source-control, reason: 코드를 쌓아가며 }
---

## 개념

설계대로 **화면(프론트엔드), 서버(백엔드), 저장소(DB)를 각각 만들고 연결하는** 단계다.
셋으로 나눠 두면 각각 따로 만들고 고칠 수 있다. 화면이 서버에 요청하고, 서버가 DB에서 꺼내 답한다.

## 왜 나왔나

사용자가 보는 화면, 데이터를 처리하는 서버, 데이터를 저장하는 DB로 역할을 나누면 각각을 따로 만들고 고칠 수 있다.
