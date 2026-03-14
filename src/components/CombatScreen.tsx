import { useState, useEffect, useRef } from 'react';
import { useGameStore, getEffectiveStats, getTierMultiplier, getHpMultiplier } from '../store/gameStore';
import { CHARACTER_DATA } from '../data/characters';
import { getCombatImageUrl, getFrameUrl, getEnemyImageUrl } from '../utils/assets';
import * as TAT_EQUIP_DATA from '../data/tatEquipData';
import skill1Image from '../assets/images/skill1.png';
import './CombatScreen.css';

interface Props {
  mode: 'normal' | 'disk' | 'tower';
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
  type: 'normal' | 'crit' | 'enemy' | 'supercrit' | 'hypercrit';
  x: number;
  y: number;
  createdAt: number;
}

const formatDamage = (num: number) => {
  if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return Math.floor(num).toLocaleString();
};

export function CombatScreen({ mode, onClose, onOpenRebirth }: Props) {
  const gameState = useGameStore();
  const { 
    combatParty, currentStage, ownedCharacters, nextStage, ceoLinkedCharId, permanentBuffs, 
    bossSkillUnlocked, bossSkillCooldownEnd, maxDiskDamage, finishGoldenDisk,
    towerFloor, towerSlots, towerSlotLevels, towerArtifacts, finishTowerFloor,
    tatEquips
  } = gameState;

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [initialMaxDiskDamage] = useState(maxDiskDamage); 

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hpNerfMult = Math.pow(0.9, permanentBuffs.enemyHpNerfLevel || 0);
  const atkNerfMult = Math.pow(0.9, permanentBuffs.enemyAtkNerfLevel || 0);

  let bossMaxHpValue = 0;
  let bossAtkValue = 0;

  const blacklist = towerArtifacts.find(a => a.id === 'blacklist');
  const blacklistRatio = blacklist ? Math.min(30, blacklist.level * 1) / 100 : 0;

  if (mode === 'tower') {
    let tHp = 45000000;
    let tAtk = 9500;
    for (let i = 2; i <= towerFloor; i++) {
      if (i % 5 === 0) {
        tHp *= 1.3;
        tAtk *= 1.3;
      } else {
        tHp *= 1.08;
        tAtk *= 1.08;
      }
    }
    
    if (towerFloor % 5 === 0 && blacklistRatio > 0) {
       tHp = Math.floor(tHp * (1 - blacklistRatio));
    }
    
    bossMaxHpValue = Math.floor(tHp);
    bossAtkValue = Math.floor(tAtk);
  } else {
    let tHp = Math.max(10, Math.floor((1000 * Math.pow(1.135, currentStage) + 50 * currentStage) * hpNerfMult));
    let tAtk = Math.max(1, Math.floor((20 * Math.pow(1.075, currentStage) + 5 * currentStage) * atkNerfMult));
    
    if (mode === 'normal' && blacklistRatio > 0) {
       tHp = Math.max(1, Math.floor(tHp * (1 - blacklistRatio)));
    }
    
    bossMaxHpValue = tHp;
    bossAtkValue = tAtk;
  }

  const [bossHp, setBossHp] = useState(mode === 'disk' ? 0 : bossMaxHpValue);
  const [bossIndex, setBossIndex] = useState(1);
  const [combatState, setCombatState] = useState<'entering' | 'fighting' | 'boss_dead' | 'game_over' | 'disk_end' | 'tower_win'>('entering');
  const [currentBoss, setCurrentBoss] = useState(
    mode === 'disk' ? { id: 'golden_disk', name: '황금 디스크' } : 
    (mode === 'tower' && towerFloor % 5 === 0) ? { id: 'bambi', name: '탑의 수호자 밤비' } :
    BOSS_TYPES[0]
  );

  const [uiChars, setUiChars] = useState<CombatChar[]>([]);
  const [bossAction, setBossAction] = useState<'idle' | 'attack' | 'stunned' | 'hit'>('idle');
  const [damageTexts, setDamageTexts] = useState<DamageText[]>([]);
  const [walkFrame, setWalkFrame] = useState(1);
  const [isSpeedUp, setIsSpeedUp] = useState(false);
  const [diskTimeLeft, setDiskTimeLeft] = useState(60000); 
  const [diskAccumulatedDmg, setDiskAccumulatedDmg] = useState(0);

  useEffect(() => {
    if (combatState === 'entering') {
      const timer = setInterval(() => setWalkFrame(f => (f % 10) + 1), 100);
      return () => clearInterval(timer);
    }
  }, [combatState]);

  const stateRef = useRef({
    chars: [] as CombatChar[],
    bossHp: bossMaxHpValue,
    bossMaxHp: bossMaxHpValue,
    bossIndex: 1,
    bossAttackTimer: 0,
    bossAction: 'idle' as 'idle' | 'attack' | 'stunned' | 'hit',
    bossAnimTimer: 0,
    bossAtkFrame: 1 as 1 | 2,
    isFighting: false,
    dmgTexts: [] as DamageText[]
  });

  useEffect(() => {
    let charsData: (CombatChar | null)[] = [];

    const mic = towerArtifacts.find(a => a.id === 'mic');
    const lightstick = towerArtifacts.find(a => a.id === 'lightstick');
    
    // 탓 장비 보너스 가져오기
    const equip1Bonus = TAT_EQUIP_DATA.EQUIP1_ATK_BONUS[tatEquips.equip1.level] || 0;
    const equip2Bonus = TAT_EQUIP_DATA.EQUIP2_HP_BONUS[tatEquips.equip2.level] || 0;

    const atkMult = (1 + (mic ? mic.level * 0.2 : 0)) * (1 + equip1Bonus / 100);
    const hpMultGlobal = (1 + (lightstick ? lightstick.level * 0.3 : 0)) * (1 + equip2Bonus / 100);

    if (mode === 'tower') {
      charsData = towerSlots.map((slot, index) => {
        if (!slot) return null;
        
        let cHp = slot.maxHp;
        let cAtk = slot.atk;
        let cAspd = slot.aspd;

        const level = towerSlotLevels[index];
        if (index === 1 || index === 3) cHp *= (1 + (level * 0.2));
        if (index === 0 || index === 2) cAtk *= (1 + (level * 0.15));
        if (index === 3) cAspd *= (1 + (level * 0.05));

        return {
          id: slot.id,
          name: slot.name,
          tier: slot.tier,
          maxHp: Math.floor(cHp * hpMultGlobal),
          hp: Math.floor(cHp * hpMultGlobal),
          atk: Math.floor(cAtk * atkMult),
          aspd: cAspd,
          burstMult: slot.burstMult,
          burstChance: slot.burstChance, 
          attackTimer: Math.random() * 0.5,
          action: 'idle',
          animTimer: 0,
          slotIndex: index
        };
      });
    } else {
      charsData = combatParty.map((id, index) => {
        if (!id) return null;
        const charStore = ownedCharacters[id];
        const charInfo = CHARACTER_DATA.find(c => c.id === id);
        if (!charStore || !charInfo) return null;

        const s = getEffectiveStats(useGameStore.getState(), id);

        const rebirthMult = 1.0 + (permanentBuffs.hardTrainingLevel * 1.5);
        const tierMult = getTierMultiplier(id);
        const hpMult = getHpMultiplier(id);

        let baseAtk = 0;
        if (s.vocal <= 100) baseAtk = s.vocal * 10;
        else baseAtk = 1000 + (Math.log10(s.vocal - 99) * 200);

        let cMaxHp = Math.floor((200 + s.charm * 80) * rebirthMult * hpMult);
        let cAtk = Math.floor(baseAtk * rebirthMult * tierMult);
        let cAspd = (0.8 + (Math.log10(s.dance + 10) * 0.2)) * (1 + (gameState.advancedBuffs.namTatAspdBoostLevel * 0.1));

        const level = towerSlotLevels[index];
        if (index === 0) cMaxHp *= (1 + (level * 0.2));
        if (index === 1 || index === 2) cAtk *= (1 + (level * 0.15));
        if (index === 3) cAspd *= (1 + (level * 0.05));

        return {
          id,
          name: charInfo.name,
          tier: charInfo.tier,
          maxHp: Math.floor(cMaxHp * hpMultGlobal),
          hp: Math.floor(cMaxHp * hpMultGlobal),
          atk: Math.floor(cAtk * atkMult),
          aspd: cAspd,
          burstMult: 1.5 + (Math.log10(s.rap + 10) * 0.3) + (permanentBuffs.ruleBreakerLevel * 0.5), 
          burstChance: Math.min((s.sense * 1) / 100, 0.5 + (permanentBuffs.ruleBreakerLevel * 0.05)),
          attackTimer: Math.random() * 0.5,
          action: 'idle',
          animTimer: 0,
          slotIndex: index
        };
      });
    }

    const activeChars = charsData.filter(Boolean) as CombatChar[];

    stateRef.current = {
      chars: activeChars,
      bossHp: mode === 'disk' ? 0 : bossMaxHpValue,
      bossMaxHp: bossMaxHpValue,
      bossIndex: 1,
      bossAttackTimer: 0,
      bossAction: 'idle',
      bossAnimTimer: 0,
      bossAtkFrame: 1,
      isFighting: false,
      dmgTexts: []
    };

    let newBoss;
    if (mode === 'disk') newBoss = { id: 'golden_disk', name: '황금 디스크' };
    else if (mode === 'tower') newBoss = towerFloor % 5 === 0 ? { id: 'bambi', name: '탑의 수호자 밤비' } : BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
    else newBoss = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];

    setCurrentBoss(newBoss);
    setBossHp(mode === 'disk' ? 0 : bossMaxHpValue);
    setBossIndex(1);
    setCombatState('entering');
    setBossAction('idle');
    setUiChars([...charsData] as any); 
    setDamageTexts([]);
    setDiskTimeLeft(60000);
    setDiskAccumulatedDmg(0);

    const timer = setTimeout(() => {
      stateRef.current.isFighting = true;
      setCombatState('fighting');
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage, mode, towerFloor]);

  const goToNextBoss = () => {
    if (stateRef.current.bossIndex >= 3) {
      nextStage();
    } else {
      stateRef.current.bossIndex += 1;
      stateRef.current.bossHp = bossMaxHpValue;
      stateRef.current.bossAction = 'idle';

      const newBoss = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];
      setCurrentBoss(newBoss);

      setBossIndex(stateRef.current.bossIndex);
      setBossHp(bossMaxHpValue);
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
    const baseInterval = isSpeedUp ? 50 : 100;
    const tickRate = 0.1;
    const interval = setInterval(() => {
      const st = stateRef.current;
      if (!st.isFighting || (mode !== 'disk' && st.bossHp <= 0)) return;

      const aliveChars = st.chars.filter(c => c.hp > 0);
      if (aliveChars.length === 0) return;

      const now = Date.now();
      let dmgAdded = false;

      const addDamage = (value: number, type: 'normal' | 'crit' | 'enemy' | 'supercrit' | 'hypercrit', target: 'boss' | 'ally') => {
        const x = target === 'boss' ? 70 + Math.random() * 10 : 20 + Math.random() * 10;
        const y = target === 'boss' ? 30 + Math.random() * 20 : 40 + Math.random() * 20;
        st.dmgTexts.push({
          id: Math.random(),
          value: value,
          type, x, y,
          createdAt: now
        });
        dmgAdded = true;
      };

      const playbutton = towerArtifacts.find(a => a.id === 'playbutton');
      const superCritChance = playbutton ? playbutton.level * 0.05 : 0;
      const superCritMult = playbutton ? 2.0 + (playbutton.level * 0.5) : 2.0;

      // 억까 당한 탓: 극크리 개방
      const hyperCritLevel = useGameStore.getState().advancedBuffs.namTatHyperCritLevel || 0;
      const hyperCritChance = hyperCritLevel * 0.05; // 레벨당 5%
      
      const equip3Bonus = TAT_EQUIP_DATA.EQUIP3_CRIT_BONUS[useGameStore.getState().tatEquips.equip3.level] || 0;

      st.chars.forEach(char => {
        if (!char) return;
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
          let dmg = 0;
          let dmgType: 'normal' | 'crit' | 'supercrit' | 'hypercrit' = 'normal';

          if (isBurst) {
            dmg = char.atk * char.burstMult;
            dmgType = 'crit';
            
            if (Math.random() < superCritChance) {
              dmg *= superCritMult; 
              dmgType = 'supercrit';
              
              // 극크리 판정 (초크리가 터졌을 때만 굴림)
              if (hyperCritChance > 0 && Math.random() < hyperCritChance) {
                 const hyperCritMult = 3.0 * (1 + equip3Bonus / 100);
                 dmg *= hyperCritMult; // 3배 증폭 (기본) + 탓 장비 배율
                 dmgType = 'hypercrit';
              }
            }
            
            char.action = 'burst';
            char.animTimer = 0.3;
          } else {
            dmg = char.atk;
            char.action = 'attack';
            char.animTimer = 0.2;
          }

          if (mode === 'tower') {
            const isBackRow = char.slotIndex === 0 || char.slotIndex === 2;
            if (isBackRow) {
              const level = towerSlotLevels[char.slotIndex];
              const dmgBoost = 1 + (level * 0.15); // 레벨당 15% 주는 데미지 증가
              dmg = Math.floor(dmg * dmgBoost);
            }
          }

          addDamage(dmg, dmgType, 'boss');

          if (mode === 'disk') {
            st.bossHp += dmg;
          } else {
            st.bossHp -= dmg;
          }

          st.bossAction = 'hit';
          st.bossAnimTimer = 0.2;
        }

        if (!charDidAttack && char.animTimer > 0) {
          char.animTimer -= tickRate;
          if (char.animTimer <= 0) char.action = 'idle';
        }
      });

      if (mode !== 'disk') {
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

          let finalTakenDamage = bossAtkValue;
          if (mode === 'tower') {
            const isFrontRow = target.slotIndex === 1 || target.slotIndex === 3;
            if (isFrontRow) {
              const level = towerSlotLevels[target.slotIndex];
              const dmgReduction = 1 - Math.min(0.8, level * 0.05); // 레벨당 5% 감소, 최대 80% 제한
              finalTakenDamage = Math.max(1, Math.floor(finalTakenDamage * dmgReduction));
            }
          }

          target.hp -= finalTakenDamage;
          addDamage(finalTakenDamage, 'enemy', 'ally');

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
      }

      if (st.bossAnimTimer > 0) {
        st.bossAnimTimer -= tickRate;
        if (st.bossAnimTimer <= 0) st.bossAction = 'idle';
      }

      const oldLen = st.dmgTexts.length;
      st.dmgTexts = st.dmgTexts.filter(d => now - d.createdAt < 800);
      if (st.dmgTexts.length !== oldLen || dmgAdded) {
        setDamageTexts([...st.dmgTexts]);
      }

      if (mode === 'disk') {
        setDiskTimeLeft(prev => {
          const nextTime = prev - 100; 
          if (nextTime <= 0) {
            st.isFighting = false;
            setCombatState('disk_end');
            useGameStore.getState().consumeDiskTicket(); // 티켓 차감
            finishGoldenDisk(st.bossHp);
            return 0;
          }
          return nextTime;
        });
        setDiskAccumulatedDmg(st.bossHp);
      } else if (mode === 'tower') {
        if (st.bossHp <= 0) {
          st.bossHp = 0;
          st.isFighting = false;
          setCombatState('tower_win');
        } else if (st.chars.every(c => c.hp <= 0)) {
          st.isFighting = false;
          setCombatState('game_over');
        }
      } else {
        if (st.bossHp <= 0) {
          st.bossHp = 0;
          st.isFighting = false;
          setCombatState('boss_dead');
          setTimeout(goToNextBoss, 1500);
        } else if (st.chars.every(c => c.hp <= 0)) {
          st.isFighting = false;
          setCombatState('game_over');
        }
      }

      setBossHp(Math.max(0, Math.floor(st.bossHp)));
      setBossAction(st.bossAction);

      const nextUiChars = [null, null, null, null] as any;
      st.chars.forEach(c => {
        if (c) nextUiChars[c.slotIndex] = c;
      });
      setUiChars(nextUiChars);

    }, baseInterval);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bossAtkValue, isSpeedUp]);

  return (
    <div className="combat-screen-overlay">
      <div className="combat-header">
        <h2>
          {mode === 'disk' ? '황금 디스크의 방' : 
           mode === 'tower' ? `최강자의 탑 - ${towerFloor}층 도전` :
           `채팅창 방어전 - 스테이지 ${currentStage} (${bossIndex}/3)`}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {mode === 'disk' && (
            <div style={{ color: '#f1c40f', fontSize: '1.5rem', fontWeight: 'bold', textShadow: '2px 2px 4px #000' }}>
              남은 시간: {Math.ceil(diskTimeLeft / 1000)}초
            </div>
          )}
          {bossSkillUnlocked && currentTime < bossSkillCooldownEnd && mode === 'normal' && (
            <div className="combat-skill-cd-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '8px', border: '1px solid #555' }}>
              <img src={skill1Image} alt="boss-skill" style={{ width: '30px', height: '30px', borderRadius: '4px', filter: 'grayscale(100%)' }} />
              <span style={{ color: '#ff4757', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.2rem' }}>
                {Math.ceil((bossSkillCooldownEnd - currentTime) / 1000)}s
              </span>
            </div>
          )}
          <button className="combat-close-btn" onClick={onClose}>사옥으로 돌아가기</button>
        </div>
      </div>

      <div style={{ position: 'absolute', top: '90px', left: '40px', right: '40px', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setIsSpeedUp(!isSpeedUp)}
          style={{
            background: isSpeedUp ? '#ff4757' : '#333',
            color: 'white', border: '2px solid #555', borderRadius: '8px', padding: '8px 16px',
            cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)', transition: 'all 0.2s'
          }}
        >
          ⏩ 2배속 {isSpeedUp ? 'ON' : 'OFF'}
        </button>

        {mode === 'disk' && (
          <div style={{ 
            background: 'rgba(0,0,0,0.7)', 
            padding: '8px 16px', 
            borderRadius: '8px', 
            border: '1px solid #555',
            color: '#ccc',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}>
            🏆 이전 최고 기록: <span style={{ color: '#f1c40f' }}>{initialMaxDiskDamage.toLocaleString()}</span>
          </div>
        )}
      </div>

      {combatState === 'game_over' && (
        <div className="game-over-overlay">
          <h1>방어 실패...</h1>
          <p>{mode === 'tower' ? '탑의 적들이 너무 강합니다. 스펙을 올리고 슬롯을 갱신하세요.' : '악플러들에게 멘탈이 깨졌습니다.'}</p>
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
            <button className="combat-close-btn" onClick={() => {
              if (mode === 'tower') finishTowerFloor(false);
              onClose();
            }}>
              사옥으로 돌아가기
            </button>
            {mode === 'normal' && currentStage >= 30 && (
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

      {combatState === 'tower_win' && (
        <div className="game-over-overlay">
          <h1 style={{ color: '#2ecc71' }}>{towerFloor}층 돌파!</h1>
          <p>{towerFloor % 5 === 0 ? '강력한 보스를 처치하고 보상을 획득했습니다!' : '다음 층으로 나아갈 수 있습니다.'}</p>
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
            <button className="combat-close-btn" style={{ background: '#2980b9' }} onClick={() => {
              finishTowerFloor(true);
              onClose(); // 닫고 유저가 직접 모달 열어서 확인하도록
            }}>
              돌아가서 보상 확인
            </button>
          </div>
        </div>
      )}

      {combatState === 'disk_end' && (
        <div className="game-over-overlay" style={{ background: 'rgba(0,0,0,0.9)' }}>
          <h1 style={{ color: '#f1c40f', fontSize: '3rem' }}>측정 종료!</h1>
          <div style={{ fontSize: '1.5rem', color: 'white', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
            <div>이번 누적 데미지: <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{formatDamage(diskAccumulatedDmg)}</span></div>
            <div>이전 최고 기록: <span style={{ color: '#aaa' }}>{formatDamage(initialMaxDiskDamage)}</span></div>
            <div style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.8rem', marginTop: '10px' }}>
              {diskAccumulatedDmg > initialMaxDiskDamage ? '기록 갱신! 🎉' : '보상 획득 완료!'}
            </div>
            <div style={{ fontSize: '1.2rem' }}>
              획득한 음표: <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>🎵 {Math.floor(diskAccumulatedDmg / 10000).toLocaleString()}</span> 개
            </div>
          </div>
          <button className="combat-close-btn" style={{ marginTop: '30px', fontSize: '1.2rem', padding: '15px 30px' }} onClick={onClose}>
            사옥으로 돌아가기
          </button>
        </div>
      )}

      <div className="battlefield">
        {damageTexts.map(dmg => (
          <div
            key={dmg.id}
            className={`floating-damage dmg-${dmg.type}`}
            style={{ left: `${dmg.x}%`, top: `${dmg.y}%` }}
          >
            {formatDamage(dmg.value)}
          </div>
        ))}

        <div className="ally-zone">
          <div className="ally-party-grid">
            {uiChars.map((char, index) => {
              if (!char) {
                return (
                  <div key={`empty-slot-${index}`} className="ally-character-wrapper" style={{ visibility: 'hidden' }}>
                  </div>
                );
              }

              const isDead = char.hp <= 0;
              const isCeoLinked = char.id === ceoLinkedCharId;

              let spriteUrl = getCombatImageUrl(char.id, 'ready');
              if (combatState === 'entering') {
                spriteUrl = getFrameUrl(`${char.id}_walk (${walkFrame}).png`) || spriteUrl;
              } else if (char.action === 'attack' || char.action === 'burst') {
                spriteUrl = getCombatImageUrl(char.id, 'atk');
              }

              return (
                <div key={index} className={`ally-character-wrapper ${char.action !== 'idle' ? `ally-${char.action}` : ''} ${isDead ? 'dead-slot' : ''} ${isCeoLinked && !isDead && mode === 'normal' ? 'ceo-aura' : ''}`}>
                  <img src={spriteUrl} alt="ally" className="ally-sprite" />
                  <div className="ally-name">{char.name}</div>

                  <div className="char-hp-bar-container">
                    <div className="char-hp-fill" style={{ width: `${Math.max(0, Math.min(100, (char.hp / char.maxHp) * 100)) || 0}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="enemy-zone">
          {combatState !== 'boss_dead' && combatState !== 'tower_win' ? (() => {
            let bossSpriteUrl = getEnemyImageUrl(currentBoss.id, 'stay');
            if (bossAction === 'attack' && mode !== 'disk') {
              bossSpriteUrl = getEnemyImageUrl(currentBoss.id, `atk${stateRef.current.bossAtkFrame}` as 'atk1' | 'atk2');
            }

            return (
              <div className={`boss-character-wrapper boss-${combatState} boss-${bossAction}`}>
                {mode === 'disk' ? (
                  <div className="disk-dmg-container" style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ color: '#f1c40f', fontSize: '1.2rem', fontWeight: 'bold' }}>누적 데미지</div>
                    <div style={{ color: 'white', fontSize: '2.5rem', fontWeight: '900', textShadow: '2px 2px 4px #000' }}>
                      {formatDamage(bossHp)}
                    </div>
                  </div>
                ) : (
                  <div className="boss-hp-bar-container">
                    <div className="boss-hp-fill" style={{ width: `${(bossHp / bossMaxHpValue) * 100}%` }}></div>
                    <span className="boss-hp-text">{formatDamage(bossHp)} / {formatDamage(bossMaxHpValue)}</span>
                  </div>
                )}
                
                <img 
                  src={bossSpriteUrl} 
                  alt="boss" 
                  className="boss-sprite" 
                  style={{ 
                    filter: mode === 'disk' ? 'drop-shadow(0 0 10px rgba(241,196,15,0.8))' : 
                            mode === 'tower' ? 'drop-shadow(0 0 10px rgba(255,0,0,0.5)) hue-rotate(-20deg) saturate(150%)' : 'none' 
                  }} 
                />
                
                <h3 className="boss-name">
                  {mode === 'disk' ? '황금 디스크' : 
                   mode === 'tower' ? `${currentBoss.name}` : 
                   `${currentBoss.name} Lv.${currentStage}`}
                </h3>
                
                {mode !== 'disk' && (
                  <div className="boss-stats">공격력: {formatDamage(bossAtkValue)}</div>
                )}
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