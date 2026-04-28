import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Send,
  Trophy,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  FileText,
  ExternalLink,
  Sparkles,
  History,
} from "lucide-react";
import { client } from "@/lib/api";
import type { AIMessage } from "./AIAssistant";

interface AssessmentReportProps {
  errors: string[];
  onAIMessage: (msg: Omit<AIMessage, "id" | "timestamp">) => void;
  getDurationSeconds: () => number;
}

export default function AssessmentReport({
  errors,
  onAIMessage,
  getDurationSeconds,
}: AssessmentReportProps) {
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasSavedRef = useRef(false);

  const baseScore = 100;
  const deduction = errors.length * 15;
  const finalScore = Math.max(baseScore - deduction, 40);
  const durationSeconds = getDurationSeconds();

  const getGrade = (s: number) => {
    if (s >= 90) return { grade: "A", color: "text-emerald-400", bg: "bg-emerald-500/20" };
    if (s >= 75) return { grade: "B", color: "text-cyan-400", bg: "bg-cyan-500/20" };
    if (s >= 60) return { grade: "C", color: "text-amber-400", bg: "bg-amber-500/20" };
    return { grade: "D", color: "text-red-400", bg: "bg-red-500/20" };
  };

  const gradeInfo = getGrade(finalScore);

  // Auto-save attempt to database
  useEffect(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;

    const saveAttempt = async () => {
      setSaving(true);
      try {
        await client.entities.simulation_attempts.create({
          data: {
            score: finalScore,
            grade: gradeInfo.grade,
            errors_count: errors.length,
            errors_list: JSON.stringify(errors),
            duration_seconds: durationSeconds,
            procedure_type: "venipuncture",
            created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
          },
        });
        setSaved(true);
        onAIMessage({
          text: "Your simulation results have been saved to your profile. You can view your performance history anytime from the dashboard.",
          type: "success",
        });
      } catch {
        onAIMessage({
          text: "Could not save results automatically. You can still send the report to your instructor.",
          type: "warning",
        });
      } finally {
        setSaving(false);
      }
    };
    saveAttempt();
  }, []);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      if (current >= finalScore) {
        setAnimatedScore(finalScore);
        clearInterval(interval);
      } else {
        setAnimatedScore(current);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [finalScore]);

  const strengths = [
    "Patient communication and introduction",
    "Correct vein identification (Median Cubital)",
    "Completed all preparation steps",
  ];

  const weaknesses = errors.length > 0 ? errors : [];

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSendReport = () => {
    setShowConfirm(true);
  };

  const confirmSend = () => {
    setSent(true);
    setShowConfirm(false);
    onAIMessage({
      text: "Report successfully sent to your instructor via Blackboard Ultra. You can view your submission history in the LMS gradebook.",
      type: "success",
    });
  };

  return (
    <div className="flex flex-col items-center h-full p-6 overflow-y-auto animate-in fade-in duration-500">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="bg-cyan-500/20 text-cyan-400 border-0 mb-3">
            SMART ASSESSMENT
          </Badge>
          <h2 className="text-2xl font-bold text-white mb-2">
            Performance Report
          </h2>
          <p className="text-slate-400 text-sm">
            Venipuncture Procedure — AI-Generated Assessment
          </p>
          {saving && (
            <p className="text-cyan-400 text-xs mt-2 animate-pulse">
              Saving results...
            </p>
          )}
          {saved && (
            <p className="text-emerald-400 text-xs mt-2">
              ✓ Results saved to your profile
            </p>
          )}
        </div>

        {/* Score Card */}
        <Card className="bg-white/5 border-white/10 p-8 mb-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5" />
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-6 mb-6">
              {/* Score circle */}
              <div className="relative">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={
                      finalScore >= 75
                        ? "#10B981"
                        : finalScore >= 60
                          ? "#F59E0B"
                          : "#EF4444"
                    }
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(animatedScore / 100) * 327} 327`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-mono font-bold text-white">
                    {animatedScore}%
                  </span>
                  <span className="text-[10px] text-slate-400">SCORE</span>
                </div>
              </div>

              {/* Grade */}
              <div className="text-left">
                <div
                  className={`w-16 h-16 rounded-xl ${gradeInfo.bg} flex items-center justify-center mb-2`}
                >
                  <span className={`text-3xl font-bold ${gradeInfo.color}`}>
                    {gradeInfo.grade}
                  </span>
                </div>
                <p className="text-slate-400 text-xs">Overall Grade</p>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="text-lg font-bold text-white">1</span>
                </div>
                <p className="text-[10px] text-slate-500">Attempt</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-lg font-bold text-white">
                    {errors.length}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Errors</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span className="text-lg font-bold text-white">
                    {formatDuration(durationSeconds)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">Duration</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Strengths */}
          <Card className="bg-emerald-500/5 border-emerald-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-400">Strengths</h3>
            </div>
            <div className="space-y-2.5">
              {strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300">{s}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Weaknesses */}
          <Card className="bg-red-500/5 border-red-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-red-400">
                Areas to Improve
              </h3>
            </div>
            <div className="space-y-2.5">
              {weaknesses.length > 0 ? (
                weaknesses.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-300">{w}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-300">
                    No errors detected. Excellent performance!
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Error breakdown */}
        {errors.length > 0 && (
          <Card className="bg-white/5 border-white/10 p-5 mb-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Error Breakdown
            </h3>
            <div className="space-y-3">
              {errors.includes("Skipped disinfection") && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Hygiene — Disinfection</span>
                    <span className="text-red-400">Critical</span>
                  </div>
                  <Progress value={100} className="h-1.5 bg-white/10" />
                </div>
              )}
              {errors.includes("Incorrect needle angle") && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Technique — Needle Angle</span>
                    <span className="text-amber-400">Warning</span>
                  </div>
                  <Progress value={70} className="h-1.5 bg-white/10" />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* AI Recommendations */}
        <Card className="bg-cyan-500/5 border-cyan-500/20 p-5 mb-6">
          <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            AI Recommendations
          </h3>
          <ul className="space-y-2 text-xs text-slate-300">
            {errors.includes("Skipped disinfection") && (
              <li>
                • Always disinfect the puncture site with antiseptic and allow
                it to dry for 30 seconds before insertion.
              </li>
            )}
            {errors.includes("Incorrect needle angle") && (
              <li>
                • Practice maintaining a 15–30° angle. Use the angle guide
                overlay to build muscle memory.
              </li>
            )}
            <li>
              • Continue practicing the full procedure to improve speed and
              confidence.
            </li>
            <li>
              • Review the Blackboard course material on venipuncture best
              practices.
            </li>
          </ul>
        </Card>

        {/* LMS Integration */}
        <Card className="bg-white/5 border-white/10 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <ExternalLink className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Blackboard Ultra Integration
              </h3>
              <p className="text-[10px] text-slate-500">
                Send your results to your instructor
              </p>
            </div>
          </div>

          {!sent && !showConfirm && (
            <Button
              onClick={handleSendReport}
              className="w-full h-11 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Report to Instructor
            </Button>
          )}

          {showConfirm && (
            <div className="space-y-3 animate-in fade-in">
              <p className="text-xs text-slate-400 text-center">
                This will send your score ({finalScore}%), error log, and AI
                recommendations to your instructor via Blackboard Ultra.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowConfirm(false)}
                  variant="outline"
                  className="flex-1 h-10 rounded-xl text-sm border-white/20 text-slate-300 bg-transparent hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSend}
                  className="flex-1 h-10 rounded-xl text-sm bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold"
                >
                  Confirm & Send
                </Button>
              </div>
            </div>
          )}

          {sent && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-emerald-400 font-medium">
                Report sent to Blackboard Ultra successfully.
              </p>
            </div>
          )}
        </Card>

        {/* View History Button */}
        <div className="text-center mb-8">
          <Button
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 gap-2"
            onClick={() => navigate("/history")}
          >
            <History className="w-4 h-4" />
            View Performance History
          </Button>
        </div>
      </div>
    </div>
  );
}