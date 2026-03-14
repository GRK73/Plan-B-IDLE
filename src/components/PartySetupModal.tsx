import { useState, useEffect } from 'react';
import { useGameStore, getTierMultiplier, getEffectiveStats, getHpMultiplier } from '../store/gameStore';
import { CHARACTER_DATA } from '../data/characters';
import { getCardImageUrl } from '../utils/assets';
import './PartySetupModal.css';

interface Props {
  onClose: () => void;
  onStartCombat: (mode: 'normal' | 'disk') => void;
  onShowToast: (msg: string) => void;
}

export function PartySetupModal({ onClose, onStartCombat, onShowToast }: Props) {
  const { ownedCharacters, combatParty, setCombatParty, currentStage, diskTickets, checkDailyReset } = useGameStore();

  useEffect(() => {
    checkDailyReset();
  }, [checkDailyReset]);

  // 슬롯 기반(4칸 고정) 파티 상태
  const [localParty, setLocalParty] = useState<(string | null)[]>(() => {
    const arr: (string | null)[] = [null, null, null, null];
    combatParty.forEach((id, i) => {
      if (i < 4) arr[i] = id;
    });
    return arr;
  });

  const [focusedCharId, setFocusedCharId] = useState<string | null>(null);
  const [combatMode, setCombatMode] = useState<'normal' | 'disk'>('normal');

  const handleRosterClick = (id: string) => {
    if (focusedCharId === id) {
      setFocusedCharId(null); // 선택 취소
    } else {
      setFocusedCharId(id); // 배치 준비 상태
    }
  };

  const handleSlotClick = (index: number) => {
    if (focusedCharId) {
      const newParty = [...localParty];
      const existingIndex = newParty.indexOf(focusedCharId);

      if (existingIndex !== -1) {
        // 이미 파티 내부에 있으면 위치 스왑
        const temp = newParty[index];
        newParty[index] = focusedCharId;
        newParty[existingIndex] = temp;
      } else {
        // 도감 풀에서 가져와서 슬롯에 덮어쓰기
        newParty[index] = focusedCharId;
      }
      setLocalParty(newParty);
      setFocusedCharId(null); // 배치 완료 후 포커스 해제
    } else {
      // 선택된 캐릭터가 없을 때 슬롯을 클릭하면 파티에서 제외
      if (localParty[index]) {
        const newParty = [...localParty];
        newParty[index] = null;
        setLocalParty(newParty);
      }
    }
  };
const handleClose = () => {
  // 창을 닫을 때도 현재 배치 상태를 전역 스토어에 저장
  const finalParty = localParty.map(id => id || "");
  if (finalParty.some(id => id !== "")) {
    setCombatParty(finalParty);
  }
  onClose();
};

const handleConfirm = () => {
  const finalParty = localParty.map(id => id || "");
  if (!finalParty.some(id => id !== "")) {
    onShowToast('최소 1명은 배치해야 합니다.');
    return;
  }
  if (combatMode === 'disk') {
    if (useGameStore.getState().diskTickets <= 0) {
      onShowToast('오늘의 디스크 방 입장권을 모두 소진했습니다.');
      return;
    }
  }
  setCombatParty(finalParty);
  onStartCombat(combatMode);
};
const ownedList = CHARACTER_DATA.filter(char => !!ownedCharacters[char.id]);

return (
  <div className="modal-overlay">
    <div className="modal-content party-setup-modal">
      <button className="close-btn" onClick={handleClose}>X</button>
        <div className="party-setup-layout">
          {/* 좌측: 현재 선택된 파티 (2x2) */}
          <div className="party-setup-left">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>배치도</h3>
              <div className="info-tooltip-wrapper" style={{ marginBottom: '2px' }}>
                <span className="info-icon" style={{ fontSize: '1rem' }}>❓</span>
                <div className="info-tooltip" style={{ width: '300px', top: '100%', left: '0', transform: 'none', marginLeft: '0px', marginTop: '10px', textAlign: 'left' }}>
                  보스의 공격은 전열(앞쪽 2명)에 집중될 확률이 훨씬 높습니다. (약 3배)<br/>
                  체력(매력)이 높은 사원을 전열에 배치하여 후열의 딜러를 보호하세요!
                </div>
              </div>
            </div>
            <div className="selected-party-grid">
              {[0, 1, 2, 3].map(index => {
                const charId = localParty[index];
                const charInfo = charId ? CHARACTER_DATA.find(c => c.id === charId) : null;
                const charStore = charId ? ownedCharacters[charId] : null;

                let atk = 0;
                let hp = 0;

                if (charStore && charId) {
                  const s = getEffectiveStats(useGameStore.getState(), charId);
                  const rebirthMult = 1.0 + (useGameStore.getState().permanentBuffs.hardTrainingLevel * 1.5);
                  const tierMult = getTierMultiplier(charId);
                  const hpMult = getHpMultiplier(charId);

                  let baseAtk = 0;
                  if (s.vocal <= 100) baseAtk = s.vocal * 10;
                  else baseAtk = 1000 + (Math.log10(s.vocal - 99) * 200);

                  const rawAtk = Math.floor(baseAtk * rebirthMult * tierMult);
                  
                  const burstMult = 1.5 + (Math.log10(s.rap + 10) * 0.3);
                  const burstChance = Math.min((s.sense * 1) / 100, 0.5 + (useGameStore.getState().permanentBuffs.ruleBreakerLevel * 0.01));
                  
                  // 평균 타격치(기댓값) 계산
                  atk = Math.floor(rawAtk * (1 - burstChance) + (rawAtk * burstMult * burstChance));
                  const totalStats = s.vocal + s.rap + s.dance + s.sense + s.charm;
                  hp = Math.floor((200 + s.charm * 30 + totalStats * 10) * rebirthMult * hpMult);
                }
                
                // 해당 슬롯 안의 캐릭터가 포커스 되어있는지 여부 (스왑 목적)
                const isFocused = focusedCharId === charId && charId !== null;

                return (
                  <div 
                    key={index} 
                    className={`party-slot-item ${charInfo ? 'filled' : 'empty'} ${isFocused ? 'slot-focused' : ''} ${focusedCharId && !charInfo ? 'slot-highlight' : ''}`}
                    onClick={() => handleSlotClick(index)}
                  >
                    {charInfo ? (
                      <div className={`setup-card-visual tier-border-${charInfo.tier}`}>
                        <div className="card-combat-stats">
                          <span>⚔️ {atk}</span>
                          <span>🛡️ {hp}</span>
                        </div>

                        <img src={getCardImageUrl(charInfo.id)} alt="character" className="setup-card-image" draggable={false} />
                        
                        <div className="setup-card-name-bar">{charInfo.name}</div>
                        {!focusedCharId && <div className="remove-overlay">제외</div>}
                        {isFocused && <div className="focus-overlay">이동할 슬롯 선택...</div>}
                      </div>
                    ) : (
                      <span className="empty-slot-text">{index % 2 === 1 ? '전열' : '후열'} Empty</span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="party-setup-actions">
              <div className="combat-mode-toggle" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button 
                  className={`mode-btn normal ${combatMode === 'normal' ? 'active' : ''}`}
                  onClick={() => setCombatMode('normal')}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: combatMode === 'normal' ? '2px solid #e74c3c' : '2px solid #555', background: combatMode === 'normal' ? 'rgba(231, 76, 60, 0.2)' : '#333', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ⚔️ 일반 스테이지
                </button>
                <button 
                  className={`mode-btn disk ${combatMode === 'disk' ? 'active' : ''}`}
                  onClick={() => {
                    if (currentStage < 60) {
                      onShowToast('황금 디스크의 방은 스테이지 60 이상부터 진입 가능합니다.');
                    } else if (useGameStore.getState().diskTickets <= 0) {
                      onShowToast('오늘의 입장권을 모두 소진했습니다.');
                    } else {
                      setCombatMode('disk');
                    }
                  }}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: combatMode === 'disk' ? '2px solid #f1c40f' : '2px solid #555', background: combatMode === 'disk' ? 'rgba(241, 196, 15, 0.2)' : '#333', color: currentStage >= 60 && useGameStore.getState().diskTickets > 0 ? 'white' : '#888', cursor: currentStage >= 60 && useGameStore.getState().diskTickets > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
                >
                  {currentStage >= 60 ? `💿 디스크 방 (${diskTickets}/3)` : '🔒 디스크 방 (St.60)'}
                </button>
              </div>
              <button className="start-combat-btn" onClick={handleConfirm}>
                {combatMode === 'normal' ? '전투 시작!' : '기록 측정 시작 (60초)'}
              </button>
            </div>
          </div>

          {/* 우측: 보유 캐릭터 풀 */}
          <div className="party-setup-right">
            <h3>보유 사원 목록</h3>
            <div className="setup-roster-grid">
              {ownedList.map(char => {
                const isSelectedInParty = localParty.includes(char.id);
                const isFocused = focusedCharId === char.id;
                
                const charStore = ownedCharacters[char.id];
                
                let atk = 0;
                let hp = 0;

                if (charStore) {
                  const s = getEffectiveStats(useGameStore.getState(), char.id);
                  const rebirthMult = 1.0 + (useGameStore.getState().permanentBuffs.hardTrainingLevel * 1.5);
                  const tierMult = getTierMultiplier(char.id);
                  const hpMult = getHpMultiplier(char.id);

                  let baseAtk = 0;
                  if (s.vocal <= 100) baseAtk = s.vocal * 10;
                  else baseAtk = 1000 + (Math.log10(s.vocal - 99) * 200);

                  const rawAtk = Math.floor(baseAtk * rebirthMult * tierMult);
                  
                  const burstMult = 1.5 + (Math.log10(s.rap + 10) * 0.3);
                  const burstChance = Math.min((s.sense * 1) / 100, 0.5 + (useGameStore.getState().permanentBuffs.ruleBreakerLevel * 0.01));
                  
                  // 평균 타격치(기댓값) 계산
                  atk = Math.floor(rawAtk * (1 - burstChance) + (rawAtk * burstMult * burstChance));
                  const totalStats = s.vocal + s.rap + s.dance + s.sense + s.charm;
                  hp = Math.floor((200 + s.charm * 30 + totalStats * 10) * rebirthMult * hpMult);
                }

                return (
                  <div 
                    key={char.id} 
                    className={`setup-card-container ${isSelectedInParty ? 'selected' : ''} ${isFocused ? 'focused' : ''}`}
                    onClick={() => handleRosterClick(char.id)}
                  >
                    <div className={`setup-card-visual tier-border-${char.tier}`}>
                      <div className="card-combat-stats">
                        <span>⚔️ {atk}</span>
                        <span>🛡️ {hp}</span>
                      </div>

                      <img src={getCardImageUrl(char.id)} alt="character" className="setup-card-image" draggable={false} />
                      
                      {isSelectedInParty && !isFocused && <div className="check-overlay">✔ 편성됨</div>}
                      {isFocused && <div className="focus-overlay">배치할 슬롯 클릭...</div>}
                    </div>
                    <div className="setup-card-name">{char.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}