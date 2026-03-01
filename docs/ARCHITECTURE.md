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

### 줌-각도 연동 (제거됨)

> Phase 4b에서 카메라 줌-각도 자동 보간 기능을 제거했습니다.
> 줌 인/아웃 시 카메라가 바운싱하는 UX 문제가 있어 사용자가 자유롭게 조작하도록 변경.

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

---

## 8. 웹 플랫폼 한계와 단계별 최적화 전략

> 이 섹션은 "웹/React로 RCT를 만들 수 있는가?"에 대한 기술 분석과
> 프로젝트 규모 확장에 따른 아키텍처 진화 계획을 문서화합니다.

### 8-1. 현재 아키텍처가 이미 대응하는 부분

현재 구조는 이미 게임 개발의 많은 베스트 프랙티스를 반영하고 있습니다:

| 우려 사항 | 현재 대응 | 비고 |
|-----------|-----------|------|
| React Virtual DOM 오버헤드 | R3F `useFrame` + ref 직접 조작 | 매 프레임 렌더링은 React 렌더 사이클을 우회 |
| React는 UI에만 적합 | 3D는 R3F(WebGL), UI만 React | 이미 분리됨 |
| 상태 관리 오버헤드 | Zustand selector 최소 구독 | 필요한 컴포넌트만 리렌더 |
| 게임 로직과 프레임워크 결합 | `core/systems/` 순수 함수 분리 | 프레임워크 독립, 추후 WASM 이식 가능 |

핵심: **React는 이미 UI 패널(HUD, 메뉴, 빌더)에만 사용**하고, **게임 렌더링은 R3F(=WebGL)**로 처리 중.
R3F의 `useFrame`은 React 렌더링과 독립적인 rAF 루프이므로, 순수 React의 성능 문제를 대부분 회피합니다.

### 8-2. Phase별 예상 병목과 대응 전략

```
Phase 1~4  (현재)     ← 병목 없음. JS + R3F로 충분.
Phase 5    (물리)     ← 단일 차량 물리는 JS로 충분. 다수 차량 시 최적화 필요.
Phase 6~7  (관리)     ← 놀이기구 수십 개 수준. JS + InstancedMesh로 충분.
Phase 8+   (NPC/시뮬) ← ⚠️ 여기서부터 한계가 올 수 있음.
```

### 8-3. Phase 8+ 성능 위험 분석

#### 문제 1: GC(가비지 컬렉션) 스파이크

수천 명의 NPC를 매 틱 업데이트하면 대량의 임시 객체가 생성/해제되어
GC 스파이크로 프레임 드랍(30ms+)이 발생할 수 있습니다.

**대응 전략**:
- **Object Pooling**: NPC, 경로 노드 등을 풀로 관리하여 GC 최소화
- **TypedArray 기반 데이터**: NPC 상태를 `Float32Array`/`Int32Array`로 저장 (SoA 패턴)
  ```
  positions: Float32Array(guestCount * 3)  // x, y, z 연속
  states: Uint8Array(guestCount)           // 상태 enum을 숫자로
  ```
- **최종 수단**: WASM (Rust/C) 시뮬레이션 엔진

#### 문제 2: 싱글 스레드 병목

메인 스레드에서 렌더링 + 시뮬레이션 + 입력 처리를 모두 하면
시뮬레이션이 복잡해질수록 프레임 레이트가 하락합니다.

**대응 전략** (단계적 도입):
```
Step 1: 시뮬레이션 로직을 Web Worker로 분리
        Main Thread  → 렌더링 + 입력
        Worker       → NPC AI, 경로 탐색, 물리 계산
        통신: postMessage + SharedArrayBuffer

Step 2: 필요 시 시뮬레이션 코어를 WASM으로 교체
        Rust → wasm-pack → Web Worker에서 실행
        core/systems/의 순수 함수를 1:1로 포팅
```

#### 문제 3: 경로 탐색 (A* / Flow Field)

수천 NPC가 동시에 경로를 탐색하면 JS에서는 감당이 어려울 수 있습니다.

