import { Check } from "lucide-react";

interface Stage {
  id: number;
  label: string;
  shortLabel: string;
}

const STAGES: Stage[] = [
  { id: 0, label: "Preparation", shortLabel: "Prep" },
  { id: 1, label: "Vein Identification", shortLabel: "Vein ID" },
  { id: 2, label: "Needle Insertion", shortLabel: "Needle" },
  { id: 3, label: "Assessment", shortLabel: "Report" },
];

interface ProgressBarProps {
  currentStage: number;
  completedStages: number[];
}

export default function ProgressBar({
  currentStage,
  completedStages,
}: ProgressBarProps) {
  return (
    <div className="w-full px-4 py-3">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {STAGES.map((stage, index) => {
          const isCompleted = completedStages.includes(stage.id);
          const isCurrent = currentStage === stage.id;
          const isPast = stage.id < currentStage;

          return (
            <div key={stage.id} className="flex items-center flex-1 last:flex-none">
              {/* Stage dot */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                    isCompleted || isPast
                      ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      : isCurrent
                        ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] animate-pulse"
                        : "bg-white/10 text-slate-500 border border-white/10"
                  }`}
                >
                  {isCompleted || isPast ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    stage.id + 1
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium tracking-wide ${
                    isCurrent
                      ? "text-cyan-400"
                      : isCompleted || isPast
                        ? "text-emerald-400"
                        : "text-slate-500"
                  }`}
                >
                  {stage.shortLabel}
                </span>
              </div>

              {/* Connector line */}
              {index < STAGES.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 mt-[-18px]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isPast || isCompleted
                        ? "bg-emerald-500"
                        : isCurrent
                          ? "bg-gradient-to-r from-cyan-500 to-white/10"
                          : "bg-white/10"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}