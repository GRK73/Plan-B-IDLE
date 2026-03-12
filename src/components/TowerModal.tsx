import { useState } from 'react';
import { useGameStore, TowerArtifact } from '../store/gameStore';
import { CharacterSelectModal } from './CharacterSelectModal';
import { getCombatImageUrl, getEnemyImageUrl } from '../utils/assets';
import micIcon from '../assets/images/tower_mic.png';
import lightstickIcon from '../assets/images/tower_lightstick.png';
import playbuttonIcon from '../assets/images/tower_playbutton.png';
import blacklistIcon from '../assets/images/tower_blacklist.png';
import fallbackIcon from '../assets/images/tower.png';
import './TowerModal.css';

interface Props {
  onClose: () => void;
  onStartTowerCombat: () => void;
  onShowToast: (msg: string) => void;
}

const BOSS_TYPES = [
  { id: 'pengin', name: '어둠의 펜긴' },
  { id: 'chur', name: '어둠의 츄르' },
  { id: 'beeps', name: '어둠의 빕스' },
  { id: 'bambi', name: '어둠의 밤비' },
  { id: 'anggo', name: '어둠의 앙꼬' }
];

const ARTIFACT_INFO: Record<string, { name: string, desc: (lv: number) => string, img: any }> = {
  'mic': { name: '빛바랜 마이크', desc: (lv) => `공격력 +${lv * 20}% 증가`, img: micIcon },
  'lightstick': { name: '부서진 응원봉', desc: (lv) => `최대 체력 +${lv * 30}% 증가`, img: lightstickIcon },
  'playbutton': { name: '황금 재생 버튼', desc: (lv) => `초크리 확률 +${lv * 5}%, 배율 ${200 + lv * 50}%`, img: playbuttonIcon },
  'blacklist': { name: '사장의 블랙리스트', desc: (lv) => `보스 시작 체력 -${lv * 1}% 즉사`, img: blacklistIcon }
};

const formatDamage = (num: number) => {
  if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return Math.floor(num).toLocaleString();
};

