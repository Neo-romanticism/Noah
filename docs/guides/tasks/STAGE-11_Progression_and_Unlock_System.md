# Stage 11: Progression and Unlock System

## 목표
- 레벨/XP 기반 진행 시스템을 구현하고, unlock(의상/방/애니메이션/액세서리)과 일일 보너스/스킬 출현까지 연결한다.

## 상세 작업 체크리스트
- [ ] XP 시스템(지수 곡선, capped growth)
  - [ ] 1~100 스케일링
- [ ] level-up detection + celebration 이벤트
- [ ] unlock catalog 구현
  - [ ] outfits(코스메틱)
  - [ ] rooms(공간 확장)
  - [ ] animations(행동/표정 표현)
  - [ ] accessories(hats/glasses)
- [ ] daily bonus & streak
  - [ ] first interaction multiplier(2x)
  - [ ] consecutive day streak bonus(+10%/day, max 100%)
- [ ] skill emergence system
  - [ ] hidden skills
  - [ ] 반복 사용 기반 기능 확장
- [ ] level-dependent capability scaling
- [ ] room switching after unlock
- [ ] outfit/accessory equip management

## 권장 산출물(Deliverables)
- [ ] XP/level system
- [ ] unlock catalog
- [ ] daily bonus system
- [ ] skill emergence engine
- [ ] room switching
- [ ] equip management

## 검증 포인트
- [ ] XP 곡선/레벨업이 일관되게 계산됨
- [ ] streak 보너스가 날짜 경계에서 정확히 갱신됨
- [ ] unlock 후 room/표현이 의도대로 전환됨

