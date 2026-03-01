# PROJECT_PLAN.md — 개발 로드맵

> 이 문서는 Rollercoaster Tycoon 웹 클론의 단계별 개발 계획입니다.
> 각 Phase는 독립적으로 동작 가능한 마일스톤이며, 순서대로 진행합니다.
> Claude Code는 작업 시작 전 이 문서에서 현재 진행 상황을 확인합니다.

---

## Phase 의존성 그래프

```
Phase 0 (리셋/스캐폴드)
  └→ Phase 1 (메인 메뉴/맵 관리)
       └→ Phase 2 (지형 시스템)
            └→ Phase 3 (카메라 시스템)
                 └→ Phase 4 (트랙 시스템)
                      └→ Phase 5 (차량/물리)
                           └→ Phase 6 (놀이기구 관리)
                                └→ Phase 7 (프리셋 배치)
                                     └→ Phase 8+ (시뮬레이션, 재정, NPC 등)
```

---

## Phase 0: 프로젝트 리셋 & 스캐폴드 (M)

**목표**: 기존 실험 코드를 아카이브하고, TypeScript 기반 새 프로젝트 뼈대 완성

**선행 조건**: 없음 (최초 Phase)

### 태스크

- [x] 기존 `src/` 실험 코드 삭제 (docs/archive/에 참조 문서 보관 완료)
- [x] `src/` 디렉토리 새 구조 생성 (CLAUDE.md 섹션 3 기준)
- [x] `src/main.tsx` — React 앱 진입점
- [x] `src/App.tsx` — 최상위 레이아웃 (씬 라우팅 준비)
- [x] `src/components/three/Scene.tsx` — 빈 R3F Canvas + 기본 조명
- [x] `src/store/useGameStore.ts` — 게임 전역 상태 (currentScene, gameMode)
- [x] `src/core/types/common.ts` — 공통 타입 (GridPosition, Vector3Data 등)
- [x] `src/core/types/terrain.ts` — 지형 타입 예약 (빈 인터페이스)
- [x] `src/core/types/track.ts` — 트랙 타입 예약 (빈 인터페이스)
- [x] `src/core/types/ride.ts` — 놀이기구 타입 예약 (빈 인터페이스)
- [x] `src/core/types/simulation.ts` — 시뮬레이션 타입 예약 (인터페이스만, Phase 8+)
- [x] `src/core/types/finance.ts` — 재정 타입 예약 (인터페이스만, Phase 8+)
- [x] `src/core/types/index.ts` — 타입 통합 re-export
- [x] `src/core/constants/grid.ts` — 그리드 상수 (GRID_UNIT, HEIGHT_STEP 등)
- [x] `src/core/constants/index.ts` — 상수 통합 re-export
- [x] `tsconfig.json`, `vite.config.ts`, `eslint.config.js` 정리 확인
- [x] `.gitignore`, `README.md` 정리
- [x] `npm install` → `npm run dev` 정상 확인
- [x] `npx tsc --noEmit` 통과
- [x] `npm run lint` 통과

**생성 파일**:
`src/main.tsx`, `src/App.tsx`, `src/components/three/Scene.tsx`, `src/store/useGameStore.ts`,
`src/core/types/common.ts`, `src/core/types/terrain.ts`, `src/core/types/track.ts`,
`src/core/types/ride.ts`, `src/core/types/simulation.ts`, `src/core/types/finance.ts`,
`src/core/types/index.ts`, `src/core/constants/grid.ts`, `src/core/constants/index.ts`

**완료 기준**:
- `npm run dev`로 빈 3D 씬(Canvas + 조명)이 정상 렌더링
- `npx tsc --noEmit` 통과 (타입 에러 없음)
- `npm run lint` 통과

**테스트 체크포인트**: 브라우저에서 빈 3D 씬 렌더링 확인 (시각적 확인)

---

## Phase 1: 메인 메뉴 & 맵 관리 시스템 (L)

**목표**: 게임 진입 흐름 + 맵 파일 생성/저장/불러오기/삭제

