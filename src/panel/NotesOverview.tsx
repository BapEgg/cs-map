import { useRef } from 'react';
import type { ContentTree } from '../content/types';
import { exportName, isBlank, type StudyData } from '../store/studyStore';
import './notes.css';

interface Props {
  tree: ContentTree;
  data: StudyData;
  onImport: (raw: unknown) => void;
  onGoTo: (id: string) => void;
  onClose: () => void;
}

/** 여기저기 적어둔 메모를 한 화면에 모아 본다. 내보내기·가져오기도 여기서. */
export default function NotesOverview({ tree, data, onImport, onGoTo, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const entries = Object.entries(data.notes)
    .filter(([id, note]) => tree.byId[id] && !isBlank(note))
    .sort((a, b) => b[1].updatedAt.localeCompare(a[1].updatedAt));

  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportName();
    a.click();
    URL.revokeObjectURL(url);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      onImport(JSON.parse(await file.text()));
    } catch {
      alert('이 파일은 읽을 수 없어요. cs-map에서 내보낸 JSON인지 확인해 주세요.');
    }
  };

  return (
    <div className="notes">
      <header className="notes-bar">
        <h2>내 메모 {entries.length > 0 && <span>{entries.length}개</span>}</h2>
        <div className="notes-io">
          <button onClick={download} disabled={entries.length === 0}>
            파일로 내보내기
          </button>
          <button onClick={() => fileRef.current?.click()}>가져오기</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <button className="notes-close" onClick={onClose}>
            닫기
          </button>
        </div>
      </header>

      <div className="notes-list">
        {entries.length === 0 ? (
          <p className="notes-empty">
            아직 메모가 없어요. 개념을 열고 <b>내 메모</b> 탭에 적으면 여기 모입니다.
          </p>
        ) : (
          entries.map(([id, note]) => (
            <article key={id} className="notes-item">
              <button className="notes-title" onClick={() => onGoTo(id)}>
                {tree.byId[id].title}
                {note.unsure && <span className="notes-unsure">헷갈림</span>}
              </button>
              {note.myLine && <p className="notes-line">{note.myLine}</p>}
              {note.text && <p className="notes-text">{note.text}</p>}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