export function TowerModal({ onClose, onStartTowerCombat, onShowToast }: Props) {
  const { 
    towerFloor, towerFragments, towerSlots, towerSlotLevels, towerArtifacts,
    saveToTowerSlot, upgradeTowerSlot, upgradeTowerArtifact
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'challenge' | 'slotUpgrade' | 'artifactUpgrade'>('challenge');
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);

  const getEnemyHp = (floor: number) => {
    let hp = 45000000;
    for (let i = 2; i <= floor; i++) {
      if (i % 5 === 0) hp *= 1.3;
      else hp *= 1.08;
    }
    return Math.floor(hp);
  };

  const handleSaveSlot = (charId: string) => {
    if (selectingSlot !== null) {
      saveToTowerSlot(selectingSlot, charId);
      onShowToast(`${selectingSlot + 1}번 슬롯에 스냅샷을 저장했습니다!`);
      setSelectingSlot(null);
    }
  };

  const handleUpgradeSlot = (index: number) => {
    const cost = Math.floor(200 * Math.pow(1.3, towerSlotLevels[index] - 1));
    if (towerFragments >= cost) {
      upgradeTowerSlot(index);
      onShowToast(`${index + 1}번 자리 오버클럭 완료!`);
    } else {
      onShowToast('탑의 파편이 부족합니다.');
    }
  };

  const handleUpgradeArtifact = (art: TowerArtifact) => {
    if (art.level >= art.maxLevel) {
      onShowToast('최대 레벨 도달. 중복 획득 시 한계 돌파됩니다.');
      return;
    }
    const cost = Math.floor(100 * Math.pow(1.5, art.level - 1));
    if (towerFragments >= cost) {
      upgradeTowerArtifact(art.id);
      onShowToast(`${ARTIFACT_INFO[art.id]?.name} 강화 완료!`);
    } else {
      onShowToast('탑의 파편이 부족합니다.');
    }
  };

  const isPartyReady = towerSlots.some(s => s !== null);
  const nextBossFloor = Math.ceil(towerFloor / 5) * 5;
  const isBossFloor = towerFloor % 5 === 0;

  return (
    <div className="tower-modal-overlay">
      <div className="tower-modal-content">
        <div className="tower-header">
          <h2>최강자의 탑</h2>
          <button className="tower-close-btn" onClick={onClose}>닫기</button>
        </div>

        <div className="tower-tabs">
          <button 
            className={`tower-tab ${activeTab === 'challenge' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenge')}
          >
            도전하기
          </button>
          <button 
            className={`tower-tab ${activeTab === 'slotUpgrade' ? 'active' : ''}`}
            onClick={() => setActiveTab('slotUpgrade')}
          >
            자리 오버클럭
          </button>
          <button 
            className={`tower-tab ${activeTab === 'artifactUpgrade' ? 'active' : ''}`}
            onClick={() => setActiveTab('artifactUpgrade')}
          >
            유물 강화
          </button>
        </div>

        <div className="tower-body">
          {activeTab === 'challenge' && (
            <div className="tower-challenge-layout">
              <div className="tower-challenge-left">
                <h3 style={{ color: '#ccc', marginBottom: '10px', marginTop: '0' }}>스냅샷 슬롯 (클릭하여 현재 파티원 박제)</h3>
                <div className="tower-slots-container">
                  {towerSlots.map((slot, idx) => {
                    const roleText = (idx === 1 || idx === 3) ? '전열 (HP 집중)' : '후열 (딜러)';
                    return (
                      <div key={idx} className={`tower-slot ${slot ? 'filled' : 'empty'}`} onClick={() => setSelectingSlot(idx)}>
                        <div className="tower-slot-role">
                          {roleText}
                          <br/>Lv.{towerSlotLevels[idx]}
                        </div>
                        {slot ? (
                          <>
                            <img src={getCombatImageUrl(slot.id, 'ready')} alt="char" className="tower-slot-char-img" />
                            <div className="tower-slot-info">
                              <div style={{ color: '#f1c40f', fontWeight: 'bold' }}>{slot.name}</div>
                              <div>ATK: {formatDamage(Math.floor(slot.atk * (1 - slot.burstChance) + (slot.atk * slot.burstMult * slot.burstChance)))}</div>
                              <div>HP: {formatDamage(slot.maxHp)}</div>
                            </div>
                          </>
                        ) : (
                          <div>비어있음<br/>(클릭하여 기록)</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="tower-challenge-right">
                <div className="tower-info-box" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="tower-floor-text">현재 도전: {towerFloor}층 {isBossFloor ? '(BOSS)' : ''}</div>
                  
                  {(() => {
                    const bossId = isBossFloor ? 'bambi' : BOSS_TYPES[(towerFloor - 1) % BOSS_TYPES.length].id;
                    const bossName = isBossFloor ? '분노한 어둠의 밤비' : `분노한 어둠의 ${BOSS_TYPES[(towerFloor - 1) % BOSS_TYPES.length].name.split(' ')[1] || BOSS_TYPES[(towerFloor - 1) % BOSS_TYPES.length].name}`;
                    
                    return (
                      <div style={{ margin: '20px 0', textAlign: 'center' }}>
                        <img 
                          src={getEnemyImageUrl(bossId, 'stay')} 
                          alt="boss" 
                          style={{ 
                            width: '150px', 
                            height: '150px', 
                            objectFit: 'contain', 
                            filter: 'drop-shadow(0 0 10px rgba(255,0,0,0.5)) hue-rotate(-20deg) saturate(150%)',
                            marginBottom: '10px'
                          }} 
                        />
                        <div style={{ color: '#ff4757', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '1px 1px 2px black' }}>
                          {bossName}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="tower-enemy-info" style={{ marginTop: 'auto' }}>
                    예상 적 체력: <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{formatDamage(getEnemyHp(towerFloor))}</span><br/>
                    <span style={{ fontSize: '0.9rem' }}>(다음 유물 획득까지 {nextBossFloor - towerFloor + (isBossFloor ? 5 : 0)}층 남음)</span>
                  </div>
                </div>

                <button 
                  className="tower-start-btn" 
                  disabled={!isPartyReady}
                  onClick={onStartTowerCombat}
                >
                  {isPartyReady ? '등반 시작' : '슬롯에 캐릭터를 기록하세요'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'slotUpgrade' && (
            <>
              <div className="tower-fragments-display">
                보유 재화: 💎 <span style={{ color: '#f1c40f' }}>{towerFragments.toLocaleString()}</span> 파편
              </div>

              <div className="tower-section-title">자리 오버클럭 (슬롯 강화)</div>
              <div className="tower-upgrades-grid">
                {[
                  { name: '1번 슬롯 (후열 딜러)', desc: '배치된 캐릭터가 주는 데미지 증가', effect: (lv: number) => `+${lv * 15}%` },
                  { name: '2번 슬롯 (전열 탱커)', desc: '배치된 캐릭터가 받는 데미지 감소', effect: (lv: number) => `-${Math.min(80, lv * 5)}%` },
                  { name: '3번 슬롯 (후열 딜러)', desc: '배치된 캐릭터가 주는 데미지 증가', effect: (lv: number) => `+${lv * 15}%` },
                  { name: '4번 슬롯 (전열 탱커)', desc: '배치된 캐릭터가 받는 데미지 감소', effect: (lv: number) => `-${Math.min(80, lv * 5)}%` }
                ].map((slot, idx) => {
                  const currentLv = towerSlotLevels[idx];
                  const cost = Math.floor(200 * Math.pow(1.3, currentLv - 1));
                  return (
                    <div key={idx} className="tower-upgrade-card">
                      <div className="tower-upgrade-header">
                        <span className="tower-upgrade-name">{slot.name}</span>
                        <span className="tower-upgrade-level">Lv.{currentLv}</span>
                      </div>
                      <div className="tower-upgrade-desc">
                        {slot.desc} (현재: {slot.effect(currentLv - 1)} &rarr; <span style={{ color: '#2ecc71' }}>{slot.effect(currentLv)}</span>)
                      </div>
                      <button 
                        className="tower-upgrade-btn"
                        disabled={towerFragments < cost}
                        onClick={() => handleUpgradeSlot(idx)}
                      >
                        강화 ({cost.toLocaleString()} 파편)
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'artifactUpgrade' && (
            <>
              <div className="tower-fragments-display">
                보유 재화: 💎 <span style={{ color: '#f1c40f' }}>{towerFragments.toLocaleString()}</span> 파편
              </div>
              <div className="tower-section-title">보유 유물</div>
              <div className="tower-artifacts-grid">
                {towerArtifacts.length === 0 ? (
                  <div style={{ gridColumn: 'span 4', textAlign: 'center', color: '#888', padding: '20px' }}>
                    보유한 유물이 없습니다. 5층 보스를 처치하여 획득하세요.
                  </div>
                ) : (
                  towerArtifacts.map((art) => {
                    const info = ARTIFACT_INFO[art.id] || { name: '알 수 없는 유물', desc: () => '', img: fallbackIcon };
                    const isMax = art.level >= art.maxLevel;
                    const cost = Math.floor(100 * Math.pow(1.5, art.level - 1));

                    return (
                      <div key={art.id} className="tower-artifact-card">
                        <img 
                          src={info.img} 
                          alt={art.id} 
                          className="tower-artifact-img" 
                          onError={(e) => { (e.target as HTMLImageElement).src = fallbackIcon; }}
                        />
                        <div className="tower-artifact-name">{info.name}</div>
                        <div className="tower-upgrade-level" style={{ marginBottom: '5px' }}>Lv.{art.level} / Max.{art.maxLevel}</div>
                        <div className="tower-artifact-desc">{info.desc(art.level)}</div>
                        
                        <button 
                          className="tower-upgrade-btn"
                          style={{ width: '100%' }}
                          disabled={isMax || towerFragments < cost}
                          onClick={() => handleUpgradeArtifact(art)}
                        >
                          {isMax ? '한계 돌파 필요' : `강화 (${cost.toLocaleString()})`}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectingSlot !== null && (
        <CharacterSelectModal
          title={`${selectingSlot + 1}번 슬롯에 기록할 사원을 선택하세요`}
          onClose={() => setSelectingSlot(null)}
          onSelect={handleSaveSlot}
          skillTargetMode="tower"
        />
      )}
    </div>
  );
}