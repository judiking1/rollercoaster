# CLAUDE.md — Rollercoaster Tycoon 클론 프로젝트

> 이 문서는 Claude Code가 이 프로젝트에서 코드를 작성할 때 반드시 따라야 하는 규칙과 기준입니다.
> 모든 코드 생성, 수정, 리팩토링 시 이 문서를 참조하세요.

---

## 1. 프로젝트 개요

- **프로젝트명**: Rollercoaster Tycoon Web Clone
- **목표**: 롤러코스터 타이쿤 스타일의 3D 놀이공원 시뮬레이션 게임을 웹 기술로 구현
- **핵심 기술 스택**: React 19 / TypeScript / React Three Fiber (R3F) / Vite 7 / TailwindCSS 4 / Zustand 5
- **저장소**: https://github.com/judiking1/rollercoaster.git
- **개발 방식**: 기능 단위 점진적 개발 (장기 프로젝트)

---

## 2. 기술 스택 및 의존성

### 핵심

| 역할 | 라이브러리 | 버전 | 비고 |
|------|-----------|------|------|
| UI 프레임워크 | React | ^19.2.0 | Strict Mode 사용 |
| 타입 시스템 | TypeScript | ~5.9 | strict 모드 |
| 3D 렌더링 | @react-three/fiber | ^9.4.0 | R3F 기반 |
| 3D 헬퍼 | @react-three/drei | ^10.7.7 | 카메라, 컨트롤 등 |
| 빌드 도구 | Vite | ^7.2.4 | HMR, fast refresh |
| 상태 관리 | Zustand | ^5.0.8 | 도메인별 독립 스토어 |
| 스타일링 | TailwindCSS | ^4.1.17 | @tailwindcss/vite 플러그인 사용 |
| 3D 엔진 | three | ^0.181.2 | R3F 내부 의존 |
| 디버깅 UI | leva | ^0.10.1 | 개발 시 파라미터 조정 |
| ID 생성 | uuid | ^13.0.0 | 엔티티 고유 ID |
| CSS 전처리 | sass | ^1.94.2 | 필요 시 사용 |

### 보조 (필요 시 도입)

| 역할 | 라이브러리 | 도입 시점 |
|------|-----------|----------|
| 3D 모델 로딩 | @react-three/drei (useGLTF) | Phase 5+ 차량 모델 도입 시 |
| 곡선/경로 | three (CatmullRomCurve3, CubicBezierCurve3) | 트랙 시스템 구현 시 |
| 데이터 직렬화 | JSON (맵 파일 포맷) | Phase 1부터 |
| 테스트 | Vitest + React Testing Library | 유틸리티/상태 로직 테스트 |
| 물리 엔진 | @react-three/rapier | Phase 5+ 평가 후 결정 (순수 수학 우선) |

### 개발 도구

| 역할 | 도구 | 비고 |
|------|------|------|
| Lint | ESLint ^9.39 | flat config (`eslint.config.js`) |
| 타입 검사 | TypeScript (`tsc --noEmit`) | 빌드 전 필수 확인 |

---

## 3. 디렉토리 구조

