import type { ContentTree } from '../content/types';
import { conceptOf, isBlank, marksByConcept, type StudyData } from '../store/studyStore';
import './start.css';

interface Props {
  tree: ContentTree;
  data: StudyData;
  onGoTo: (id: string) => void;
  onQuiz: () => void;
}

/**
 * 아무것도 안 고른 상태에서 뜨는 화면.
 *
 * 원래는 "왼쪽에서 개념을 누르세요" 안내문 두 줄이었다. 매일 처음 보는 화면인데
 * 할 일을 하나도 주지 않아서, 열 때마다 뭘 눌러야 할지 다시 정해야 했다.
 * 그래서 **다음에 할 일을 먼저 내민다.**
 */
export default function StartPanel({ tree, data, onGoTo, onQuiz }: Props) {
  const alive = (id: string) => !!tree.byId[id];

  const recent = data.recent.filter(alive).slice(0, 6);

  // 다시 봐야 할 것: 헷갈림 표시 + 퀴즈에서 틀린 것(면접 문제 하나라도 틀렸으면 그 개념)
  const marks = marksByConcept(data.marks);
  const review = [
    ...Object.keys(data.notes).filter((id) => alive(id) && data.notes[id].unsure),
    ...Object.keys(marks).filter((id) => alive(id) && !marks[id].known),
  ];
  const toReview = [...new Set(review)].slice(0, 8);

  // 아직 한 번도 안 들어가 본 과목
  const seen = new Set([
    ...data.recent,
    ...Object.keys(data.notes),
    ...Object.keys(data.marks).map(conceptOf),
  ]);
  const touched = (id: string): boolean =>
    seen.has(id) || (tree.byId[id]?.childIds ?? []).some(touched);
  const subjects = tree.byId[tree.rootId]?.childIds ?? [];
  const fresh = subjects.filter((id) => !touched(id));

  const firstTime = recent.length === 0 && toReview.length === 0;

  return (
    <aside className="panel start">
      <h2 className="start-title">{firstTime ? '어디서 시작할까요' : '이어서 볼까요'}</h2>

      {firstTime && (
        <p className="start-lead">
          지도에서 개념을 누르면 여기에 설명이 열려요. 설명 속 밑줄 친 용어를 누르면 페이지를 떠나지
          않고 그 자리에서 뜻을 볼 수 있어요.
        </p>
      )}

      {recent.length > 0 && (
        <section>
          <h3 className="section-title">최근 본 개념</h3>
          <div className="chip-row">
            {recent.map((id) => (
              <button key={id} className="chip" onClick={() => onGoTo(id)}>
                {tree.byId[id].title}
              </button>
            ))}
          </div>
        </section>
      )}

      {toReview.length > 0 && (
        <section>
          <h3 className="section-title">다시 볼 것 {toReview.length}개</h3>
          <div className="chip-row">
            {toReview.map((id) => (
              <button key={id} className="chip chip-warn" onClick={() => onGoTo(id)}>
                {tree.byId[id].title}
              </button>
            ))}
          </div>
          <button className="btn btn-primary start-quiz" onClick={onQuiz}>
            퀴즈로 점검하기
          </button>
        </section>
      )}

      {fresh.length > 0 && (
        <section>
          <h3 className="section-title">아직 안 열어본 과목</h3>
          <div className="chip-row">
            {fresh.map((id) => (
              <button key={id} className="chip" onClick={() => onGoTo(id)}>
                {tree.byId[id].title}
              </button>
            ))}
          </div>
        </section>
      )}

      {firstTime && fresh.length === 0 && (
        <div className="chip-row">
          {subjects.map((id) => (
            <button key={id} className="chip" onClick={() => onGoTo(id)}>
              {tree.byId[id].title}
            </button>
          ))}
        </div>
      )}

      <p className="start-tip">
        지도는 드래그로 옮기고, 휠로 훑고, Ctrl+휠로 확대해요. 오른쪽 아래 ⤢ 를 누르면 전체가 다시
        보여요.
      </p>

      {Object.values(data.notes).some((n) => !isBlank(n)) && (
        <p className="start-count">
          지금까지 메모 {Object.values(data.notes).filter((n) => !isBlank(n)).length}개를 남겼어요.
        </p>
      )}
    </aside>
  );
}
