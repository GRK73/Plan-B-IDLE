import { useState, useEffect, useRef } from 'react';
import { useGameStore, Stats, getEffectiveStats, getHpMultiplier } from '../store/gameStore';
import { CHARACTER_DATA } from '../data/characters';
import { getCardImageUrl } from '../utils/assets';
import './StatModal.css';

interface Props {
  charId: string;
  onClose: () => void;
}

const STAT_KEYS: Array<keyof Stats> = ['vocal', 'rap', 'dance', 'sense', 'charm'];
const STAT_NAMES: Record<keyof Stats, string> = {
  vocal: '보컬 (V)', 
  rap: '랩 (R)', 
  dance: '댄스 (D)', 
  sense: '방송감 (S)', 
  charm: '매력 (C)'
};

const STAT_TOOLTIPS: Record<keyof Stats, { prod: string, combat: string }> = {
  vocal: { prod: '초당 풍 생산 기본치', combat: '평타 기본 공격력' },
  rap: { prod: '생산 속도 가속', combat: '크리티컬 데미지 배율' },
  dance: { prod: '대박(크리) 시 생산 배율', combat: '초당 공격 속도 (ASPD)' },
  sense: { prod: '대박(크리) 터질 확률', combat: '공격 시 크리티컬 확률' },
  charm: { prod: '최종 생산량 뻥튀기', combat: '전투 최대 체력 (HP)' }
};

