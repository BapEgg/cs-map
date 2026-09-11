---
id: page-replacement
title: 페이지 교체 기법
order: 4
card:
  one_line: 메모리가 꽉 찼을 때 어떤 페이지를 내보낼지 결정
  analogy: ''
  keywords: []
flow:
  prev: { id: virtual-memory, reason: 꽉 차면 뭘 내보낼지 }
---

## 왜 나왔나

필요한 페이지가 메모리에 없으면(페이지 폴트) 디스크에서 가져와야 한다. 자리가 없으면 **누군가를 내보내야** 하는데, 잘못 고르면 폴트가 계속 난다.
