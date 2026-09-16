---
term: GIL
aliases: [Global Interpreter Lock]
link: null
---

CPython 인터프리터가 한 번에 **한 스레드만** 파이썬 바이트코드를 실행하게 하는 전역 락이다. 코어가 많아도 순수 파이썬 코드는 병렬로 돌지 않는다(동시성은 있고 병렬성은 없다).
