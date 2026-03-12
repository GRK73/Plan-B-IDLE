import { useState, useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import skill1Image from './assets/images/skill1.png';
import skill2Image from './assets/images/skill2.png';
import poongIcon from './assets/images/poong-icon.png';
import { useGameStore } from './store/gameStore';
import { CHARACTER_DATA } from './data/characters';
import { GachaResultModal } from './components/GachaModal';
import { GachaProbModal } from './components/GachaProbModal';
import { CollectionModal } from './components/CollectionModal';
import { StatModal } from './components/StatModal';
import { CombatScreen } from './components/CombatScreen';
import { PartySetupModal } from './components/PartySetupModal';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { RebirthModal } from './components/RebirthModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';
import { LeaderboardModal } from './components/LeaderboardModal';
import { NicknameModal } from './components/NicknameModal';
import { GoldenDiskModal } from './components/GoldenDiskModal';
import { TowerModal } from './components/TowerModal';
import ticketIcon from './assets/images/ticket.PNG';
import bookIcon from './assets/images/book.PNG';
import backgroundImg from './assets/images/backgroud.png';
import backgroundImg2 from './assets/images/background2.PNG';
import skill3Image from './assets/images/skill3.png';
import goldenNoteIcon from './assets/images/golden_note.png';
import towerIcon from './assets/images/tower.png';
import { getFrameUrl, getUiImage } from './utils/assets';
import './App.css';

const getStartFrame = (id: string) => {
  if (['dope', 'kanghee'].includes(id)) return 5;
  if (['bammoon', 'beaksora', 'hansegin', 'hansehyun', 'hobal', 'jjiro', 'kimsomnya', 'marihee', 'navi', 'peha', 'reapersuk', 'yoonseram', 'yuriae', 'zio'].includes(id)) return 6;
  if (['bambe', 'gongdori', 'hamjjugu', 'runna', 'songbam'].includes(id)) return 7;
  if (['yonaka'].includes(id)) return 8;
  if (['yoomroro'].includes(id)) return 9;
  return 1;
};

type ViewMode = 'normal' | 'chroma' | null;
type ModalType = 'gachaResult' | 'collection' | 'partySetup' | 'gachaProb' | 'rebirth' | 'stat' | 'charInfo' | 'leaderboard' | 'goldenDisk' | 'tower' | null;
type SkillTargetMode = 'boss' | 'ceo' | 'oshi' | null;

interface CharEntity {
  container: PIXI.Container;
  spriteContainer: PIXI.Container;
  walkSprite: PIXI.AnimatedSprite;
  staySprite: PIXI.Sprite;
  speed: number;
  dirX: number;
  dirY: number;
  state: 'walking' | 'stopped';
  stateTimer: number;
}

const formatCompact = (num: number) => {
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.floor(num));
};

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [closingModal, setClosingModal] = useState<ModalType>(null);
  const [confirmConfig, setConfirmConfig] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const [isStatOpen, setIsStatOpen] = useState(false);
  const [isStatClosing, setIsStatClosing] = useState(false);

  const [isCombatOpen, setIsCombatOpen] = useState(false);
  const [combatMode, setCombatMode] = useState<'normal' | 'disk' | 'tower'>('normal');
  const [isGachaMenuOpen, setIsGachaMenuOpen] = useState(false);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [pendingRebirthAction, setPendingRebirthAction] = useState<'skill' | 'combat' | null>(null);
  const [skillTargetMode, setSkillTargetMode] = useState<SkillTargetMode>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [introStep, setIntroStep] = useState(0);

  useEffect(() => {
    if (viewMode === null) {
      setTimeout(() => setIntroStep(1), 300);
      setTimeout(() => setIntroStep(2), 1000);
      setTimeout(() => setIntroStep(3), 1700);
    }
  }, [viewMode]);

  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [gachaResults, setGachaResults] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pixiContainer = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const charEntitiesRef = useRef<CharEntity[]>([]);
  const [pixiReady, setPixiReady] = useState(false);

  const {
    poong, tat, musicalNotes, totalTps, calculateTps, gameTick, pullGacha, gachaLevel, totalRolls,
    bossSkillUnlocked, bossSkillCooldownEnd, unlockBossSkill, useBossSkill,
    ceoSkillUnlocked, ceoLinkedCharId, unlockCeoSkill, linkCeoSkill,
    oshiSkillUnlocked, oshiLinkedCharId, unlockOshiSkill, linkOshiSkill,
    permanentBuffs, currentStage, doRebirth, initGame, saveGame, resetGame,
    setNickname
  } = useGameStore();

  const activeRoster = useGameStore(state => state.activeRoster);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    const saveTimer = setInterval(() => {
      saveGame();
    }, 60000); // 1분마다 자동 저장 (토스트 없음)

    return () => {
      clearInterval(timer);
      clearInterval(saveTimer);
    };
  }, [saveGame]);

  const handleOpenModal = (type: ModalType) => {
    setActiveModal(type);
    setClosingModal(null);
  };


  const handleCloseModal = () => {
    setClosingModal(activeModal);
    setTimeout(() => {
      setActiveModal(null);
      setClosingModal(null);
    }, 250); // CSS 애니메이션 시간과 맞춤
  };

  const handleOpenStat = (id: string) => {
    setSelectedCharId(id);
    setIsStatOpen(true);
    setIsStatClosing(false);
  };

  const handleCloseStat = () => {
    setIsStatClosing(true);
    setTimeout(() => {
      setIsStatOpen(false);
      setIsStatClosing(false);
    }, 250);
  };

  const handleGacha = (times: number | 'max') => {
    const discount = permanentBuffs.gachaDiscountLevel * 5;
    const singleCost = Math.max(10, 100 - discount);
    const requiredPoong = times === 'max' ? singleCost : times * singleCost;

    if (poong < requiredPoong) {
      setToastMessage('풍이 부족합니다.');
      return;
    }
    const results = pullGacha(times);
    setGachaResults(results);
    setIsGachaMenuOpen(false);
    if (activeModal !== 'gachaResult') {
      handleOpenModal('gachaResult');
    }
  };

  const handleSkillSelect = (charId: string) => {
    if (skillTargetMode === 'boss') {
      useBossSkill(charId);
      setToastMessage('숙제 스탯 펌핑 완료! (랜덤 스탯 대폭 증가)');
    } else if (skillTargetMode === 'ceo') {
      linkCeoSkill(charId);
      setToastMessage('대표의 편애가 적용되었습니다! (모든 스탯 +10)');
    } else if (skillTargetMode === 'oshi') {
      const charInfo = CHARACTER_DATA.find(c => c.id === charId);
      if (charInfo) {
        linkOshiSkill(charId);
        setToastMessage(`[${charInfo.name}] 사원이 최애로 지정되었습니다!`);
      }
    }
    calculateTps();
    setSkillTargetMode(null);
  };

  // 1초마다 풍 생산 (게임 틱)
  useEffect(() => {
    if (!viewMode) return;
    calculateTps();
    const interval = setInterval(() => {
      gameTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [viewMode, calculateTps, gameTick]);

  // 1. PIXI 앱 초기화 (최초 1회, 캔버스 생성 및 틱커 구동)
  useEffect(() => {
    if (!viewMode || !pixiContainer.current) return;

    let isCancelled = false;
    const app = new PIXI.Application();
    appRef.current = app;

    let handleResize: () => void;

    const initPixi = async () => {
      const w = pixiContainer.current?.clientWidth || window.innerWidth;
      const h = pixiContainer.current?.clientHeight || window.innerHeight;

      try {
        await app.init({
          width: w,
          height: h,
          backgroundAlpha: 0, // 리액트 div의 배경(이미지, 크로마키)이 보이도록 항상 투명
          backgroundColor: 0x000000,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          antialias: true,
        });
        app.stage.sortableChildren = true;
        app.stage.eventMode = 'none'; // 최적화: 클릭 이벤트 추적 비활성화

        if (isCancelled) {
          app.destroy(true, { children: true, texture: true });
          return;
        }

        if (pixiContainer.current) {
          pixiContainer.current.innerHTML = '';
          pixiContainer.current.appendChild(app.canvas);
        }

        // Ticker (렌더링 루프) - 멈췄다 걸었다 하는 로직 적용
        app.ticker.add((ticker) => {
          const dt = ticker.deltaTime;
          const deltaSec = dt * (1 / 60);

          charEntitiesRef.current.forEach(entity => {
            entity.stateTimer -= deltaSec;

            if (entity.stateTimer <= 0) {
              if (entity.state === 'walking') {
                entity.state = 'stopped';
                entity.stateTimer = 1 + Math.random() * 3;
                entity.walkSprite.visible = false;
                entity.staySprite.visible = true;
                entity.walkSprite.stop();
              } else {
                entity.state = 'walking';
                entity.stateTimer = 1 + Math.random() * 4;
                entity.dirX = Math.random() > 0.5 ? 1 : -1;
                entity.dirY = (Math.random() - 0.5) * 2;
                entity.spriteContainer.scale.x = entity.dirX;
                entity.walkSprite.visible = true;
                entity.staySprite.visible = false;
                entity.walkSprite.play();
              }
            }

            if (entity.state === 'walking') {
              entity.container.x += entity.speed * entity.dirX * dt;
              entity.container.y += entity.speed * entity.dirY * 0.5 * dt; // Y축은 살짝 느리게

              // 좌우 벽 충돌 처리
              if (entity.container.x > app.screen.width - 50) {
                entity.dirX = -1;
                entity.spriteContainer.scale.x = -1;
              } else if (entity.container.x < 50) {
                entity.dirX = 1;
                entity.spriteContainer.scale.x = 1;
              }

              // 상하(Y축) 40픽셀 제한 처리
              const minY = app.screen.height - 50;
              const maxY = app.screen.height - 10;
              if (entity.container.y < minY) {
                entity.dirY = Math.abs(entity.dirY);
                entity.container.y = minY;
              } else if (entity.container.y > maxY) {
                entity.dirY = -Math.abs(entity.dirY);
                entity.container.y = maxY;
              }

              // 원근감을 위해 Y좌표에 따라 Z-Index 정렬
              entity.container.zIndex = entity.container.y;
            }
          });
        });

        handleResize = () => {
          if (app && pixiContainer.current) {
            const nw = pixiContainer.current.clientWidth;
            const nh = pixiContainer.current.clientHeight;
            app.renderer.resize(nw, nh);
          }
        };
        window.addEventListener('resize', handleResize);

        setPixiReady(true);
      } catch (err) {
        console.error("PixiJS Init Error:", err);
      }
    };

    initPixi();

    return () => {
      isCancelled = true;
      setPixiReady(false);
      if (handleResize) {
        window.removeEventListener('resize', handleResize);
      }
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, [viewMode]);

  // 2. 캐릭터 로스터 변경 시 스테이지 갱신 (캔버스 재생성 방지)
  useEffect(() => {
    const app = appRef.current;
    if (!pixiReady || !app || !app.stage) return;

    // 기존 캐릭터 초기화 및 메모리 누수 방지
    while (app.stage.children.length > 0) {
      const child = app.stage.children[0];
      app.stage.removeChild(child);
      child.destroy({ children: true });
    }
    charEntitiesRef.current = [];

    const currentOwned = useGameStore.getState().ownedCharacters;
    const w = app.screen.width;
    const h = app.screen.height;

    activeRoster.forEach((id, index) => {
      const charState = currentOwned[id];
      const charInfo = CHARACTER_DATA.find(c => c.id === id);
      if (!charState || !charInfo) return;

      const container = new PIXI.Container();
      const spriteContainer = new PIXI.Container();

      // 빈 텍스처로 초기화 (크래시 방지)
      const staySprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
      staySprite.anchor.set(0.5, 1);

      const walkSprite = new PIXI.AnimatedSprite([PIXI.Texture.EMPTY]);
      walkSprite.anchor.set(0.5, 1);
      walkSprite.animationSpeed = 0.2;

      staySprite.visible = false;
      walkSprite.visible = true;

      spriteContainer.addChild(staySprite);
      spriteContainer.addChild(walkSprite);
      container.addChild(spriteContainer);

      const nameText = new PIXI.Text({
        text: charInfo.name,
        style: { fill: 0xffffff, fontSize: 14, fontWeight: 'bold', stroke: { width: 3, color: 0x000000 } }
      });
      nameText.anchor.set(0.5, 1);
      nameText.y = -190; // 크기 증가에 따라 이름표를 더 위로 올림
      container.addChild(nameText);

      // 비동기 에셋 로드
      const loadCharAssets = async () => {
        try {
          const stayUrl = getFrameUrl(`${id}_stay.png`);
          if (stayUrl) {
            const t = await PIXI.Assets.load(stayUrl);
            staySprite.texture = t;

            // 크기 대폭 확대: 기본 180, 송밤 170
            // 송밤은 Walk와 Stay 크기 차이 없음 (170), 다른 애들은 Stay가 10px 더 작음 (170)
            const targetWalkHeight = id === 'songbam' ? 170 : 180;
            const targetStayHeight = 170;

            const walkScaleFactor = targetWalkHeight / t.height;
            const stayScaleFactor = targetStayHeight / t.height;

            staySprite.scale.set(stayScaleFactor);
            walkSprite.scale.set(walkScaleFactor);
          }

          let frameCount = 1;
          const urlsToLoad: string[] = [];
          while (true) {
            const walkUrl = getFrameUrl(`${id}_walk (${frameCount}).png`);
            if (walkUrl) {
              urlsToLoad.push(walkUrl);
              frameCount++;
            } else {
              break;
            }
          }

          if (urlsToLoad.length > 0) {
            const loadedTextures = await Promise.all(urlsToLoad.map(url => PIXI.Assets.load(url)));
            let finalTextures = [];
            const startIdx = getStartFrame(id) - 1;

            if (startIdx >= 0 && startIdx < loadedTextures.length) {
              finalTextures = [
                ...loadedTextures.slice(startIdx),
                ...loadedTextures.slice(0, startIdx)
              ];
            } else {
              finalTextures = loadedTextures;
            }

            walkSprite.textures = finalTextures;

            // 모든 캐릭터의 1회 걷기 루프(전체 프레임 재생)가 동일하게 1.5초 걸리도록 속도 동적 계산
            // 공식: animationSpeed = 프레임수 / (60fps * 루프시간(초))
            const targetLoopTimeSec = 1.5;
            walkSprite.animationSpeed = finalTextures.length / (60 * targetLoopTimeSec);

            walkSprite.play();
          }
        } catch (e) {
          console.error("Asset load error:", e);
        }
      };

      loadCharAssets();

      // 분산 배치
      const spacing = w / (activeRoster.length + 1);
      container.x = spacing * (index + 1);
      container.y = h - 50;

      app.stage.addChild(container);

      const baseSpeed = 1.2;
      const startDirX = Math.random() > 0.5 ? 1 : -1;
      const startDirY = (Math.random() - 0.5) * 2;
      spriteContainer.scale.x = startDirX;
      container.zIndex = container.y;

      charEntitiesRef.current.push({
        container,
        spriteContainer,
        walkSprite,
        staySprite,
        speed: baseSpeed,
        dirX: startDirX,
        dirY: startDirY,
        state: 'walking',
        stateTimer: 1 + Math.random() * 3
      });
    });
  }, [activeRoster, pixiReady]);

  if (!viewMode) {
    const startBg = getUiImage('startpage');
    const icon1 = getUiImage('icon1');
    const icon2 = getUiImage('icon2');

    const handleReset = async () => {
      setConfirmConfig({
        message: "모든 기록이 초기화 됩니다. 정말 초기화 하시겠습니까?",
        onConfirm: async () => {
          await resetGame();
          setToastMessage('모든 기록이 초기화되었습니다.');
          setConfirmConfig(null);
        }
      });
    };

    return (
      <div
        className="mode-selection-screen"
        style={{ background: startBg ? `url(${startBg}) center/cover no-repeat` : '#111' }}
      >
        <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
          <button onClick={handleReset} className="mode-btn metal-btn" style={{ fontSize: '1rem', padding: '10px 20px', backgroundColor: '#e74c3c' }}>
            기록 초기화
          </button>
        </div>
        <div className="intro-container">
          {introStep >= 1 && <img src={icon1} className="intro-icon icon-1" alt="icon1" />}
          {introStep >= 2 && <img src={icon2} className="intro-icon icon-2" alt="icon2" />}

          {introStep >= 3 && (
            <div className="button-group intro-buttons">
              <button onClick={() => setViewMode('normal')} className="mode-btn metal-btn">
                일반 모드
              </button>
              <button onClick={() => setViewMode('chroma')} className="mode-btn metal-btn">
                크로마키 모드
              </button>
            </div>
          )}
        </div>

        {/* 공통 컨펌 모달 (시작 화면용) */}
        {confirmConfig && (
          <ConfirmModal
            message={confirmConfig.message}
            onConfirm={() => {
              confirmConfig.onConfirm();
              setConfirmConfig(null);
            }}
            onCancel={() => setConfirmConfig(null)}
          />
        )}
        {/* 토스트 메시지 (시작 화면용) */}
        {toastMessage && (
          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        )}
      </div>
    );
  }

  return (
    <div
      className={`game-overlay ${viewMode}`}
      style={
        viewMode === 'normal'
          ? { background: `url(${backgroundImg}) center/cover no-repeat` }
          : { background: `url(${backgroundImg2}) bottom center / 100% auto no-repeat, #00ff00` }
      }
    >
      {/* 좌상단 스킬 아이콘 패널 */}
      <div className="skills-panel">
        <div
          className={`skill-icon-wrapper ${bossSkillUnlocked ? 'unlocked' : 'locked'}`}
          onClick={() => {
            if (!bossSkillUnlocked) {
              if (poong >= 10000) {
                unlockBossSkill();
                setToastMessage('사장 스킬 "빕어의 숙제" 해금!');
              } else {
                setToastMessage('풍이 부족합니다. (10,000풍 필요)');
              }
            } else {
              if (currentTime < bossSkillCooldownEnd) {
                setToastMessage('아직 쿨타임입니다.');
              } else {
                setSkillTargetMode('boss');
              }
            }
          }}
        >
          <img src={skill1Image} alt="boss-skill" />
          <div className="skill-name">빕어의 숙제</div>
          {!bossSkillUnlocked && <div className="skill-lock">🔒<br />10k</div>}
          {bossSkillUnlocked && currentTime < bossSkillCooldownEnd && (
            <div className="skill-cd">
              {Math.ceil((bossSkillCooldownEnd - currentTime) / 1000)}s
            </div>
          )}
        </div>

        <div
          className={`skill-icon-wrapper ${ceoSkillUnlocked ? 'unlocked' : 'locked'}`}
          onClick={() => {
            if (!ceoSkillUnlocked) {
              if (poong >= 50000) {
                unlockCeoSkill();
                setToastMessage('대표 스킬 "대표의 가호" 해금!');
              } else {
                setToastMessage('풍이 부족합니다. (50,000풍 필요)');
              }
            } else {
              setSkillTargetMode('ceo');
            }
          }}
        >
          <img src={skill2Image} alt="ceo-skill" />
          <div className="skill-name">대표의 가호</div>
          {!ceoSkillUnlocked && <div className="skill-lock">🔒<br />50k</div>}
          {ceoSkillUnlocked && ceoLinkedCharId && (
            <div className="skill-linked">적용중</div>
          )}
        </div>

        <div
          className={`skill-icon-wrapper ${oshiSkillUnlocked ? 'unlocked' : 'locked'}`}
          onClick={() => {
            if (!oshiSkillUnlocked) {
              if (poong >= 100000) {
                unlockOshiSkill();
                setToastMessage('최애 지정 스킬 해금!');
              } else {
                setToastMessage('풍이 부족합니다. (100,000풍 필요)');
              }
            } else {
              setSkillTargetMode('oshi');
            }
          }}
        >
          <img src={skill3Image} alt="oshi-skill" />
          <div className="skill-name">최애 지정</div>
          {!oshiSkillUnlocked && <div className="skill-lock">🔒<br />100k</div>}
          {oshiSkillUnlocked && oshiLinkedCharId && (
            <div className="skill-linked">적용중</div>
          )}
        </div>

        {/* 창낼용기(환생) 버튼 추가 */}
        <div
          className="skill-icon-wrapper unlocked rebirth-action-btn"
          style={{ borderColor: '#e74c3c' }}
          onClick={() => {
            if (currentStage < 30) {
              setToastMessage('창낼용기(환생)는 스테이지 30 이상부터 가능합니다.');
            } else {
              setConfirmConfig({
                message: "정말 창내시겠습니까? (모든 맵 진행도와 풍이 초기화 되며 '탓'을 얻습니다)",
                onConfirm: () => {
                  setConfirmConfig(null);
                  setPendingRebirthAction('skill');
                  setIsNicknameModalOpen(true);
                }
              });
            }
          }}
        >
          <div style={{ fontSize: '2.5rem', opacity: 0.8 }}>🔄</div>
          <div className="skill-name" style={{ backgroundColor: 'rgba(231, 76, 60, 0.8)' }}>
            창낼용기
          </div>
        </div>
      </div>

      {/* 우측: 재화(풍, 탓) 패널 및 메뉴 버튼 */}
      <div className="ui-layer">
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div
            className="resource-box tat-box"
            style={{ borderColor: '#f1c40f', cursor: 'pointer' }}
            onClick={() => handleOpenModal('goldenDisk')}
            title="황금 디스크 상점 열기"
          >
            <img src={goldenNoteIcon} alt="note" style={{ width: '24px', height: '24px', filter: 'drop-shadow(0 0 4px rgba(241,196,15,0.8))' }} />
            <span className="tat-amount" style={{ color: '#f1c40f' }}>{formatCompact(musicalNotes)}</span>
          </div>

          <div
            className="resource-box tat-box"
            onClick={() => handleOpenModal('rebirth')}
            title="탓 상점 열기"
          >
            <span className="tat-amount">탓(Tat): {formatCompact(tat)}</span>
          </div>

          <div className="resource-box poong-box" style={{ minWidth: '180px', display: 'flex', justifyContent: 'center' }}>
            <img src={poongIcon} alt="poong" />
            <div className="poong-texts">
              <span className="poong-amount" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCompact(poong)} 풍</span>
              <span className="tps-amount" style={{ fontVariantNumeric: 'tabular-nums' }}>+{formatCompact(totalTps)} / 초</span>
            </div>
          </div>
        </div>

        <div className="menu-buttons">
          <div className="gacha-info-panel" style={{ display: 'flex', gap: '10px', alignItems: 'center', alignSelf: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px' }}>
                <img src={ticketIcon} alt="ticket" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                <span style={{ color: '#f1c40f', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {formatCompact(Math.max(10, Math.floor(50 * Math.pow(1.0011, Math.max(0, totalRolls - (permanentBuffs.gachaDiscountLevel * 50))))))} 풍
                </span>
              </div>
              <button className="gacha-prob-btn" onClick={() => handleOpenModal('gachaProb')}>
                확률표 보기
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="gacha-level">모집 레벨: Lv.{gachaLevel}</div>
              <div className="gacha-rolls" style={{ marginBottom: 0 }}>누적 모집: {totalRolls}회</div>
            </div>
          </div>

          <div className="main-circle-buttons">
            <div className="gacha-button-container">
              {isGachaMenuOpen && (
                <div className="gacha-options-menu">
                  <button onClick={() => handleGacha(1)}>1회</button>
                  <button onClick={() => handleGacha(10)}>10회</button>
                  <button onClick={() => handleGacha(100)}>100회</button>
                  <button onClick={() => handleGacha('max')} className="max-btn">모두 소모</button>
                </div>
              )}

              <button
                className={`gacha-trigger-btn ${isGachaMenuOpen ? 'active' : ''}`}
                onClick={() => setIsGachaMenuOpen(!isGachaMenuOpen)}
              >
                <img src={ticketIcon} alt="Gacha" />
              </button>
            </div>

            <button
              className="gacha-trigger-btn book-btn"
              onClick={() => handleOpenModal('collection')}
            >
              <img src={bookIcon} alt="Collection" />
            </button>
          </div>

          <div className="main-circle-buttons" style={{ marginTop: '5px' }}>
            <button
              className="gacha-trigger-btn combat-circle-btn"
              onClick={() => handleOpenModal('partySetup')}
            >
              <span className="emoji-icon">⚔️</span>
            </button>

            {currentStage >= 1 && (
              <button
                className="gacha-trigger-btn tower-circle-btn"
                onClick={() => handleOpenModal('tower')}
              >
                <img src={towerIcon} alt="Tower" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              </button>
            )}
          </div>

          <div className="main-circle-buttons" style={{ marginTop: '5px' }}>
            <button
              className="gacha-trigger-btn mode-circle-btn"
              onClick={async () => {
                await saveGame();
                setToastMessage('수동 저장 완료!');
              }}
            >
              <span className="emoji-icon">💾</span>
            </button>
          </div>
        </div>
      </div>

      <div className="character-layer" ref={pixiContainer}>
      </div>

      {/* 우측 하단 리더보드 전용 플로팅 버튼 */}
      <button
        className="leaderboard-floating-btn"
        onClick={() => handleOpenModal('leaderboard')}
        title="명예의 전당 랭킹 보기"
      >
        🏆
      </button>

      {/* 전투 화면 오버레이 */}
      {isCombatOpen && (
        <CombatScreen
          mode={combatMode}
          onClose={() => setIsCombatOpen(false)}
          onOpenRebirth={() => {
            setPendingRebirthAction('combat');
            setIsNicknameModalOpen(true);
          }}
        />
      )}

      {/* 캐릭터 선택 모달 (스킬용) */}
      {skillTargetMode && (
        <CharacterSelectModal
          title={
            skillTargetMode === 'boss' ? '숙제 스탯 펌핑을 받을 사원을 선택하세요.' :
              skillTargetMode === 'oshi' ? '최애로 지정할 인원을 선택하세요.' :
                '대표의 편애를 받을 사원을 선택하세요.'
          }
          allowedTiers={
            skillTargetMode === 'oshi'
              ? ['C', 'U', ...(permanentBuffs.oshiBoostLevel >= 1 ? ['R' as const] : []), ...(permanentBuffs.oshiBoostLevel >= 2 ? ['SR' as const] : [])]
              : undefined
          }
          skillTargetMode={skillTargetMode}
          onClose={() => setSkillTargetMode(null)}
          onSelect={handleSkillSelect}
        />
      )}
      {/* 모달 렌더링 (닫힐 때 애니메이션을 위해 closing 상태 포함 렌더링) */}
      {(activeModal === 'rebirth' || closingModal === 'rebirth') && (
        <div className={closingModal === 'rebirth' ? 'modal-closing' : ''}>
          <RebirthModal
            onClose={handleCloseModal}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        </div>
      )}

      {(activeModal === 'gachaResult' || closingModal === 'gachaResult') && (
        <div className={closingModal === 'gachaResult' ? 'modal-closing' : ''}>
          <GachaResultModal
            results={gachaResults}
            onClose={handleCloseModal}
            onPullAgain={handleGacha}
          />
        </div>
      )}

      {(activeModal === 'gachaProb' || closingModal === 'gachaProb') && (
        <div className={closingModal === 'gachaProb' ? 'modal-closing' : ''}>
          <GachaProbModal
            currentLevel={gachaLevel}
            onClose={handleCloseModal}
          />
        </div>
      )}

      {(activeModal === 'collection' || closingModal === 'collection') && (
        <div className={closingModal === 'collection' ? 'modal-closing' : ''}>
          <CollectionModal
            onClose={handleCloseModal}
            onSelectChar={handleOpenStat}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        </div>
      )}

      {(activeModal === 'partySetup' || closingModal === 'partySetup') && (
        <div className={closingModal === 'partySetup' ? 'modal-closing' : ''}>
          <PartySetupModal
            onClose={handleCloseModal}
            onStartCombat={(mode) => {
              setCombatMode(mode);
              handleCloseModal();
              setIsCombatOpen(true);
            }}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        </div>
      )}

      {(activeModal === 'goldenDisk' || closingModal === 'goldenDisk') && (
        <div className={closingModal === 'goldenDisk' ? 'modal-closing' : ''}>
          <GoldenDiskModal
            onClose={handleCloseModal}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        </div>
      )}

      {(activeModal === 'tower' || closingModal === 'tower') && (
        <div className={closingModal === 'tower' ? 'modal-closing' : ''}>
          <TowerModal
            onClose={handleCloseModal}
            onStartTowerCombat={() => {
              setCombatMode('tower');
              handleCloseModal();
              setIsCombatOpen(true);
            }}
            onShowToast={(msg) => setToastMessage(msg)}
          />
        </div>
      )}

      {(activeModal === 'leaderboard' || closingModal === 'leaderboard') && (
        <div className={closingModal === 'leaderboard' ? 'modal-closing' : ''}>
          <LeaderboardModal onClose={handleCloseModal} />
        </div>
      )}

      {isNicknameModalOpen && (
        <NicknameModal
          onConfirm={(name) => {
            setNickname(name);
            setIsNicknameModalOpen(false);
            doRebirth();
            setToastMessage('창냈습니다! 탓(Tat)을 획득했습니다.');
            if (pendingRebirthAction === 'combat') {
              handleOpenModal('rebirth');
            }
            setPendingRebirthAction(null);
          }}
          onCancel={() => {
            setIsNicknameModalOpen(false);
            doRebirth();
            setToastMessage('창냈습니다! 탓(Tat)을 획득했습니다.');
            if (pendingRebirthAction === 'combat') {
              handleOpenModal('rebirth');
            }
            setPendingRebirthAction(null);
          }}
        />
      )}

      {(isStatOpen || isStatClosing) && selectedCharId && (
        <div className={isStatClosing ? 'modal-closing' : ''}>
          <StatModal
            charId={selectedCharId}
            onClose={handleCloseStat}
            onShowToast={(msg) => setToastMessage(msg)}
            onOpenConfirm={(config) => setConfirmConfig(config)}
          />
        </div>
      )}
      {/* 공통 컨펌 모달 */}
      {confirmConfig && (
        <ConfirmModal
          message={confirmConfig.message}
          onConfirm={() => {
            confirmConfig.onConfirm();
            setConfirmConfig(null);
          }}
          onCancel={() => setConfirmConfig(null)}
        />
      )}

      {/* 토스트 메시지 렌더링 */}
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </div>
  );
}

export default App;
