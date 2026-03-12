import { useGameStore } from '../store/gameStore';
import goldenNoteIcon from '../assets/images/golden_note.png';
import './GoldenDiskModal.css';

interface Props {
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

const STAT_NAMES = {
  vocal: '보컬 (V)',
  rap: '랩 (R)',
  dance: '댄스 (D)',
  sense: '방송감 (S)',
  charm: '매력 (C)'
};

export function GoldenDiskModal({ onClose, onShowToast }: Props) {
  const { musicalNotes, diskBuffs, upgradeDiskBuff } = useGameStore();

  const handleUpgrade = (statKey: keyof typeof STAT_NAMES) => {
    const currentLevel = diskBuffs[statKey];
    const cost = Math.floor(100 * Math.pow(1.5, currentLevel));
    
    if (musicalNotes >= cost) {
      upgradeDiskBuff(statKey);
      onShowToast(`${STAT_NAMES[statKey]} 10% 강화 완료!`);
    } else {
      onShowToast('음표가 부족합니다.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content disk-modal">
        <button className="close-btn" onClick={onClose}>X</button>
        
        <div className="disk-modal-header">
          <img src={goldenNoteIcon} alt="note" className="disk-header-icon" />
          <h2>황금 디스크 상점</h2>
        </div>
        
        <p className="disk-desc">
          황금디스크의 방에서 획득한 음표를 이용하여 스탯을 강화합니다.
        </p>

        <div className="disk-currency-box">
          <span style={{ fontSize: '1.2rem', color: '#ccc' }}>보유 음표:</span>
          <span style={{ fontSize: '1.8rem', color: '#f1c40f', fontWeight: 'bold' }}>🎵 {musicalNotes.toLocaleString()}</span>
        </div>

        {/* 2열 그리드로 변경된 상점 아이템 목록 */}
        <div className="disk-buffs-grid">
          {(Object.entries(STAT_NAMES) as [keyof typeof STAT_NAMES, string][]).map(([key, name]) => {
            const level = diskBuffs[key];
            const currentBonus = level * 10;
            const nextBonus = (level + 1) * 10;
            const cost = Math.floor(100 * Math.pow(1.5, level));
            const canAfford = musicalNotes >= cost;

            return (
              <div key={key} className="disk-buff-item">
                <div className="disk-buff-info">
                  <div className="disk-buff-name">
                    {name} <span className="disk-buff-level">Lv.{level}</span>
                  </div>
                  <div className="disk-buff-effect">
                    <span style={{ color: '#2ecc71' }}>+{currentBonus}%</span>
                    <span style={{ color: '#aaa', margin: '0 5px' }}>➔</span>
                    <span style={{ color: '#3498db' }}>+{nextBonus}%</span>
                  </div>
                </div>
                <button 
                  className="disk-upgrade-btn" 
                  disabled={!canAfford}
                  onClick={() => handleUpgrade(key)}
                >
                  <div style={{ fontSize: '0.8rem', color: canAfford ? '#eee' : '#888' }}>필요 음표</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>🎵 {cost.toLocaleString()}</div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
