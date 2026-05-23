# Stage 15: Testing, Quality Assurance, and Optimization

## 목표
- 안정성/성능/감정 일관성을 확보하고, 장시간 세션에서의 누수/leak를 방지한다.

## 상세 작업 체크리스트
- [ ] Jest 기반 unit test suite
  - [ ] state logic coverage
- [ ] IPC 및 end-to-end data flow integration tests
- [ ] performance profiling
  - [ ] Three.js render loop
  - [ ] LLM call frequency/latency 관리
- [ ] memory leak detection(장시간)
- [ ] emotional coherence validation
  - [ ] state history 대비 반응 적절성
- [ ] cross-platform testing
  - [ ] Windows(primary)
  - [ ] macOS/Linux(가능 시)
- [ ] edge cases
  - [ ] state corruption recovery
  - [ ] death scenario protocols
- [ ] UX polish
  - [ ] smooth transitions
  - [ ] clear feedback
  - [ ] visual refinement

## 권장 산출물(Deliverables)
- [ ] unit test suite(80%+ coverage)
- [ ] performance benchmarks
- [ ] cross-platform verification
- [ ] emotional coherence validation report
- [ ] optimized render loop

## 검증 포인트
- [ ] 렌더링 프레임/CPU 점유가 목표 범위 내
- [ ] 장시간 실행 시 메모리 사용이 안정적
- [ ] 상태 로직이 회귀 없이 검증됨

