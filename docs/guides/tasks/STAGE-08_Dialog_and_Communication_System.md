# Stage 8: Dialog and Communication System

## 목표
- Noah가 **텍스트 버블**과 **터미널 대화 창**을 통해 사용자와 소통하도록 만들고, 감정/맥락 기반으로 대사를 선택하며 TTS로 음성까지 제공한다.

## 상세 작업 체크리스트
- [ ] dialog database 구축
  - [ ] emotion-contextual organization
- [ ] text bubble overlay 시스템
  - [ ] 짧고 즉각적인 반응
- [ ] terminal dialog window
  - [ ] global hotkey binding
  - [ ] taskbar icon click
- [ ] dialog selection logic
  - [ ] weight-based probability selection
  - [ ] cooldown enforcement(반복 방지)
- [ ] TTS integration
  - [ ] free TTS provider(고정)
  - [ ] emotion-matched tone/speed
  - [ ] user toggle enable/disable
- [ ] conversation context management
  - [ ] LLM context limits 고려한 history
  - [ ] aging message summarization or dropping
- [ ] emotion-appropriate dialog filtering
- [ ] context dialog(right-click menu)
  - [ ] emotion-appropriate bubble

## 권장 산출물(Deliverables)
- [ ] dialog database
- [ ] text bubble system
- [ ] terminal dialog window
- [ ] TTS integration
- [ ] context menu interaction
- [ ] dialog management(가중치/쿨다운)

## 검증 포인트
- [ ] 같은 상황에서 반복 대사가 과도하게 나오지 않음
- [ ] 감정 변화에 따라 대사 선택/톤이 자연스럽게 달라짐
- [ ] TTS on/off가 렌더/상태와 충돌하지 않음

