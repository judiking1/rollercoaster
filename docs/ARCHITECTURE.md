# ARCHITECTURE.md — 시스템 아키텍처

> 이 문서는 Rollercoaster Tycoon 웹 클론의 아키텍처 설계를 정의합니다.
> 코드 작성 시 이 아키텍처를 따르며, 변경 시 이 문서를 먼저 업데이트합니다.

---

## 1. 아키텍처 패턴: 레이어드 아키텍처 + 도메인 스토어

ECS(Entity-Component-System)를 사용하지 않습니다. React/R3F가 이미 컴포지션 모델을 제공하며, ECS는 이 프로젝트 규모에서 과도한 추상화입니다.

### 5개 레이어

```
┌─────────────────────────────────────────────────┐
│  UI Layer (components/ui/)                      │  TailwindCSS 기반 2D UI
│  - MainMenu, HUD, Toolbar, RideBuilder 등       │  사용자 입력 → 훅/스토어 호출
├─────────────────────────────────────────────────┤
│  3D Layer (components/three/)                   │  R3F 컴포넌트
│  - Scene, Terrain, Track, Vehicle 등             │  스토어 구독 → 3D 렌더링
├─────────────────────────────────────────────────┤
│  Hooks Layer (hooks/)                           │  커스텀 훅
│  - useTerrainEditor, useTrackBuilder 등          │  UI ↔ 스토어 ↔ 시스템 연결
├─────────────────────────────────────────────────┤
│  Store Layer (store/)                           │  Zustand 도메인 스토어
│  - useGameStore, useTerrainStore 등              │  상태 관리 + 액션
├─────────────────────────────────────────────────┤
│  Core Layer (core/)                             │  프레임워크 독립
│  - types/, constants/, utils/, systems/         │  순수 로직, 타입, 상수
└─────────────────────────────────────────────────┘
```

### 의존성 규칙

- 상위 레이어만 하위 레이어에 의존 가능 (단방향)
- **Core**는 어떤 레이어에도 의존하지 않음
- **Store**는 Core에만 의존
- **Hooks**는 Store와 Core에 의존
- **3D/UI Layer**는 Hooks, Store, Core에 의존
- 같은 레이어 간 의존은 허용하되 순환 의존 금지

```
UI / 3D  →  Hooks  →  Store  →  Core
             ↓                    ↑
             └────────────────────┘
```

---

## 2. 상태 직렬화 설계

### 원칙

모든 게임 상태는 **JSON 직렬화 가능**해야 합니다.

```
금지: 함수, 클래스 인스턴스, Symbol, Map/Set, TypedArray (상태 내)
허용: string, number, boolean, null, 일반 객체, 배열
```

### Float32Array → Array 변환 규칙

내부 계산에서 `Float32Array`를 사용하더라도 Zustand 스토어 상태에는 `number[]`로 저장합니다.

```typescript
// ✅ 스토어 상태: number[]
interface TerrainState {
  heightMap: number[];  // JSON 직렬화 가능
}

// ✅ core/systems 내부 계산: Float32Array 사용 가능
function calculateNormals(heightMap: readonly number[]): Float32Array {
  const normals = new Float32Array(heightMap.length * 3);
  // ... 계산 후 반환 (렌더링에 직접 사용)
  return normals;
}
```

### 직렬화/역직렬화 흐름

```
저장 (Save):
  Store State → serializer.serializeMap() → JSON string → localStorage

불러오기 (Load):
  localStorage → JSON string → serializer.deserializeMap() → Store Actions (상태 복원)
```

---

## 3. 액션/이벤트 흐름

### 별도 이벤트 버스 없음

Zustand 액션이 이벤트 핸들러 역할을 합니다.

```typescript
// 사용자 입력 → 훅 → 스토어 액션
function handleTerrainClick(position: GridPosition) {
  const { activeTool, brushSize } = useGameStore.getState();
  const { heightMap, gridSize } = useTerrainStore.getState();

  // core/systems 순수 함수 호출
  const newHeightMap = adjustHeight(heightMap, position.x, position.z, brushSize, delta, gridSize);

  // 스토어 상태 업데이트
  useTerrainStore.getState().setHeightMap(newHeightMap);
}
```

### 크로스-스토어 통신

```typescript
// ✅ 다른 스토어 읽기: useXStore.getState()
const saveMap = () => {
  const terrain = useTerrainStore.getState();
  const rides = useRideStore.getState();
  const mapData = serializeMap({ terrain, rides });
  // ...
};

// ❌ 스토어 간 구독 금지 (순환 의존 위험)
// useTerrainStore 내부에서 useTrackStore.subscribe() 하지 않음
```

### 전형적인 데이터 흐름

