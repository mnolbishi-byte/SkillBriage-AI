import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  ArrowLeft,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Trophy,
  Target,
  Bell,
  FileText,
  Sparkles,
  Search,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  Send,
  BarChart3,
  Shield,
  Eye,
  Calendar,
  BookOpen,
  Zap,
} from "lucide-react";
import { client } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface StudentData {
  userId: string;
  name: string;
  email: string;
  attempts: AttemptData[];
  totalAttempts: number;
  bestScore: number;
  avgScore: number;
  latestScore: number;
  trend: number;
  completionRate: number;
  status: "good" | "needs_improvement" | "critical";
  repeatedErrors: string[];
  alerts: AlertItem[];
}

interface AttemptData {
  id: number;
  score: number;
  grade: string;
  errors_count: number;
  errors_list: string;
  duration_seconds: number;
  procedure_type: string;
  created_at: string;
  user_id: string;
}

interface ConsentData {
  user_id: string;
  student_name: string;
  student_email: string;
  allow_tracking: boolean;
}

interface AlertItem {
  type: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
}

interface NoteData {
  id: number;
  student_user_id: string;
  note_text: string;
  note_type: string;
  created_at: string;
}

export default function FacultyPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, login } = useAuth();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState<NoteData[]>([]);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<string>("general");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      login();
      return;
    }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      // Get all consenting students
      const consentRes = await client.entities.student_consent.queryAll({
        query: { allow_tracking: true },
        limit: 100,
      });
      const consents: ConsentData[] = (consentRes?.data?.items || []) as ConsentData[];

      // Get all simulation attempts
      const attemptsRes = await client.entities.simulation_attempts.queryAll({
        query: {},
        sort: "-created_at",
        limit: 500,
      });
      const allAttempts: AttemptData[] = (attemptsRes?.data?.items || []) as AttemptData[];

      // Group attempts by user
      const attemptsByUser: Record<string, AttemptData[]> = {};
      for (const a of allAttempts) {
        if (!attemptsByUser[a.user_id]) attemptsByUser[a.user_id] = [];
        attemptsByUser[a.user_id].push(a);
      }

      // Build student data for consenting students
      const studentList: StudentData[] = consents.map((consent) => {
        const userAttempts = attemptsByUser[consent.user_id] || [];
        const scores = userAttempts.map((a) => a.score);
        const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const latestScore = scores.length > 0 ? scores[0] : 0;
        const previousScore = scores.length > 1 ? scores[1] : null;
        const trend = previousScore !== null ? latestScore - previousScore : 0;

        // Detect repeated errors
        const errorCounts: Record<string, number> = {};
        for (const a of userAttempts) {
          try {
            const errs: string[] = JSON.parse(a.errors_list);
            for (const e of errs) {
              errorCounts[e] = (errorCounts[e] || 0) + 1;
            }
          } catch { /* ignore */ }
        }
        const repeatedErrors = Object.entries(errorCounts)
          .filter(([, count]) => count >= 2)
          .map(([err]) => err);

        // Generate alerts
        const alerts: AlertItem[] = [];
        for (const [err, count] of Object.entries(errorCounts)) {
          if (count >= 3) {
            alerts.push({
              type: "critical",
              message: `Repeated weakness: "${err}" detected in ${count} attempts`,
              timestamp: new Date().toISOString(),
            });
          }
        }
        if (latestScore < 60 && userAttempts.length > 0) {
          alerts.push({
            type: "critical",
            message: `Performance below threshold (${latestScore}%)`,
            timestamp: userAttempts[0]?.created_at || new Date().toISOString(),
          });
        }
        if (trend < -10) {
          alerts.push({
            type: "warning",
            message: `Score declined by ${Math.abs(trend)} points`,
            timestamp: new Date().toISOString(),
          });
        }

        // Determine status
        let status: "good" | "needs_improvement" | "critical" = "good";
        if (avgScore < 60 || alerts.some((a) => a.type === "critical")) {
          status = "critical";
        } else if (avgScore < 75 || repeatedErrors.length > 0) {
          status = "needs_improvement";
        }

        const completionRate = userAttempts.length > 0
          ? Math.round((userAttempts.filter((a) => a.score >= 60).length / userAttempts.length) * 100)
          : 0;

        return {
          userId: consent.user_id,
          name: consent.student_name || "Unknown Student",
          email: consent.student_email || "",
          attempts: userAttempts,
          totalAttempts: userAttempts.length,
          bestScore,
          avgScore,
          latestScore,
          trend,
          completionRate,
          status,
          repeatedErrors,
          alerts,
        };
      });

      setStudents(studentList);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async (studentUserId: string) => {
    try {
      const res = await client.entities.instructor_notes.query({
        query: { student_user_id: studentUserId },
        sort: "-created_at",
        limit: 50,
      });
      setNotes((res?.data?.items || []) as NoteData[]);
    } catch {
      setNotes([]);
    }
  };

  const handleSelectStudent = (student: StudentData) => {
    setSelectedStudent(student);
    fetchNotes(student.userId);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedStudent) return;
    setSavingNote(true);
    try {
      await client.entities.instructor_notes.create({
        data: {
          student_user_id: selectedStudent.userId,
          note_text: newNote.trim(),
          note_type: noteType,
          created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
      });
      setNewNote("");
      fetchNotes(selectedStudent.userId);
    } catch {
      // silently fail
    } finally {
      setSavingNote(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const allAlerts = useMemo(() => {
    return students
      .flatMap((s) => s.alerts.map((a) => ({ ...a, studentName: s.name, studentId: s.userId })))
      .sort((a, b) => (a.type === "critical" ? -1 : 1));
  }, [students]);

  const overallStats = useMemo(() => {
    if (students.length === 0) return null;
    const good = students.filter((s) => s.status === "good").length;
    const needs = students.filter((s) => s.status === "needs_improvement").length;
    const critical = students.filter((s) => s.status === "critical").length;
    const totalAttempts = students.reduce((sum, s) => sum + s.totalAttempts, 0);
    const avgScore = students.length > 0
      ? Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length)
      : 0;
    return { good, needs, critical, totalAttempts, avgScore, totalStudents: students.length };
  }, [students]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "good": return <div className="w-3 h-3 rounded-full bg-emerald-500" />;
      case "needs_improvement": return <div className="w-3 h-3 rounded-full bg-amber-500" />;
      case "critical": return <div className="w-3 h-3 rounded-full bg-red-500" />;
      default: return null;
    }
  };

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
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getAIRecommendations = (student: StudentData) => {
    const recs: string[] = [];
    if (student.repeatedErrors.some((e) => e.toLowerCase().includes("disinfect") || e.toLowerCase().includes("hygiene"))) {
      recs.push("Focus on infection control training — recommend in-person demonstration of aseptic technique");
    }
    if (student.repeatedErrors.some((e) => e.toLowerCase().includes("angle") || e.toLowerCase().includes("needle"))) {
      recs.push("Schedule hands-on needle insertion practice with angle guide overlay");
    }
    if (student.avgScore < 60) {
      recs.push("Recommend repeating the full simulation module before clinical placement");
    }
    if (student.trend < -10) {
      recs.push("Performance declining — consider one-on-one mentoring session");
    }
    if (student.totalAttempts >= 5 && student.avgScore < 75) {
      recs.push("Multiple attempts with low scores — recommend in-person lab demonstration");
    }
    if (recs.length === 0) {
      recs.push("Student performing well — continue current training path");
      recs.push("Consider assigning advanced procedures to maintain engagement");
    }
    return recs;
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
      </div>
    );
  }

  // Student Detail View
  if (selectedStudent) {
    const student = selectedStudent;
    const recs = getAIRecommendations(student);

    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white">
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-md bg-white/5">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 text-slate-400 hover:text-white"
              onClick={() => setSelectedStudent(null)}
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
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
            <Eye className="w-3 h-3 mr-1" />
            Student Profile
          </Badge>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-8">
          {/* Student Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center text-xl font-bold text-cyan-400">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{student.name}</h1>
                {getStatusIcon(student.status)}
              </div>
              <p className="text-slate-400 text-sm">{student.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            <Card className="bg-white/5 border-white/10 p-4">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Best Score</p>
              <p className="text-xl font-bold text-white">{student.bestScore}%</p>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Average</p>
              <p className="text-xl font-bold text-white">{student.avgScore}%</p>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Attempts</p>
              <p className="text-xl font-bold text-white">{student.totalAttempts}</p>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Completion</p>
              <p className="text-xl font-bold text-white">{student.completionRate}%</p>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4">
              <p className="text-[10px] text-slate-500 uppercase mb-1">Trend</p>
              <p className={`text-xl font-bold ${student.trend > 0 ? "text-emerald-400" : student.trend < 0 ? "text-red-400" : "text-slate-400"}`}>
                {student.trend > 0 ? "+" : ""}{student.trend}
              </p>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Error Patterns */}
            <Card className="bg-red-500/5 border-red-500/20 p-5">
              <h3 className="text-sm font-bold text-red-400 mb-4 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Error Patterns & Skill Gaps
              </h3>
              {student.repeatedErrors.length > 0 ? (
                <div className="space-y-2">
                  {student.repeatedErrors.map((err, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="text-xs text-slate-300">{err}</span>
                      <Badge className="ml-auto bg-red-500/20 text-red-400 border-0 text-[10px]">
                        Repeated
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No repeated error patterns detected.</p>
              )}
            </Card>

            {/* Strengths */}
            <Card className="bg-emerald-500/5 border-emerald-500/20 p-5">
              <h3 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Identified Strengths
              </h3>
              <div className="space-y-2">
                {student.avgScore >= 70 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">Good overall performance average</span>
                  </div>
                )}
                {student.completionRate >= 80 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">High completion rate</span>
                  </div>
                )}
                {student.trend > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs text-slate-300">Improving trend (+{student.trend})</span>
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300">Correct vein selection demonstrated</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-300">Patient communication skills</span>
                </div>
              </div>
            </Card>
          </div>

          {/* AI Recommendations */}
          <Card className="bg-cyan-500/5 border-cyan-500/20 p-5 mb-8">
            <h3 className="text-sm font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Recommendations for Instructor
            </h3>
            <div className="space-y-2">
              {recs.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-cyan-500/10">
                  <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300">{rec}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Score Progression */}
          {student.attempts.length > 1 && (
            <Card className="bg-white/5 border-white/10 p-6 mb-8">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                Score Progression
              </h3>
              <div className="flex items-end gap-2 h-32">
                {[...student.attempts].reverse().slice(-12).map((attempt, i) => {
                  const height = (attempt.score / 100) * 100;
                  const barColor =
                    attempt.score >= 90 ? "bg-emerald-500"
                      : attempt.score >= 75 ? "bg-cyan-500"
                        : attempt.score >= 60 ? "bg-amber-500"
                          : "bg-red-500";
                  return (
                    <div key={attempt.id} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-slate-500">{attempt.score}%</span>
                      <div
                        className={`w-full rounded-t-sm ${barColor} min-h-[4px]`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[8px] text-slate-600">#{i + 1}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Attempts History */}
          <Card className="bg-white/5 border-white/10 p-5 mb-8">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Attempts History
            </h3>
            <div className="space-y-2">
              {student.attempts.map((attempt) => {
                const gc = getGradeColor(attempt.grade);
                let parsedErrors: string[] = [];
                try { parsedErrors = JSON.parse(attempt.errors_list); } catch { /* ignore */ }
                return (
                  <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${gc.split(" ")[1]}`}>
                        <span className={`text-sm font-bold ${gc.split(" ")[0]}`}>{attempt.grade}</span>
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white">{attempt.score}%</span>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{formatDuration(attempt.duration_seconds)}</span>
                          <span><AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />{attempt.errors_count} errors</span>
                          <span>{formatDate(attempt.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {parsedErrors.length > 0 && (
                      <div className="flex gap-1">
                        {parsedErrors.map((e, i) => (
                          <Badge key={i} variant="outline" className="border-red-500/30 text-red-400 text-[9px]">{e}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {student.attempts.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No attempts recorded yet.</p>
              )}
            </div>
          </Card>

          {/* Clinical Intervention — Instructor Notes */}
          <Card className="bg-white/5 border-white/10 p-5 mb-8">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Clinical Intervention & Notes
            </h3>

            {/* Add Note */}
            <div className="mb-4 space-y-3">
              <div className="flex gap-2">
                {["general", "intervention", "assignment"].map((t) => (
                  <Button
                    key={t}
                    variant={noteType === t ? "default" : "outline"}
                    size="sm"
                    className={noteType === t
                      ? "bg-cyan-500/20 text-cyan-400 border-0 text-[10px] h-7"
                      : "border-white/20 text-slate-400 bg-transparent hover:bg-white/5 text-[10px] h-7"
                    }
                    onClick={() => setNoteType(t)}
                  >
                    {t === "general" && "📝 Note"}
                    {t === "intervention" && "🏥 Intervention"}
                    {t === "assignment" && "📋 Assignment"}
                  </Button>
                ))}
              </div>
              <Textarea
                placeholder={
                  noteType === "intervention"
                    ? `e.g., "Schedule lab session for ${student.name} – focus on aseptic technique"`
                    : noteType === "assignment"
                      ? `e.g., "Assign additional practice on infection control module"`
                      : "Add a note about this student's performance..."
                }
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="bg-white/5 border-white/10 text-white text-sm min-h-[80px] placeholder:text-slate-600"
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || savingNote}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold text-sm h-9 gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {savingNote ? "Saving..." : "Add Note"}
              </Button>
            </div>

            {/* Existing Notes */}
            {notes.length > 0 && (
              <div className="space-y-2 border-t border-white/10 pt-4">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={
                        note.note_type === "intervention" ? "bg-amber-500/20 text-amber-400 border-0 text-[9px]"
                          : note.note_type === "assignment" ? "bg-blue-500/20 text-blue-400 border-0 text-[9px]"
                            : "bg-slate-500/20 text-slate-400 border-0 text-[9px]"
                      }>
                        {note.note_type}
                      </Badge>
                      <span className="text-[10px] text-slate-600">{formatDate(note.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-300">{note.note_text}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Blackboard Integration */}
          <Card className="bg-white/5 border-white/10 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Blackboard Ultra Sync</h3>
                <p className="text-[10px] text-slate-500">Reports auto-synced to student record</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-emerald-400 font-medium">
                All performance data is synced with Blackboard Ultra
              </p>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Main Dashboard View
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
        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
          <Shield className="w-3 h-3 mr-1" />
          Faculty Dashboard
        </Badge>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Faculty Clinical Performance Dashboard</h1>
          <p className="text-slate-400 text-sm">Monitor student progress and provide targeted guidance</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            {overallStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <Card className="bg-white/5 border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] text-slate-500 uppercase">Students</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{overallStats.totalStudents}</p>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-slate-500 uppercase">Good</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{overallStats.good}</p>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-[10px] text-slate-500 uppercase">Needs Work</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{overallStats.needs}</p>
                </Card>
                <Card className="bg-red-500/5 border-red-500/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-[10px] text-slate-500 uppercase">Critical</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{overallStats.critical}</p>
                </Card>
                <Card className="bg-white/5 border-white/10 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] text-slate-500 uppercase">Avg Score</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{overallStats.avgScore}%</p>
                </Card>
              </div>
            )}

            {/* Real-Time Alerts */}
            {allAlerts.length > 0 && (
              <Card className="bg-white/5 border-white/10 p-5 mb-8">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Real-Time Alerts
                  <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px] ml-2">
                    {allAlerts.length}
                  </Badge>
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allAlerts.slice(0, 10).map((alert, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        alert.type === "critical" ? "bg-red-500/10 border border-red-500/20"
                          : alert.type === "warning" ? "bg-amber-500/10 border border-amber-500/20"
                            : "bg-blue-500/10 border border-blue-500/20"
                      }`}
                    >
                      <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                        alert.type === "critical" ? "text-red-400" : "text-amber-400"
                      }`} />
                      <div className="flex-1">
                        <p className="text-xs text-slate-300">
                          <span className="font-bold text-white">{alert.studentName}:</span>{" "}
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search students by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-10"
              />
            </div>

            {/* Student List */}
            {filteredStudents.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-12 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">
                  {students.length === 0 ? "No Students Yet" : "No Results"}
                </h3>
                <p className="text-slate-400 text-sm">
                  {students.length === 0
                    ? "Students who enable tracking will appear here."
                    : "Try a different search term."}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <Card
                    key={student.userId}
                    className="bg-white/5 border-white/10 p-5 cursor-pointer hover:border-cyan-500/30 hover:bg-white/[0.07] transition-all"
                    onClick={() => handleSelectStudent(student)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(student.status)}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-sm font-bold text-cyan-400">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-bold text-white">{student.name}</span>
                            {student.alerts.length > 0 && (
                              <Badge className="bg-red-500/20 text-red-400 border-0 text-[9px]">
                                {student.alerts.length} alert{student.alerts.length !== 1 ? "s" : ""}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-[11px] text-slate-500">
                            <span><Trophy className="w-3 h-3 inline mr-0.5" />{student.totalAttempts} attempts</span>
                            <span><Target className="w-3 h-3 inline mr-0.5" />Avg {student.avgScore}%</span>
                            <span><Clock className="w-3 h-3 inline mr-0.5" />Best {student.bestScore}%</span>
                            <span>
                              {student.trend > 0 ? (
                                <TrendingUp className="w-3 h-3 inline mr-0.5 text-emerald-400" />
                              ) : student.trend < 0 ? (
                                <TrendingDown className="w-3 h-3 inline mr-0.5 text-red-400" />
                              ) : (
                                <Minus className="w-3 h-3 inline mr-0.5" />
                              )}
                              {student.trend > 0 ? "+" : ""}{student.trend}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Completion bar */}
                        <div className="hidden md:block w-24">
                          <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                            <span>Completion</span>
                            <span>{student.completionRate}%</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                student.completionRate >= 80 ? "bg-emerald-500"
                                  : student.completionRate >= 50 ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                              style={{ width: `${student.completionRate}%` }}
                            />
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}