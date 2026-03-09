import './GachaProbModal.css';

interface Props {
  onClose: () => void;
  currentLevel: number;
}

export function GachaProbModal({ onClose, currentLevel }: Props) {
  return (
    <div className="modal-overlay">
      <div className="modal-content prob-modal">
        <button className="close-btn" onClick={onClose}>X</button>
        <h2>사원 모집 확률표</h2>
        <p>현재 모집 레벨: <strong>Lv.{currentLevel}</strong></p>

        <table className="prob-table">
          <thead>
            <tr>
              <th>레벨</th>
              <th>3기생 (C)</th>
              <th>2기생 (U)</th>
              <th>1기생 (R)</th>
              <th>정식 멤버 (SR)</th>
            </tr>
          </thead>
          <tbody>
            <tr className={currentLevel === 1 ? 'current-level' : ''}>
              <td>Lv. 1</td>
              <td>96.0%</td>
              <td>4.0%</td>
              <td>-</td>
              <td>-</td>
            </tr>
            <tr className={currentLevel === 2 ? 'current-level' : ''}>
              <td>Lv. 2 (100회)</td>
              <td>86.4%</td>
              <td>7.6%</td>
              <td>6.0%</td>
              <td>-</td>
            </tr>
            <tr className={currentLevel === 3 ? 'current-level' : ''}>
              <td>Lv. 3 (500회)</td>
              <td>74.4%</td>
              <td>9.6%</td>
              <td>16.0%</td>
              <td>-</td>
            </tr>
            <tr className={currentLevel === 4 ? 'current-level' : ''}>
              <td>Lv. 4 (1000회)</td>
              <td>66.0%</td>
              <td>10.0%</td>
              <td>23.0%</td>
              <td>1.0%</td>
            </tr>
            <tr className={currentLevel === 5 ? 'current-level' : ''}>
              <td>Lv. 5 (2000회)</td>
              <td>60.0%</td>
              <td>9.0%</td>
              <td>26.0%</td>
              <td>5.0%</td>
            </tr>
            <tr className={currentLevel === 6 ? 'current-level' : ''}>
              <td>Lv. 6 (5000회)</td>
              <td>54.0%</td>
              <td>10.0%</td>
              <td>26.0%</td>
              <td>10.0%</td>
            </tr>
          </tbody>
        </table>
        <p className="prob-note">* 각 확률은 해당 등급 내 캐릭터 수에 따라 균등하게 배분됩니다.</p>
      </div>
    </div>
  );
}
