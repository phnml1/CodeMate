import { SCORE_RADIUS, SCORE_CIRCUMFERENCE } from "@/constants/review";
import { getScoreColor, getScoreLabel } from "@/lib/review";

interface ReviewScoreProps {
  score: number;
}

export default function ReviewScore({ score }: ReviewScoreProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const offset = SCORE_CIRCUMFERENCE * (1 - clamped / 100);
  const colors = getScoreColor(clamped);

  return (
    <div className={`flex items-center gap-4 px-4 py-3 rounded-xl ${colors.bg}`}>
      <div className="relative w-16 h-16 shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r={SCORE_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-200 dark:text-slate-700"
          />
          <circle
            cx="40"
            cy="40"
            r={SCORE_RADIUS}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={SCORE_CIRCUMFERENCE}
            strokeDashoffset={offset}
            className={`${colors.ring} transition-all duration-700`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-black ${colors.text}`}>{clamped}</span>
        </div>
      </div>
      <div>
        <p className={`text-xl font-black ${colors.text}`}>{getScoreLabel(clamped)}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">코드 품질 점수</p>
      </div>
    </div>
  );
}
