/**
 * IconButton.tsx — 아이콘 기반 버튼 컴포넌트
 * TopBar/BottomBar에서 사용하는 통일된 아이콘 버튼
 */

import type { ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  label?: string;
  tooltip?: string;
  isActive?: boolean;
  accentColor?: 'amber' | 'blue' | 'purple' | 'emerald' | 'red' | 'orange' | 'cyan';
  disabled?: boolean;
  size?: 'sm' | 'md';
  onClick: () => void;
}

const ACCENT_CLASSES: Record<string, { active: string; border: string }> = {
  amber: { active: 'bg-amber-500/20 text-amber-400', border: 'border-b-2 border-amber-500' },
  blue: { active: 'bg-blue-500/20 text-blue-400', border: 'border-b-2 border-blue-500' },
  purple: { active: 'bg-purple-500/20 text-purple-400', border: 'border-b-2 border-purple-500' },
  emerald: { active: 'bg-emerald-500/20 text-emerald-400', border: 'border-b-2 border-emerald-500' },
  red: { active: 'bg-red-500/20 text-red-400', border: 'border-b-2 border-red-500' },
  orange: { active: 'bg-orange-500/20 text-orange-400', border: 'border-b-2 border-orange-500' },
  cyan: { active: 'bg-cyan-500/20 text-cyan-400', border: 'border-b-2 border-cyan-500' },
};

export default function IconButton({
  icon,
  label,
  tooltip,
  isActive = false,
  accentColor = 'blue',
  disabled = false,
  size = 'md',
  onClick,
}: IconButtonProps) {
  const accent = ACCENT_CLASSES[accentColor] ?? ACCENT_CLASSES.blue;
  const sizeClass = size === 'sm' ? 'h-8 min-w-8' : 'h-9 min-w-9';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const baseClass = `${sizeClass} flex flex-col items-center justify-center gap-0.5 rounded transition-colors`;
  const stateClass = disabled
    ? 'opacity-30 cursor-not-allowed'
    : isActive
      ? `${accent.active} ${accent.border}`
      : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`${baseClass} ${stateClass} px-1.5`}
    >
      <span className={iconSize}>{icon}</span>
      {label && (
        <span className="text-[9px] leading-none">{label}</span>
      )}
    </button>
  );
}