**선행 조건**: Phase 0 완료

### 1-1. 씬 전환 시스템

- [x] `useGameStore.ts`에 `currentScene` 상태 추가 ('mainMenu' | 'mapSelect' | 'game')
- [x] `App.tsx`에서 `currentScene`에 따른 씬 라우팅 구현

### 1-2. 메인 메뉴 UI

- [x] `scenes/MainMenuScene.tsx` — 게임 시작 화면
  - [x] 게임 타이틀 표시
  - [x] 메뉴 버튼: 자유 모드(Free Play), 불러오기(Load Map)
  - [x] (예약) 퀘스트 모드, 설정 버튼 (비활성 상태로 표시)

### 1-3. 맵 선택 & 관리

- [x] `scenes/MapSelectScene.tsx` — 맵 브라우저
  - [x] 새 맵 만들기: 이름, 크기(S/M/L) 입력 → 빈 맵 생성
  - [x] 저장된 맵 목록 표시 (localStorage 기반)
  - [x] 맵 불러오기, 이름 변경, 삭제 기능
  - [x] 맵 선택 시 `GameScene`으로 전환

### 1-4. 맵 직렬화 시스템

- [x] `core/utils/serializer.ts` — 맵 데이터 ↔ JSON 변환
  - [x] `serializeMap(storeState): string`
  - [x] `deserializeMap(jsonString): MapFile`
  - [x] 버전 호환성 체크 (`version` 필드)
- [x] `store/useMapStore.ts` — 맵 관리 상태
  - [x] `savedMaps`: 저장된 맵 목록 메타데이터
  - [x] `currentMapId`: 현재 열린 맵
  - [x] 액션: `createMap`, `saveMap`, `loadMap`, `deleteMap`, `renameMap`
- [x] localStorage 어댑터 (추후 파일 기반으로 교체 가능하도록 인터페이스 분리)

### 1-5. 게임 씬 기본 뼈대

- [x] `scenes/GameScene.tsx` — 게임 플레이 화면 뼈대
  - [x] R3F Canvas + 카메라 + 조명
  - [x] HUD 오버레이 (저장, 메뉴 복귀 버튼)
  - [x] 빈 지형 영역 표시 (Phase 2에서 구현)

**생성 파일**:
`src/scenes/MainMenuScene.tsx`, `src/scenes/MapSelectScene.tsx`, `src/scenes/GameScene.tsx`,
`src/core/utils/serializer.ts`, `src/store/useMapStore.ts`,
`src/components/ui/MainMenu.tsx`, `src/components/ui/MapBrowser.tsx`, `src/components/ui/HUD.tsx`

**완료 기준**:
- 메인 메뉴 → 새 맵 생성 → 게임 씬 진입 → 저장 → 메뉴 복귀 → 불러오기 전체 흐름 작동
- 맵 직렬화 → 역직렬화 왕복 테스트 통과
- `npx tsc --noEmit` 통과

**테스트 체크포인트**: `serializer.ts`의 serialize/deserialize 왕복 단위 테스트

---

## Phase 2: 지형 시스템 (XL)

**목표**: 3D 그리드 기반 지형 렌더링 + 높이 편집 + Undo/Redo

**선행 조건**: Phase 1 완료 (맵 저장/불러오기 연동 필요)

### 2-1. 지형 데이터 구조

- [x] `core/types/terrain.ts` — 지형 타입 정의 (GridSize, HeightMap 등)
- [x] `core/constants/grid.ts` — 그리드 상수 보강 (편집 상수 추가)
  - [x] 맵 크기 프리셋: S(32x32), M(64x64), L(128x128)
- [x] `store/useTerrainStore.ts` — 높이맵 상태 관리
  - [x] `heightMap: number[]` — (gridSizeX + 1) * (gridSizeZ + 1) 정점 높이
  - [x] `initTerrain(sizeX, sizeZ)` — 평탄한 지형 초기화
  - [x] `setVertexHeight(x, z, h)` — 단일 정점 높이 설정
  - [x] `getVertexHeight(x, z)` — 단일 정점 높이 조회