export function StatModal({ charId, onClose }: Props) {
  const { ownedCharacters, investStat, autoDistributeSingleStats, doBreakthrough, calculateTps } = useGameStore();
  
  const charState = ownedCharacters[charId];
  const charInfo = CHARACTER_DATA.find(c => c.id === charId);

  // 카드 확대 상태
  const [isCardExpanded, setIsCardExpanded] = useState(false);

  // 꾹 누르기 상태 관리
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startHoldAction = (action: () => void) => {
    action(); 
    holdIntervalRef.current = setInterval(() => {
      action();
    }, 100); // 0.1초마다 실행
  };

  const stopHoldAction = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopHoldAction();
  }, []);

  if (!charState || !charInfo) return null;

  // Radar Chart Configuration
  const size = 250;
  const center = size / 2;
  const radius = 75;

  const getPoint = (index: number, ratio: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2; 
    const x = center + radius * ratio * Math.cos(angle);
    const y = center + radius * ratio * Math.sin(angle);
    return `${x},${y}`;
  };

  const bgPolygons = [1, 0.8, 0.6, 0.4, 0.2].map(scale => {
    return STAT_KEYS.map((_, i) => getPoint(i, scale)).join(' ');
  });

  const maxAbsCap = Math.max(...Object.values(charState.caps));

  const dataPoints = STAT_KEYS.map((key, i) => {
    const val = getEffectiveStats(useGameStore.getState(), charId)[key];
    const ratio = maxAbsCap > 0 ? val / maxAbsCap : 0;
    return getPoint(i, Math.min(1.0, ratio));
  }).join(' ');

  const bossBonusSum = Object.values(charState.permanentBonus || {}).reduce((sum, val) => sum + val, 0);
  const totalCaps = Object.values(charState.caps).reduce((sum, val) => sum + val, 0);
  const hasBrokenThrough = totalCaps > (charInfo.baseCap * 5) + bossBonusSum;

  const isAllMaxed = STAT_KEYS.every(key => charState.stats[key] >= charState.caps[key]);

  const getBreakCost = () => {
    const breakCount = Math.floor((totalCaps - charInfo.baseCap * 5) / charInfo.baseCap);
    return Math.floor(charInfo.breakthroughCost * Math.pow(1.1, Math.max(0, breakCount)));
  };

  const currentBreakCost = getBreakCost();
  const canBreakthrough = (isAllMaxed || hasBrokenThrough) && charState.points >= currentBreakCost;

  // UI 렌더링용 최종 스탯(대표의 가호 등 포함)
  const [effectiveStats, setEffectiveStats] = useState(() => getEffectiveStats(useGameStore.getState(), charId));

  // 상태 변경 추적용
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      setEffectiveStats(getEffectiveStats(state, charId));
    });
    return unsub;
  }, [charId]);

  const s = effectiveStats;
  const rebirthMult = 1.0 + (useGameStore.getState().permanentBuffs.hardTrainingLevel * 1.5);
  const tierMult = charInfo.tier === 'SR' ? 6.0 : charInfo.tier === 'R' ? 3.0 : charInfo.tier === 'U' ? 1.5 : 1.0;
  const hpMult = getHpMultiplier(charId);

  let baseAtk = 0;
  if (s.vocal <= 100) baseAtk = s.vocal * 10;
  else baseAtk = 1000 + (Math.log10(s.vocal - 99) * 200);

  const cAtk = Math.floor(baseAtk * rebirthMult * tierMult);
  const cCritChance = Math.min((s.sense * 1), 50 + (useGameStore.getState().permanentBuffs.ruleBreakerLevel));
  const cCritMult = (1.5 + Math.log10(s.rap + 10) * 0.3) * 100;
  const cAspd = 0.8 + (Math.log10(s.dance + 10) * 0.2);
  const cHp = Math.floor((200 + s.charm * 30 + (s.vocal + s.rap + s.dance + s.sense + s.charm) * 10) * rebirthMult * hpMult);

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content stat-modal">
        <button className="close-btn" onClick={onClose}>X</button>
        
        <div className="stat-layout">
          {/* 좌측: 캐릭터 카드 & 기본 정보 */}
          <div className="stat-col left-col">
            <div 
              className={`stat-card-visual tier-border-${charInfo.tier} clickable-card`}
              onClick={() => setIsCardExpanded(true)}
            >
              <div className={`card-tier-badge tier-color-${charInfo.tier}`}>{charInfo.tier === 'SR' ? 'P.B' : charInfo.tier}</div>
              <img src={getCardImageUrl(charId)} alt="character" className="stat-card-image" />
              <div className="card-click-hint">🔍 클릭하여 확대</div>
            </div>
            <h2 className="stat-char-name">{charInfo.name}</h2>
            <div className="points-badge">잔여 pt: {charState.points}</div>
          </div>

          {/* 중앙: 레이더 차트 및 전투 상세 */}
          <div className="stat-col mid-col">
            <div className="radar-chart-container">
              <svg width={size} height={size}>
                {bgPolygons.map((points, idx) => (
                  <polygon key={idx} points={points} className="radar-bg" />
                ))}
                {STAT_KEYS.map((_, i) => {
                  const [x, y] = getPoint(i, 1).split(',');
                  return <line key={i} x1={center} y1={center} x2={x} y2={y} className="radar-axis" />;
                })}
                <polygon points={dataPoints} className="radar-data" />
                {STAT_KEYS.map((key, i) => {
                  const [x, y] = getPoint(i, 1.3).split(','); 
                  return (
                    <text key={key} x={x} y={y} className="radar-label" textAnchor="middle" dominantBaseline="central">
                      {STAT_NAMES[key]}
                    </text>
                  );
                })}
              </svg>
            </div>
            <div className="combat-stats-summary">
              <h4>⚔️ 전투 상세 능력치</h4>
              <ul>
                <li><span>기본 공격력</span> <span>{cAtk}</span></li>
                <li><span>크리티컬 확률</span> <span>{cCritChance.toFixed(1)}%</span></li>
                <li><span>크리티컬 배율</span> <span>{cCritMult.toFixed(0)}%</span></li>
                <li><span>공격 속도</span> <span>{cAspd.toFixed(2)}/초</span></li>
                <li><span>최대 체력</span> <span>{cHp}</span></li>
              </ul>
            </div>
          </div>

          {/* 우측: 스탯 리스트 및 돌파 */}
          <div className="stat-col right-col">
            <div className="stat-list-header" style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '10px'}}>
              <button 
                className="auto-distribute-btn-small" 
                onClick={() => autoDistributeSingleStats(charId)}
              >
                ✨ 자동 배분
              </button>
            </div>
            <div className="stat-list">
              {STAT_KEYS.map((statKey) => {
                const pureVal = charState.stats[statKey];
                const currentVal = effectiveStats[statKey];
                const maxVal = charState.caps[statKey];
                const isMax = pureVal >= maxVal;
                const canInvest = charState.points > 0 && !isMax;

                // 대표 스킬 버프로 인한 보너스 표시
                const bonusStat = currentVal - pureVal;
                const displayVal = bonusStat > 0 
                  ? <span style={{color: '#2ecc71'}}>{pureVal}+{bonusStat}</span>
                  : pureVal;

                return (
                  <div key={statKey} className="stat-item">
                    <div className="stat-name-tooltip-wrapper">
                      <span className="stat-name">{STAT_NAMES[statKey]}</span>
                      <div className="stat-tooltip">
                        <div><strong>🌱 생산:</strong> {STAT_TOOLTIPS[statKey].prod}</div>
                        <div><strong>⚔️ 전투:</strong> {STAT_TOOLTIPS[statKey].combat}</div>
                      </div>
                    </div>
                    <div className="stat-bar-bg">
                      <div 
                        className="stat-bar-fill" 
                        style={{ width: `${Math.min(100, (currentVal / maxVal) * 100)}%` }}
                      />
                    </div>
                    <span className="stat-value">{displayVal} / {maxVal}</span>
                    <button 
                      className="invest-btn" 
                      disabled={!canInvest}
                      onMouseDown={() => startHoldAction(() => {
                        const s = useGameStore.getState().ownedCharacters[charId];
                        if (s.points > 0 && s.stats[statKey] < s.caps[statKey]) {
                          investStat(charId, statKey);
                          calculateTps();
                        } else {
                          stopHoldAction();
                        }
                      })}
                      onMouseUp={stopHoldAction}
                      onMouseLeave={stopHoldAction}
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="breakthrough-section">
              <button 
                className={`breakthrough-btn ${(isAllMaxed || hasBrokenThrough) ? (canBreakthrough ? 'ready' : 'need-points') : 'not-ready'}`}
                disabled={!canBreakthrough}
                onMouseDown={() => startHoldAction(() => {
                  const s = useGameStore.getState().ownedCharacters[charId];
                  if (s.points >= getBreakCost()) {
                    doBreakthrough(charId);
                  } else {
                    stopHoldAction();
                  }
                })}
                onMouseUp={stopHoldAction}
                onMouseLeave={stopHoldAction}
              >
                🔥 한계 돌파 ({getBreakCost()}pt)
              </button>
              {((isAllMaxed || hasBrokenThrough) && !canBreakthrough) && (
                <div className="breakthrough-hint">포인트가 부족합니다.</div>
              )}
              {(!isAllMaxed && !hasBrokenThrough) && (
                <div className="breakthrough-hint">첫 돌파 전에는 모든 스탯을 한계까지 올려야 합니다.</div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 카드 확대 오버레이 */}
      {isCardExpanded && (
        <div className="expanded-card-overlay" onClick={() => setIsCardExpanded(false)}>
          <img 
            src={getCardImageUrl(charId)} 
            alt={`${charInfo.name} expanded`} 
            className={`expanded-card-image tier-border-${charInfo.tier}`} 
          />
        </div>
      )}
    </div>
  );
}
