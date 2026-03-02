/**
 * vehicleRef.ts — Vehicle ↔ Scene 카메라 연동용 공유 ref
 * 포커스된 차량만 이 ref에 기록, Scene에서 카메라 오버라이드에 사용
 */

import * as THREE from 'three';

/** 포커스된 차량의 현재 트랜스폼 (매 프레임 업데이트) */
export const vehicleTransform = {
  position: new THREE.Vector3(),
  tangent: new THREE.Vector3(0, 0, 1),
  up: new THREE.Vector3(0, 1, 0),
  /** 현재 유효한 데이터가 있는지 */
  active: false,
};