### 2-2. 지형 3D 렌더링

- [x] `components/three/terrain/Terrain.tsx` — 높이맵 기반 메쉬 렌더링
  - [x] `BufferGeometry` 직접 생성 (position, normal, index 어트리뷰트)
  - [x] 높이맵 변경 시 geometry 업데이트 (`useEffect` + ref로 attribute 교체)
  - [x] 기본 재질: 높이에 따른 색상 그라데이션 (vertex colors)
- [x] `components/three/terrain/GridOverlay.tsx` — 편집 모드 시 그리드 라인 표시
  - [x] `LineSegments` 기반, 지형 높이를 따름
  - [x] terrain 모드에서만 표시

### 2-3. 지형 편집 인터랙션

- [x] `components/three/terrain/TerrainCursor.tsx` — 마우스 호버 시 편집 커서 표시
  - [x] R3F onPointerMove로 지형 위 마우스 위치 감지
  - [x] RCT 스타일 서브 셀렉션: 꼭지점 근처 → corner 모드(인접 삼각형 + 정점 마커), 면 중앙 → full 모드(전체 셀)
  - [x] NxN 격자 셀 기반 브러시 영역 하이라이트
  - [x] 높이 힌트 라벨 (m 단위, drei Html 컴포넌트)
- [x] `hooks/useTerrainEditor.ts` — 편집 로직 훅
  - [x] 도구 모드: 편집(Sculpt) — 드래그 방향으로 올리기/내리기, 평탄화(Flatten)
  - [x] 스컬프트: 클릭 후 마우스 위로 드래그 = 올리기, 아래로 = 내리기 (ratchet 메커니즘)
  - [x] 드래그 중 서브 셀렉션 잠금 + 높이 힌트 실시간 갱신
  - [x] 브러시 크기 조절 (1~5 그리드)
  - [x] Undo/Redo (heightMap 스냅샷 스택, max 50)
- [x] `components/ui/TerrainEditor/TerrainToolbar.tsx` — 편집 도구 UI
  - [x] 도구 선택 버튼 (편집, 평탄화) + 사용법 힌트
  - [x] 브러시 크기 슬라이더
  - [x] Undo/Redo 버튼
- [x] `core/systems/TerrainSystem.ts` — 순수 로직
  - [x] `adjustHeightGrid` / `adjustSingleVertex` — 격자 셀/정점 기반 높이 조절
  - [x] `flattenAreaGrid` — 영역 평탄화
  - [x] `detectSubSelection` — RCT 스타일 corner/full 모드 감지
  - [x] `calculateNormals`, `generatePositions`, `generateVertexColors` 등 geometry 생성

### 2-4. 지형 + 맵 저장 연동

- [x] 맵 저장 시 heightMap이 JSON에 포함되는지 확인 (useMapStore.saveMap에서 terrainStore 동기화)
- [x] 맵 불러오기 시 heightMap이 올바르게 복원되는지 확인 (GameScene에서 initFromMapData)
- [ ] 다양한 크기 맵에서 저장/불러오기 왕복 수동 테스트

**생성 파일**:
`src/store/useTerrainStore.ts`, `src/core/systems/TerrainSystem.ts`,
`src/components/three/terrain/Terrain.tsx`, `src/components/three/terrain/GridOverlay.tsx`,
`src/components/three/terrain/TerrainCursor.tsx`,
`src/hooks/useTerrainEditor.ts`, `src/components/ui/TerrainEditor/TerrainToolbar.tsx`

**완료 기준**:
- 3D 지형 위에서 마우스로 높이를 올리고 내리며 편집 가능
- 저장 후 불러오면 동일한 지형 복원
- 64x64 지형 편집 시 60FPS 유지
- `npx tsc --noEmit` 통과

**테스트 체크포인트**: `TerrainSystem.ts`의 `adjustHeight`, `flattenArea`, `calculateNormals` 단위 테스트

