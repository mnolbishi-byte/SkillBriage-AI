import { Switch } from "@/components/ui/switch";
import {
  type EmotionState,
  getEmotionEmoji,
  getEmotionLabel,
  getEmotionColor,
  getEmotionBgColor,
} from "@/lib/emotionEngine";

interface EmotionIndicatorProps {
  emotionState: EmotionState;
  stress: number;
  confidence: number;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export default function EmotionIndicator({
  emotionState,
  stress,
  confidence,
  enabled,
  onToggle,
}: EmotionIndicatorProps) {
  return (
    <div className="absolute top-4 left-4 z-20">
      {/* Toggle */}
      <div className="flex items-center gap-2 mb-2 bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 border border-white/10">
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-cyan-500 scale-75"
        />
        <span className="text-[10px] text-slate-300 font-medium">Emotional Support</span>
      </div>

      {/* Emotion Indicator */}
      {enabled && (
        <div
          className={`border rounded-xl px-3 py-2.5 backdrop-blur-md transition-all duration-500 ${getEmotionBgColor(emotionState)}`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg leading-none">{getEmotionEmoji(emotionState)}</span>
            <span className={`text-xs font-bold ${getEmotionColor(emotionState)}`}>
              {getEmotionLabel(emotionState)}
            </span>
          </div>

          {/* Mini bars */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-slate-400 w-12">Stress</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    stress >= 70 ? "bg-red-400" : stress >= 40 ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${stress}%` }}
                />
              </div>
              <span className="text-[8px] text-slate-500 w-6 text-right">{stress}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-slate-400 w-12">Confidence</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-700"
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-[8px] text-slate-500 w-6 text-right">{confidence}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}