```
rollercoaster/
├── public/
│   ├── models/              # GLTF/GLB 3D 모델 에셋
│   ├── textures/            # 텍스처 이미지
│   └── sounds/              # 효과음/배경음 (추후)
├── src/
│   ├── main.tsx             # 앱 진입점
│   ├── App.tsx              # 최상위 라우팅 및 레이아웃
│   │
│   ├── core/                # 게임 핵심 시스템 (프레임워크 독립적)
│   │   ├── constants/       # 게임 상수 (그리드 크기, 물리 상수 등)
│   │   │   ├── grid.ts
│   │   │   ├── physics.ts
│   │   │   └── index.ts
│   │   ├── types/           # TypeScript 타입 정의
│   │   │   ├── common.ts    # 공통 타입 (Vector3, GridPosition 등)
│   │   │   ├── terrain.ts
│   │   │   ├── track.ts     # 트랙 세그먼트, 경로 타입
│   │   │   ├── ride.ts
│   │   │   ├── simulation.ts # 예약: 시뮬레이션 타입 (Phase 8+)
│   │   │   ├── finance.ts   # 예약: 재정 시스템 타입 (Phase 8+)
│   │   │   └── index.ts
│   │   ├── utils/           # 순수 유틸리티 함수
│   │   │   ├── math.ts      # 벡터, 보간, 곡선 계산
│   │   │   ├── grid.ts      # 그리드 좌표 변환
│   │   │   ├── serializer.ts # 맵 저장/불러오기 직렬화
│   │   │   └── validation.ts # 트랙 연결 유효성 검증
│   │   └── systems/         # 게임 시스템 로직 (상태 비의존)
│   │       ├── TerrainSystem.ts
│   │       ├── TrackSystem.ts
│   │       ├── PhysicsSystem.ts
│   │       └── RideSystem.ts
│   │
│   ├── store/               # Zustand 상태 관리
│   │   ├── index.ts         # 스토어 통합 export
│   │   ├── useGameStore.ts  # 게임 전역 상태 (모드, 시간, UI 상태)
│   │   ├── useTerrainStore.ts
│   │   ├── useTrackStore.ts
│   │   ├── useRideStore.ts
│   │   ├── useMapStore.ts   # 맵 저장/불러오기/관리
│   │   └── useCameraStore.ts
│   │
│   ├── components/          # React 컴포넌트
│   │   ├── ui/              # 2D UI 컴포넌트 (TailwindCSS)
│   │   │   ├── MainMenu.tsx
│   │   │   ├── HUD.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   ├── MapBrowser.tsx
│   │   │   ├── RideBuilder/
│   │   │   │   ├── RideBuilderPanel.tsx
│   │   │   │   ├── TrackSegmentPicker.tsx
│   │   │   │   └── RideStatsDisplay.tsx
│   │   │   ├── TerrainEditor/
│   │   │   │   ├── TerrainToolbar.tsx
│   │   │   │   └── HeightControls.tsx
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Slider.tsx
│   │   │       └── Tooltip.tsx
│   │   │
│   │   └── three/           # 3D R3F 컴포넌트
│   │       ├── Scene.tsx          # 메인 씬 컨테이너
│   │       ├── CameraController.tsx
│   │       ├── Lighting.tsx
│   │       ├── terrain/
│   │       │   ├── Terrain.tsx          # 지형 메쉬 렌더링
│   │       │   ├── TerrainChunk.tsx     # 청크 단위 렌더링 (최적화)
│   │       │   ├── TerrainCursor.tsx    # 편집 시 호버 커서
│   │       │   └── GridOverlay.tsx      # 그리드 오버레이
│   │       ├── track/
│   │       │   ├── TrackSegment.tsx     # 개별 트랙 세그먼트 렌더링
│   │       │   ├── TrackPath.tsx        # 트랙 경로 전체 렌더링
│   │       │   ├── TrackPreview.tsx     # 배치 전 프리뷰 (반투명)
│   │       │   └── TrackSupport.tsx     # 지지대 렌더링
│   │       ├── ride/
│   │       │   ├── Vehicle.tsx          # 차량 렌더링 및 경로 따라가기
│   │       │   ├── Station.tsx          # 정거장 렌더링
│   │       │   └── RideGroup.tsx        # 놀이기구 전체 묶음
│   │       └── environment/
│   │           ├── Skybox.tsx
│   │           └── Water.tsx            # (추후)
│   │
│   ├── hooks/               # 커스텀 훅
│   │   ├── useTerrainEditor.ts
│   │   ├── useTrackBuilder.ts
│   │   ├── useRideTest.ts
│   │   ├── useMapIO.ts      # 맵 저장/불러오기
│   │   └── useKeyboard.ts   # 키보드 단축키
│   │
│   ├── scenes/              # 게임 씬 (페이지 단위)
│   │   ├── MainMenuScene.tsx
│   │   ├── MapSelectScene.tsx
│   │   └── GameScene.tsx
│   │
│   └── assets/              # 정적 리소스 (import 용)
│       └── icons/
│
├── docs/                    # 프로젝트 문서
│   ├── PROJECT_PLAN.md      # 개발 로드맵
│   ├── ARCHITECTURE.md      # 아키텍처 상세
│   ├── CHANGELOG.md         # 변경 이력
│   └── archive/             # 실험 문서 보관 (참조용)
│
├── CLAUDE.md                # ← 이 파일 (Claude Code 지침)
├── eslint.config.js
├── tsconfig.json
├── vite.config.ts
├── package.json
└── README.md
```

---

## 4. 코딩 규칙

### 4.1 일반 원칙