---

## Phase 3: 카메라 시스템 고도화 (M)

**목표**: 놀이공원 관리에 적합한 RTS 스타일 카메라 조작 완성

**선행 조건**: Phase 2 완료 (지형 위에서 카메라 조작 테스트 필요)

> **현재 상태**: Phase 2에서 기본 카메라 시스템이 이미 구현됨.
> CameraControls 기반 회전/줌/팬 + WASD 이동 + 맵 중앙 자동 포커스 작동 중.
> Phase 3에서는 미구현 기능을 보완합니다.

### 완료된 항목 (Phase 2에서 구현)

- [x] CameraControls (camera-controls 라이브러리) 기반 카메라 제어
- [x] 우클릭 드래그: 카메라 회전
- [x] 중클릭 드래그: 카메라 팬
- [x] 마우스 휠: 줌 인/아웃
- [x] WASD: 카메라 수평 이동 (truck + forward)
- [x] terrain 모드: 좌클릭=편집, 우클릭=회전 분리
- [x] 맵 로드 시 카메라 맵 중앙 자동 포커스

### 미구현 태스크

- [ ] 줌 레벨에 따른 카메라 각도 자동 조절 (줌 아웃 → 더 탑다운, 줌 인 → 더 수평)
- [ ] 카메라 이동 범위 제한 (맵 밖으로 나가지 않도록)
- [ ] `store/useCameraStore.ts` — 카메라 상태 (position, target, zoom, cameraMode)
- [ ] `hooks/useKeyboard.ts` — 키보드 단축키 통합 시스템 (현재 WASD는 Scene.tsx에 내장)
- [ ] 추후 놀이기구 모드 카메라: 'rideFollow', 'rideFirstPerson'

**완료 기준**:
- 키보드와 마우스로 자유롭게 맵을 탐색 가능
- 지형 편집과 카메라 조작이 자연스럽게 공존
- 맵 밖으로 카메라가 나가지 않음
- `npx tsc --noEmit` 통과

**테스트 체크포인트**: 시각적 확인 (카메라 조작의 자연스러움)

---

## Phase 4: 트랙 시스템 (XL)

**목표**: 트랙 세그먼트를 하나씩 배치하여 폐쇄 트랙 생성

**선행 조건**: Phase 3 완료 (카메라 조작 + 지형 위 작업 가능)

> **참고**: `docs/archive/`의 기존 트랙 빌더 코드를 참조하여 리팩토링합니다.

### 4-1. 트랙 데이터 구조

- [ ] `core/types/track.ts` — 트랙 세그먼트 타입 정의
  - [ ] 세그먼트 속성: type, direction, heightDelta, bankAngle, specialType
  - [ ] 세그먼트 타입 union: straight, left_gentle, left_sharp, right_gentle, right_sharp, slope_up, slope_down
  - [ ] 특수 타입 union: normal, chain_lift, brake, booster
- [ ] `core/constants/track.ts` — 트랙 상수
  - [ ] `SEGMENT_LENGTH` — 트랙 한 땀의 기본 길이
  - [ ] 각 세그먼트 타입별 방향 변화량
  - [ ] 곡률별 회전 각도 프리셋
- [ ] `core/systems/TrackSystem.ts` — 트랙 계산 로직
  - [ ] `calculateNextPosition(currentPos, currentDir, segmentType)` → 다음 세그먼트 시작점
  - [ ] `validateConnection(lastSegment, stationPosition)` → 자동완성 가능 여부
  - [ ] `generateCurvePoints(segments)` → Three.js 곡선을 위한 제어점 배열
  - [ ] `autoComplete(currentSegments, targetPosition)` → 자동완성 세그먼트 배열
  - [ ] `checkCollision(segments, newSegment)` → 충돌 감지

### 4-2. 트랙 빌더 UI

