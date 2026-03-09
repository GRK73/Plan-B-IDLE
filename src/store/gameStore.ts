import { create } from 'zustand';
import { BaseDirectory, readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { CHARACTER_DATA } from '../data/characters';

export interface Stats {
  vocal: number;
  rap: number;
  dance: number;
  sense: number;
  charm: number;
}

export interface OwnedCharacter {
  id: string;
  points: number;
  stats: Stats;
  caps: Stats;
  permanentBonus: Stats; // 사장 스킬로 얻은 영구 보너스
}

export interface PermanentBuffs {
  startPoongLevel: number;
  tpsMultiplierLevel: number;
  ruleBreakerLevel: number;
  hardTrainingLevel: number;
  bossSkillBoostLevel: number; // 빕어 스킬 강화
  ceoSkillBoostLevel: number;  // 대표 스킬 강화
  gachaDiscountLevel: number;  // 가차 비용 할인
  vipGachaLevel: number;       // VIP 멤버십 (확률 증가)
  enemyHpNerfLevel: number;    // 보스 체력 너프
  enemyAtkNerfLevel: number;   // 보스 공격력 너프
}

interface GameState {
  poong: number;
  tat: number; // 환생 재화 '탓'
  permanentBuffs: PermanentBuffs;
  ownedCharacters: Record<string, OwnedCharacter>;
  activeRoster: string[]; // 현재 화면에 출근한 캐릭터 ID 목록 (최대 10명)
  totalTps: number;
  
  // 가차 시스템 상태
  gachaLevel: number;
  totalRolls: number;

  // 전투 시스템 상태
  combatParty: string[]; // 방어전 참여 멤버 (최대 4명)
  currentStage: number;

  // 스킬 시스템 상태
  bossSkillUnlocked: boolean;
  bossSkillCooldownEnd: number;
  ceoSkillUnlocked: boolean;
  ceoLinkedCharId: string | null;
  ceoLinkedStat: keyof Stats | null;
  oshiSkillUnlocked: boolean;
  oshiLinkedCharId: string | null;

  // Actions
  addPoong: (amount: number) => void;
  unlockCharacter: (id: string) => void;
  investStat: (charId: string, statType: keyof Stats) => void;
  autoDistributeSingleStats: (charId: string) => void;
  autoDistributeAllStats: () => void; // 일괄 배분
  doBreakthrough: (charId: string) => void; // 한계 돌파
  autoBreakthroughAll: () => void; // 일괄 돌파
  toggleRoster: (charId: string) => void; // 출근/퇴근 토글
  setCombatParty: (party: string[]) => void; // 파티 설정
  nextStage: () => void;
  calculateTps: () => void;
  gameTick: () => void;
  pullGacha: (times: number | 'max') => string[];
  
  // 스킬 Actions
  unlockBossSkill: () => void;
  useBossSkill: (charId: string) => void;
  unlockCeoSkill: () => void;
  linkCeoSkill: (charId: string | null) => void;
  unlockOshiSkill: () => void;
  linkOshiSkill: (charId: string | null) => void;
  
  // 환생 Actions
  doRebirth: () => void;
  buyBuff: (buffName: keyof PermanentBuffs) => void;

  // 세이브/로드 Actions
  initGame: () => Promise<void>;
  saveGame: () => Promise<void>;
  resetGame: () => Promise<void>;
}

// 등급별 초기 포인트 (고등급일수록 첨 획득시 더 많은 포인트 지급)
const getStartingPoints = (tier: string): number => {
  switch (tier) {
    case 'SR': return 40;
    case 'R': return 25;
    case 'U': return 15;
    case 'C': default: return 10;
  }
};

// 등급별 스탯 효율 배율 (최종 뻥튀기용)
export const getTierMultiplier = (charId: string): number => {
  const state = useGameStore.getState();
  if (state.oshiLinkedCharId === charId) return 4.5; // Oshi is between R(3) and SR(6)

  const charInfo = CHARACTER_DATA.find(c => c.id === charId);
  if (!charInfo) return 1.0;
  switch (charInfo.tier) {
    case 'SR': return 6.0;
    case 'R': return 3.0;
    case 'U': return 1.5;
    case 'C': default: return 1.0;
  }
};

export const getHpMultiplier = (charId: string): number => {
  const state = useGameStore.getState();
  if (state.oshiLinkedCharId === charId) return 1.75; // Oshi is between R(1.5) and SR(2.0)

  const charInfo = CHARACTER_DATA.find(c => c.id === charId);
  if (!charInfo) return 1.0;
  switch (charInfo.tier) {
    case 'SR': return 2.0;
    case 'R': return 1.5;
    case 'U': return 1.2;
    case 'C': default: return 1.0;
  }
};

export const getEffectiveStats = (state: GameState, charId: string): Stats => {
  const char = state.ownedCharacters[charId];
  if (!char) return { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 };
  const stats = { ...char.stats };
  if (state.ceoLinkedCharId === charId) {
    const ceoBoost = 10 + (state.permanentBuffs.ceoSkillBoostLevel * 20); // Revamped CEO Boost (+20 per level)
    stats.vocal += ceoBoost;
    stats.rap += ceoBoost;
    stats.dance += ceoBoost;
    stats.sense += ceoBoost;
    stats.charm += ceoBoost;
  }
  
  // 환생 버프 곱연산 적용을 제외한 "순수 스탯 합산치"만 넘깁니다. 
  // 등급별 배율(TierMultiplier)은 여기서 바로 곱하지 않고, TPS나 전투 데미지를 계산하는 최상위(최종) 단계에서만 곱해야 체급 차이가 부각됩니다.
  return {
    vocal: stats.vocal,
    rap: stats.rap,
    dance: stats.dance,
    sense: stats.sense,
    charm: stats.charm,
  };
};

const calcCharTps = (stats: Stats, buffs: PermanentBuffs, charId: string) => {
  // 로그 기반 제한 
  let baseVocal = 0;
  if (stats.vocal <= 100) baseVocal = stats.vocal * 10;
  else baseVocal = 1000 + (Math.log10(stats.vocal - 99) * 200);
  
  const base = Math.max(1, baseVocal);
  // Revamped Rule Breaker (+5% hardcap per level)
  const critChance = Math.min((stats.sense * 1) / 100, 0.5 + (buffs.ruleBreakerLevel * 0.05));
  // Revamped Rule Breaker (+0.5x critical multiplier per level)
  const critMult = 1.5 + (Math.log10(stats.rap + 10) * 0.3) + (buffs.ruleBreakerLevel * 0.5); 
  const finalMult = 1.0 + (stats.charm * 0.03); 
  const interval = 1 / (0.8 + Math.log10(stats.dance + 10) * 0.2);
  
  const expectedValuePerTick = (base * (1 - critChance)) + (base * critMult * critChance);
  const tps = (expectedValuePerTick * finalMult) / interval;
  
  const rebirthMult = 1.0 + (buffs.tpsMultiplierLevel * 2.0); // 1레벨당 +200%
  const tierMult = getTierMultiplier(charId);
  
  return tps * rebirthMult * tierMult;
};

// 가차 레벨 업데이트 로직 
const calculateGachaLevel = (rolls: number): number => {
  if (rolls >= 5000) return 6;
  if (rolls >= 2000) return 5;
  if (rolls >= 1000) return 4;
  if (rolls >= 500) return 3;
  if (rolls >= 100) return 2;
  return 1;
};

// 랜덤 초기 지급 캐릭터 선택 헬퍼
const getRandomStarter = () => {
  const cTier = CHARACTER_DATA.filter(c => c.tier === 'C');
  const idx = Math.floor(Math.random() * cTier.length);
  return cTier[idx];
};

const _starter = getRandomStarter();

export const useGameStore = create<GameState>((set, get) => ({
  poong: 10000, // 초기 자본금
  tat: 0,
  permanentBuffs: {
    startPoongLevel: 0,
    tpsMultiplierLevel: 0,
    ruleBreakerLevel: 0,
    hardTrainingLevel: 0,
    bossSkillBoostLevel: 0,
    ceoSkillBoostLevel: 0,
    gachaDiscountLevel: 0,
    vipGachaLevel: 0,
    enemyHpNerfLevel: 0,
    enemyAtkNerfLevel: 0
  },
  ownedCharacters: {
    [_starter.id]: {
      id: _starter.id,
      points: 10,
      stats: { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 },
      caps: { vocal: _starter.baseCap, rap: _starter.baseCap, dance: _starter.baseCap, sense: _starter.baseCap, charm: _starter.baseCap },
      permanentBonus: { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 }
    }
  },
  activeRoster: [_starter.id], // 초기 지급 캐릭터 출근 상태
  totalTps: 0,
  gachaLevel: 1,
  totalRolls: 0,
  combatParty: [_starter.id],
  currentStage: 1,
  bossSkillUnlocked: false,
  bossSkillCooldownEnd: 0,
  ceoSkillUnlocked: false,
  ceoLinkedCharId: null,
  ceoLinkedStat: null,
  oshiSkillUnlocked: false,
  oshiLinkedCharId: null,

  addPoong: (amount) => set((state) => ({ poong: state.poong + amount })),

  unlockBossSkill: () => set((state) => {
    if (state.poong >= 10000 && !state.bossSkillUnlocked) {
      return { poong: state.poong - 10000, bossSkillUnlocked: true };
    }
    return state;
  }),

  useBossSkill: (charId) => set((state) => {
    const now = Date.now();
    if (!state.bossSkillUnlocked || now < state.bossSkillCooldownEnd) return state;

    const char = state.ownedCharacters[charId];
    if (!char) return state;

    const statKeys: Array<keyof Stats> = ['vocal', 'rap', 'dance', 'sense', 'charm'];
    const randomKey = statKeys[Math.floor(Math.random() * statKeys.length)];
    // Revamped Boss Skill (+30 per level applied to ONE stat)
    const boostAmount = 30 + (state.permanentBuffs.bossSkillBoostLevel * 30);

    return {
      bossSkillCooldownEnd: now + 300 * 1000, 
      ownedCharacters: {
        ...state.ownedCharacters,
        [charId]: {
          ...char,
          stats: {
            ...char.stats,
            [randomKey]: char.stats[randomKey] + boostAmount
          },
          caps: {
            ...char.caps,
            [randomKey]: char.caps[randomKey] + boostAmount
          },
          permanentBonus: {
            ...char.permanentBonus,
            [randomKey]: (char.permanentBonus?.[randomKey] || 0) + boostAmount
          }
        }
      }
    };
  }),

  unlockCeoSkill: () => set((state) => {
    if (state.poong >= 50000 && !state.ceoSkillUnlocked) {
      return { poong: state.poong - 50000, ceoSkillUnlocked: true };
    }
    return state;
  }),

  linkCeoSkill: (charId) => set((state) => {
    if (!state.ceoSkillUnlocked) return state;
    if (!charId) {
      return { ceoLinkedCharId: null, ceoLinkedStat: null };
    }
    return { ceoLinkedCharId: charId, ceoLinkedStat: 'vocal' };
  }),

  unlockOshiSkill: () => set((state) => {
    if (state.poong >= 100000 && !state.oshiSkillUnlocked) {
      return { poong: state.poong - 100000, oshiSkillUnlocked: true };
    }
    return state;
  }),

  linkOshiSkill: (charId) => set((state) => {
    if (!state.oshiSkillUnlocked) return state;
    if (!charId) {
      return { oshiLinkedCharId: null };
    }
    const charData = CHARACTER_DATA.find(c => c.id === charId);
    if (!charData || (charData.tier !== 'C' && charData.tier !== 'U')) return state;
    
    return { oshiLinkedCharId: charId };
  }),

  doRebirth: () => {
    const state = get();
    if (state.currentStage < 30) return;

    const earnedTat = (state.currentStage - 30) * 10;

    // 랜덤 초기 캐릭터 선택
    const starter = getRandomStarter();
    const startPoong = 10000 + (state.permanentBuffs.startPoongLevel * 10000);

    set({
      tat: state.tat + earnedTat,
      poong: startPoong,
      totalTps: 0,
      ownedCharacters: {
        [starter.id]: {
          id: starter.id,
          points: 10,
          stats: { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 },
          caps: { vocal: starter.baseCap, rap: starter.baseCap, dance: starter.baseCap, sense: starter.baseCap, charm: starter.baseCap },
          permanentBonus: { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 }
        }
      },
      currentStage: 1,
      totalRolls: 0,
      gachaLevel: 1,
      activeRoster: [starter.id],
      combatParty: [starter.id],
      bossSkillCooldownEnd: 0,
      bossSkillUnlocked: false,
      ceoSkillUnlocked: false,
      oshiSkillUnlocked: false,
      ceoLinkedCharId: null,
      ceoLinkedStat: null,
      oshiLinkedCharId: null,
    });
    get().calculateTps();
  },

  buyBuff: (buffName) => set((state) => {
    const buffs = { ...state.permanentBuffs };
    let cost = 0;

    switch (buffName) {
      case 'startPoongLevel':
        cost = Math.floor(10 * (buffs.startPoongLevel + 1));
        break;
      case 'tpsMultiplierLevel':
        cost = Math.floor(30 * Math.pow(buffs.tpsMultiplierLevel + 1, 1.5));
        break;
      case 'hardTrainingLevel':
        cost = Math.floor(30 * Math.pow(buffs.hardTrainingLevel + 1, 1.5)); 
        break;
      case 'ruleBreakerLevel':
        cost = Math.floor(50 * Math.pow(buffs.ruleBreakerLevel + 1, 1.5)); 
        break;
      case 'bossSkillBoostLevel':
        cost = Math.floor(80 * Math.pow(buffs.bossSkillBoostLevel + 1, 1.5)); 
        break;
      case 'ceoSkillBoostLevel':
        cost = Math.floor(100 * Math.pow(buffs.ceoSkillBoostLevel + 1, 1.5)); 
        break;
      case 'gachaDiscountLevel':
        cost = Math.floor(80 * Math.pow(buffs.gachaDiscountLevel + 1, 1.5)); 
        break;
      case 'vipGachaLevel':
        cost = Math.floor(150 * Math.pow(buffs.vipGachaLevel + 1, 1.5)); 
        break;
      case 'enemyHpNerfLevel':
        cost = Math.floor(100 * Math.pow((buffs.enemyHpNerfLevel || 0) + 1, 1.5));
        break;
      case 'enemyAtkNerfLevel':
        cost = Math.floor(100 * Math.pow((buffs.enemyAtkNerfLevel || 0) + 1, 1.5));
        break;
    }

    if (state.tat < cost) return state;

    (buffs as any)[buffName] += 1;

    // 초기 자본금 지원 구매 시 즉시 풍 지급
    const bonusPoong = buffName === 'startPoongLevel' ? 10000 : 0;

    return {
      tat: state.tat - cost,
      poong: state.poong + bonusPoong,
      permanentBuffs: buffs
    };
  }),

  unlockCharacter: (id) => set((state) => {
    const charData = CHARACTER_DATA.find(c => c.id === id);
    if (!charData) return state;

    const existing = state.ownedCharacters[id];
    if (existing) {
      return {
        ownedCharacters: {
          ...state.ownedCharacters,
          [id]: { ...existing, points: existing.points + 1 }
        }
      };
    }

    // 신규 획득 시, 로스터 자리가 비어있으면 자동 출근
    const newRoster = [...state.activeRoster];
    if (newRoster.length < 10 && !newRoster.includes(id)) {
      newRoster.push(id);
    }

    // 전투 파티 자리가 비어있으면 자동 배치 (최대 4명)
    const newParty = [...state.combatParty];
    if (newParty.length < 4 && !newParty.includes(id)) {
      newParty.push(id);
    }

    // 신규 획득: 등급별 초기 포인트 지급
    const startPts = getStartingPoints(charData.tier);

    return {
      ownedCharacters: {
        ...state.ownedCharacters,
        [id]: {
          id,
          points: startPts,
          stats: { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 },
          caps: { 
            vocal: charData.baseCap, 
            rap: charData.baseCap, 
            dance: charData.baseCap, 
            sense: charData.baseCap, 
            charm: charData.baseCap 
          },
          permanentBonus: { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 }
        }
      },
      activeRoster: newRoster,
      combatParty: newParty
    };
  }),

  toggleRoster: (charId) => set((state) => {
    const isWorking = state.activeRoster.includes(charId);
    if (isWorking) {
      // 퇴근
      return { activeRoster: state.activeRoster.filter(id => id !== charId) };
    } else {
      // 출근 (최대 10명 제한)
      if (state.activeRoster.length >= 10) return state;
      return { activeRoster: [...state.activeRoster, charId] };
    }
  }),

  setCombatParty: (party) => set({ combatParty: party }),

  nextStage: () => set((state) => ({ currentStage: state.currentStage + 1 })),

  investStat: (charId, statType) => set((state) => {
    const char = state.ownedCharacters[charId];
    if (!char || char.points <= 0) return state;
    if (char.stats[statType] >= char.caps[statType]) return state;

    return {
      ownedCharacters: {
        ...state.ownedCharacters,
        [charId]: {
          ...char,
          points: char.points - 1,
          stats: {
            ...char.stats,
            [statType]: char.stats[statType] + 1
          }
        }
      }
    };
  }),

  autoDistributeSingleStats: (charId) => {
    set((state) => {
      const newOwned = { ...state.ownedCharacters };
      const char = { ...newOwned[charId] };
      if (!char || char.points <= 0) return state;

      const newStats = { ...char.stats };
      let pts = char.points;
      let charChanged = false;
      const statKeys: Array<keyof Stats> = ['vocal', 'rap', 'dance', 'sense', 'charm'];

      let canInvest = true;
      while (pts > 0 && canInvest) {
        canInvest = false;
        let minVal = Infinity;
        let targetStat: keyof Stats | null = null;

        for (const key of statKeys) {
          if (newStats[key] < char.caps[key]) {
            canInvest = true;
            if (newStats[key] < minVal) {
              minVal = newStats[key];
              targetStat = key;
            }
          }
        }

        if (targetStat) {
          newStats[targetStat]++;
          pts--;
          charChanged = true;
        }
      }

      if (charChanged) {
        char.stats = newStats;
        char.points = pts;
        newOwned[charId] = char;
        return { ownedCharacters: newOwned };
      }
      return state;
    });
    get().calculateTps();
  },

  autoDistributeAllStats: () => {
    set((state) => {
      let changed = false;
      const newOwned = { ...state.ownedCharacters };
      const statKeys: Array<keyof Stats> = ['vocal', 'rap', 'dance', 'sense', 'charm'];

      Object.keys(newOwned).forEach(charId => {
        const char = { ...newOwned[charId] };
        const newStats = { ...char.stats };
        let pts = char.points;
        let charChanged = false;

        if (pts > 0) {
          let canInvest = true;
          while (pts > 0 && canInvest) {
            canInvest = false;
            let minVal = Infinity;
            let targetStat: keyof Stats | null = null;

            for (const key of statKeys) {
              if (newStats[key] < char.caps[key]) {
                canInvest = true;
                if (newStats[key] < minVal) {
                  minVal = newStats[key];
                  targetStat = key;
                }
              }
            }

            if (targetStat) {
              newStats[targetStat]++;
              pts--;
              charChanged = true;
              changed = true;
            }
          }

          if (charChanged) {
            char.stats = newStats;
            char.points = pts;
            newOwned[charId] = char;
          }
        }
      });

      if (changed) {
        return { ownedCharacters: newOwned };
      }
      return state;
    });
    get().calculateTps();
  },

  autoBreakthroughAll: () => {
    set((state) => {
      let changed = false;
      const newOwned = { ...state.ownedCharacters };
      const statKeys: Array<keyof Stats> = ['vocal', 'rap', 'dance', 'sense', 'charm'];

      Object.keys(newOwned).forEach(charId => {
        const char = { ...newOwned[charId] };
        const charData = CHARACTER_DATA.find(c => c.id === charId);
        if (!charData) return;

        let charChanged = false;

        while (char.points >= charData.breakthroughCost) {
          const bossBonusSum = Object.values(char.permanentBonus || {}).reduce((sum, val) => sum + val, 0);
          const totalCaps = Object.values(char.caps).reduce((sum, val) => sum + val, 0);
          const hasBrokenThrough = totalCaps > (charData.baseCap * 5) + bossBonusSum;

          const isReady = (Object.keys(char.stats) as Array<keyof Stats>).every(
            key => char.stats[key] >= char.caps[key]
          );

          if (!hasBrokenThrough && !isReady) break; // 돌파 불가

          const breakCount = Math.floor((totalCaps - charData.baseCap * 5) / charData.baseCap);
          const currentBreakCost = Math.floor(charData.breakthroughCost * Math.pow(1.1, Math.max(0, breakCount)));

          if (char.points < currentBreakCost) break;

          const randomKey = statKeys[Math.floor(Math.random() * statKeys.length)];
          char.caps = {
            ...char.caps,
            [randomKey]: char.caps[randomKey] + charData.baseCap
          };
          char.points -= currentBreakCost;
          charChanged = true;
          changed = true;
        }

        if (charChanged) {
          newOwned[charId] = char;
        }
      });

      if (changed) {
        return { ownedCharacters: newOwned };
      }
      return state;
    });
  },

  doBreakthrough: (charId) => set((state) => {
    const char = state.ownedCharacters[charId];
    const charData = CHARACTER_DATA.find(c => c.id === charId);
    if (!char || !charData) return state;

    // 보스 스킬 보너스를 제외한 순수 돌파 여부 확인
    const bossBonusSum = Object.values(char.permanentBonus || {}).reduce((sum, val) => sum + val, 0);
    const totalCaps = Object.values(char.caps).reduce((sum, val) => sum + val, 0);
    const hasBrokenThrough = totalCaps > (charData.baseCap * 5) + bossBonusSum;

    const isReady = (Object.keys(char.stats) as Array<keyof Stats>).every(
      key => char.stats[key] >= char.caps[key]
    );

    // 첫 돌파 시에만 모든 스탯 풀업 필수
    if (!hasBrokenThrough && !isReady) return state;
    const breakCount = Math.floor((totalCaps - charData.baseCap * 5) / charData.baseCap);
    const currentBreakCost = Math.floor(charData.breakthroughCost * Math.pow(1.1, Math.max(0, breakCount)));

    if (char.points < currentBreakCost) return state;

    const statKeys: Array<keyof Stats> = ['vocal', 'rap', 'dance', 'sense', 'charm'];
    const randomKey = statKeys[Math.floor(Math.random() * statKeys.length)];

    return {
      ownedCharacters: {
        ...state.ownedCharacters,
        [charId]: {
          ...char,
          points: char.points - currentBreakCost,
          caps: {
            ...char.caps,
            [randomKey]: char.caps[randomKey] + charData.baseCap
          }
        }
      }
    };
  }),

  calculateTps: () => set((state) => {
    let tps = 0;
    Object.values(state.ownedCharacters).forEach(char => {
      if (state.activeRoster.includes(char.id)) {
        tps += calcCharTps(char.stats, state.permanentBuffs, char.id);
      }
    });
    return { totalTps: tps };
  }),

  gameTick: () => set((state) => ({ poong: state.poong + state.totalTps })),

  pullGacha: (times: number | 'max') => {
    const state = get();
    // Revamped Gacha Discount: subtracts from totalRolls exponent instead of flat cost
    const rollDiscount = state.permanentBuffs.gachaDiscountLevel * 50;
    
    let pullTimes = typeof times === 'number' ? times : 10000;
    if (pullTimes <= 0) return [];

    let currentRolls = state.totalRolls;
    let currentPoong = state.poong;
    let totalSpent = 0;
    const results: string[] = [];

    for (let i = 0; i < pullTimes; i++) {
        // 적용된 할인만큼 지수 증가폭을 지연시킵니다 (최소 0 방어)
        const discountedRolls = Math.max(0, currentRolls - rollDiscount);
        const baseCost = 50 * Math.pow(1.0011, discountedRolls);
        const singleCost = Math.max(10, Math.floor(baseCost)); 

        if (currentPoong < singleCost) {
            break; // 돈이 부족하면 즉시 중단 (times가 'max'일 때 자동 정지 역할)
        }

        currentPoong -= singleCost;
        totalSpent += singleCost;
        currentRolls++;
      const currentLevel = calculateGachaLevel(currentRolls);
      
      // 등급별 가중치 설정 (각 캐릭터 1명당 확률 %)
      const levelWeights: Record<number, Record<string, number>> = {
        1: { 'C': 8.0, 'U': 2.0, 'R': 0.0, 'SR': 0.0 },
        2: { 'C': 7.2, 'U': 3.8, 'R': 1.2, 'SR': 0.0 },
        3: { 'C': 6.2, 'U': 4.8, 'R': 3.2, 'SR': 0.0 },
        4: { 'C': 5.5, 'U': 5.0, 'R': 4.6, 'SR': 0.25 },
        5: { 'C': 5.0, 'U': 4.5, 'R': 5.2, 'SR': 1.25 },
        6: { 'C': 4.5, 'U': 5.0, 'R': 5.2, 'SR': 2.5 }
      };

      const currentWeights = { ...levelWeights[currentLevel] };
      
      // VIP 멤버십 Revamp: SR 확률 고정 +1.0%p 증가 (레벨당 1%)
      const vipBonus = state.permanentBuffs.vipGachaLevel * 1.0;
      currentWeights['SR'] += vipBonus;
      currentWeights['C'] = Math.max(0, currentWeights['C'] - vipBonus);

      // 전체 풀 생성 (각 캐릭터별 가중치 부여)
      const pool: { id: string, weight: number }[] = [];
      let totalWeight = 0;

      CHARACTER_DATA.forEach(char => {
        const w = currentWeights[char.tier] || 0;
        if (w > 0) {
          pool.push({ id: char.id, weight: w });
          totalWeight += w;
        }
      });

      // 랜덤 선택
      let randomNum = Math.random() * totalWeight;
      let selectedId = pool[0].id;
      
      for (const item of pool) {
        if (randomNum < item.weight) {
          selectedId = item.id;
          break;
        }
        randomNum -= item.weight;
      }
      
      results.push(selectedId);
      // 스토어의 unlockCharacter 호출하여 즉시 반영
      get().unlockCharacter(selectedId);
    }

    // 상태 최종 업데이트
    set({
      poong: state.poong - totalSpent,
      totalRolls: currentRolls,
      gachaLevel: calculateGachaLevel(currentRolls),
    });

    get().calculateTps(); // TPS 재계산
    return results;
  },

  initGame: async () => {
    try {
      const hasDir = await exists('', { baseDir: BaseDirectory.AppData });
      if (!hasDir) {
        await mkdir('', { baseDir: BaseDirectory.AppData, recursive: true });
      }

      const hasSave = await exists('save.json', { baseDir: BaseDirectory.AppData });
      if (hasSave) {
        const contents = await readTextFile('save.json', { baseDir: BaseDirectory.AppData });
        const savedState = JSON.parse(contents);
        
        if (savedState.permanentBuffs) {
          savedState.permanentBuffs.enemyHpNerfLevel = savedState.permanentBuffs.enemyHpNerfLevel || 0;
          savedState.permanentBuffs.enemyAtkNerfLevel = savedState.permanentBuffs.enemyAtkNerfLevel || 0;
        }

        set({ ...savedState });
        get().calculateTps();
        console.log("Game loaded from AppData/save.json");
      } else {
        await get().saveGame();
        console.log("Created fresh save.json in AppData");
      }
    } catch (e) {
      console.error("Failed to init game data:", e);
    }
  },

  saveGame: async () => {
    try {
      const state = get();
      // 저장 대상에서 actions들은 제외하고 순수 데이터만 추출
      const { 
        poong, tat, permanentBuffs, ownedCharacters, activeRoster, 
        gachaLevel, totalRolls, combatParty, currentStage, 
        bossSkillUnlocked, bossSkillCooldownEnd, ceoSkillUnlocked, 
        ceoLinkedCharId, ceoLinkedStat, oshiSkillUnlocked, oshiLinkedCharId
      } = state;
      
      const dataToSave = {
        poong, tat, permanentBuffs, ownedCharacters, activeRoster, 
        gachaLevel, totalRolls, combatParty, currentStage, 
        bossSkillUnlocked, bossSkillCooldownEnd, ceoSkillUnlocked, 
        ceoLinkedCharId, ceoLinkedStat, oshiSkillUnlocked, oshiLinkedCharId
      };

      await writeTextFile('save.json', JSON.stringify(dataToSave), { baseDir: BaseDirectory.AppData });
      console.log("Game saved manually/automatically.");
    } catch (e) {
      console.error("Failed to save game data:", e);
    }
  },

  resetGame: async () => {
    try {
      // 랜덤 초기 캐릭터
      const starter = getRandomStarter();
      const initialState = {
        poong: 10000, // 초기 자본금
        tat: 0,
        permanentBuffs: {
          startPoongLevel: 0, tpsMultiplierLevel: 0, ruleBreakerLevel: 0,
          hardTrainingLevel: 0, bossSkillBoostLevel: 0, ceoSkillBoostLevel: 0,
          gachaDiscountLevel: 0, vipGachaLevel: 0,
          enemyHpNerfLevel: 0, enemyAtkNerfLevel: 0
        },
        ownedCharacters: {
          [starter.id]: {
            id: starter.id,
            points: 10,
            stats: { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 },
            caps: { vocal: starter.baseCap, rap: starter.baseCap, dance: starter.baseCap, sense: starter.baseCap, charm: starter.baseCap },
            permanentBonus: { vocal: 0, rap: 0, dance: 0, sense: 0, charm: 0 }
          }
        },
        activeRoster: [starter.id],
        totalTps: 0,
        gachaLevel: 1,
        totalRolls: 0,
        combatParty: [starter.id],
        currentStage: 1,
        bossSkillUnlocked: false,
        bossSkillCooldownEnd: 0,
        ceoSkillUnlocked: false,
        ceoLinkedCharId: null,
        ceoLinkedStat: null,
        oshiSkillUnlocked: false,
        oshiLinkedCharId: null,
      };

      set({ ...initialState });
      get().calculateTps();
      // 초기화된 데이터 덮어쓰기
      await writeTextFile('save.json', JSON.stringify(initialState), { baseDir: BaseDirectory.AppData });
      console.log("Game data reset completely.");
    } catch (e) {
      console.error("Failed to reset game data:", e);
    }
  }
}));

