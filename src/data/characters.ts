export type Tier = 'SR' | 'R' | 'U' | 'C';

export interface CharacterBase {
  id: string;
  name: string;
  tier: Tier;
  baseCap: number;
  breakthroughCost: number;
}

export const CHARACTER_DATA: CharacterBase[] = [
  // 정식 멤버 (SR)
  { id: 'hansegin', name: '한세긴', tier: 'SR', baseCap: 40, breakthroughCost: 25 },
  { id: 'navi', name: '나비', tier: 'SR', baseCap: 40, breakthroughCost: 25 },
  { id: 'songbam', name: '송밤', tier: 'SR', baseCap: 40, breakthroughCost: 25 },
  { id: 'kanghee', name: '크앙희', tier: 'SR', baseCap: 40, breakthroughCost: 25 },

  // 연습생 1기 (R)
  { id: 'hobal', name: '호발', tier: 'R', baseCap: 25, breakthroughCost: 15 },
  { id: 'bambe', name: '밤베', tier: 'R', baseCap: 25, breakthroughCost: 15 },
  { id: 'yoomroro', name: '윰로로', tier: 'R', baseCap: 25, breakthroughCost: 15 },
  { id: 'jjiro', name: '찌로', tier: 'R', baseCap: 25, breakthroughCost: 15 },
  { id: 'peha', name: '프하', tier: 'R', baseCap: 25, breakthroughCost: 15 },

  // 연습생 2기 (U)
  { id: 'gongdori', name: '공도리', tier: 'U', baseCap: 15, breakthroughCost: 10 },
  { id: 'hansehyun', name: '한세현', tier: 'U', baseCap: 15, breakthroughCost: 10 },

  // 연습생 3기 (C)
  { id: 'kimsomnya', name: '김솜냐', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'dope', name: '도페', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'runna', name: '룬나', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'reapersuk', name: '리퍼석', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'marihee', name: '마리히', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'bammoon', name: '밤문', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'beaksora', name: '백소라', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'yonaka', name: '요나카', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'yoonseram', name: '윤세람', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'yuriae', name: '유리에', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'zio', name: '지오', tier: 'C', baseCap: 10, breakthroughCost: 5 },
  { id: 'hamjjugu', name: '햄쩌구', tier: 'C', baseCap: 10, breakthroughCost: 5 },
];