- [ ] `components/ui/RideBuilder/RideBuilderPanel.tsx` — 놀이기구 제작 패널
  - [ ] 제작 시작: 정거장 위치 선택 → 빌더 모드 진입
  - [ ] 세그먼트 타입 선택 버튼 (직진, 좌회전, 우회전, 오르막, 내리막)
  - [ ] 특수 트랙 선택 (체인리프트, 브레이크, 부스터)
  - [ ] 뱅크 각도 조절
  - [ ] Undo (마지막 세그먼트 제거)
  - [ ] 자동완성 버튼 (조건 충족 시 활성화)
  - [ ] 완료/취소 버튼
- [ ] `components/ui/RideBuilder/TrackSegmentPicker.tsx` — 세그먼트 종류 선택 UI

### 4-3. 트랙 3D 렌더링

- [ ] `components/three/track/TrackPath.tsx` — 전체 트랙 경로 렌더링
  - [ ] `CatmullRomCurve3` 또는 `TubeGeometry` 기반
  - [ ] 세그먼트별 색상 구분 (특수 트랙은 다른 색)
- [ ] `components/three/track/TrackSegment.tsx` — 개별 세그먼트 렌더링
  - [ ] 트랙 메쉬 (두 줄의 레일 + 침목)
  - [ ] 정상 상태 / 선택 상태 시각 구분
- [ ] `components/three/track/TrackPreview.tsx` — 배치 전 프리뷰
  - [ ] 반투명 표시
  - [ ] 스냅 위치에 다음 세그먼트 프리뷰
  - [ ] 배치 불가능한 경우 빨간색 표시
- [ ] `components/three/track/TrackSupport.tsx` — 지지대 자동 생성
  - [ ] 트랙과 지형 사이 높이 차이에 맞춰 높이 자동 계산
  - [ ] InstancedMesh로 대량 렌더링 최적화
- [ ] `components/three/ride/Station.tsx` — 정거장 렌더링
  - [ ] 정거장 플랫폼 메쉬
  - [ ] 입구/출구 표시

### 4-4. 트랙 + 지형 상호작용

- [ ] 트랙 배치 시 지형 위 높이 참조
- [ ] 트랙이 지형 아래로 뚫고 들어가는 경우 감지 (경고 또는 차단)
- [ ] 지지대 높이 = 트랙 높이 - 해당 위치 지형 높이

**생성 파일**:
`src/core/types/track.ts` (보강), `src/core/constants/track.ts`, `src/core/systems/TrackSystem.ts`,
`src/store/useTrackStore.ts`,
`src/components/three/track/TrackPath.tsx`, `src/components/three/track/TrackSegment.tsx`,
`src/components/three/track/TrackPreview.tsx`, `src/components/three/track/TrackSupport.tsx`,
`src/components/three/ride/Station.tsx`,
`src/components/ui/RideBuilder/RideBuilderPanel.tsx`, `src/components/ui/RideBuilder/TrackSegmentPicker.tsx`,
`src/hooks/useTrackBuilder.ts`

**완료 기준**:
- 정거장부터 시작하여 트랙을 한 땀씩 이어 붙여 하나의 폐쇄 트랙 완성 가능
- 3D로 트랙과 지지대가 올바르게 렌더링됨
- 스냅, 충돌감지, 자동완성 작동
- `npx tsc --noEmit` 통과

**테스트 체크포인트**: `TrackSystem.ts`의 `calculateNextPosition`, `validateConnection`, `checkCollision` 단위 테스트

---

## Phase 5: 차량 & 물리 시뮬레이션 (L)

**목표**: 트랙 위를 달리는 차량 구현 + 물리 기반 속도 계산

**선행 조건**: Phase 4 완료 (폐쇄 트랙 필요)

### 5-1. 차량 경로 이동

- [ ] `components/three/ride/Vehicle.tsx` — 차량 렌더링 + 경로 추적
  - [ ] 트랙 세그먼트들로부터 `CatmullRomCurve3` 경로 생성
  - [ ] `useFrame`에서 t 파라미터 증가 → `curve.getPointAt(t)`로 위치 업데이트
  - [ ] 차량 방향(접선 벡터) 자동 정렬
  - [ ] 뱅크 각도에 따른 차량 기울기
