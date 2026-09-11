import { describe, expect, it } from 'vitest';
import { emptyNote, isBlank, normalize, type StudyData } from './studyStore';

describe('메모 저장소', () => {
  it('빈 메모를 알아본다', () => {
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank(emptyNote())).toBe(true);
    expect(isBlank({ ...emptyNote(), text: '  ' })).toBe(true);
    expect(isBlank({ ...emptyNote(), unsure: true })).toBe(false);
    expect(isBlank({ ...emptyNote(), myLine: '내 말로' })).toBe(false);
  });

  it('망가진 입력을 받아도 빈 상태로 돌아간다', () => {
    for (const bad of [null, undefined, 42, 'x', []]) {
      expect(normalize(bad)).toEqual({ version: 1, notes: {}, marks: {} });
    }
  });

  it('가져온 JSON에서 쓸 수 있는 것만 남긴다', () => {
    const got = normalize({
      notes: {
        paging: { text: '내 메모', myLine: '칸 나누기', unsure: true, updatedAt: '2026-09-01' },
        broken: '문자열이면 버린다',
        partial: { text: '본문만' },
      },
      marks: {
        lru: { known: true, at: '2026-09-02' },
        bad: { known: '네' },
      },
    });
    expect(Object.keys(got.notes).sort()).toEqual(['paging', 'partial']);
    expect(got.notes.partial).toMatchObject({ text: '본문만', myLine: '', unsure: false });
    expect(Object.keys(got.marks)).toEqual(['lru']);
  });

  it('버전을 붙여 내보낸다', () => {
    const data: StudyData = normalize({ notes: {}, marks: {} });
    expect(data.version).toBe(1);
  });
});
