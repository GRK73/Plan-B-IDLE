import { useState, useEffect, useRef } from 'react';
import { useGameStore, getEffectiveStats, getTierMultiplier, getHpMultiplier } from '../store/gameStore';
import { CHARACTER_DATA } from '../data/characters';
import { getCombatImageUrl, getFrameUrl, getEnemyImageUrl } from '../utils/assets';
import './CombatScreen.css';

interface Props {
  onClose: () => void;
  onOpenRebirth: () => void;
}

const BOSS_TYPES = [
  { id: 'pengin', name: '어둠의 펜긴' },
  { id: 'chur', name: '어둠의 츄르' },
  { id: 'beeps', name: '어둠의 빕스' },
  { id: 'bambi', name: '어둠의 밤비' },
  { id: 'anggo', name: '어둠의 앙꼬' }
];

interface CombatChar {
  id: string;
  name: string;
  tier: string;
  maxHp: number;
  hp: number;
  atk: number;
  aspd: number;
  burstMult: number; // 랩 기반 크리티컬 배율
  burstChance: number; // 방송감 기반 크리티컬 확률
  
  attackTimer: number;
  action: 'idle' | 'attack' | 'burst' | 'dead' | 'hit';
  animTimer: number;
  slotIndex: number;
}

interface DamageText {
  id: number;
  value: number;
  type: 'normal' | 'crit' | 'enemy';
  x: number;
  y: number;
  createdAt: number;
}