- [ ] 차량 모델: 기본 Box geometry (추후 GLTF 모델로 교체 가능)

### 5-2. 물리 시뮬레이션

- [ ] `core/systems/PhysicsSystem.ts` — 물리 계산 (순수 수학, rapier 미사용)
  - [ ] 에너지 보존 기반 속도 계산: v = sqrt(2g * deltaH + v0²)
  - [ ] 마찰 감속: v -= friction * dt
  - [ ] 공기 저항: v -= airResist * v² * dt
  - [ ] 체인리프트 구간: 일정 속도로 끌어올림
  - [ ] 브레이크 구간: 목표 속도까지 감속
  - [ ] 부스터 구간: 목표 속도까지 가속
- [ ] `components/ui/RideBuilder/RideStatsDisplay.tsx` — 운행 통계 표시
  - [ ] 실시간: 현재 속도
  - [ ] 운행 완료 후: 최대 속력, 최대 높이, 최대 G-Force, 주행 시간, 트랙 길이
- [ ] G-Force 계산
  - [ ] 수직 G-Force: 곡선 반경과 속도 기반
  - [ ] 횡방향 G-Force: 곡률과 속도 기반

### 5-3. 테스트 운행

- [ ] `hooks/useRideTest.ts` — 테스트 운행 훅
  - [ ] 운행 시작/중지/리셋
  - [ ] 운행 완료 시 통계 계산 및 표시
- [ ] 카메라 모드 전환
  - [ ] 탑승자 시점 (1인칭): 차량 위치에 카메라 부착
  - [ ] 추적 시점 (3인칭): 차량을 따라가는 카메라
  - [ ] 자유 시점: 기존 카메라 유지하면서 차량 운행

**생성 파일**:
`src/core/systems/PhysicsSystem.ts`, `src/core/constants/physics.ts`,
`src/components/three/ride/Vehicle.tsx`,
`src/components/ui/RideBuilder/RideStatsDisplay.tsx`,
`src/hooks/useRideTest.ts`

**완료 기준**:
- 트랙 위에서 차량이 물리 법칙에 따라 움직임
- 속도, G-Force 등 운행 통계 도출
- 탑승자 시점(1인칭)으로 관찰 가능
- `npx tsc --noEmit` 통과

**테스트 체크포인트**: `PhysicsSystem.ts`의 속도 계산, G-Force 계산 단위 테스트

---

## Phase 6: 놀이기구 완성 & 관리 (L)

**목표**: 놀이기구를 하나의 완성된 단위로 저장/관리

**선행 조건**: Phase 5 완료 (차량 + 물리 시뮬레이션)

### 6-1. 놀이기구 통합

- [ ] `store/useRideStore.ts` — 놀이기구 CRUD
  - [ ] `rides: Record<string, RideData>`
  - [ ] `addRide`, `updateRide`, `deleteRide`
  - [ ] 각 놀이기구: 정거장 + 트랙 + 차량 설정 + 통계
- [ ] 차량 타입 선택 UI
  - [ ] 놀이기구 종류별 사용 가능한 차량 목록
  - [ ] 열차 수, 차량 수 설정
- [ ] 놀이기구 이름 설정
- [ ] 놀이기구 목록 패널 (전체 놀이기구 관리)

### 6-2. 놀이기구 편집

- [ ] 기존 놀이기구 선택 → 트랙 편집 모드 재진입
- [ ] 개별 세그먼트 수정/삭제
- [ ] 놀이기구 전체 삭제

### 6-3. 맵 저장에 놀이기구 포함

- [ ] 직렬화: 모든 놀이기구 데이터 JSON 포함
- [ ] 역직렬화: 놀이기구 복원 및 3D 렌더링

**생성 파일**:
`src/store/useRideStore.ts`, `src/core/systems/RideSystem.ts`,
`src/components/three/ride/RideGroup.tsx`

