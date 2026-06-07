---
issue_id: ISSUE-021
type: 버그
priority: 높음
status: 진행예정
labels: [bug, interaction]
related: [docs/guides/Midterm_Alignment_Check.md]
---

## 환경 정보

- OS: Linux
- 버전/빌드: v1.0.0 (Stage 06 완료 상태)

## 버그 설명

렌더러 씬에서 사용자가 마우스를 구역 상에서 미친 듯이 연타하는 "마우스 학대(Beat)" 행위를 감지했을 때, 렌더러 보호 차원에서의 Mute 필터로 인해 오히려 메인 프로세스로 클릭 신호(`click`)가 누락되어 노아가 아파하지도 않고 트라우마도 쌓이지 않는 '학대 방어 무적' 상태가 발생하는 버그입니다.

## 재현 단계

1. 마우스로 노아 영역 위를 매우 빠르게 연타한다.
2. `src/renderer/interaction/click.ts`에서 어뷰징 임계치(30클릭/500ms)를 초과하여 `clickDetector.isClickAbuse()`가 `true`를 반환한다.
3. [src/renderer/interaction/index.ts](src/renderer/interaction/index.ts) 내부에서 다음 조건절에 따라 클릭 이벤트를 삼켜버린다:
   ```typescript
   if (!clickDetector.isClickAbuse()) {
     eventCallbacks.onClick?.();
   }
   ```
4. 메인 프로세스 및 아바타에 어떠한 신호도 가지 못해 트라우마 상승치 가해와 `flinch`(움찔거림) 애니메이션이 작동하지 않는다.

## 예상 동작

과속 클릭이 감지되었을 때, 클릭 이벤트를 단순히 무시하는 것이 아니라 **"마우스 학대" 또는 "Beating"**이라는 강력한 위해 인터랙션으로 정확하게 간주해야 합니다. 
이를 통해 메인은 정상적으로 트라우마 상승 패널티와 애정도 대폭 삭감(`click: { affection: -10, morality: -5, trauma: 5 }`)을 먹이고, 아바타 렌더러는 움찔거리며 괴로워하는 비주얼을 표현해야 합니다.

## 실제 동작

`clickDetector`가 참을 뱉는 학대 행동 시에는 렌더러 콜백이 완벽히 정적 상태(Mute)가 되어 노아에게 아무런 인덕션과 애정도 영향도 미치지 않습니다.

## 해결 방안

1. 클릭 어뮤즈 상태가 감지될 때, 이벤트를 무시하는 대신 `{ type: 'beating' }` 혹은 전용 학대 유형의 인터랙션 신호로 포장해 메인 IPC 채널로 별도 브로드캐스트합니다.
2. 혹은 일반 클릭에 과속 마크를 얹어서 보내어, 메인이 한 번에 여러 다발의 데미지 누적 및 트라우마 인지를 안전하게 하도록 설계합니다.