export function CombatScreen({ onClose, onOpenRebirth }: Props) {
  const gameState = useGameStore();
  const { combatParty, currentStage, ownedCharacters, nextStage, ceoLinkedCharId, permanentBuffs } = gameState;
  
  const hpNerfMult = Math.pow(0.9, permanentBuffs.enemyHpNerfLevel || 0);
  const atkNerfMult = Math.pow(0.9, permanentBuffs.enemyAtkNerfLevel || 0);

  // 밸런스 조정: 지수적 보스 스케일링 (30스테이지 스탯이 40스테이지에 나오도록 완화) + 환생 억까/안티 너프 적용
  const bossMaxHp = Math.max(10, Math.floor((1000 * Math.pow(1.135, currentStage) + 50 * currentStage) * hpNerfMult));
  const bossAtk = Math.max(1, Math.floor((20 * Math.pow(1.075, currentStage) + 5 * currentStage) * atkNerfMult));

  const [bossHp, setBossHp] = useState(bossMaxHp);
  const [bossIndex, setBossIndex] = useState(1);
  const [combatState, setCombatState] = useState<'entering'|'fighting'|'boss_dead'|'game_over'>('entering');
  const [currentBoss, setCurrentBoss] = useState(BOSS_TYPES[0]);
  
  const [uiChars, setUiChars] = useState<CombatChar[]>([]);
  const [bossAction, setBossAction] = useState<'idle'|'attack'|'stunned'|'hit'>('idle');
  const [damageTexts, setDamageTexts] = useState<DamageText[]>([]);
  const [walkFrame, setWalkFrame] = useState(1);

  useEffect(() => {
    if (combatState === 'entering') {
      const timer = setInterval(() => setWalkFrame(f => (f % 10) + 1), 100);
      return () => clearInterval(timer);
    }
  }, [combatState]);

  const stateRef = useRef({
    chars: [] as CombatChar[],
    bossHp: bossMaxHp,
    bossMaxHp: bossMaxHp,
    bossIndex: 1,
    bossAttackTimer: 0,
    bossAction: 'idle' as 'idle'|'attack'|'stunned'|'hit',
    bossAnimTimer: 0,
    bossAtkFrame: 1 as 1 | 2,
    isFighting: false,
    dmgTexts: [] as DamageText[]
  });

  // 스테이지가 바뀌거나 전투 최초 진입 시 초기화
  useEffect(() => {
    const charsData: CombatChar[] = combatParty.map((id, index) => {
      const charStore = ownedCharacters[id];
      const charInfo = CHARACTER_DATA.find(c => c.id === id);
      if (!charStore || !charInfo) return null;
      
      const s = getEffectiveStats(useGameStore.getState(), id);
      const totalStats = s.vocal + s.rap + s.dance + s.sense + s.charm;
      
      const rebirthMult = 1.0 + (permanentBuffs.hardTrainingLevel * 1.5);
      const tierMult = getTierMultiplier(id);
      const hpMult = getHpMultiplier(id);
      
      let baseAtk = 0;
      if (s.vocal <= 100) baseAtk = s.vocal * 10;
      else baseAtk = 1000 + (Math.log10(s.vocal - 99) * 200);

      return {
        id,
        name: charInfo.name,
        tier: charInfo.tier,
        maxHp: Math.floor((200 + s.charm * 30 + totalStats * 10) * rebirthMult * hpMult),
        hp: Math.floor((200 + s.charm * 30 + totalStats * 10) * rebirthMult * hpMult),
        atk: Math.floor(baseAtk * rebirthMult * tierMult),
        aspd: 0.8 + (Math.log10(s.dance + 10) * 0.2), // 로그 기반
        burstMult: 1.5 + (Math.log10(s.rap + 10) * 0.3), // 로그 기반
        burstChance: Math.min((s.sense * 1) / 100, 0.5 + (permanentBuffs.ruleBreakerLevel * 0.01)),
        attackTimer: Math.random() * 0.5, 
        action: 'idle',
        animTimer: 0,
        slotIndex: index
      };
    }).filter(Boolean) as CombatChar[];

    stateRef.current = {
      chars: charsData,
      bossHp: bossMaxHp,
      bossMaxHp: bossMaxHp,
      bossIndex: 1,
      bossAttackTimer: 0,
      bossAction: 'idle',
      bossAnimTimer: 0,
      bossAtkFrame: 1,
      isFighting: false,
      dmgTexts: []
    };

    const newBoss = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
    setCurrentBoss(newBoss);
    setBossHp(bossMaxHp);
    setBossIndex(1);
    setCombatState('entering');
    setBossAction('idle');
    setUiChars([...charsData]);
    setDamageTexts([]);

    const timer = setTimeout(() => {
      stateRef.current.isFighting = true;
      setCombatState('fighting');
    }, 1000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage]);

  const goToNextBoss = () => {
    if (stateRef.current.bossIndex >= 3) {
      nextStage();
    } else {
      stateRef.current.bossIndex += 1;
      stateRef.current.bossHp = bossMaxHp;
      stateRef.current.bossAction = 'idle';
      
      const newBoss = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
      setCurrentBoss(newBoss);
      
      setBossIndex(stateRef.current.bossIndex);
      setBossHp(bossMaxHp);
      setBossAction('idle');
      setCombatState('entering');
      
      stateRef.current.isFighting = false;
      
      setTimeout(() => {
        stateRef.current.isFighting = true;
        setCombatState('fighting');
      }, 1000);
    }
  };

  useEffect(() => {
    const tickRate = 0.1; 
    const interval = setInterval(() => {
      const st = stateRef.current;
      if (!st.isFighting || st.bossHp <= 0) return;

      const aliveChars = st.chars.filter(c => c.hp > 0);
      if (aliveChars.length === 0) return; 

      const now = Date.now();
      let dmgAdded = false;

      const addDamage = (value: number, type: 'normal' | 'crit' | 'enemy', target: 'boss' | 'ally') => {
        // 보스는 우측(약 70%~80%), 아군은 좌측(약 20%~30%)
        const x = target === 'boss' ? 70 + Math.random() * 10 : 20 + Math.random() * 10;
        const y = target === 'boss' ? 30 + Math.random() * 20 : 40 + Math.random() * 20;
        st.dmgTexts.push({
          id: Math.random(),
          value: Math.floor(value),
          type, x, y,
          createdAt: now
        });
        dmgAdded = true;
      };

      // 아군 개별 액션
      st.chars.forEach(char => {
        if (char.hp <= 0) {
          char.action = 'dead';
          return;
        }

        char.attackTimer += tickRate;
        let charDidAttack = false;

        if (char.attackTimer >= (1 / char.aspd)) {
          char.attackTimer = 0;
          charDidAttack = true;

          const isBurst = Math.random() < char.burstChance;

          if (isBurst) {
            const dmg = char.atk * char.burstMult;
            st.bossHp -= dmg;
            char.action = 'burst';
            char.animTimer = 0.3; 
            addDamage(dmg, 'crit', 'boss');
          } else {
            const dmg = char.atk;
            st.bossHp -= dmg;
            char.action = 'attack';
            char.animTimer = 0.2; 
            addDamage(dmg, 'normal', 'boss');
          }

          st.bossAction = 'hit';
          st.bossAnimTimer = 0.2;
        }

        if (!charDidAttack && char.animTimer > 0) {
          char.animTimer -= tickRate;
          if (char.animTimer <= 0) char.action = 'idle';
        }
      });

      // 보스 공격
      st.bossAttackTimer += tickRate;
      if (st.bossAttackTimer >= 1.0) { 
        st.bossAttackTimer = 0;
        
        let totalWeight = 0;
        const weightedTargets = aliveChars.map(char => {
          const isFront = char.slotIndex === 1 || char.slotIndex === 3;
          const weight = isFront ? 3 : 1; 
          totalWeight += weight;
          return { char, weight };
        });

        let randomNum = Math.random() * totalWeight;
        let target = aliveChars[0];
        
        for (const item of weightedTargets) {
          if (randomNum < item.weight) {
            target = item.char;
            break;
          }
          randomNum -= item.weight;
        }

        target.hp -= bossAtk;
        addDamage(bossAtk, 'enemy', 'ally');
        
        if (target.hp <= 0) {
          target.hp = 0;
          target.action = 'dead';
        } else {
          target.action = 'hit';
          target.animTimer = 0.2;
        }

        st.bossAction = 'attack';
        st.bossAtkFrame = Math.random() > 0.5 ? 1 : 2;
        st.bossAnimTimer = 0.3;
      }

      if (st.bossAnimTimer > 0) {
        st.bossAnimTimer -= tickRate;
        if (st.bossAnimTimer <= 0) st.bossAction = 'idle';
      }

      // 데미지 텍스트 정리 (800ms 경과 시 삭제)
      const oldLen = st.dmgTexts.length;
      st.dmgTexts = st.dmgTexts.filter(d => now - d.createdAt < 800);
      if (st.dmgTexts.length !== oldLen || dmgAdded) {
        setDamageTexts([...st.dmgTexts]);
      }

      if (st.bossHp <= 0) {
        st.bossHp = 0;
        st.isFighting = false;
        setCombatState('boss_dead');
        setTimeout(goToNextBoss, 1500);
      } else if (st.chars.every(c => c.hp <= 0)) {
        st.isFighting = false;
        setCombatState('game_over');
      }

      setBossHp(Math.max(0, Math.floor(st.bossHp)));
      setBossAction(st.bossAction);
      setUiChars([...st.chars]);

    }, 100);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossAtk]);

  return (
    <div className="combat-screen-overlay">
      <div className="combat-header">
        <h2>채팅창 방어전 - 스테이지 {currentStage} ({bossIndex}/3)</h2>
        <button className="combat-close-btn" onClick={onClose}>사옥으로 돌아가기</button>
      </div>

      <div className="battlefield">
        {/* 데미지 텍스트 오버레이 */}
        {damageTexts.map(dmg => (
          <div 
            key={dmg.id} 
            className={`floating-damage dmg-${dmg.type}`}
            style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}
          >
            {dmg.value}
          </div>
        ))}

        {/* 게임 오버 오버레이 */}
        {combatState === 'game_over' && (
          <div className="game-over-overlay">
            <h1>방어 실패...</h1>
            <p>악플러들에게 멘탈이 깨졌습니다.</p>
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
              <button className="combat-close-btn" onClick={onClose}>
                돌아가서 스펙을 올리자
              </button>
              {currentStage >= 30 && (
                <button 
                  className="combat-close-btn" 
                  style={{ background: '#8e44ad' }} 
                  onClick={() => {
                    onClose();
                    onOpenRebirth();
                  }}
                >
                  창낼용기 (환생하기)
                </button>
              )}
            </div>
          </div>
        )}

        {/* 좌측: 아군 파티 진영 */}
        <div className="ally-zone">
          <div className="ally-party-grid">
            {uiChars.map((char, index) => {
              const isDead = char.hp <= 0;
              const isCeoLinked = char.id === ceoLinkedCharId;
              
              let spriteUrl = getCombatImageUrl(char.id, 'ready');
              if (combatState === 'entering') {
                spriteUrl = getFrameUrl(`${char.id}_walk (${walkFrame}).png`) || spriteUrl;
              } else if (char.action === 'attack' || char.action === 'burst') {
                spriteUrl = getCombatImageUrl(char.id, 'atk');
              }

              return (
                <div key={index} className={`ally-character-wrapper ${char.action !== 'idle' ? `ally-${char.action}` : ''} ${isDead ? 'dead-slot' : ''} ${isCeoLinked && !isDead ? 'ceo-aura' : ''}`}>
                  <img src={spriteUrl} alt="ally" className="ally-sprite" />
                  <div className="ally-name">{char.name}</div>
                  
                  {/* 개별 HP 바 */}
                  <div className="char-hp-bar-container">
                    <div className="char-hp-fill" style={{ width: `${Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100)) || 0}%` }}></div>
                  </div>
                </div>
              );
            })}
            
            {/* 빈 슬롯 렌더링 (4명 미만일 경우) */}
            {Array.from({ length: 4 - uiChars.length }).map((_, i) => (
              <div key={`empty-${i}`} className="ally-character-wrapper">
                <div className="empty-slot-marker">Empty</div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 보스(악플러) 진영 */}
        <div className="enemy-zone">
          {combatState !== 'boss_dead' ? (() => {
            let bossSpriteUrl = getEnemyImageUrl(currentBoss.id, 'stay');
            if (bossAction === 'attack') {
              bossSpriteUrl = getEnemyImageUrl(currentBoss.id, `atk${stateRef.current.bossAtkFrame}` as 'atk1' | 'atk2');
            }

            return (
              <div className={`boss-character-wrapper boss-${combatState} boss-${bossAction}`}>
                <div className="boss-hp-bar-container">
                  <div className="boss-hp-fill" style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}></div>
                  <span className="boss-hp-text">{bossHp} / {bossMaxHp}</span>
                </div>
                <img src={bossSpriteUrl} alt="boss" className="boss-sprite" />
                <h3 className="boss-name">{currentBoss.name} Lv.{currentStage}</h3>
                <div className="boss-stats">공격력: {bossAtk}</div>
              </div>
            );
          })() : (
            <div className="boss-dead-text">처치!</div>
          )}
        </div>
      </div>
    </div>
  );
}