```
1. 사용자 입력 (클릭/키보드)
   ↓
2. UI/3D 컴포넌트의 이벤트 핸들러
   ↓
3. 커스텀 훅 (useTerrainEditor, useTrackBuilder)
   ↓
4. core/systems 순수 함수 호출 (계산)
   ↓
5. Zustand 스토어 액션 (상태 업데이트)
   ↓
6. 구독 중인 컴포넌트 자동 리렌더 (React 반응성)
```

---

## 4. 카메라 시스템 아키텍처

### 3가지 모드

| 모드 | 설명 | 전환 조건 |
|------|------|----------|
| `free` | RTS 스타일 자유 조작 | 기본 모드 |
| `rideFollow` | 차량 추적 (3인칭) | 테스트 운행 시 선택 |
| `rideFirstPerson` | 탑승자 시점 (1인칭) | 테스트 운행 시 선택 |

### 입력 매핑

| 입력 | `free` 모드 동작 | `rideFollow`/`rideFirstPerson` 동작 |
|------|-----------------|--------------------------------------|
| WASD / 화살표 | 수평 이동 (팬) | — |
| 마우스 휠 | 줌 인/아웃 | 줌 인/아웃 (rideFollow만) |
| 마우스 우클릭 드래그 | 카메라 회전 (orbit) | — |
| 마우스 중클릭 드래그 | 카메라 팬 | — |
| ESC | — | free 모드로 복귀 |

### 줌-각도 연동

```
줌 아웃 (멀리) → 카메라 각도 60~75° (탑다운에 가까움)
줌 인 (가까이) → 카메라 각도 30~45° (수평에 가까움)

보간: angle = lerp(MIN_ANGLE, MAX_ANGLE, 1 - zoomNormalized)
```

---

## 5. 3D 에셋 파이프라인

### Phase 0-4: 프로시저럴 기하학만 사용

모든 3D 오브젝트를 코드로 생성합니다.

```
지형:     BufferGeometry (position, normal, index)
트랙:     TubeGeometry / 커스텀 BufferGeometry
지지대:   CylinderGeometry + InstancedMesh
정거장:   BoxGeometry 조합
차량:     BoxGeometry (플레이스홀더)
그리드:   LineSegments
```

### Phase 5+: GLTF/GLB 모델 도입 (평가 후)

```
파일 위치:  public/models/
로딩:       drei useGLTF + Suspense
캐싱:       useGLTF.preload()
```

---

## 6. 핵심 설계 결정

| 결정 사항 | 선택 | 이유 |
|-----------|------|------|
| 아키텍처 | Layered + Domain Stores | ECS보다 React/R3F 생태계에 자연스럽게 적합 |
| 상태 관리 | Zustand (immer 없이) | 의존성 최소화, spread로 충분한 불변성 관리 |
| 타입 시스템 | TypeScript strict | 컴파일 타임 안전성, 리팩토링 신뢰성 |
| TS enum | union + as const | 트리 셰이킹 가능, 더 단순한 멘탈 모델 |
| rail vs track | **track** | 기존 코드에서 사용한 네이밍과 일관성 유지 |
| 물리 엔진 | 순수 수학 우선 | 디버깅 용이, rapier는 Phase 5+ 이후 평가 |
| core 계층 함수 스타일 | export function | static class보다 트리 셰이킹 유리, 간결 |
| 3D 에셋 (초기) | 프로시저럴 | 모델 에셋 없이 빠르게 프로토타이핑 |
| 이벤트 시스템 | Zustand 액션 | 별도 이벤트 버스 불필요, 상태 변경이 곧 이벤트 |
| 직렬화 포맷 | JSON | 웹 네이티브, 디버깅 용이, localStorage 호환 |
| CSS 프레임워크 | TailwindCSS 4 | 유틸리티 우선, @tailwindcss/vite 플러그인 사용 |
| 브랜치 전략 | main 직접 분기 | 1인 개발, dev 브랜치 오버헤드 불필요 |

---

## 7. 성능 전략

### 렌더링 최적화

| 대상 | 기법 | 적용 시점 |
|------|------|----------|
| 지형 | 청크 분할 + frustum culling | Phase 2 |
| 그리드 오버레이 | InstancedMesh 또는 LineSegments | Phase 2 |
| 트랙 지지대 | InstancedMesh | Phase 4 |
| 차량 | InstancedMesh (다수 차량) | Phase 5 |
| 전체 씬 | LOD (Level of Detail) | Phase 5+ |

### 상태 최적화

| 대상 | 기법 |
|------|------|
| Zustand 구독 | selector로 최소 범위 구독 |
| 지형 편집 | heightMap diff만 전파 (가능 시) |
| useFrame 계산 | ref 직접 조작, setState 금지 |
| 곡선 계산 | Web Worker (Phase 5+ 평가) |
