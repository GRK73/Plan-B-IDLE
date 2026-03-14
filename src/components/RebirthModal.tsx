import { useState } from 'react';
import { useGameStore, PermanentBuffs, AdvancedBuffs, TatEquips } from '../store/gameStore';
import * as TAT_EQUIP_DATA from '../data/tatEquipData';
import equip1Img from '../assets/images/equip1.png';
import equip2Img from '../assets/images/equip2.png';
import equip3Img from '../assets/images/equip3.png';
import equip4Img from '../assets/images/equip4.png';
import './RebirthModal.css';

interface Props {
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

type BuffKey = keyof PermanentBuffs;
type AdvancedBuffKey = keyof AdvancedBuffs;

interface BuffOption {
  key: BuffKey | AdvancedBuffKey | 'equip1' | 'equip2' | 'equip3' | 'equip4';
  id: string;
  title: string;
  icon: string;
  description: string;
  getPreview: (level: number) => string;
  getCost: (level: number) => number;
  isAdvanced?: boolean;
  isEquip?: boolean;
  equipIndex?: 1 | 2 | 3 | 4;
  image?: string;
  bonusArr?: number[];
  suffix?: string;
}

export function RebirthModal({ onClose, onShowToast }: Props) {
  const { 
    tat, namTat, permanentBuffs, advancedBuffs, tatEquips, 
    buyBuff, buyAdvancedBuff, unlockTatEquip, upgradeTatEquip 
  } = useGameStore();
  const [activeTab, setActiveTab] = useState<'tat' | 'namTat' | 'equip'>('tat');
  
  // Animation state for equipment upgrades
  const [animatingEquip, setAnimatingEquip] = useState<number | null>(null);
  const [animResultMode, setAnimResultMode] = useState<'success' | 'drop' | null>(null);

  const buffOptions: BuffOption[] = [
    // --- 탓 상점 (기존) ---
    {
      key: 'startPoongLevel',
      id: 'startPoongLevel',
      title: '초기 자본금 지원',
      icon: '💰',
      description: '환생 시 지급되는 기본 1만 풍 이외에, 추가 시작 자금을 늘립니다.',
      getPreview: (level) => `+${level}만 풍`,
      getCost: (level) => Math.floor(10 * (level + 1))
    },
    {
      key: 'tpsMultiplierLevel',
      id: 'tpsMultiplierLevel',
      title: '패스트 트랙',
      icon: '🚀',
      description: '초당 최종 풍 생산량(TPS)을 영구적으로 증가시킵니다.',
      getPreview: (level) => `+${level * 200}%`,
      getCost: (level) => Math.floor(30 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'ruleBreakerLevel',
      id: 'ruleBreakerLevel',
      title: '룰 브레이커',
      icon: '🔥',
      description: '방송감(크리티컬 확률) 하드캡 한계를 크게 늘리고, 치명타 데미지 배율을 높입니다.',
      getPreview: (level) => `캡 ${50 + level * 5}% / 치피 +${(level * 0.5).toFixed(1)}x`,
      getCost: (level) => Math.floor(50 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'hardTrainingLevel',
      id: 'hardTrainingLevel',
      title: '하드트레이닝',
      icon: '💪',
      description: '아군 파티의 기본 전투력과 체력을 퍼센트로 증가시켜 줍니다.',
      getPreview: (level) => `전투 스탯 +${level * 150}%`,
      getCost: (level) => Math.floor(30 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'bossSkillBoostLevel',
      id: 'bossSkillBoostLevel',
      title: '숙제 스탯 펌핑',
      icon: '📖',
      description: '사장 스킬(빕어의 숙제) 발동 시 영구적으로 오르는 랜덤 1개 스탯 상승폭을 대폭 높입니다.',
      getPreview: (level) => `스탯 펌핑 +${30 + level * 30}`,
      getCost: (level) => Math.floor(80 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'ceoSkillBoostLevel',
      id: 'ceoSkillBoostLevel',
      title: '대표의 편애',
      icon: '👑',
      description: '대표 스킬(대표의 가호) 연결 시 추가되는 모든 스탯 버프량을 대폭 증가시킵니다.',
      getPreview: (level) => `모든 스탯 버프 +${10 + level * 20}`,
      getCost: (level) => Math.floor(100 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'gachaDiscountLevel',
      id: 'gachaDiscountLevel',
      title: '모집 비용 지연',
      icon: '🎫',
      description: '천문학적으로 증가하는 가차 비용의 지수 함수 계산 시점을 뒤로 늦춥니다. (초후반 필수)',
      getPreview: (level) => `비용 계산 -${level * 50}회 지연`,
      getCost: (level) => Math.floor(80 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'vipGachaLevel',
      id: 'vipGachaLevel',
      title: 'VIP 멤버십',
      icon: '💎',
      description: '기본 C등급 확률을 대폭 낮추고 정식 멤버(SR) 획득 고정 확률을 늘립니다.',
      getPreview: (level) => `SR 등장 고정 +${(level * 1.0).toFixed(1)}%`,
      getCost: (level) => Math.floor(150 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'enemyHpNerfLevel',
      id: 'enemyHpNerfLevel',
      title: '방송 억까 (체력 너프)',
      icon: '📉',
      description: '지속적인 방송 견제로 적 보스의 최대 체력을 영구적으로 낮춥니다. (복리 감소)',
      getPreview: (level) => `체력 배율 x${Math.pow(0.9, level).toFixed(2)}`,
      getCost: (level) => Math.floor(100 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'enemyAtkNerfLevel',
      id: 'enemyAtkNerfLevel',
      title: '악플러 차단 (공격력 감소)',
      icon: '🛡️',
      description: '악플러들의 공격력을 영구적으로 감소시킵니다. (곱연산)',
      getPreview: (level) => `공격력 배율 x${Math.pow(0.9, level).toFixed(2)}`,
      getCost: (level) => Math.floor(100 * Math.pow(level + 1, 1.5))
    },
    {
      key: 'oshiBoostLevel',
      id: 'oshiBoostLevel',
      title: '최애 지정 등급 확장',
      icon: '🌟',
      description: '최애로 지정할 수 있는 사원의 등급을 확장합니다. (1Lv: R등급 가능, 2Lv: SR등급 가능)',
      getPreview: (level) => level === 0 ? 'C, U 등급' : level === 1 ? 'C, U, R 등급' : level === 2 ? '모든 등급' : 'MAX',
      getCost: (level) => level >= 2 ? Infinity : 150 * (level + 1)
    },
    // --- 탓 장비 (신규) ---
    {
      key: 'equip1' as any,
      id: 'equip1',
      title: '[음향기기] 플래티넘 오디오 인터페이스',
      icon: '🎙️',
      description: '모든 사원의 공격력을 영구적으로 증폭시킵니다. (10강, 20강 하락 방지 방어선)',
      getPreview: (level) => `공증 +${TAT_EQUIP_DATA.EQUIP1_ATK_BONUS[level]}%`,
      getCost: () => TAT_EQUIP_DATA.TAT_EQUIP_ENHANCE_COST,
      isEquip: true,
      equipIndex: 1,
      image: equip1Img,
      bonusArr: TAT_EQUIP_DATA.EQUIP1_ATK_BONUS,
      suffix: '% 공증'
    },
    {
      key: 'equip2' as any,
      id: 'equip2',
      title: '[무대장비] 다이아몬드 인이어 모니터',
      icon: '🎧',
      description: '모든 사원의 최대 체력을 영구적으로 증폭시킵니다. (10강, 20강 하락 방지 방어선)',
      getPreview: (level) => `체증 +${TAT_EQUIP_DATA.EQUIP2_HP_BONUS[level]}%`,
      getCost: () => TAT_EQUIP_DATA.TAT_EQUIP_ENHANCE_COST,
      isEquip: true,
      equipIndex: 2,
      image: equip2Img,
      bonusArr: TAT_EQUIP_DATA.EQUIP2_HP_BONUS,
      suffix: '% 체증'
    },
    {
      key: 'equip3' as any,
      id: 'equip3',
      title: '[굿즈] 홀로그램 시그니처 펜라이트',
      icon: '🪄',
      description: '극크리티컬 발생 시 원래 곱해지던 데미지를 더욱 영구적으로 증폭시킵니다. (10강, 20강 하락 방지 방어선)',
      getPreview: (level) => `극크리증 +${TAT_EQUIP_DATA.EQUIP3_CRIT_BONUS[level]}%`,
      getCost: () => TAT_EQUIP_DATA.TAT_EQUIP_ENHANCE_COST,
      isEquip: true,
      equipIndex: 3,
      image: equip3Img,
      bonusArr: TAT_EQUIP_DATA.EQUIP3_CRIT_BONUS,
      suffix: '% 극크리증'
    },
    {
      key: 'equip4' as any,
      id: 'equip4',
      title: '[패스] 블랙카드 VVIP 프리패스',
      icon: '💳',
      description: '모든 종류의 5대 스탯 베이스 체급을 퍼센트(%) 단위로 뻥튀기합니다. (10강, 20강 하락 방지 방어선)',
      getPreview: (level) => `스탯 뻥튀기 +${TAT_EQUIP_DATA.EQUIP4_STAT_BONUS[level]}%`,
      getCost: () => TAT_EQUIP_DATA.TAT_EQUIP_ENHANCE_COST,
      isEquip: true,
      equipIndex: 4,
      image: equip4Img,
      bonusArr: TAT_EQUIP_DATA.EQUIP4_STAT_BONUS,
      suffix: '% 스탯 뻥튀기'
    },
    // --- 남탓 상점 (심화) ---
    {
      key: 'namTatGachaDiscountLevel',
      id: 'namTatGachaDiscountLevel',
      title: '내 잘못은 없어',
      icon: '💸',
      description: '가챠(모집) 시 요구되는 풍 비용을 %로 직접 할인합니다.',
      getPreview: (level) => level >= 10 ? 'MAX (50% 할인)' : `비용 ${level * 5}% 할인`,
      getCost: (level) => level >= 10 ? Infinity : 10 + level * 20,
      isAdvanced: true
    },
    {
      key: 'namTatAspdBoostLevel',
      id: 'namTatAspdBoostLevel',
      title: '손가락이 느린 탓',
      icon: '⚡',
      description: '전투 시 모든 파티원(탑 포함)의 최종 공격 속도를 곱연산으로 증가시킵니다.',
      getPreview: (level) => `공속 +${level * 10}%`,
      getCost: (level) => 20 + level * 30,
      isAdvanced: true
    },
    {
      key: 'namTatTpsBoostLevel',
      id: 'namTatTpsBoostLevel',
      title: '경제가 안 좋은 탓',
      icon: '🏭',
      description: '초당 전체 풍 생산량(TPS) 최종 결과값을 % 단위로 곱연산 증폭시킵니다.',
      getPreview: (level) => `최종 TPS +${level * 50}%`,
      getCost: (level) => 50 + level * 50,
      isAdvanced: true
    },
    {
      key: 'namTatHyperCritLevel',
      id: 'namTatHyperCritLevel',
      title: '억까 당한 탓',
      icon: '💥',
      description: '초크리티컬 발동 시 한 번 더 배율이 곱해지는 [극크리티컬]을 해방합니다.',
      getPreview: (level) => `확률 ${level * 5}% (x3)`,
      getCost: (level) => 100 + level * 100,
      isAdvanced: true
    },
    {
      key: 'namTatDiskTimeLevel',
      id: 'namTatDiskTimeLevel',
      title: '비겁한 변명',
      icon: '⏳',
      description: '황금 디스크 방 제한 시간을 늘리고, 환생 직후 시작 스테이지를 점프합니다.',
      getPreview: (level) => `시간+${level * 3}초 / 스킵 ${1 + level * 5}층`,
      getCost: (level) => 30 + level * 30,
      isAdvanced: true
    }
  ];

  const currentOptions = buffOptions.filter(o => 
    activeTab === 'equip' ? o.isEquip :
    activeTab === 'namTat' ? o.isAdvanced && !o.isEquip : 
    !o.isAdvanced && !o.isEquip
  );
  
  // Update selected ID when tab changes if it's not valid for current tab
  const [selectedBuffId, setSelectedBuffId] = useState<string>(currentOptions[0].id);
  const selectedOption = buffOptions.find(o => o.id === selectedBuffId) || currentOptions[0];
  
  // Calculate current level based on active tab
  let currentLevel = 0;
  let isMax = false;
  let isUnlocked = true;
  let equipProbs = { s: 0, k: 100, d: 0 };
  
  if (activeTab === 'equip') {
    const stateKey = `equip${selectedOption.equipIndex}` as keyof TatEquips;
    const stateObj = tatEquips[stateKey];
    currentLevel = stateObj.level;
    isMax = currentLevel >= 30;
    isUnlocked = stateObj.unlocked;
    equipProbs = TAT_EQUIP_DATA.TAT_EQUIP_PROBS[currentLevel] || {s:0,k:100,d:0};
  } else if (activeTab === 'namTat') {
    currentLevel = advancedBuffs[selectedOption.key as AdvancedBuffKey] || 0;
  } else {
    currentLevel = permanentBuffs[selectedOption.key as BuffKey] || 0;
  }
  
  const cost = activeTab === 'equip' 
    ? (isUnlocked ? TAT_EQUIP_DATA.TAT_EQUIP_ENHANCE_COST : TAT_EQUIP_DATA.TAT_EQUIP_UNLOCK_COST)
    : selectedOption.getCost(currentLevel);

  const handleBuy = () => {
    if (activeTab === 'namTat') {
      if (namTat < cost) {
        onShowToast('남탓이 부족합니다!');
        return;
      }
      buyAdvancedBuff(selectedOption.key as AdvancedBuffKey);
    } else if (activeTab === 'tat') {
      if (tat < cost) {
        onShowToast('탓(Tat)이 부족합니다!');
        return;
      }
      buyBuff(selectedOption.key as BuffKey);
    }
    onShowToast('영구 버프 구매 완료!');
  };

  const handleEquipUnlock = (index: 1|2|3|4) => {
    if (tat < TAT_EQUIP_DATA.TAT_EQUIP_UNLOCK_COST) {
      onShowToast('탓(Tat)이 부족합니다!');
      return;
    }
    unlockTatEquip(index);
    onShowToast('장비가 해금되었습니다!');
  };

  const handleEquipUpgrade = (index: 1|2|3|4, currentLevel: number) => {
    if (animatingEquip !== null) return;
    if (tat < TAT_EQUIP_DATA.TAT_EQUIP_ENHANCE_COST) {
      onShowToast('탓(Tat)이 부족합니다!');
      return;
    }
    
    // Start shake animation
    setAnimatingEquip(index);
    setAnimResultMode(null);
    
    setTimeout(() => {
      const probs = TAT_EQUIP_DATA.TAT_EQUIP_PROBS[currentLevel] || {s:0, k:100, d:0};
      const rand = Math.random() * 100;
      let resultMode: 'success' | 'drop' | null = null;
      let action: 's'|'m'|'d' = 'm';
      
      if (rand < probs.s) {
        action = 's';
        resultMode = 'success';
      } else if (rand < probs.s + probs.k) {
        action = 'm';
        resultMode = null; // No special visual except stopping shake
      } else {
        action = 'd';
        resultMode = 'drop';
      }
      
      upgradeTatEquip(index, action);
      setAnimResultMode(resultMode);
      
      if (action === 's') onShowToast('강화 성공! ✨');
      else if (action === 'd') onShowToast('강화 실패... 등급이 하락했습니다 📉');
      else onShowToast('강화 실패... 등급이 유지됩니다 💦');
      
      // Clear result animation state after short delay
      setTimeout(() => {
        setAnimatingEquip(null);
        setAnimResultMode(null);
      }, 600);
      
    }, 1500); // 1.5s delay
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content rebirth-modal-split">
        <div className="rebirth-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <div className="rebirth-tabs" style={{ margin: 0, gap: '0' }}>
            <button 
              className={`rebirth-tab-btn ${activeTab === 'tat' ? 'active' : ''}`} 
              style={{ borderRadius: '8px 0 0 8px', borderRight: '1px solid #2c3e50', padding: '10px 20px', fontSize: '1.1rem' }}
              onClick={() => { setActiveTab('tat'); setSelectedBuffId('startPoongLevel'); }}
            >
              탓 상점
            </button>
            <button 
              className={`rebirth-tab-btn ${activeTab === 'namTat' ? 'active' : ''}`} 
              style={{ borderRadius: '0', borderRight: '1px solid #2c3e50', padding: '10px 20px', fontSize: '1.1rem' }}
              onClick={() => { setActiveTab('namTat'); setSelectedBuffId('namTatGachaDiscountLevel'); }}
            >
              남탓 상점
            </button>
            <button 
              className={`rebirth-tab-btn ${activeTab === 'equip' ? 'active' : ''}`} 
              style={{ borderRadius: '0 8px 8px 0', padding: '10px 20px', fontSize: '1.1rem' }}
              onClick={() => { setActiveTab('equip'); setSelectedBuffId('equip1'); }}
            >
              탓 장비
            </button>
          </div>
          <button className="close-btn" onClick={onClose} style={{ position: 'relative', top: 'auto', right: 'auto' }}>X</button>
        </div>

        <div className="tat-balance">
          {activeTab === 'namTat' ? `보유 남탓(Nam-Tat): ` : `보유 탓(Tat): `}
          <span style={{ color: activeTab === 'namTat' ? '#e74c3c' : '#f1c40f' }}>
            {activeTab === 'namTat' ? namTat.toLocaleString() : tat.toLocaleString()}
          </span>
        </div>

        <div className="rebirth-body-split">
          {/* 좌측 그리드 */}
          <div className="buff-grid-compact">
            {currentOptions.map(opt => {
              let lvl = 0;
              let isLocked = false;
              if (activeTab === 'equip') {
                  const st = tatEquips[`equip${opt.equipIndex}` as keyof TatEquips];
                  lvl = st.level;
                  isLocked = !st.unlocked;
              } else if (activeTab === 'namTat') {
                  lvl = advancedBuffs[opt.key as AdvancedBuffKey] || 0;
              } else {
                  lvl = permanentBuffs[opt.key as BuffKey] || 0;
              }
              
              const isSelected = selectedBuffId === opt.id;
              
              
              return (
                <div
                  key={opt.id}
                  className={`compact-buff-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedBuffId(opt.id)}
                >
                  <div className="buff-icon" style={{filter: isLocked ? 'grayscale(100%)' : 'none'}}>
                     {activeTab === 'equip' ? <img src={opt.image} alt="equip" style={{width: '40px', height: '40px', objectFit: 'contain'}} /> : opt.icon}
                  </div>
                  <div className="buff-title-sm">{opt.title}</div>
                  <div className="buff-level-sm">{isLocked ? '미해금' : `Lv.${lvl}`}</div>
                </div>
              );
            })}
          </div>

          {/* 우측 설명창 */}
          <div className={`buff-details-panel ${activeTab === 'equip' && animatingEquip === selectedOption.equipIndex && animResultMode === 'drop' ? 'equip-card-drop-anim' : ''}`}>
            {(() => {
              let iconAnimClass = '';
              if (activeTab === 'equip' && animatingEquip === selectedOption.equipIndex) {
                  if (animResultMode === 'success') iconAnimClass = 'equip-anim-success';
                  else if (animResultMode === 'drop') iconAnimClass = 'equip-anim-drop';
                  else iconAnimClass = 'equip-anim-shake';
              }
              return (
                <div className={`detail-icon ${iconAnimClass}`} style={{filter: !isUnlocked && activeTab === 'equip' ? 'grayscale(100%)' : 'none'}}>
                  {activeTab === 'equip' ? <img src={selectedOption.image} alt="equip" style={{width: '80px', height: '80px', objectFit: 'contain'}} className="equip-img" /> : selectedOption.icon}
                </div>
              );
            })()}
            
            {activeTab === 'equip' ? (
              isUnlocked && !isMax ? (
                <div className="equip-probs" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center', gap: '15px', background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '8px', fontSize: '1.05rem' }}>
                  <span className="prob-s" style={{ color: '#2ecc71', fontWeight: 'bold' }}>성공 {equipProbs.s}%</span>
                  <span className="prob-k" style={{ color: '#aaa' }}>유지 {equipProbs.k}%</span>
                  <span className="prob-d" style={{ color: '#e74c3c', fontWeight: 'bold' }}>하락 {equipProbs.d}%</span>
                </div>
              ) : isUnlocked && isMax ? (
                <h3 className="detail-title" style={{ color: '#f1c40f' }}>MAX LEVEL</h3>
              ) : (
                <h3 className="detail-title">미해금 장비</h3>
              )
            ) : (
              <h3 className="detail-title">{selectedOption.title}</h3>
            )}
            
            <p className="detail-desc">{selectedOption.description}</p>

            <div className="detail-stats" style={{ marginBottom: activeTab === 'equip' ? '15px' : '20px' }}>
              <div className="stat-row">
                <span>{activeTab === 'equip' ? `${currentLevel}강 ` : '현재 능력치 '}</span>
                <span className="current-val">{!isUnlocked ? '효과 없음' : selectedOption.getPreview(currentLevel)}</span>
              </div>
              <div className="stat-row">
                <span>{activeTab === 'equip' ? `${currentLevel + 1}강 ` : '다음 레벨업 '}</span>
                <span className="next-val">{isMax ? 'MAX' : selectedOption.getPreview(currentLevel + 1)}</span>
              </div>
            </div>
            
            {activeTab === 'equip' && !isUnlocked ? (
              <button
                className="buy-btn-large unlock"
                onClick={() => handleEquipUnlock(selectedOption.equipIndex as any)}
                disabled={tat < TAT_EQUIP_DATA.TAT_EQUIP_UNLOCK_COST}
                style={{ background: '#8e44ad' }}
              >
                해금 ({TAT_EQUIP_DATA.TAT_EQUIP_UNLOCK_COST.toLocaleString()} 탓)
              </button>
            ) : (
              <button
                className="buy-btn-large"
                style={{ background: activeTab === 'equip' ? '#27ae60' : undefined }}
                onClick={activeTab === 'equip' ? () => handleEquipUpgrade(selectedOption.equipIndex as any, currentLevel) : handleBuy}
                disabled={
                  (activeTab === 'tat' && tat < cost) || 
                  (activeTab === 'namTat' && namTat < cost) || 
                  (activeTab === 'equip' && (tat < cost || animatingEquip !== null)) || 
                  cost === Infinity || isMax
                }
              >
                {cost === Infinity || isMax ? '최대 레벨 도달' : activeTab === 'equip' ? `강화 시도 (${TAT_EQUIP_DATA.TAT_EQUIP_ENHANCE_COST.toLocaleString()} 탓)` : `성장 (${cost.toLocaleString()} ${activeTab === 'tat' ? '탓' : '남탓'})`}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