**완료 기준**:
- 하나의 맵에 여러 놀이기구를 만들고, 각각 테스트 운행 가능
- 저장/불러오기 시 모든 놀이기구 보존
- `npx tsc --noEmit` 통과

**테스트 체크포인트**: 놀이기구 포함 맵 직렬화/역직렬화 왕복 테스트

---

## Phase 7: 놀이기구 프리셋 배치 (M)

**목표**: 완성된 놀이기구를 프리셋으로 저장하고, 맵에 원클릭 배치

**선행 조건**: Phase 6 완료 (놀이기구 CRUD 완성)

### 태스크

- [ ] 놀이기구 프리셋 저장/불러오기
- [ ] 배치 모드: 반투명 프리뷰가 마우스를 따라다님
- [ ] 회전: Q/E 키로 90도 단위 회전
- [ ] 지형 충돌 검사: 배치 가능 여부 표시 (초록/빨강)
- [ ] 클릭으로 배치 확정
- [ ] 배치 후 지지대 자동 생성

**생성 파일**:
`src/hooks/usePresetPlacer.ts`, `src/components/ui/PresetBrowser.tsx`

**완료 기준**:
- 미리 만든 놀이기구를 다른 위치에 자유롭게 배치 가능
- 프리셋 저장/불러오기/배치 전체 흐름 작동
- `npx tsc --noEmit` 통과

**테스트 체크포인트**: 시각적 확인 (프리셋 배치의 자연스러움)

---

## Phase 8+: 향후 확장 후보 (우선순위 미정)

> 아래 항목들은 핵심 기능 완성 후 선택적으로 진행합니다.
> 각 항목의 우선순위는 개발 진행 상황에 따라 결정합니다.
> `core/types/simulation.ts`와 `core/types/finance.ts`에 인터페이스가 예약되어 있습니다.

### 보행자 도로 시스템
- 도로 그리드 배치 (땅 위에 포장 텍스처)
- 정거장 입구/출구와 도로 연결
- 도로 위 NPC 이동 경로 (A* 또는 flow field)

### NPC (손님) 시스템
- NPC 스폰, 이동, 놀이기구 탑승
- NPC 상태: 만족도, 배고픔 등
- NPC AI: 목적지 선택, 대기열 참여

### 시간 시스템 (시뮬레이션)
- 게임 틱 기반 시간 진행
- 재생/일시정지/배속 컨트롤
- 저장 시 현재 틱 및 모든 엔티티 상태 기록

### 재정 시스템
- 놀이기구별 건설 비용, 유지 비용
- 입장료 설정
- 수입/지출 통계 대시보드

### 놀이기구 종류 확장
- 워터슬라이드, 회전목마, 관람차 등
- 각 종류별 고유 트랙/차량/물리 파라미터

### 장식 & 풍경
- 나무, 꽃, 벤치, 울타리 등 배치
- 지형 텍스처 페인팅 (잔디, 흙, 물)

### 사운드
- 배경 음악
- 놀이기구 효과음 (체인리프트 소리, 바람 소리, 비명)
- UI 효과음

### 멀티플레이 / 공유
- 맵 파일 내보내기/가져오기 (.json 파일 다운로드/업로드)
- 놀이기구 프리셋 공유

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-03-01 | Phase 2 UX 개선: 드래그 방향 스컬프트, 도구 단순화(2개), WASD 카메라, 실시간 높이 힌트 |
| 2026-03-01 | Phase 2: RCT 스타일 서브 셀렉션 (corner/full 모드) 추가 |
| 2026-03-01 | Phase 2: 격자 셀 기반 편집 + CameraControls + 드래그 쓰로틀 + 맵 중앙 카메라 |
| 2026-03-01 | Phase 2: 지형 시스템 구현 (3D 렌더링, 높이 편집, Undo/Redo, 맵 저장 연동) |
| 2026-03-01 | Phase 0-1: 프로젝트 리셋 + 메인 메뉴/맵 관리 시스템 |
