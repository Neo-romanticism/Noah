# Stage 1: Foundation and Infrastructure

## 목표
- Noah 데스크톱 앱의 **코어 스켈레톤**(Electron main/renderer/shared)과 **빌드 파이프라인**, 그리고 **IPC 브리지**를 완성한다.

## 상세 작업 체크리스트
- [ ] Electron main 프로세스 아키텍처 확정
  - [ ] 윈도우 생성/속성/라이프사이클 관리
- [ ] TypeScript 컴파일 파이프라인 설정
  - [ ] main: CommonJS 출력
  - [ ] renderer: ESM 출력
- [ ] webpack으로 renderer 번들링 설정 (Three.js 통합 포함)
- [ ] IPC 채널 인프라 구현
  - [ ] `state:update` (Main → Renderer)
  - [ ] `state:request` (Renderer → Main)
  - [ ] `action:interaction` (Renderer → Main)
  - [ ] `system:metrics` (Main → Renderer)
- [ ] preload 스크립트 구현
  - [ ] contextIsolation enabled
  - [ ] secure IPC gateway
- [ ] 앱 윈도우 속성 설정
  - [ ] Transparent background
  - [ ] Frameless
  - [ ] Always-on-top
- [ ] 영속 저장을 위한 OS-적절 데이터 디렉토리 구축

## 권장 산출물(Deliverables)
- [ ] `npm run build`, `npm run dev` 동작
- [ ] 투명 오버레이 윈도우 렌더링 확인
- [ ] main↔renderer 양방향 IPC 정상 동작
- [ ] preload 기반 안전 IPC 경로 확립

## 검증 포인트
- [ ] 앱 시작 시 에러 없이 renderer 로드
- [ ] IPC 호출/응답이 양방향으로 정상 라우팅
- [ ] contextIsolation 정책 위반 없이 통신