- **Single Responsibility**: 하나의 파일/함수/컴포넌트는 하나의 역할만 담당
- **DRY (Don't Repeat Yourself)**: 중복 코드는 즉시 유틸리티 또는 공통 컴포넌트로 추출
- **YAGNI (You Aren't Gonna Need It)**: 현재 Phase에서 필요한 것만 구현. 단, 확장 가능한 구조는 미리 설계
- **Composition over Inheritance**: React 컴포넌트와 시스템 모두 합성 패턴 우선

### 4.2 네이밍 컨벤션

```
파일명:
  - React 컴포넌트:  PascalCase.tsx  (예: TerrainChunk.tsx)
  - 훅:              useCamelCase.ts (예: useTerrainEditor.ts)
  - 유틸리티/상수:    camelCase.ts   (예: gridUtils.ts)
  - 타입 정의:        camelCase.ts   (예: terrain.ts)
  - 스토어:           useCamelCase.ts (예: useTerrainStore.ts)

변수/함수:
  - 일반 변수:        camelCase
  - 상수:             UPPER_SNAKE_CASE (예: GRID_SIZE, MAX_HEIGHT)
  - 컴포넌트:         PascalCase
  - 이벤트 핸들러:     handleXxx 또는 onXxx (예: handleTerrainClick, onTrackPlace)
  - boolean:          is/has/can/should 접두사 (예: isEditing, hasStation, canAutoComplete)

Zustand 스토어 액션:
  - set 접두사: 값 설정 (setTool, setHeight)
  - add/remove/update 접두사: CRUD (addTrackSegment, removeRide)
  - reset 접두사: 초기화 (resetTerrain)
  - toggle 접두사: 토글 (toggleGrid)
```

### 4.3 React & R3F 규칙

```tsx
// ✅ 좋은 예: 컴포넌트는 작고 명확하게, Props 인터페이스 명시
interface TerrainChunkProps {
  chunkX: number;
  chunkZ: number;
  heightData: Float32Array;
}

export default function TerrainChunk({ chunkX, chunkZ, heightData }: TerrainChunkProps) {
  // 훅은 컴포넌트 최상단에
  const activeTool = useGameStore((s) => s.activeTool);
  const meshRef = useRef<THREE.Mesh>(null);

  // 메모이제이션: 비용이 큰 계산에만 적용
  const geometry = useMemo(() => {
    return createChunkGeometry(heightData);
  }, [heightData]);

  // useFrame: 매 프레임 호출. 상태 업데이트 금지, ref 조작만.
  useFrame((_state, _delta) => {
    // ❌ setState 호출 금지
    // ✅ meshRef.current!.position.y = ... (직접 조작)
  });

  return <mesh ref={meshRef} geometry={geometry} />;
}
```

**R3F 핵심 규칙:**
- `useFrame` 내에서 React state 업데이트 절대 금지 (매 프레임 리렌더 방지)
- `useFrame`에서는 ref를 통한 직접 조작만 허용
- 3D 오브젝트의 geometry/material은 `useMemo`로 캐싱
- dispose 패턴: `useEffect` cleanup에서 geometry, material dispose 호출
- 대량 오브젝트는 `InstancedMesh` 사용 (지지대, 그리드 셀 등)
- `useRef`에는 반드시 제네릭 타입 명시: `useRef<THREE.Mesh>(null)`

### 4.4 TypeScript 규칙

```typescript
// ✅ interface: 컴포넌트 Props, 스토어 State/Actions, 도메인 엔티티에 사용
interface TerrainState {
  heightMap: number[];
  gridSize: GridSize;
}

// ✅ type: 유니언, 인터섹션, 유틸리티 타입, 간단한 별칭에 사용
type TerrainTool = 'raise' | 'lower' | 'flatten' | 'level';
type Nullable<T> = T | null;

// ✅ union + as const: enum 대신 사용
const SEGMENT_TYPES = ['straight', 'left_gentle', 'left_sharp', 'right_gentle', 'right_sharp'] as const;
type SegmentType = typeof SEGMENT_TYPES[number];

// ✅ satisfies: 타입 안전성과 추론 동시 확보
const RIDE_DEFINITIONS = {
  steel_coaster: { name: '스틸 코스터', friction: 0.02 },
  wooden_coaster: { name: '우드 코스터', friction: 0.04 },
} as const satisfies Record<string, RideDefinition>;

// ✅ import type: 타입만 가져올 때
import type { Vector3Tuple } from 'three';
```

**TypeScript 필수 규칙:**
- `any` 사용 금지 → `unknown` + 타입 가드 사용
- `enum` 사용 금지 → union type + `as const` 사용
- `import type` 사용: 타입만 가져올 때 반드시 `import type` 사용
- `readonly` 권장: 배열/튜플 파라미터에 `readonly` 사용 권장
- Props 인터페이스: 모든 React 컴포넌트에 `interface XxxProps` 정의
- 제네릭 타입: `useRef`, `useState` 등에 제네릭 타입 명시

### 4.5 Zustand 스토어 규칙

```typescript
// ✅ State/Actions 인터페이스 분리 + spread 불변성 관리
import { create } from 'zustand';

interface TerrainState {
  heightMap: number[];
  gridSize: { x: number; z: number };
}

interface TerrainActions {
  initTerrain: (sizeX: number, sizeZ: number) => void;
  setHeight: (x: number, z: number, height: number) => void;
  getHeightAt: (x: number, z: number) => number;
}

const useTerrainStore = create<TerrainState & TerrainActions>()((set, get) => ({
  // --- State ---
  heightMap: [],
  gridSize: { x: 64, z: 64 },

  // --- Actions ---
  initTerrain: (sizeX, sizeZ) => set({
    heightMap: new Array((sizeX + 1) * (sizeZ + 1)).fill(0),
    gridSize: { x: sizeX, z: sizeZ },
  }),

  setHeight: (x, z, height) => set((state) => {
    const idx = z * (state.gridSize.x + 1) + x;
    const newHeightMap = [...state.heightMap];
    newHeightMap[idx] = height;
    return { heightMap: newHeightMap };
  }),

  // --- Selectors (get 사용) ---
  getHeightAt: (x, z) => {
    const s = get();
    return s.heightMap[z * (s.gridSize.x + 1) + x] ?? 0;
  },
}));

export default useTerrainStore;
```

**Zustand 규칙:**
- 각 도메인별 독립 스토어 (useTerrainStore, useTrackStore 등)
- `State`와 `Actions` 인터페이스를 분리 정의
- immer 미사용 — spread 연산자(`...`)로 불변성 관리
- selector 사용으로 불필요한 리렌더링 방지: `useTerrainStore(s => s.gridSize)`
- 스토어 간 참조가 필요하면 `useXStore.getState()` 로 다른 스토어 읽기 (순환 의존 주의)
- 상태는 항상 JSON 직렬화 가능해야 함 (함수, 클래스 인스턴스 저장 금지)

### 4.6 core/systems 규칙 (게임 로직 분리)

```typescript
// ✅ core/systems/TerrainSystem.ts — 순수 함수 export, React/Zustand 의존 없음
import type { GridSize } from '../types/terrain';

/**
 * 주어진 좌표 주변 정점들의 높이를 브러시로 조절
 */
export function adjustHeight(
  heightMap: readonly number[],
  centerX: number,
  centerZ: number,
  radius: number,
  delta: number,
  gridSize: GridSize,
): number[] {
  const newMap = [...heightMap];
  // ... 순수 계산 로직
  return newMap;
}

export function calculateNormals(
  heightMap: readonly number[],
  gridSize: GridSize,
): Float32Array {
  // ... 법선 벡터 계산
}
```

**core 계층 규칙:**
- React, Zustand, R3F 등 프레임워크에 절대 의존하지 않음
- `export function` 기반 순수 함수 (static class 사용 금지)
- 단위 테스트 가능해야 함
- 입출력이 명확한 데이터 변환 로직
- 파라미터에 `readonly` 배열 사용 권장

### 4.7 성능 규칙

**성능 예산:**
- 목표 프레임률: **60 FPS**
- 최대 지형 크기: **128 x 128** (Phase 2 기준)
- 놀이기구당 최대 세그먼트: **500개**
- 동시 렌더링 놀이기구: **20개** 이하

| 상황 | 해결책 |
|------|--------|
| 대량 반복 오브젝트 (그리드 셀, 지지대) | `InstancedMesh` 사용 |
| 넓은 지형 | 청크 분할 + 시야 기반 LOD |
| 매 프레임 계산 | `useFrame` + ref 직접 조작 |
| 비용 큰 geometry 생성 | `useMemo` + deps 최소화 |
| 상태 변경 시 리렌더 범위 | Zustand selector로 최소 구독 |
| 트랙 곡선 계산 | Worker Thread 고려 (Phase 5+) |
| 텍스처/모델 로딩 | `Suspense` + `useLoader` 캐싱 |

---

## 5. 맵 파일 포맷 (JSON)

초기 설계. Phase 진행에 따라 확장됩니다.

### TypeScript 인터페이스

```typescript
// core/types/common.ts
interface MapFile {
  version: string;
  meta: MapMeta;
  settings: MapSettings;
  terrain: TerrainData;
  rides: RideData[];
  // 예약 (Phase 8+)
  // paths?: PathData[];
  // scenery?: SceneryData[];
  // finance?: FinanceData;
  // simulation?: SimulationState;
}

interface MapMeta {
  name: string;
  author: string;
  createdAt: string;   // ISO 8601
  updatedAt: string;
  description: string;
}

interface MapSettings {
  gridSize: { x: number; z: number };
  gridUnit: number;
  heightStep: number;
  maxHeight: number;
  minHeight: number;
}
```

### JSON 예시

```jsonc
{
  "version": "1.0.0",
  "meta": {
    "name": "My Park",
    "author": "Player",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "description": ""
  },
  "settings": {
    "gridSize": { "x": 64, "z": 64 },
    "gridUnit": 1.0,
    "heightStep": 0.5,
    "maxHeight": 50,
    "minHeight": -10
  },
  "terrain": {
    "heightMap": []    // 1D 배열 (row-major), (gridSize.x+1) * (gridSize.z+1) 크기
  },
  "rides": []
}
```

---

## 6. Git 규칙

### 브랜치 전략

```
main              ← 항상 안정적으로 실행 가능
├── feat/terrain-editor     ← 기능 개발 (main에서 직접 분기)
├── feat/track-builder
├── fix/terrain-normals     ← 버그 수정
└── refactor/store-split    ← 리팩토링
```

> 1인 개발 프로젝트이므로 `dev` 브랜치 없이 `main`에서 직접 분기합니다.

### 커밋 메시지 (Conventional Commits)

```
<type>(<scope>): <description>

type:
  feat     — 새 기능
  fix      — 버그 수정
  refactor — 코드 구조 개선 (기능 변경 없음)
  perf     — 성능 개선
  style    — 코드 포맷팅 (기능 변경 없음)
  docs     — 문서 추가/수정
  test     — 테스트 추가/수정
  chore    — 빌드, 설정, 의존성 등

scope (선택):
  terrain, track, ride, vehicle, store, ui, camera, map, core, config

예시:
  feat(terrain): 높이맵 기반 지형 렌더링 구현
  fix(track): 곡선 트랙 정점 연결 오류 수정
  refactor(store): terrain 스토어 TypeScript 전환
  perf(terrain): InstancedMesh 기반 그리드 오버레이로 전환
  docs: PROJECT_PLAN Phase 3 세부 태스크 추가
```

### 커밋 단위

- **하나의 커밋 = 하나의 논리적 변경**
- 기능이 크면 작은 단위로 쪼개서 커밋 (예: "지형 데이터 구조 정의" → "지형 렌더링" → "지형 편집 인터랙션")
- 커밋 전 반드시 `npm run lint` 및 `npx tsc --noEmit` 통과 확인
- 작동하지 않는 상태로 커밋하지 않음

---

## 7. Claude Code 작업 지침

### 작업 시작 전 체크리스트

1. `PROJECT_PLAN.md`에서 현재 Phase와 진행 상황 확인
2. 현재 작업할 태스크 확인
3. 관련 기존 코드 파악 (영향 범위 분석)
4. 작업 완료 후 `PROJECT_PLAN.md`의 체크박스 업데이트

### 코드 작성 시

- 새 파일 생성 시 디렉토리 구조(섹션 3)를 반드시 따름
- 파일 상단에 TSDoc/JSDoc 주석으로 파일의 역할 설명
- 복잡한 알고리즘에는 한글 주석으로 로직 설명
- `console.log` 디버깅 코드는 커밋 전 반드시 제거
- 하드코딩 값은 `core/constants/`로 분리
- 커밋 전 `npx tsc --noEmit`으로 타입 에러 없음 확인

### 아카이브 관련

- 이전 실험 코드/문서는 `docs/archive/`에 보관
- 새 구현 시 `docs/archive/`의 기존 코드를 참조 가능 (특히 트랙 시스템)
- 아카이브 파일은 수정하지 않음 (읽기 전용 참조)

### 리팩토링 판단 기준

- 동일 로직 3회 이상 반복 → 유틸리티로 추출
- 컴포넌트 200줄 초과 → 분할 검토
- props 5개 초과 → 객체로 묶거나 context/store 활용 검토
- 스토어 액션 15개 초과 → 슬라이스 분할 검토

### 에러 처리

- 맵 파일 로드/저장 시 `try-catch` 필수
- 사용자에게 보여줄 에러는 한글 메시지
- 개발자용 에러는 `console.error`에 상세 정보 포함

---

## 8. 확장성을 위한 설계 원칙

### 놀이기구 타입 확장

```typescript
// core/types/ride.ts — 데이터 주도 설계
interface RideDefinition {
  name: string;
  category: 'coaster' | 'flat' | 'water';
  availableSegments: readonly SegmentType[];
  availableSpecials: readonly SpecialType[];
  vehicleOptions: readonly string[];
  physics: {
    friction: number;
    airResistance: number;
    maxBankAngle: number;
  };
  cost?: number; // 예약: 재정 시스템 (Phase 8+)
}

const RIDE_DEFINITIONS = {
  steel_coaster: {
    name: '스틸 코스터',
    category: 'coaster',
    availableSegments: ['straight', 'left_turn', 'right_turn', 'slope_up', 'slope_down', 'loop', 'corkscrew'],
    availableSpecials: ['chain_lift', 'brake', 'booster'],
    vehicleOptions: ['standard_car', 'floorless_car'],
    physics: {
      friction: 0.02,
      airResistance: 0.001,
      maxBankAngle: 90,
    },
  },
  wooden_coaster: {
    name: '우드 코스터',
    category: 'coaster',
    availableSegments: ['straight', 'left_turn', 'right_turn', 'slope_up', 'slope_down'],
    availableSpecials: ['chain_lift', 'brake'],
    vehicleOptions: ['wooden_car'],
    physics: {
      friction: 0.04,
      airResistance: 0.001,
      maxBankAngle: 60,
    },
  },
  // 새 놀이기구 추가 시 여기에 정의만 추가
} as const satisfies Record<string, RideDefinition>;
```

### 예약 타입 파일 (Phase 8+)

```typescript
// core/types/simulation.ts — 인터페이스만 정의, 구현은 Phase 8+
interface SimulationState {
  tick: number;
  speed: 'paused' | 'normal' | 'fast' | 'ultra';
  time: string; // "HH:MM" 형식
}

interface Guest {
  id: string;
  position: { x: number; y: number; z: number };
  satisfaction: number;
  hunger: number;
  targetRideId: string | null;
}

// core/types/finance.ts — 인터페이스만 정의, 구현은 Phase 8+
interface FinanceState {
  cash: number;
  income: number;
  expenses: number;
  loanAmount: number;
}

interface Transaction {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  tick: number;
}
```

### 시뮬레이션 시간 (추후 도입 대비)

- 모든 상태 변경은 `tick` 기반으로 설계 가능하도록 액션을 순수 함수로 유지
- 현재는 tick 시스템 미구현, 하지만 상태 구조가 직렬화 가능하도록 설계

### 재정 시스템 (추후 도입 대비)

- 모든 놀이기구/시설물 정의에 `cost` 필드를 예약 (현재는 무시)
- 건설/삭제 액션이 cost 계산 로직을 호출할 수 있는 hook point 마련

---

## 9. 테스트 기준

### 반드시 테스트해야 하는 것

- `core/systems/` 의 모든 순수 함수 (단위 테스트)
- `core/utils/` 의 모든 유틸리티 함수
- 맵 직렬화/역직렬화 (저장 → 불러오기 왕복 테스트)
- 트랙 연결 유효성 검증 로직

### 테스트 불필요

- 단순 UI 렌더링 (시각적 확인으로 대체)
- R3F 3D 렌더링 결과

---

## 10. 작업 요청 시 참고사항

- 사용자가 "다음 단계 진행해줘"라고 하면 → `PROJECT_PLAN.md`에서 다음 미완료 태스크를 찾아 진행
- 사용자가 특정 기능을 요청하면 → 해당 기능이 어느 Phase에 속하는지 확인 후, 선행 의존성이 충족되었는지 확인
- 대규모 변경이 필요하면 → 먼저 계획을 텍스트로 설명하고 승인 받은 후 진행
- 성능 문제 발생 시 → 프로파일링 결과를 먼저 확인하고, 추측이 아닌 데이터 기반 최적화
