interface XPProgressBarProps {
  current: number;
  max: number;
}

export function XPProgressBar({ current, max }: XPProgressBarProps) {
  const percentage = (current / max) * 100;

  return (
    <div>
      <div className="flex justify-between pixel-text text-pixel-2xs xs:text-pixel-xs text-slate-400 mb-0.5 xs:mb-1">
        <span>XP</span>
        <span>{current}/{max}</span>
      </div>
      <div
        className="pixel-progress-bar h-2 xs:h-2.5 rounded overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`Experience: ${current} of ${max}`}
      >
        <div
          className="pixel-progress-fill h-full bg-gradient-to-r from-xp to-xp/80 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
