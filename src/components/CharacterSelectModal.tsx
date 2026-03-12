import { useGameStore, getEffectiveStats, getTierMultiplier, getHpMultiplier } from '../store/gameStore';
import { CHARACTER_DATA, Tier } from '../data/characters';
import { getCardImageUrl } from '../utils/assets';
import './CharacterSelectModal.css';

interface Props {
  title: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  allowedTiers?: Tier[];
  skillTargetMode?: 'boss' | 'ceo' | 'oshi' | 'tower' | null;
}

export function CharacterSelectModal({ title, onClose, onSelect, allowedTiers, skillTargetMode }: Props) {
  const { ownedCharacters, permanentBuffs } = useGameStore();

  const ownedList = CHARACTER_DATA.filter(char => {
    if (!ownedCharacters[char.id]) return false;
    if (allowedTiers && !allowedTiers.includes(char.tier)) return false;
    return true;
  });

  const getTooltipContent = () => {
    switch (skillTargetMode) {
      case 'boss':
        return (
          <>
            사장 스킬 발동 시, 선택한 사원의 랜덤 스탯 하나와 최대 한계치가 영구적으로 대폭 증가합니다.
          </>
        );
      case 'ceo':
        return (
          <>
            대표 스킬 발동 시, 선택한 사원의 모든 스탯이 영구적으로 추가 보너스를 받습니다.
          </>
        );
      case 'tower':
        return (
          <>
            선택한 사원의 현재 모든 능력치(버프 포함)를 탑의 해당 슬롯에 영구 기록합니다. 환생해도 유지됩니다!
          </>
        );
      case 'oshi':
      default:
        return (
          <>
            최애로 지정된 사원은 초당 풍 생산량(TPS)과 전투 스탯 효율이 극대화됩니다.<br/>
            기본 선택 가능 등급: C, U<br/>
            (환생 상점에서 탓을 소모하여 R, SR 등급까지 확장 가능)
          </>
        );
    }
  };

  const getCharacterCombatStats = (charId: string) => {
    const s = getEffectiveStats(useGameStore.getState(), charId);
    const rebirthMult = 1.0 + (permanentBuffs.hardTrainingLevel * 1.5);
    const tierMult = getTierMultiplier(charId);
    const hpMult = getHpMultiplier(charId);

    let baseAtk = 0;
    if (s.vocal <= 100) baseAtk = s.vocal * 10;
    else baseAtk = 1000 + (Math.log10(s.vocal - 99) * 200);

    const rawAtk = Math.floor(baseAtk * rebirthMult * tierMult);
    
    const burstMult = 1.5 + (Math.log10(s.rap + 10) * 0.3);
    const burstChance = Math.min((s.sense * 1) / 100, 0.5 + (permanentBuffs.ruleBreakerLevel * 0.01));
    
    const atk = Math.floor(rawAtk * (1 - burstChance) + (rawAtk * burstMult * burstChance));
    const totalStats = s.vocal + s.rap + s.dance + s.sense + s.charm;
    const hp = Math.floor((200 + s.charm * 30 + totalStats * 10) * rebirthMult * hpMult);
    
    return { atk, hp };
  };

  const formatStat = (num: number) => {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '700px', maxWidth: '95%' }}>
        <button className="close-btn" onClick={onClose}>X</button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', gap: '10px' }}>
          <h2 style={{ margin: 0, color: '#f1c40f' }}>{title}</h2>
          <div className="info-tooltip-wrapper">
            <span className="info-icon">❓</span>
            <div className="info-tooltip">
              {getTooltipContent()}
            </div>
          </div>
        </div>

        {ownedList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#aaa' }}>
            해당 조건에 맞는 사원이 없습니다.
          </div>
        ) : (
          <div className="setup-roster-grid" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {ownedList.map(char => {
              const stats = skillTargetMode === 'tower' ? getCharacterCombatStats(char.id) : null;
              
              return (
                <div
                  key={char.id}
                  className="setup-card-container"
                  onClick={() => {
                    onSelect(char.id);
                    onClose();
                  }}
                >
                  <div className={`setup-card-visual tier-border-${char.tier}`}>
                    
                    {stats && (
                      <div className="card-combat-stats" style={{ position: 'absolute', top: '5px', left: '5px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', zIndex: 2, background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', gap: '1px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#ff4757', fontWeight: 'bold' }}>⚔️ {formatStat(stats.atk)}</span>
                        <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>🛡️ {formatStat(stats.hp)}</span>
                      </div>
                    )}
                    
                    <img src={getCardImageUrl(char.id)} alt="character" className="setup-card-image" draggable={false} />
                  </div>
                  <div className="setup-card-name">{char.name}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
