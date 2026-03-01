# CHANGELOG

이 문서는 프로젝트의 주요 변경 이력을 기록합니다.
[Conventional Commits](https://www.conventionalcommits.org/) 기반으로 작성합니다.

---

## v0.3.0 — 지형 시스템 (Phase 2) (2026-03-01)

### 변경 사항

- **feat(terrain)**: `TerrainSystem.ts` — 순수 지형 계산 함수 (높이 조절, 평탄화, geometry 생성, 서브 셀렉션 감지)
- **feat(terrain)**: `useTerrainStore.ts` — 지형 상태 관리 (heightMap, 브러시, Undo/Redo 스택)
- **feat(terrain)**: `Terrain.tsx` — heightMap 기반 BufferGeometry 3D 렌더링 + vertex colors
- **feat(terrain)**: `GridOverlay.tsx` — 지형 높이를 따르는 편집 모드 그리드 라인
- **feat(terrain)**: `TerrainCursor.tsx` — RCT 스타일 서브 셀렉션 커서
  - corner 모드: 꼭지점 인접 삼각형 하이라이트 (주황) + 정점 마커
  - full 모드: 브러시 영역 전체 셀 하이라이트 (노랑)
  - 높이 힌트 라벨 (m 단위, drei Html)
- **feat(terrain)**: `useTerrainEditor.ts` — 편집 인터랙션 훅
  - 스컬프트 도구: 드래그 방향 기반 올리기/내리기 (ratchet 메커니즘, 20px/단계)
  - 평탄화 도구: 클릭 시 영역 평균 높이로 맞춤
  - 드래그 중 서브 셀렉션 잠금 + 높이 힌트 실시간 갱신
- **feat(terrain)**: `TerrainToolbar.tsx` — 편집 도구 UI (편집/평탄화 + 크기 슬라이더 + Undo/Redo)
- **feat(camera)**: CameraControls 기반 카메라 (우클릭=회전, 중클릭=팬, 휠=줌)
- **feat(camera)**: WASD 키보드 카메라 이동 (terrain 모드 대응)
- **feat(camera)**: 맵 로드 시 카메라 맵 중앙 자동 포커스
- **feat(ui)**: HUD에 "지형 편집" 토글 버튼 추가
- **refactor**: OrbitControls → CameraControls (camera-controls 라이브러리) 전환
- **refactor**: 지형 도구 단순화 (raise/lower/flatten/level 4개 → sculpt/flatten 2개)

### 다음 단계

- Phase 3: 카메라 시스템 고도화 (줌 레벨 각도, 이동 범위 제한)
- Phase 4: 트랙 시스템

---

## v0.2.0 — 메인 메뉴 & 맵 관리 시스템 (2026-03-01)

### 변경 사항

- **feat(core)**: `serializer.ts` — MapFile 직렬화/역직렬화 + 타입 가드 검증
- **feat(core)**: `storage.ts` — localStorage 어댑터 (StorageAdapter 인터페이스 분리)
- **feat(store)**: `useMapStore.ts` — 맵 CRUD (생성/저장/불러오기/삭제/이름변경)
- **feat(ui)**: `MainMenu.tsx` — 메인 메뉴 (자유모드, 불러오기, 예약 버튼)
- **feat(ui)**: `MapBrowser.tsx` — 맵 브라우저 (새 맵 생성 폼, 맵 목록, 인라인 이름변경, 2단계 삭제)
- **feat(ui)**: `HUD.tsx` — 게임 내 HUD 오버레이 (저장, 메뉴 복귀, 저장 알림)
- **feat(scene)**: `MainMenuScene.tsx`, `MapSelectScene.tsx`, `GameScene.tsx` 씬 wrapper
- **refactor**: `App.tsx` — switch 기반 씬 라우팅으로 변경

### 다음 단계

- Phase 2: 지형 시스템 (3D 높이맵 렌더링 + 편집)

---

## v0.1.0 — 프로젝트 리셋 (2026-03-01)

### 변경 사항

- **docs**: CLAUDE.md 전면 개편 (TypeScript 기준, 의존성 버전 동기화, immer 제거, TS 규칙 추가)
- **docs**: PROJECT_PLAN.md 전면 개편 (Phase 의존성 그래프, 복잡도 표시, 파일 목록, 완료 기준 추가)
- **docs**: ARCHITECTURE.md 신규 생성 (레이어드 아키텍처, 상태 직렬화, 설계 결정 테이블)
- **docs**: CHANGELOG.md 신규 생성
- **docs**: 기존 실험 문서 7개를 `docs/archive/`로 이동

### 아카이브된 문서

- `docs/archive/track_system_v2.md`
- `docs/archive/phase7_plan.md`
- `docs/archive/phase8_redesign.md`
- `docs/archive/implementation_plan.md`
- `docs/archive/task.md`
- `docs/archive/thinking.md`
- `docs/archive/walkthrough.md`

### 다음 단계

- Phase 0: 프로젝트 스캐폴드 (기존 src/ 코드 초기화, TypeScript 기반 뼈대 생성)
