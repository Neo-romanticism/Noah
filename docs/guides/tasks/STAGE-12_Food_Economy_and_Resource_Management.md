# Stage 12: Food Economy and Resource Management

## 목표
- 가상 화폐(Noah Coins)와 feeding 경제를 구축하고, CPU/GPU cycle 기반 “mining” 및 상점/아이템 상호작용을 구현한다.

## 상세 작업 체크리스트
- [ ] Noah Coins(NC) 가상 화폐 시스템
- [ ] CPU/GPU cycle allocation "mining" mechanism
- [ ] food shop tiered items 구현
  - [ ] Basic Kibble(10 NC, -30 hunger, 없음)
  - [ ] Premium Meal(50 NC, -50 hunger, +5 affection)
  - [ ] Luxury Feast(200 NC, -80 hunger, +15 affection, rare animation)
  - [ ] Snack(5 NC, -10 hunger, cooldown 없음)
- [ ] food drag-and-drop interaction
- [ ] 경제적 결과 처리
  - [ ] starvation progression: sadness → anger → relationship damage
  - [ ] resource allocation balance requirement
- [ ] resource allocation UI
- [ ] food cooldown & hunger decay modifiers

## 권장 산출물(Deliverables)
- [ ] NC currency foundation
- [ ] mining/resource allocation 모듈
- [ ] food shop UI + item catalog
- [ ] drag-and-drop feeding
- [ ] consequence/balance system

## 검증 포인트
- [ ] 구매/섭취 시 currency와 hunger/affection이 정확히 반영됨
- [ ] cooldown이 의도대로 집행됨
- [ ] starvation 단계가 연속적으로 진행됨

