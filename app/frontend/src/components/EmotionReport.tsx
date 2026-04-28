import { Card } from "@/components/ui/card";
import {
  Brain,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Activity,
} from "lucide-react";
import {
  type EmotionReportData,
  getEmotionEmoji,
  type EmotionState,
} from "@/lib/emotionEngine";

interface EmotionReportProps {
  report: EmotionReportData;
}

const stageLabels: Record<string, string> = {
  preparation: "Preparation",
  vein: "Vein ID",
  disinfection: "Disinfection",
  needle: "Needle",
  completion: "Completion",
};

export default function EmotionReport({ report }: EmotionReportProps) {
  const trendIcon =
    report.performanceCorrelation.overallTrend === "improving" ? (
      <TrendingUp className="w-4 h-4 text-emerald-400" />
    ) : report.performanceCorrelation.overallTrend === "declining" ? (
      <TrendingDown className="w-4 h-4 text-red-400" />
    ) : (
      <Minus className="w-4 h-4 text-blue-400" />
    );

  const trendLabel =
    report.performanceCorrelation.overallTrend === "improving"
      ? "Confidence Improving"
      : report.performanceCorrelation.overallTrend === "declining"
        ? "Needs More Practice"
        : "Stable Performance";

  const trendColor =
    report.performanceCorrelation.overallTrend === "improving"
      ? "text-emerald-400"
      : report.performanceCorrelation.overallTrend === "declining"
        ? "text-red-400"
        : "text-blue-400";

  return (
    <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20 p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4 text-purple-400" />
        Emotional Wellness Report
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Heart className="w-4 h-4 text-red-400 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-white">{report.averageStress}%</p>
          <p className="text-[9px] text-slate-500 uppercase">Avg Stress</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <Activity className="w-4 h-4 text-cyan-400 mx-auto mb-1.5" />
          <p className="text-lg font-bold text-white">{report.averageConfidence}%</p>
          <p className="text-[9px] text-slate-500 uppercase">Avg Confidence</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          {trendIcon}
          <div className="mt-1.5" />
          <p className={`text-xs font-bold ${trendColor}`}>{trendLabel}</p>
          <p className="text-[9px] text-slate-500 uppercase">Trend</p>
        </div>
      </div>

      {/* Stress Timeline (Simple Bar Chart) */}
      {report.stressTimeline.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Stress Level During Training
          </h4>
          <div className="bg-white/5 rounded-xl p-3">
            <div className="flex items-end gap-[2px] h-16">
              {report.stressTimeline.map((point, i) => {
                const barColor =
                  point.stress >= 70
                    ? "bg-red-400"
                    : point.stress >= 40
                      ? "bg-amber-400"
                      : "bg-emerald-400";
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${barColor} transition-all duration-300 min-w-[2px]`}
                    style={{ height: `${Math.max(point.stress, 2)}%` }}
                    title={`${point.time}s - ${point.stress}% stress (${point.stage})`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[8px] text-slate-600 mt-1">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Progression by Stage */}
      {report.confidenceProgression.length > 0 && (
        <div className="mb-5">
          <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Confidence Progression
          </h4>
          <div className="space-y-2">
            {report.confidenceProgression.map((item) => (
              <div key={item.stage} className="flex items-center gap-3">
                <span className="text-[10px] text-slate-400 w-20 shrink-0">
                  {stageLabels[item.stage] || item.stage}
                </span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${item.confidence}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 w-8 text-right">{item.confidence}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emotion Distribution */}
      <div className="mb-4">
        <h4 className="text-xs font-bold text-slate-400 mb-3">Emotion Distribution</h4>
        <div className="grid grid-cols-4 gap-2">
          {(["calm", "neutral", "stressed", "anxious"] as EmotionState[]).map((state) => (
            <div key={state} className="bg-white/5 rounded-lg p-2 text-center">
              <span className="text-base">{getEmotionEmoji(state)}</span>
              <p className="text-sm font-bold text-white mt-1">{report.emotionDistribution[state]}%</p>
              <p className="text-[8px] text-slate-500 capitalize">{state}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Performance-Emotion Correlation */}
      <div className="bg-white/5 rounded-xl p-3">
        <h4 className="text-xs font-bold text-slate-400 mb-2">Performance–Emotion Correlation</h4>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Peak stress stage</span>
            <span className="text-white font-medium">
              {stageLabels[report.peakStressStage] || report.peakStressStage} ({report.peakStress}%)
            </span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">High-stress error moments</span>
            <span className="text-amber-400 font-medium">{report.performanceCorrelation.highStressErrors}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Calm & focused moments</span>
            <span className="text-emerald-400 font-medium">{report.performanceCorrelation.calmSuccesses}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}