**대응 전략**:
- Flow Field 알고리즘 (전체 맵 1회 계산 → 모든 NPC 공유)
- Web Worker에서 비동기 계산
- 캐싱: 도로 네트워크 변경 시에만 재계산

### 8-4. 미래 목표 아키텍처 (Phase 8+ 도달 시)

```
┌─────────────────────────────────────────────────┐
│  React UI Layer                                 │  메뉴, HUD, 패널
│  (components/ui/)                               │  HTML/CSS/TailwindCSS
├─────────────────────────────────────────────────┤
│  R3F 3D Rendering Layer                         │  WebGL 기반 3D 렌더링
│  (components/three/)                            │  useFrame + ref 직접 조작
│  - InstancedMesh, BufferGeometry 등              │  React 렌더 사이클 우회
├─────────────────────────────────────────────────┤
│  Zustand Store Layer                            │  상태 관리 + 브릿지
│  (store/)                                       │  메인 스레드에서 최소 상태 유지
├─────────────────────────────────────────────────┤
│  Web Worker — Simulation Engine                 │  별도 스레드
│  - NPC AI, 경로 탐색, 물리, 재정 계산             │  SharedArrayBuffer 공유
│  - JS 또는 WASM (Rust)                          │  postMessage로 결과 전달
├─────────────────────────────────────────────────┤
│  Core Layer (core/)                             │  순수 로직 (프레임워크 독립)
│  - types/, constants/, systems/                 │  JS → WASM 이식 가능하도록 설계
└─────────────────────────────────────────────────┘
```

### 8-5. 현재 코드에서 미리 지키는 원칙

Phase 8+의 확장을 위해 **지금부터** 지키는 설계 원칙:

1. **`core/systems/`의 순수 함수 패턴 유지**
   - React/Zustand 의존 없이 입력→출력만 있는 함수
   - 추후 Web Worker나 WASM으로 이식할 때 그대로 옮기기 가능

2. **상태는 항상 JSON 직렬화 가능**
   - 클래스 인스턴스, Map/Set, 함수를 상태에 저장하지 않음
   - SharedArrayBuffer로 전환 시 데이터 구조 변환이 용이

3. **`useFrame`에서 setState 절대 금지**
   - ref 직접 조작으로 React 렌더링 루프와 게임 루프 분리
   - 매 프레임 리렌더 방지

4. **대량 오브젝트에 InstancedMesh 사용**
   - 지지대, 그리드, NPC 등 수백~수천 개 오브젝트

5. **시뮬레이션 로직은 독립적인 tick 함수로 설계**
   - `updateSimulation(state, deltaTime) → newState` 형태
   - 메인 스레드에서 호출하다가 → Worker로 이동 가능

### 8-6. WASM 도입 판단 기준

WASM은 성능이 필요할 때만 도입합니다. 섣부른 최적화를 피하고 프로파일링 결과 기반으로 결정합니다.

| 지표 | 임계값 | 대응 |
|------|--------|------|
| NPC 수 | < 200 | JS로 충분 |
| NPC 수 | 200~1000 | Web Worker 분리 + Object Pool |
| NPC 수 | > 1000 | WASM 시뮬레이션 엔진 검토 |
| 경로 탐색 시간 | < 16ms/tick | JS로 충분 |
| 경로 탐색 시간 | > 16ms/tick | Flow Field + Web Worker |
| GC pause | < 5ms | 허용 |
| GC pause | > 10ms | TypedArray SoA 패턴 전환 |
| 전체 프레임 시간 | > 16.6ms (60FPS 미달) | 프로파일링 후 병목 지점 최적화 |

### 8-7. 참고 사례

- **OpenRCT2**: 원작 RCT를 C로 역공학 재구현. Emscripten으로 웹 빌드 시도됨 → 브라우저에서 RCT가 돌아가는 것은 이미 증명된 사실
- **WebAssembly 성능**: 네이티브 대비 약 80~90% 성능 도달 가능
- **SharedArrayBuffer + OffscreenCanvas**: 멀티스레드 렌더링/시뮬레이션 분리 가능
- **현대 WebGL**: Three.js/R3F로 수만 폴리곤 씬을 60FPS 렌더링 가능
