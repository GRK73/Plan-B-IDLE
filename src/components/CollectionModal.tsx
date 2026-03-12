import { useGameStore } from '../store/gameStore';
import { CHARACTER_DATA, Tier } from '../data/characters';
import { getCardImageUrl } from '../utils/assets';
import './CollectionModal.css';

interface Props {
  onClose: () => void;
  onSelectChar: (id: string) => void;
  onShowToast: (msg: string) => void;
}

export function CollectionModal({ onClose, onSelectChar, onShowToast }: Props) {
  const { ownedCharacters, activeRoster, toggleRoster } = useGameStore();

  const renderTierGroup = (tier: Tier, title: string) => {
    const charsInTier = CHARACTER_DATA.filter(c => c.tier === tier);
    if (charsInTier.length === 0) return null;

    return (
      <div className="tier-section" key={tier}>
        <h3 className={`tier-title tier-color-${tier}`}>{title}</h3>
        <div className="collection-grid">
          {charsInTier.map(char => {
            const owned = ownedCharacters[char.id];
            const isOwned = !!owned;
            const isWorking = activeRoster.includes(char.id);

            return (
              <div 
                key={char.id} 
                className={`collection-card-container ${isOwned ? '' : 'locked'} ${isWorking ? 'working' : ''}`}
                onClick={() => {
                  if (isOwned) {
                    onSelectChar(char.id);
                  }
                }}
              >
                <div className={`collection-card-visual tier-border-${char.tier}`}>
                  <div className={`card-tier-badge tier-color-${char.tier}`}>{char.tier === 'SR' ? 'P.B' : char.tier}</div>
                  <img src={getCardImageUrl(char.id)} alt="character" className="collection-card-image" />
                  {isOwned && (
                    <div className="card-points-overlay">pt: {owned.points}</div>
                  )}
                </div>
                <div className="collection-card-name">{isOwned ? char.name : '???'}</div>
                
                {isOwned && (
                  <div className="card-actions" style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                    <button 
                      className={`roster-toggle-btn ${isWorking ? 'on' : 'off'}`}
                      style={{ flex: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isWorking && activeRoster.length >= 10) {
                          onShowToast("최대 10명까지만 출근할 수 있습니다.");
                          return;
                        }
                        toggleRoster(char.id);
                      }}
                    >
                      {isWorking ? '퇴근' : '출근'}
                    </button>
                    <button
                      className="lock-toggle-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        useGameStore.getState().toggleLock(char.id);
                      }}
                      title="일괄 배분/돌파 잠금"
                    >
                      {owned.isLocked ? '🔒' : '🔓'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content collection-modal">
        <button className="close-btn" onClick={onClose}>X</button>
        <div className="collection-header-actions" style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <p className="collection-desc">
            카드를 클릭하면 스탯을 관리할 수 있습니다. <br/>
            (현재 출근 인원: {activeRoster.length} / 10)
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="auto-distribute-btn" 
              onClick={() => {
                useGameStore.getState().autoDistributeAllStats();
                onShowToast("보유한 모든 캐릭터의 포인트가 일괄 배분되었습니다!");
              }}
            >
              ✨ 스탯 일괄 배분
            </button>
            <button 
              className="auto-distribute-btn breakthrough-all-btn" 
              onClick={() => {
                useGameStore.getState().autoBreakthroughAll();
                onShowToast("가능한 모든 한계 돌파가 완료되었습니다!");
              }}
            >
              🔥 일괄 돌파
            </button>
          </div>
        </div>
        
        <div className="collection-content">
          {renderTierGroup('SR', 'PLAN.B 등급')}
          {renderTierGroup('R', '1기')}
          {renderTierGroup('U', '2기')}
          {renderTierGroup('C', '3기')}
        </div>
      </div>
    </div>
  );
}
