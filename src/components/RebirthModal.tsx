import { useState } from 'react';
import { useGameStore, PermanentBuffs } from '../store/gameStore';
import './RebirthModal.css';

interface Props {
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

type BuffKey = keyof PermanentBuffs;

interface BuffOption {
  key: BuffKey;
  id: string;
  title: string;
  icon: string;
  description: string;
  getPreview: (level: number) => string;
  getCost: (level: number) => number;
}

export function RebirthModal({ onClose, onShowToast }: Props) {
  const { tat, permanentBuffs, buyBuff } = useGameStore();

  const buffOptions: BuffOption[] = [
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
      getPreview: (level) => `+${level * 50}%`,
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
      getPreview: (level) => `전투 스탯 +${level * 20}%`,
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
      title: '안티 팬덤 (공격력 너프)',
      icon: '🛡️',
      description: '안티 팬덤을 형성하여 적 보스의 공격력을 영구적으로 약화시킵니다. (복리 감소)',
      getPreview: (level) => `공격 배율 x${Math.pow(0.9, level).toFixed(2)}`,
      getCost: (level) => Math.floor(100 * Math.pow(level + 1, 1.5))
    }
  ];

  const [selectedBuffId, setSelectedBuffId] = useState<string>(buffOptions[0].id);

  const selectedOption = buffOptions.find(o => o.id === selectedBuffId) || buffOptions[0];
  const currentLevel = permanentBuffs[selectedOption.key];
  const cost = selectedOption.getCost(currentLevel);

  const handleBuy = () => {
    if (tat < cost) {
      onShowToast('탓(Tat)이 부족합니다!');
      return;
    }
    buyBuff(selectedOption.key);
    onShowToast('영구 버프 구매 완료!');
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 2000 }}>
      <div className="modal-content rebirth-modal-split">
        <button className="close-btn" onClick={onClose}>X</button>
        <h2 className="rebirth-title">탓 상점</h2>
        <div className="tat-balance">보유 탓(Tat): <span>{tat.toLocaleString()}</span></div>

        <div className="rebirth-body-split">
          {/* 좌측 그리드 */}
          <div className="buff-grid-compact">
            {buffOptions.map(opt => {
              const lvl = permanentBuffs[opt.key];
              const isSelected = selectedBuffId === opt.id;
              return (
                <div 
                  key={opt.id} 
                  className={`compact-buff-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedBuffId(opt.id)}
                >
                  <div className="buff-icon">{opt.icon}</div>
                  <div className="buff-title-sm">{opt.title}</div>
                  <div className="buff-level-sm">Lv.{lvl}</div>
                </div>
              );
            })}
          </div>

          {/* 우측 설명창 */}
          <div className="buff-details-panel">
            <div className="detail-icon">{selectedOption.icon}</div>
            <h3 className="detail-title">{selectedOption.title}</h3>
            <p className="detail-desc">{selectedOption.description}</p>
            
            <div className="detail-stats">
              <div className="stat-row">
                <span>현재 능력치 </span>
                <span className="current-val">{selectedOption.getPreview(currentLevel)}</span>
              </div>
              <div className="stat-row">
                <span>다음 레벨업 </span>
                <span className="next-val">{selectedOption.getPreview(currentLevel + 1)}</span>
              </div>
            </div>

            <button 
              className="buy-btn-large" 
              onClick={handleBuy} 
              disabled={tat < cost}
            >
              성장 ({cost.toLocaleString()} 탓)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
