# Plan.B 키우기 - 함수 및 컴포넌트 구조 명세서 (CODE.md)

이 문서는 프로젝트 내의 주요 파일, 컴포넌트, 전역 스토어 함수들의 역할과 동작 방식을 추적하기 위해 작성되었습니다. 코드 수정 및 디버깅 시 참고 자료로 활용됩니다.

---

## 1. 전역 상태 관리 (`src/store/gameStore.ts`)
Zustand를 사용하여 게임의 핵심 데이터와 비즈니스 로직을 관리합니다.

### 💰 핵심 재화 및 스탯 관련 액션
* **`addPoong(amount)`**: 재화(풍)를 추가합니다. 주로 초당 생산량(TPS)에 의해 호출됩니다.
* **`investStat(charId, statType)`**: 특정 사원(`charId`)의 특정 스탯(`statType`)에 1포인트를 투자합니다. (한계치 제한 적용)
* **`autoDistributeSingleStats(charId)`**: 한 명의 사원에게 쌓인 모든 포인트를, 현재 스탯이 가장 낮은 항목부터 우선적으로 균등하게 자동 분배합니다.
* **`autoDistributeAllStats()`**: 🔒(잠금) 상태가 아닌 **보유한 모든 사원**의 포인트를 균등하게 자동 분배합니다.
* **`resetCharacterStats(charId)`**: 특정 사원에게 투자된 스탯을 모두 0으로 깎고 이를 포인트로 환급합니다. 단, 한계치(Caps)는 깎이지 않고 유지됩니다.
* **`doBreakthrough(charId)`**: 포인트를 소모하여 특정 사원의 스탯 한계치(Caps)를 영구적으로 무작위 1종 증가시킵니다.
* **`autoBreakthroughAll()`**: 🔒(잠금) 상태가 아닌 **보유한 모든 사원**에 대해 가능한 만큼 일괄 한계 돌파를 수행합니다.
* **`calculateTps()`**: 현재 출근(Roster) 중인 사원들의 스탯(Vocal, Rap, Dance, Sense)과 등급 배율, 환생 영구 버프 등을 종합하여 초당 풍 생산량(Total TPS)을 재계산합니다.

### 🛡️ 전투 및 배치 관련 액션
* **`toggleRoster(charId)`**: 방치형 화면(메인)에 돌아다닐 사원의 출근/퇴근 상태를 토글합니다. (최대 10명 제한)
* **`toggleLock(charId)`**: 특정 사원을 🔒(잠금) 상태로 만들어 '일괄 분배' 및 '일괄 돌파' 로직에서 무시되도록 보호합니다.
* **`setCombatParty(party)`**: 방어전에 출전할 최대 4명의 파티원 배치 상태(전/후열 포함 배열)를 저장합니다.
* **`nextStage()`**: 방어전 스테이지를 1단계 상승시킵니다.

### 🌟 스킬 및 시스템 버프 액션
* **`pullGacha(times)`**: 풍을 소모하여 지정된 횟수만큼 사원 모집(뽑기)을 진행합니다. 누적 횟수에 따라 모집 레벨업이 발생합니다.
* **`useBossSkill(charId)`**: "빕어의 숙제" 발동. 지정된 사원의 스탯과 한계치가 대폭 상승하며, 1분(60,000ms)의 쿨타임이 적용됩니다.
* **`linkCeoSkill(charId)`**: "대표의 편애" 발동. 지정된 1명의 사원의 모든 스탯에 영구적인 +10 보너스를 부여합니다.
* **`linkOshiSkill(charId)`**: "최애 지정" 발동. 특정 사원의 TPS 효율과 체력 배율을 폭발적으로 증가시킵니다. (오시 부스트 레벨에 따라 선택 가능 등급 확장)

