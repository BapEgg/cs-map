import { useCallback, useState } from 'react';
import {
  RECENT_MAX,
  emptyNote,
  localStore,
  normalize,
  type ConceptNote,
  type StudyData,
  type StudyStore,
} from './studyStore';

/**
 * 내 메모와 퀴즈 기록을 들고 있는다. 바뀔 때마다 저장소에 넘긴다.
 * 저장소가 바뀌어도(나중에 로그인 + DB) 이 훅을 쓰는 쪽은 그대로다.
 */
export function useStudy(store: StudyStore = localStore) {
  const [data, setData] = useState<StudyData>(() => store.load());
  /** 저장이 막혀 있는지. 적은 게 안 남는다는 걸 사용자가 알아야 한다. */
  const [saveFailed, setSaveFailed] = useState(false);

  /** 상태를 바꾸면서 같은 값을 저장소에도 넘긴다. */
  const update = useCallback(
    (fn: (prev: StudyData) => StudyData) => {
      setData((prev) => {
        const next = fn(prev);
        const ok = store.save(next);
        // 렌더 중에 다른 state를 건드리지 않도록 다음 틱으로 미룬다.
        if (!ok) queueMicrotask(() => setSaveFailed(true));
        return next;
      });
    },
    [store],
  );

  const setNote = useCallback(
    (id: string, patch: Partial<ConceptNote>) =>
      update((prev) => ({
        ...prev,
        notes: {
          ...prev.notes,
          [id]: {
            ...emptyNote(),
            ...prev.notes[id],
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        },
      })),
    [update],
  );

  const setMark = useCallback(
    (id: string, known: boolean | null) =>
      update((prev) => {
        const marks = { ...prev.marks };
        if (known === null) delete marks[id];
        else marks[id] = { known, at: new Date().toISOString() };
        return { ...prev, marks };
      }),
    [update],
  );

  const clearMarks = useCallback(
    (ids: string[]) =>
      update((prev) => {
        const marks = { ...prev.marks };
        for (const id of ids) delete marks[id];
        return { ...prev, marks };
      }),
    [update],
  );

  /** 방금 본 개념으로 기록한다. 이미 있으면 맨 앞으로 끌어올린다. */
  const touch = useCallback(
    (id: string) =>
      update((prev) =>
        prev.recent[0] === id
          ? prev
          : { ...prev, recent: [id, ...prev.recent.filter((x) => x !== id)].slice(0, RECENT_MAX) },
      ),
    [update],
  );

  /** 가져오기. 같은 개념이 양쪽에 있으면 더 최근에 고친 쪽을 남긴다. */
  const importJson = useCallback(
    (raw: unknown) =>
      update((prev) => {
        const incoming = normalize(raw);
        const notes = { ...prev.notes };
        for (const [id, note] of Object.entries(incoming.notes)) {
          const mine = notes[id];
          if (!mine || note.updatedAt > mine.updatedAt) notes[id] = note;
        }
        return {
          version: 1,
          notes,
          marks: { ...prev.marks, ...incoming.marks },
          recent: prev.recent,
        };
      }),
    [update],
  );

  return { data, saveFailed, setNote, setMark, clearMarks, importJson, touch };
}
