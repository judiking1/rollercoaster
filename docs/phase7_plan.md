# Phase 7: 근본적인 레일 생성 로직 개선

## 문제점

### 1. ID 중복 문제
- **원인**: `segments.length` 사용으로 세그먼트 삭제 후 인덱스 재사용
- **증상**: 같은 key 에러, 하나 선택 시 여러 개 선택됨

### 2. 초기 레일 잔여물
- **원인**: `createRide`에서 4 units 직선 세그먼트 자동 생성
- **증상**: 시작 레일 삭제 시 start_node 부근에 짧은 레일 남음

### 3. 레일 연결 불일치  
- **원인**: 새 세그먼트가 이전 노드의 tangent를 정확히 따르지 않음
- **증상**: 직선과 곡선의 이음새가 자연스럽지 않음

## 해결책

### 1. 전역 카운터 기반 ID 생성
```typescript
// 각 라이드에 nextSegmentId, nextNodeId 카운터 유지
interface Ride {
    nextSegmentId: number
    nextNodeId: number
    // ... 기존 필드
}

// ID 생성 시
const segmentId = `${ride.id}-segment-${ride.nextSegmentId++}`
const nodeId = `${ride.id}-node-${ride.nextNodeId++}`
```

### 2. 초기 세그먼트 제거
```typescript
// createRide에서는 start node만 생성, 세그먼트는 사용자가 Build로 생성
createRide: (startPosition) => {
    // Start node만 생성
    // segments: [] (빈 배열)
}
```

### 3. Tangent 정확도 개선
```typescript
// calculateNextTrackSegment 개선
// - 이전 노드의 tangent를 정확히 따름
// - 베지어 곡선 control point 계산 개선
```

## 구현 순서

1. ✅ Ride interface에 카운터 추가
2. ✅ createRide 초기 세그먼트 제거
3. ✅ commitPreview ID 생성 로직 수정
4. ✅ connectNodes ID 생성 로직 수정
5. ✅ deleteSelectedSegment 개선 (카운터는 유지)
6. ⚠️ calculateNextTrackSegment tangent 계산 검증