### 🔄 환생, 리더보드, 디스크 방 및 최강자의 탑 액션
* **`doRebirth()`**: 30스테이지 이상에서 활성화되며, 현재까지 모은 데이터를 초기화하고 탓(Tat)을 획득합니다. 100스테이지 이상이라면 심화 재화인 남탓(Nam-Tat)도 획득합니다. **닉네임이 설정되어 있다면 리더보드(Google Sheets)에 현재 스테이지를 자동으로 기록합니다.**
* **`setNickname(name)`**: 사용자의 닉네임을 전역 상태에 저장합니다.
* **`buyBuff(buffName)`**: 탓을 소모하여 영구적인 스펙(PermanentBuffs)을 구매합니다.
* **`buyAdvancedBuff(buffName)`**: 남탓을 소모하여 극후반 전용 심화 특성(AdvancedBuffs)을 구매합니다.
* **`finishGoldenDisk(totalDamage)`**: 황금 디스크 방 전투 종료 시 호출되며, 최고 기록을 경신할 경우 차액만큼의 **음표(Musical Notes)** 재화를 획득합니다.
* **`upgradeDiskBuff(statType)`**: 음표를 소모하여 사원 전체의 기초 스탯을 영구적으로 % 단위로 뻥튀기합니다.
* **`saveToTowerSlot(slotIndex, charId)`**: 현재 파티원의 강력한 상태(스냅샷)를 탑 슬롯에 박제합니다.
* **`upgradeTowerSlot(slotIndex)`**: 탑의 파편을 소모하여 특정 슬롯의 성능(HP, ATK, ASPD)을 퍼센트로 오버클럭합니다.
* **`upgradeTowerArtifact(artifactId)`**: 탑의 파편을 소모하여 보유한 유물을 강화합니다.
* **`finishTowerFloor(isWin)`**: 탑 전투 승리 시 보상(파편 및 유물)을 정산하고 층수를 올립니다.
* **`initGame()`**: 앱 실행 시 로컬에 저장된 `save.json` 파일을 불러옵니다.
* **`saveGame()`**: 현재 스토어의 데이터를 로컬 `save.json`에 저장합니다.
* **`resetGame()`**: 진행 중인 모든 데이터를 삭제하고 게임을 완전 초기화합니다.

---

## 2. 주요 UI 컴포넌트 (`src/components/`)

### 메인 화면 (오버레이)
* **`App.tsx`**
  * 게임의 최상위 컨테이너로, PixiJS 캔버스 렌더링과 플로팅 데미지를 주관합니다.
  * 각종 모달 창의 열기/닫기 애니메이션 및 스킬 타겟 선택 분기 처리를 담당합니다.

### 시스템 모달 (UI 패널)
* **`StatModal.tsx`**: 개별 사원의 상세 정보 확인 및 스탯 투자를 진행하는 창입니다.
* **`CollectionModal.tsx`**: 보유 사원 도감 및 일괄 육성, 출퇴근 관리 기능을 제공합니다.
* **`GachaModal.tsx` & `GachaProbModal.tsx`**: 가챠 연출 및 확률 정보를 제공합니다.
* **`RebirthModal.tsx`**: 환생 상점(탓 상점) 창입니다.
* **`GoldenDiskModal.tsx`**: 획득한 음표를 소모해 전체 스탯을 %로 강화하는 디스크 상점입니다.
* **`TowerModal.tsx`**: 90층 이후 해금되는 스냅샷 슬롯 기록, 등반, 유물 및 슬롯 오버클럭 강화 UI를 제공합니다.
* **`LeaderboardModal.tsx`**: Google Sheets API(CSV)를 통해 불러온 상위 5명의 랭킹을 표시합니다.
* **`NicknameModal.tsx`**: 환생 시 점수 기록을 위해 유저의 닉네임을 입력받는 팝업입니다.
* **`PartySetupModal.tsx`**: 방어전 파티원(2x2 그리드) 배치 및 **일반 전투 / 디스크 방 진입 모드 선택** 창입니다.
* **`CombatScreen.tsx`**: 일반 보스 전투, 제한시간 60초의 '황금 디스크 방', 그리고 '최강자의 탑' 전투를 렌더링하는 실시간 전투 패널입니다. 탑 강화 수치 및 유물 효과(초크리티컬 등)가 전역적으로 적용됩니다.
* **`CharacterSelectModal.tsx`**: 스킬 사용 대상을 선택하는 공용 팝업 창입니다.
* **`ConfirmModal.tsx` / `Toast.tsx`**: 알림 및 확인 시스템입니다.

---

## 3. 유틸리티 및 데이터 (`src/utils/`, `src/data/`)
* **`leaderboardApi.ts`**: Google Apps Script 웹 앱을 통해 점수를 제출(POST)하고, Google Sheets의 CSV 출력물을 읽어와(GET) 랭킹을 반환합니다.
* **`characters.ts`**: 사원 데이터 정의.
* **`assets.ts`**: 리소스 경로 관리 헬퍼 함수.

---
*(이 문서는 프로젝트가 업데이트될 때마다 지속적으로 갱신됩니다.)*