/**
 * icons/index.tsx — 게임 UI용 인라인 SVG 아이콘 모음
 * 모든 아이콘: 20x20 viewBox, currentColor 사용
 */

interface IconProps {
  className?: string;
}

/** 관찰 모드 — 눈 모양 */
export function IconEye({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

/** 지형 편집 — 산 모양 */
export function IconMountain({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16l5-10 3 4 4-7 4 13H2z" />
    </svg>
  );
}

/** 트랙 빌더 — 레일 모양 */
export function IconTrack({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17L10 3l7 14" />
      <line x1="5.5" y1="12" x2="14.5" y2="12" />
      <line x1="4.2" y1="15" x2="15.8" y2="15" />
      <line x1="7" y1="9" x2="13" y2="9" />
    </svg>
  );
}

/** X-Ray — 방사형 원 */
export function IconXRay({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7" />
      <circle cx="10" cy="10" r="3" />
      <line x1="10" y1="1" x2="10" y2="5" />
      <line x1="10" y1="15" x2="10" y2="19" />
      <line x1="1" y1="10" x2="5" y2="10" />
      <line x1="15" y1="10" x2="19" y2="10" />
    </svg>
  );
}

/** 저장 — 플로피 디스크 */
export function IconSave({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 17H5a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v7a2 2 0 01-2 2z" />
      <path d="M13 17v-5H7v5" />
      <path d="M7 3v4h5" />
    </svg>
  );
}

/** 메뉴 — 톱니바퀴 */
export function IconMenu({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="3" />
      <path d="M10 1v2M10 17v2M1 10h2M17 10h2M3.93 3.93l1.41 1.41M14.66 14.66l1.41 1.41M3.93 16.07l1.41-1.41M14.66 5.34l1.41-1.41" />
    </svg>
  );
}

/** 스컬프트 — 상하 화살표 */
export function IconSculpt({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l4 4h-3v4h3l-4 4-4-4h3V6H6l4-4z" />
      <line x1="3" y1="17" x2="17" y2="17" />
    </svg>
  );
}

/** 평탄화 — 수평선 */
export function IconFlatten({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="10" x2="18" y2="10" />
      <path d="M4 6l2 4M16 6l-2 4" />
      <path d="M4 14l2-4M16 14l-2-4" />
    </svg>
  );
}

/** 되돌리기 — 왼쪽 회전 화살표 */
export function IconUndo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h8a4 4 0 110 8H8" />
      <polyline points="7 4 4 7 7 10" />
    </svg>
  );
}

/** 다시 실행 — 오른쪽 회전 화살표 */
export function IconRedo({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 7H8a4 4 0 100 8h4" />
      <polyline points="13 4 16 7 13 10" />
    </svg>
  );
}

/** 재생 — 삼각형 */
export function IconPlay({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" stroke="none">
      <polygon points="5,3 17,10 5,17" />
    </svg>
  );
}

/** 중지 — 정사각형 */
export function IconStop({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" stroke="none">
      <rect x="4" y="4" width="12" height="12" rx="1" />
    </svg>
  );
}

/** 카메라 */
export function IconCamera({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 012-2h2l1-2h4l1 2h2a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <circle cx="10" cy="10" r="3" />
    </svg>
  );
}

/** 도로 (미래 확장) */
export function IconRoad({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2l-2 16h4l2-16H4zM12 2l2 16h4l-2-16h-4z" />
      <line x1="10" y1="3" x2="10" y2="6" />
      <line x1="10" y1="9" x2="10" y2="12" />
      <line x1="10" y1="15" x2="10" y2="18" />
    </svg>
  );
}

/** 장식/나무 (미래 확장) */
export function IconTree({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2l-6 8h3l-2 4h3v4h4v-4h3l-2-4h3L10 2z" />
    </svg>
  );
}

/** 추가 (+) */
export function IconPlus({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="10" y1="4" x2="10" y2="16" />
      <line x1="4" y1="10" x2="16" y2="10" />
    </svg>
  );
}

/** 취소 (X) */
export function IconClose({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  );
}

/** 불러오기 — 폴더 열기 */
export function IconLoad({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6V15a2 2 0 002 2h12a2 2 0 002-2V8a2 2 0 00-2-2h-5l-2-2H4a2 2 0 00-2 2z" />
    </svg>
  );
}

/** 나가기 — 문 + 화살표 */
export function IconExit({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 17H4a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="12 14 17 10 12 6" />
      <line x1="17" y1="10" x2="7" y2="10" />
    </svg>
  );
}

/** 놀이기구 목록 — 롤러코스터 리스트 */
export function IconRideList({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 5h4M2 10h4M2 15h4" />
      <path d="M8 5h10M8 10h10M8 15h10" />
      <circle cx="10" cy="5" r="0.5" fill="currentColor" />
      <circle cx="10" cy="10" r="0.5" fill="currentColor" />
      <circle cx="10" cy="15" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** 아래 화살표 — 드롭다운 힌트 */
export function IconChevronDown({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 8 10 13 15 8" />
    </svg>
  );
}
