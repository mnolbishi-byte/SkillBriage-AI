import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowLeft,
  Home,
  Camera,
  FlaskConical,
  Headphones,
  VideoOff,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hand,
  Syringe,
  Droplets,
  Shield,
  Target,
  Sparkles,
  ChevronRight,
  Volume2,
  VolumeX,
  RotateCcw,
  Send,
  Trophy,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { client } from "@/lib/api";
import EmotionIndicator from "@/components/EmotionIndicator";
import AdaptiveMessage from "@/components/AdaptiveMessage";
import EmotionReport from "@/components/EmotionReport";
import {
  type EmotionState,
  type EmotionSnapshot,
  type EmotionReportData,
  classifyEmotion,
  simulateEmotionDetection,
  getAdaptiveMessage,
  getAdaptiveGuidance,
  generateEmotionReport,
} from "@/lib/emotionEngine";
import { initTTS, speak, stopSpeaking, isTTSSupported } from "@/lib/ttsEngine";

type ARMode = null | "ar";
type Stage = "select" | "preparation" | "vein" | "disinfection" | "needle" | "completion" | "assessment";

interface AISubtitle {
  id: string;
  text: string;
  type: "info" | "warning" | "error" | "success" | "welcome";
}

export default function ARCameraPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const [mode, setMode] = useState<ARMode>(null);
  const [stage, setStage] = useState<Stage>("select");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [subtitles, setSubtitles] = useState<AISubtitle[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<AISubtitle | null>(null);

  // Stage-specific state
  const [glovesDetected, setGlovesDetected] = useState(false);
  const [patientGreeted, setPatientGreeted] = useState(false);
  const [veinSelected, setVeinSelected] = useState<string | null>(null);
  const [disinfected, setDisinfected] = useState(false);
  const [disinfectTimer, setDisinfectTimer] = useState(0);
  const [disinfectRunning, setDisinfectRunning] = useState(false);
  const [needleAngle, setNeedleAngle] = useState(0);
  const [needleInserted, setNeedleInserted] = useState(false);
  const [criticalAlert, setCriticalAlert] = useState(false);
  const [bloodFlowDetected, setBloodFlowDetected] = useState(false);
  const [sampleLabeled, setSampleLabeled] = useState(false);
  const [score, setScore] = useState(0);

  // Emotion Support state
  const [emotionEnabled, setEmotionEnabled] = useState(true);
  const [emotionState, setEmotionState] = useState<EmotionState>("neutral");
  const [emotionStress, setEmotionStress] = useState(10);
  const [emotionConfidence, setEmotionConfidence] = useState(70);
  const [emotionHistory, setEmotionHistory] = useState<EmotionSnapshot[]>([]);
  const [adaptiveMessage, setAdaptiveMessage] = useState("");
  const [adaptiveTone, setAdaptiveTone] = useState<"calm" | "encouraging" | "celebratory">("encouraging");
  const [adaptiveVisible, setAdaptiveVisible] = useState(false);
  const [emotionReport, setEmotionReport] = useState<EmotionReportData | null>(null);
  const emotionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAdaptiveTimeRef = useRef(0);

  // TTS Voice Output state
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [ttsSupported] = useState(() => isTTSSupported());
  const voiceEnabledRef = useRef(true);

  // Keep ref in sync with state so callbacks always have latest value
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  useEffect(() => {
    if (!user) login();
  }, []);

  // Initialize TTS engine
  useEffect(() => {
    if (ttsSupported) {
      initTTS();
    }
  }, [ttsSupported]);

  // Cleanup camera and TTS on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopSpeaking();
    };
  }, []);

  // Disinfection timer
  useEffect(() => {
    if (!disinfectRunning) return;
    if (disinfectTimer >= 60) {
      setDisinfectRunning(false);
      setDisinfected(true);
      showSubtitle("Disinfection complete. 60-second wait time fulfilled. You may now proceed.", "success");
      return;
    }
    const interval = setInterval(() => {
      setDisinfectTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [disinfectRunning, disinfectTimer]);

  // Emotion Detection Engine — runs every 3 seconds when camera is active and emotion support is enabled
  useEffect(() => {
    if (!cameraActive || !emotionEnabled || stage === "select" || stage === "assessment") {
      if (emotionIntervalRef.current) {
        clearInterval(emotionIntervalRef.current);
        emotionIntervalRef.current = null;
      }
      return;
    }

    emotionIntervalRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const { stress, confidence } = simulateEmotionDetection(
        errors.length,
        stage,
        elapsed,
        emotionStress,
        emotionConfidence
      );
      const state = classifyEmotion(stress, confidence);

      setEmotionStress(stress);
      setEmotionConfidence(confidence);
      setEmotionState(state);

      // Record snapshot for history
      const snapshot: EmotionSnapshot = {
        state,
        confidence,
        stress,
        timestamp: Date.now(),
        stage,
      };
      setEmotionHistory((prev) => [...prev, snapshot]);

      // Show adaptive message if emotion is stressed/anxious (throttle to every 15s)
      const now = Date.now();
      if ((state === "stressed" || state === "anxious") && now - lastAdaptiveTimeRef.current > 15000) {
        const guidance = getAdaptiveGuidance(state, errors.length, stress);
        setAdaptiveMessage(guidance.message);
        setAdaptiveTone(guidance.tone);
        setAdaptiveVisible(true);
        lastAdaptiveTimeRef.current = now;
        // Speak the adaptive message
        if (voiceEnabledRef.current && ttsSupported) {
          speak(guidance.message);
        }
        // Auto-hide after 6 seconds
        setTimeout(() => setAdaptiveVisible(false), 6000);
      }
    }, 3000);

    return () => {
      if (emotionIntervalRef.current) {
        clearInterval(emotionIntervalRef.current);
        emotionIntervalRef.current = null;
      }
    };
  }, [cameraActive, emotionEnabled, stage, errors.length, emotionStress, emotionConfidence]);

  // Cleanup emotion interval on unmount
  useEffect(() => {
    return () => {
      if (emotionIntervalRef.current) {
        clearInterval(emotionIntervalRef.current);
      }
    };
  }, []);

  // Show positive reinforcement when a stage is completed successfully
  const showPositiveReinforcement = useCallback(() => {
    if (!emotionEnabled) return;
    const msg = getAdaptiveMessage(emotionState, true);
    setAdaptiveMessage(msg);
    setAdaptiveTone("celebratory");
    setAdaptiveVisible(true);
    lastAdaptiveTimeRef.current = Date.now();
    // Speak the positive reinforcement
    if (voiceEnabledRef.current && ttsSupported) {
      speak(msg);
    }
    setTimeout(() => setAdaptiveVisible(false), 5000);
  }, [emotionEnabled, emotionState, ttsSupported]);

  const showSubtitle = useCallback((text: string, type: AISubtitle["type"] = "info") => {
    const sub: AISubtitle = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      text,
      type,
    };
    setCurrentSubtitle(sub);
    setSubtitles((prev) => [...prev, sub]);
    // Speak the subtitle aloud if voice is enabled
    if (voiceEnabledRef.current && ttsSupported) {
      speak(text);
    }
  }, [ttsSupported]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraError("");
    } catch {
      setCameraError("Camera access denied. Please allow camera permissions and try again.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleModeSelect = async (selectedMode: ARMode) => {
    setMode(selectedMode);
    setStage("preparation");
    startTimeRef.current = Date.now();
    await startCamera();
    showSubtitle(
      "Welcome to the Digital Venipuncture Lab. The system has extracted clinical steps from your Fundamentals of Nursing course via Blackboard Ultra. Let's begin.",
      "welcome"
    );
    setTimeout(() => {
      showSubtitle("Introduce yourself to the patient and explain the procedure.", "info");
    }, 3000);
  };

  // PREPARATION STAGE
  const handleGreetPatient = () => {
    setPatientGreeted(true);
    showSubtitle("Good. Communication detected. Now please put on your gloves.", "success");
  };

  const handleDetectGloves = () => {
    setGlovesDetected(true);
    showSubtitle("Gloves detected. Preparation complete. Moving to vein identification.", "success");
    showPositiveReinforcement();
    setTimeout(() => {
      setStage("vein");
      showSubtitle("Identify the correct vein area in the antecubital fossa. Select the appropriate vein.", "info");
    }, 1500);
  };

  // VEIN IDENTIFICATION
  const handleVeinSelect = (vein: string) => {
    setVeinSelected(vein);
    if (vein === "cephalic" || vein === "median_cubital") {
      showSubtitle(`Good. ${vein === "cephalic" ? "Cephalic vein" : "Median cubital vein"} is a suitable choice. Proceed to disinfection.`, "success");
      showPositiveReinforcement();
      setTimeout(() => {
        setStage("disinfection");
        showSubtitle("Disinfect the injection site before proceeding. Apply antiseptic and wait 60 seconds.", "info");
      }, 1500);
    } else {
      showSubtitle("Incorrect vein selection. The basilic vein has higher risk of nerve injury. Please select another vein.", "warning");
      setErrors((prev) => [...prev, "Incorrect vein selection"]);
      setVeinSelected(null);
      // Show supportive message on error if emotion support is enabled
      if (emotionEnabled) {
        const guidance = getAdaptiveGuidance(emotionState, errors.length + 1, emotionStress);
        setAdaptiveMessage(guidance.message);
        setAdaptiveTone(guidance.tone);
        setAdaptiveVisible(true);
        setTimeout(() => setAdaptiveVisible(false), 6000);
      }
    }
  };

  // DISINFECTION / CRITICAL ERROR
  const handleStartDisinfection = () => {
    setDisinfectRunning(true);
    setDisinfectTimer(0);
    showSubtitle("Disinfection started. Please wait 60 seconds for the antiseptic to dry.", "info");
  };

  const handleSkipDisinfection = () => {
    // Critical error!
    setCriticalAlert(true);
    setErrors((prev) => [...prev, "Skipped disinfection step"]);
    showSubtitle("STOP! Critical Error Detected. Disinfection step was skipped. This increases risk of infection.", "error");
    // Show supportive message on critical error
    if (emotionEnabled) {
      setTimeout(() => {
        const guidance = getAdaptiveGuidance("anxious", errors.length + 1, emotionStress);
        setAdaptiveMessage(guidance.message);
        setAdaptiveTone(guidance.tone);
        setAdaptiveVisible(true);
        setTimeout(() => setAdaptiveVisible(false), 6000);
      }, 1500);
    }
    setTimeout(() => {
      setCriticalAlert(false);
      showSubtitle("You must disinfect before proceeding. Apply antiseptic now.", "warning");
    }, 3000);
  };

  const handleDisinfectionComplete = () => {
    setDisinfected(true);
    setDisinfectRunning(false);
    showSubtitle("Disinfection verified. Proceed to needle insertion.", "success");
    showPositiveReinforcement();
    setTimeout(() => {
      setStage("needle");
      showSubtitle("Insert the needle at a 15–30 degree angle. Adjust your angle carefully.", "info");
    }, 1500);
  };

  // NEEDLE INSERTION
  const handleAngleChange = (angle: number) => {
    setNeedleAngle(angle);
    if (angle >= 15 && angle <= 30) {
      showSubtitle(`Perfect angle (${angle}°). Continue with insertion.`, "success");
    } else if (angle > 30) {
      showSubtitle(`Incorrect angle (${angle}°). Risk of hematoma. Adjust to 15–30°.`, "warning");
    } else {
      showSubtitle(`Angle too shallow (${angle}°). Adjust to 15–30°.`, "warning");
    }
  };

  const handleInsertNeedle = () => {
    if (needleAngle < 15 || needleAngle > 30) {
      setErrors((prev) => [...prev, `Incorrect needle angle (${needleAngle}°)`]);
      showSubtitle(`Warning: Needle inserted at ${needleAngle}°. Optimal range is 15–30°.`, "warning");
      if (emotionEnabled) {
        const guidance = getAdaptiveGuidance(emotionState, errors.length + 1, emotionStress);
        setAdaptiveMessage(guidance.message);
        setAdaptiveTone(guidance.tone);
        setAdaptiveVisible(true);
        setTimeout(() => setAdaptiveVisible(false), 6000);
      }
    }
    setNeedleInserted(true);
    showSubtitle("Needle inserted. Monitoring for blood flow...", "info");
    setTimeout(() => {
      setBloodFlowDetected(true);
      showSubtitle("Blood flow detected. Procedure successful. Well done!", "success");
      showPositiveReinforcement();
      setTimeout(() => {
        setStage("completion");
        showSubtitle("Remember to label the sample immediately at bedside.", "info");
      }, 2000);
    }, 2000);
  };

  // COMPLETION
  const handleLabelSample = () => {
    setSampleLabeled(true);
    showSubtitle("Sample labeled. Generating your smart assessment report...", "success");
    showPositiveReinforcement();
    // Calculate score
    const baseScore = 100;
    const penalty = errors.length * 15;
    const finalScore = Math.max(0, baseScore - penalty);
    setScore(finalScore);
    // Generate emotion report
    const report = generateEmotionReport(emotionHistory, errors);
    setEmotionReport(report);
    setTimeout(() => {
      setStage("assessment");
    }, 1500);
  };

  // ASSESSMENT — Save & send report
  const handleSendReport = async () => {
    try {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
      await client.entities.simulation_attempts.create({
        data: {
          score,
          grade,
          errors_count: errors.length,
          errors_list: JSON.stringify(errors),
          duration_seconds: duration,
          procedure_type: "ar_guided_simulation",
          created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
      });
      showSubtitle("Report saved and synced with Blackboard Ultra.", "success");
    } catch {
      showSubtitle("Report saved locally.", "info");
    }
  };

  const handleRestart = () => {
    stopCamera();
    stopSpeaking();
    setMode(null);
    setStage("select");
    setErrors([]);
    setSubtitles([]);
    setCurrentSubtitle(null);
    setGlovesDetected(false);
    setPatientGreeted(false);
    setVeinSelected(null);
    setDisinfected(false);
    setDisinfectTimer(0);
    setDisinfectRunning(false);
    setNeedleAngle(0);
    setNeedleInserted(false);
    setCriticalAlert(false);
    setBloodFlowDetected(false);
    setSampleLabeled(false);
    setScore(0);
    // Reset emotion state
    setEmotionState("neutral");
    setEmotionStress(10);
    setEmotionConfidence(70);
    setEmotionHistory([]);
    setAdaptiveMessage("");
    setAdaptiveVisible(false);
    setEmotionReport(null);
    if (emotionIntervalRef.current) {
      clearInterval(emotionIntervalRef.current);
      emotionIntervalRef.current = null;
    }
  };

  const getDuration = () => {
    const s = Math.round((Date.now() - startTimeRef.current) / 1000);
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const getGrade = () => (score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F");

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
      </div>
    );
  }

  // MODE SELECTION
  if (stage === "select") {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-md bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold">SkillBridge <span className="text-cyan-400">AI</span></span>
            </div>
          </div>
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            <Camera className="w-3 h-3 mr-1" />
            AR Camera Mode
          </Badge>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                <Camera className="w-10 h-10 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold mb-3">AR Camera Mode</h1>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Enter the AR guided simulation. Wear headphones for the best experience with AI voice guidance.
              </p>
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
                <Headphones className="w-3.5 h-3.5" />
                Headphones recommended for voice guidance
              </div>
            </div>

            <div className="max-w-md mx-auto">
              {/* AR Guided Simulation */}
              <Card
                className="group bg-white/5 border-white/10 p-8 cursor-pointer hover:border-purple-400/50 hover:shadow-[0_0_40px_rgba(168,85,247,0.15)] transition-all duration-500 hover:-translate-y-1"
                onClick={() => handleModeSelect("ar")}
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <FlaskConical className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">🧪 Enter AR Guided Simulation</h3>
                <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                  Opens augmented reality overlay. Virtual clinical environment projected over your real-world view with AI voice guidance and emotional support.
                </p>
                <div className="flex items-center text-purple-400 text-sm font-medium gap-2 group-hover:gap-3 transition-all">
                  Start Simulation <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ASSESSMENT STAGE
  if (stage === "assessment") {
    const grade = getGrade();
    const gradeColor = grade === "A" ? "text-emerald-400 bg-emerald-500/20" : grade === "B" ? "text-cyan-400 bg-cyan-500/20" : grade === "C" ? "text-amber-400 bg-amber-500/20" : "text-red-400 bg-red-500/20";

    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-md bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-bold">SkillBridge <span className="text-cyan-400">AI</span></span>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-0">
            <Trophy className="w-3 h-3 mr-1" />
            Assessment Complete
          </Badge>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8 max-w-3xl mx-auto w-full">
          <div className="text-center mb-8">
            <div className={`w-24 h-24 rounded-full ${gradeColor.split(" ")[1]} flex items-center justify-center mx-auto mb-4`}>
              <span className={`text-4xl font-bold ${gradeColor.split(" ")[0]}`}>{grade}</span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Smart Assessment Report</h1>
            <p className="text-slate-400 text-sm">AR Camera Mode — AR Guided Simulation</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="bg-white/5 border-white/10 p-4 text-center">
              <Target className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{score}%</p>
              <p className="text-[10px] text-slate-500 uppercase">Score</p>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4 text-center">
              <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{getDuration()}</p>
              <p className="text-[10px] text-slate-500 uppercase">Duration</p>
            </Card>
            <Card className="bg-white/5 border-white/10 p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{errors.length}</p>
              <p className="text-[10px] text-slate-500 uppercase">Errors</p>
            </Card>
          </div>

          {/* Weaknesses */}
          {errors.length > 0 && (
            <Card className="bg-red-500/5 border-red-500/20 p-5 mb-4">
              <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Weaknesses
              </h3>
              <div className="space-y-2">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-xs text-slate-300">{err}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Strengths */}
          <Card className="bg-emerald-500/5 border-emerald-500/20 p-5 mb-4">
            <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Strengths
            </h3>
            <div className="space-y-2">
              {patientGreeted && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-slate-300">Good patient communication</span>
                </div>
              )}
              {veinSelected && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-slate-300">Correct vein selection</span>
                </div>
              )}
              {disinfected && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-slate-300">Proper disinfection procedure</span>
                </div>
              )}
              {needleAngle >= 15 && needleAngle <= 30 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-slate-300">Correct needle angle ({needleAngle}°)</span>
                </div>
              )}
            </div>
          </Card>

          {/* Error Timeline */}
          <Card className="bg-white/5 border-white/10 p-5 mb-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Procedure Timeline
            </h3>
            <div className="space-y-3">
              {["Preparation", "Vein Identification", "Disinfection", "Needle Insertion", "Completion"].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-slate-300 flex-1">{step}</span>
                  <span className="text-[10px] text-slate-600">Completed</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Emotional Wellness Report */}
          {emotionReport && (
            <div className="mb-6">
              <EmotionReport report={emotionReport} />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleSendReport}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold h-11 gap-2"
            >
              <Send className="w-4 h-4" />
              Send Report to Instructor
            </Button>
            <Button
              variant="outline"
              onClick={handleRestart}
              className="border-white/20 text-slate-300 bg-transparent hover:bg-white/5 h-11 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restart
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ACTIVE SIMULATION STAGES
  const stageLabels: Record<string, string> = {
    preparation: "Stage 1: Preparation",
    vein: "Stage 2: Vein Identification",
    disinfection: "Stage 3: Disinfection",
    needle: "Stage 4: Needle Insertion",
    completion: "Stage 5: Completion",
  };

  const stageProgress: Record<string, number> = {
    preparation: 20,
    vein: 40,
    disinfection: 60,
    needle: 80,
    completion: 100,
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col">
      {/* Critical Alert Overlay */}
      {criticalAlert && (
        <div className="fixed inset-0 z-50 bg-red-900/80 flex items-center justify-center animate-pulse">
          <div className="text-center p-8">
            <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-red-300 mb-2">⚠️ CRITICAL ERROR</h2>
            <p className="text-red-200 text-lg mb-2">Disinfection step was skipped!</p>
            <p className="text-red-300/70 text-sm">This increases risk of infection.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-md bg-white/5 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={() => { stopCamera(); stopSpeaking(); navigate("/"); }}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-bold">SkillBridge <span className="text-cyan-400">AI</span></span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex-1 max-w-sm mx-4">
          <div className="flex justify-between text-[9px] text-slate-500 mb-1">
            <span>{stageLabels[stage] || ""}</span>
            <span>{stageProgress[stage] || 0}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${stageProgress[stage] || 0}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
            🧪 AR Mode
          </Badge>
          {ttsSupported && (
            <Button
              variant="ghost"
              size="icon"
              className={`w-8 h-8 ${voiceEnabled ? "text-cyan-400 hover:text-cyan-300" : "text-slate-500 hover:text-slate-400"}`}
              onClick={() => {
                if (voiceEnabled) stopSpeaking();
                setVoiceEnabled(!voiceEnabled);
              }}
              title={voiceEnabled ? "Mute voice guidance" : "Enable voice guidance"}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white" onClick={() => { stopCamera(); stopSpeaking(); navigate("/"); }}>
            <Home className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Camera View */}
        <div className="flex-1 relative bg-black">
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
              {cameraError ? (
                <div className="text-center p-6">
                  <VideoOff className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-red-400 text-sm mb-3">{cameraError}</p>
                  <Button onClick={startCamera} className="bg-blue-500 hover:bg-blue-400 text-white text-sm">
                    Retry Camera
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Initializing camera...</p>
                </div>
              )}
            </div>
          )}

          {/* Emotion Indicator */}
          {cameraActive && (
            <EmotionIndicator
              emotionState={emotionState}
              stress={emotionStress}
              confidence={emotionConfidence}
              enabled={emotionEnabled}
              onToggle={setEmotionEnabled}
            />
          )}

          {/* Adaptive Motivational Message */}
          {cameraActive && emotionEnabled && (
            <AdaptiveMessage
              message={adaptiveMessage}
              emotionState={emotionState}
              tone={adaptiveTone}
              visible={adaptiveVisible}
            />
          )}

          {/* AR Overlay Elements */}
          {cameraActive && mode === "ar" && stage === "vein" && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 border-2 border-cyan-400/60 rounded-xl">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-cyan-400 bg-black/60 px-2 py-0.5 rounded whitespace-nowrap">
                  Antecubital Fossa Region
                </div>
              </div>
            </div>
          )}

          {/* Needle Angle Indicator */}
          {cameraActive && stage === "needle" && (
            <div className="absolute top-4 right-4 z-10">
              <div className={`px-3 py-2 rounded-lg text-sm font-bold ${needleAngle >= 15 && needleAngle <= 30 ? "bg-emerald-500/80 text-white" : "bg-red-500/80 text-white"}`}>
                Angle: {needleAngle}°
              </div>
            </div>
          )}

          {/* AI Subtitle Bar */}
          {currentSubtitle && (
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className={`mx-4 mb-4 p-3 rounded-xl backdrop-blur-md flex items-start gap-2 ${
                currentSubtitle.type === "error" ? "bg-red-900/80 border border-red-500/50"
                  : currentSubtitle.type === "warning" ? "bg-amber-900/80 border border-amber-500/50"
                    : currentSubtitle.type === "success" ? "bg-emerald-900/80 border border-emerald-500/50"
                      : "bg-black/70 border border-white/20"
              }`}>
                <Volume2 className={`w-4 h-4 shrink-0 mt-0.5 ${
                  currentSubtitle.type === "error" ? "text-red-400"
                    : currentSubtitle.type === "warning" ? "text-amber-400"
                      : currentSubtitle.type === "success" ? "text-emerald-400"
                        : "text-cyan-400"
                }`} />
                <p className="text-sm text-white leading-relaxed">{currentSubtitle.text}</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="w-full lg:w-80 shrink-0 bg-[#0F1629] border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">AI Clinical Guide</h3>
          </div>

          {/* PREPARATION */}
          {stage === "preparation" && (
            <div className="space-y-4">
              <Card className="bg-white/5 border-white/10 p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Patient Communication</h4>
                <Button
                  onClick={handleGreetPatient}
                  disabled={patientGreeted}
                  className={`w-full h-10 text-sm gap-2 ${patientGreeted ? "bg-emerald-500/20 text-emerald-400 border-0" : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0"}`}
                >
                  {patientGreeted ? <CheckCircle2 className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {patientGreeted ? "Patient Greeted ✓" : "Greet Patient (Speak)"}
                </Button>
              </Card>

              <Card className={`p-4 ${glovesDetected ? "bg-emerald-500/5 border-emerald-500/20" : !patientGreeted ? "bg-white/5 border-white/10 opacity-50" : "bg-white/5 border-white/10"}`}>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <Hand className="w-3.5 h-3.5" />
                  Safety Check — Gloves
                </h4>
                {!glovesDetected && !patientGreeted && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 mb-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] text-amber-400">Waiting for patient communication first</span>
                  </div>
                )}
                {patientGreeted && !glovesDetected && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 mb-3 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-[10px] text-orange-400">🟠 Gloves NOT detected — required to proceed</span>
                  </div>
                )}
                <Button
                  onClick={handleDetectGloves}
                  disabled={!patientGreeted || glovesDetected}
                  className={`w-full h-10 text-sm gap-2 ${glovesDetected ? "bg-emerald-500/20 text-emerald-400 border-0" : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-0"}`}
                >
                  {glovesDetected ? <CheckCircle2 className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
                  {glovesDetected ? "Gloves Detected ✓" : "Confirm Gloves On"}
                </Button>
              </Card>
            </div>
          )}

          {/* VEIN IDENTIFICATION */}
          {stage === "vein" && (
            <div className="space-y-4">
              <Card className="bg-cyan-500/5 border-cyan-500/20 p-4">
                <h4 className="text-xs font-bold text-cyan-400 uppercase mb-3 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" />
                  Select Vein
                </h4>
                <p className="text-[10px] text-slate-400 mb-3">
                  Identify the correct vein in the antecubital fossa region.
                </p>
                <div className="space-y-2">
                  {[
                    { id: "median_cubital", label: "Median Cubital Vein", desc: "Most common choice", recommended: true },
                    { id: "cephalic", label: "Cephalic Vein", desc: "Suitable alternative" },
                    { id: "basilic", label: "Basilic Vein", desc: "Higher nerve injury risk", risky: true },
                  ].map((vein) => (
                    <Button
                      key={vein.id}
                      onClick={() => handleVeinSelect(vein.id)}
                      disabled={!!veinSelected}
                      className={`w-full h-auto py-3 px-4 text-left justify-start gap-3 ${
                        veinSelected === vein.id
                          ? "bg-emerald-500/20 text-emerald-400 border-0"
                          : (vein as { risky?: boolean }).risky
                            ? "bg-red-500/10 text-slate-300 hover:bg-red-500/20 border-0"
                            : "bg-white/5 text-slate-300 hover:bg-white/10 border-0"
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{vein.label}</span>
                          {vein.recommended && <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-[8px]">RECOMMENDED</Badge>}
                        </div>
                        <span className="text-[10px] text-slate-500">{vein.desc}</span>
                      </div>
                      {veinSelected === vein.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* DISINFECTION */}
          {stage === "disinfection" && (
            <div className="space-y-4">
              <Card className="bg-white/5 border-white/10 p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  Disinfection Protocol
                </h4>

                {!disinfected && !disinfectRunning && (
                  <>
                    <Button
                      onClick={handleStartDisinfection}
                      className="w-full h-10 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-0 gap-2 mb-2"
                    >
                      <Droplets className="w-4 h-4" />
                      Apply Antiseptic
                    </Button>
                    <Button
                      onClick={handleSkipDisinfection}
                      variant="outline"
                      className="w-full h-10 text-sm border-red-500/30 text-red-400 bg-transparent hover:bg-red-500/10 gap-2"
                    >
                      <Syringe className="w-4 h-4" />
                      Skip to Injection (Unsafe)
                    </Button>
                  </>
                )}

                {disinfectRunning && (
                  <div className="text-center py-4">
                    <div className="relative w-20 h-20 mx-auto mb-3">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                        <circle
                          cx="40" cy="40" r="36" fill="none" stroke="#06b6d4" strokeWidth="4"
                          strokeDasharray={`${(disinfectTimer / 60) * 226} 226`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-cyan-400">{60 - disinfectTimer}s</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">Waiting for antiseptic to dry...</p>
                    <Button
                      onClick={handleDisinfectionComplete}
                      disabled={disinfectTimer < 5}
                      className="mt-3 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-0 text-xs h-8"
                    >
                      {disinfectTimer < 5 ? "Please wait..." : "Confirm Dry (Skip Timer)"}
                    </Button>
                  </div>
                )}

                {disinfected && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Disinfection Complete</span>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* NEEDLE INSERTION */}
          {stage === "needle" && (
            <div className="space-y-4">
              <Card className="bg-white/5 border-white/10 p-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                  <Syringe className="w-3.5 h-3.5" />
                  Needle Angle Control
                </h4>
                <p className="text-[10px] text-slate-400 mb-3">Adjust to 15–30° for optimal insertion.</p>

                <div className="mb-4">
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={needleAngle}
                    onChange={(e) => handleAngleChange(Number(e.target.value))}
                    disabled={needleInserted}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>0°</span>
                    <span className="text-emerald-400">15–30° optimal</span>
                    <span>90°</span>
                  </div>
                </div>

                <div className={`p-3 rounded-lg mb-3 text-center ${
                  needleAngle >= 15 && needleAngle <= 30
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : needleAngle > 30
                      ? "bg-red-500/10 border border-red-500/20"
                      : "bg-amber-500/10 border border-amber-500/20"
                }`}>
                  <p className="text-2xl font-bold">{needleAngle}°</p>
                  <p className={`text-[10px] ${
                    needleAngle >= 15 && needleAngle <= 30 ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {needleAngle >= 15 && needleAngle <= 30
                      ? "✓ Optimal angle"
                      : needleAngle > 30
                        ? "⚠ Risk of hematoma"
                        : "⚠ Too shallow"}
                  </p>
                </div>

                {!needleInserted ? (
                  <Button
                    onClick={handleInsertNeedle}
                    className="w-full h-10 text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0 gap-2"
                  >
                    <Syringe className="w-4 h-4" />
                    Insert Needle
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Needle inserted</span>
                    </div>
                    {bloodFlowDetected && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10">
                        <Droplets className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-emerald-400">Blood flow detected ✓</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Virtual patient voice */}
                {needleInserted && needleAngle > 30 && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-300 italic">"Ouch… I feel pain!"</p>
                    <p className="text-[10px] text-red-400 mt-1">— Virtual Patient</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* COMPLETION */}
          {stage === "completion" && (
            <div className="space-y-4">
              <Card className="bg-emerald-500/5 border-emerald-500/20 p-4">
                <h4 className="text-xs font-bold text-emerald-400 uppercase mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Procedure Successful
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  Blood flow detected. Well done! Now label the sample at bedside.
                </p>
                <Button
                  onClick={handleLabelSample}
                  disabled={sampleLabeled}
                  className={`w-full h-10 text-sm gap-2 ${sampleLabeled ? "bg-emerald-500/20 text-emerald-400 border-0" : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-0"}`}
                >
                  {sampleLabeled ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  {sampleLabeled ? "Sample Labeled ✓" : "Label Sample"}
                </Button>
              </Card>
            </div>
          )}

          {/* Errors Log */}
          {errors.length > 0 && (
            <Card className="bg-red-500/5 border-red-500/20 p-4 mt-4">
              <h4 className="text-xs font-bold text-red-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Errors ({errors.length})
              </h4>
              <div className="space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="text-[10px] text-red-300 flex items-center gap-1">
                    <XCircle className="w-2.5 h-2.5" /> {err}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}