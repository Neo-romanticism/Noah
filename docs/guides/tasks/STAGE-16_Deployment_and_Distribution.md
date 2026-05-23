# Stage 16: Deployment and Distribution

## 목표
- Electron 앱을 각 플랫폼에 배포 가능한 형태로 패키징하고, 업데이트 시 state 보존 및 사용자 온보딩을 제공한다.

## 상세 작업 체크리스트
- [ ] electron-builder 설정
  - [ ] platform 별 packaged builds 준비
- [ ] code signing certificates(해당 시)
- [ ] platform installer 생성
  - [ ] Windows: .exe
  - [ ] macOS: .dmg
  - [ ] Linux: .AppImage
- [ ] 업데이트 메커니즘
  - [ ] manual distribution
  - [ ] state preservation across updates
- [ ] end-user documentation
  - [ ] installation instructions
  - [ ] first-run guide
  - [ ] basic care instructions
- [ ] onboarding flow
  - [ ] naming ceremony(permanent name selection)
  - [ ] birth sequence(생성 시퀀스)
- [ ] distribution channel
  - [ ] GitHub Releases
  - [ ] project website
- [ ] optional crash reporting & privacy-respecting telemetry

## 권장 산출물(Deliverables)
- [ ] packaged application
- [ ] installer with onboarding
- [ ] user documentation
- [ ] update mechanism(state migration/preservation)
- [ ] release-ready distribution build

## 검증 포인트
- [ ] 빌드된 배포물이 각 OS에서 실행됨
- [ ] 업데이트 시 state 데이터가 유실되지 않음
- [ ] 온보딩 플로우가 첫 실행에서 정상 동작

