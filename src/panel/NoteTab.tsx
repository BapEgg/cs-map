import { emptyNote, type ConceptNote } from '../store/studyStore';

interface Props {
  note: ConceptNote | undefined;
  onChange: (patch: Partial<ConceptNote>) => void;
}

/** 개념마다 남기는 내 메모. 브라우저에 바로 저장된다. */
export default function NoteTab({ note, onChange }: Props) {
  const value = note ?? emptyNote();

  return (
    <div className="panel-body note">
      <label className="note-field">
        <span>내 말로 쓰는 한 줄 정의</span>
        <input
          type="text"
          value={value.myLine}
          placeholder="설명을 안 보고, 내 말로 한 줄."
          onChange={(e) => onChange({ myLine: e.target.value })}
        />
      </label>

      <label className="note-field">
        <span>자유 메모</span>
        <textarea
          rows={9}
          value={value.text}
          placeholder="헷갈린 지점, 나중에 찾아볼 것, 떠오른 비유 같은 걸 적어두세요."
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>

      <label className="note-unsure">
        <input
          type="checkbox"
          checked={value.unsure}
          onChange={(e) => onChange({ unsure: e.target.checked })}
        />
        아직 헷갈린다
      </label>

      <p className="note-saved">
        적는 대로 이 브라우저에 저장됩니다. 위쪽 <b>내 메모</b> 버튼에서 파일로 내보낼 수 있어요.
      </p>
    </div>
  );
}
