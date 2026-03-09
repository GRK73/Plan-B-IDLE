const cardImages = import.meta.glob('../assets/images/*_card.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const badgeImages = import.meta.glob('../assets/images/*.{png,PNG}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const combatImages = import.meta.glob('../assets/combat/*.{png,PNG}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const frameImages = import.meta.glob('../assets/game_frames/**/*.{png,PNG}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const enemyImages = import.meta.glob('../assets/enemy/*.{png,PNG}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

import testSdImage from '../assets/images/test-sd.png';

export const getCardImageUrl = (charId: string) => {
  const searchId = charId === 'yoomroro' ? 'yumroro' : charId;
  const key = Object.keys(cardImages).find(k => k.toLowerCase().includes(`${searchId}_card`));
  return key ? cardImages[key] : testSdImage;
};

export const getTierBadgeUrl = (tier: string) => {
  let filename = 'trainee_3.png';
  if (tier === 'SR') filename = 'planb';
  else if (tier === 'R') filename = 'trainee_1';
  else if (tier === 'U') filename = 'trainee_2';
  else if (tier === 'C') filename = 'trainee_3';

  const key = Object.keys(badgeImages).find(k => k.toLowerCase().includes(filename.toLowerCase()));
  return key ? badgeImages[key] : testSdImage;
};

export const getUiImage = (filename: string) => {
  const key = Object.keys(badgeImages).find(k => k.toLowerCase().includes(filename.toLowerCase()));
  return key ? badgeImages[key] : '';
};

export const getCombatImageUrl = (charId: string, type: 'ready' | 'atk') => {
  let key = Object.keys(combatImages).find(k => k.toLowerCase().includes(`${charId}_${type}`));
  
  if (!key && type === 'ready' && charId === 'marihee') {
    key = Object.keys(combatImages).find(k => k.toLowerCase().includes(`marihee_raedy`));
  }
  
  return key ? combatImages[key] : testSdImage;
};

export const getFrameUrl = (filename: string) => {
  const lowerFilename = filename.toLowerCase();
  const key = Object.keys(frameImages).find(k => k.toLowerCase().endsWith(lowerFilename));
  return key ? frameImages[key] : null;
};

export const getEnemyImageUrl = (name: string, type: 'stay' | 'atk1' | 'atk2') => {
  const key = Object.keys(enemyImages).find(k => k.toLowerCase().includes(`${name}_${type}`));
  return key ? enemyImages[key] : testSdImage;
};