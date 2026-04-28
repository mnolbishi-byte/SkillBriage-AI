import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Activity,
  Trophy,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  BarChart3,
  History,
  Target,
  Zap,
  Minus,
} from "lucide-react";
import { client } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface SimulationAttempt {
  id: number;
  score: number;
  grade: string;
  errors_count: number;
  errors_list: string;
  duration_seconds: number;
  procedure_type: string;
  created_at: string;
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, login } = useAuth();
  const [attempts, setAttempts] = useState<SimulationAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      login();
      return;
    }

    const fetchAttempts = async () => {
      try {
        const res = await client.entities.simulation_attempts.query({
          query: {},
          sort: "-created_at",
          limit: 50,
        });
        if (res?.data?.items) {
          setAttempts(res.data.items as SimulationAttempt[]);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, [user, authLoading]);

  const stats = useMemo(() => {
    if (attempts.length === 0) return null;

    const scores = attempts.map((a) => a.score);
    const bestScore = Math.max(...scores);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const totalAttempts = attempts.length;
    const latestScore = scores[0];
    const previousScore = scores.length > 1 ? scores[1] : null;
    const trend = previousScore !== null ? latestScore - previousScore : 0;
    const totalErrors = attempts.reduce((sum, a) => sum + a.errors_count, 0);
    const avgDuration = Math.round(
      attempts.reduce((sum, a) => sum + a.duration_seconds, 0) / attempts.length
    );

    return { bestScore, avgScore, totalAttempts, latestScore, trend, totalErrors, avgDuration };
  }, [attempts]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "text-emerald-400 bg-emerald-500/20";
      case "B": return "text-cyan-400 bg-cyan-500/20";
      case "C": return "text-amber-400 bg-amber-500/20";
      default: return "text-red-400 bg-red-500/20";
    }
  };

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-md bg-white/5">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-slate-400 hover:text-white"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold">
              SkillBridge <span className="text-cyan-400">AI</span>
            </span>
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-sm h-9 px-4 rounded-lg"
          onClick={() => navigate("/simulation")}
        >
          <Zap className="w-4 h-4 mr-2" />
          New Simulation
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <History className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold">Performance History</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Track your improvement across simulation sessions
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
          </div>
        ) : attempts.length === 0 ? (
          <Card className="bg-white/5 border-white/10 p-12 text-center">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">
              No Attempts Yet
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Complete your first simulation to start tracking your progress.
            </p>
            <Button
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold"
              onClick={() => navigate("/simulation")}
            >
              Start First Simulation
            </Button>
          </Card>
        ) : (
          <>
            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-white/5 border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Best Score
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.bestScore}%</p>
                </Card>

                <Card className="bg-white/5 border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Average
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.avgScore}%</p>
                </Card>

                <Card className="bg-white/5 border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Attempts
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stats.totalAttempts}</p>
                </Card>

                <Card className="bg-white/5 border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {stats.trend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : stats.trend < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                      Trend
                    </span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${stats.trend > 0 ? "text-emerald-400" : stats.trend < 0 ? "text-red-400" : "text-slate-400"}`}
                  >
                    {stats.trend > 0 ? "+" : ""}
                    {stats.trend}
                  </p>
                </Card>
              </div>
            )}

            {/* Score Progress Chart (simple bar visualization) */}
            {attempts.length > 1 && (
              <Card className="bg-white/5 border-white/10 p-6 mb-8">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Score Progression
                </h3>
                <div className="flex items-end gap-2 h-32">
                  {[...attempts].reverse().slice(-12).map((attempt, i) => {
                    const height = (attempt.score / 100) * 100;
                    const barColor =
                      attempt.score >= 90
                        ? "bg-emerald-500"
                        : attempt.score >= 75
                          ? "bg-cyan-500"
                          : attempt.score >= 60
                            ? "bg-amber-500"
                            : "bg-red-500";
                    return (
                      <div
                        key={attempt.id}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <span className="text-[9px] text-slate-500">
                          {attempt.score}%
                        </span>
                        <div
                          className={`w-full rounded-t-sm ${barColor} transition-all duration-500 min-h-[4px]`}
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[8px] text-slate-600">
                          #{i + 1}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Attempts List */}
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              All Sessions ({attempts.length})
            </h3>
            <div className="space-y-3">
              {attempts.map((attempt, index) => {
                const gradeColors = getGradeColor(attempt.grade);
                let parsedErrors: string[] = [];
                try {
                  parsedErrors = JSON.parse(attempt.errors_list);
                } catch {
                  // ignore
                }

                return (
                  <Card
                    key={attempt.id}
                    className="bg-white/5 border-white/10 p-5 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Grade Badge */}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${gradeColors.split(" ")[1]}`}
                        >
                          <span
                            className={`text-xl font-bold ${gradeColors.split(" ")[0]}`}
                          >
                            {attempt.grade}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-white">
                              {attempt.score}%
                            </span>
                            <Badge
                              variant="outline"
                              className="border-slate-700 text-slate-400 text-[10px]"
                            >
                              {attempt.procedure_type}
                            </Badge>
                            {index === 0 && (
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-[10px]">
                                LATEST
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(attempt.duration_seconds)}
                            </span>
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {attempt.errors_count} error{attempt.errors_count !== 1 ? "s" : ""}
                            </span>
                            <span>{formatDate(attempt.created_at)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="hidden md:block w-32">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              attempt.score >= 90
                                ? "bg-emerald-500"
                                : attempt.score >= 75
                                  ? "bg-cyan-500"
                                  : attempt.score >= 60
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                            }`}
                            style={{ width: `${attempt.score}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Error details (collapsed) */}
                    {parsedErrors.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="flex flex-wrap gap-2">
                          {parsedErrors.map((err, ei) => (
                            <Badge
                              key={ei}
                              variant="outline"
                              className="border-red-500/30 text-red-400 text-[10px]"
                            >
                              {err}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}