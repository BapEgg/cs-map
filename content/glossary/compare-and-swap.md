---
term: compare-and-swap
aliases: [CAS, test-and-set]
link: mutex
---

CPU가 제공하는 원자적 명령이다. "메모리 값이 기대한 값이면 새 값으로 바꾸고, 아니면 아무것도 안 한다"를 **한 명령**으로 한다. 락과 `AtomicInteger` 같은 무락 자료구조가 이 위에 만들어진다.
