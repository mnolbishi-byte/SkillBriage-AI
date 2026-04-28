import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Activity, ArrowLeft, Home } from "lucide-react";
import ProgressBar from "@/components/simulation/ProgressBar";
import AIAssistant, {
  type AIMessage,
} from "@/components/simulation/AIAssistant";
import StagePreparation from "@/components/simulation/StagePreparation";
import StageVeinIdentification from "@/components/simulation/StageVeinIdentification";
import StageNeedleInsertion from "@/components/simulation/StageNeedleInsertion";
import AssessmentReport from "@/components/simulation/AssessmentReport";
import TrackingConsent from "@/components/simulation/TrackingConsent";
import { useAuth } from "@/contexts/AuthContext";
import { client } from "@/lib/api";

export default function SimulationPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showConsent, setShowConsent] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const consentCheckedRef = useRef(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "welcome",
      text: "Welcome to the Digital Venipuncture Lab. This procedure was automatically generated from your Blackboard course content. Let's begin with the preparation stage.",
      type: "welcome",
      timestamp: Date.now(),
    },
  ]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      login();
    }
  }, []);

  // Check if consent has been given
  useEffect(() => {
    if (!user || consentCheckedRef.current) return;
    consentCheckedRef.current = true;

    const checkConsent = async () => {
      try {
        const res = await client.entities.student_consent.query({
          query: {},
          limit: 1,
        });
        if (!res?.data?.items?.length) {
          // No consent record — show dialog
          setShowConsent(true);
        }
      } catch {
        // silently fail
      }
    };
    checkConsent();
  }, [user]);

  const addMessage = useCallback(
    (msg: Omit<AIMessage, "id" | "timestamp">) => {
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
        },
      ]);
    },
    []
  );

  const completeStage = useCallback(
    (stageId: number) => {
      setCompletedStages((prev) =>
        prev.includes(stageId) ? prev : [...prev, stageId]
      );
      setCurrentStage(stageId + 1);
    },
    []
  );

  const handlePreparationComplete = useCallback(() => {
    completeStage(0);
    addMessage({
      text: "Preparation complete. Moving to vein identification. Use the AR overlay to locate the correct vein in the antecubital fossa.",
      type: "info",
    });
  }, [completeStage, addMessage]);

  const handleVeinComplete = useCallback(() => {
    completeStage(1);
    addMessage({
      text: "Vein identified successfully. Now prepare for needle insertion. Remember to disinfect the site first.",
      type: "info",
    });
  }, [completeStage, addMessage]);

  const handleNeedleComplete = useCallback(
    (procedureErrors: string[]) => {
      setErrors(procedureErrors);
      completeStage(2);
      addMessage({
        text: "Procedure complete. Generating your smart assessment report...",
        type: "info",
      });
    },
    [completeStage, addMessage]
  );

  const getDurationSeconds = useCallback(() => {
    return Math.round((Date.now() - startTimeRef.current) / 1000);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col">
      {/* Tracking Consent Modal */}
      {showConsent && <TrackingConsent onClose={() => setShowConsent(false)} />}

      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-md bg-white/5 shrink-0">
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

        {/* Progress Bar */}
        <div className="flex-1 max-w-md mx-4">
          <ProgressBar
            currentStage={currentStage}
            completedStages={completedStages}
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-slate-400 hover:text-white"
          onClick={() => navigate("/")}
        >
          <Home className="w-4 h-4" />
        </Button>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Simulation Area */}
        <div className="flex-1 overflow-y-auto">
          {currentStage === 0 && (
            <StagePreparation
              onComplete={handlePreparationComplete}
              onAIMessage={addMessage}
            />
          )}
          {currentStage === 1 && (
            <StageVeinIdentification
              onComplete={handleVeinComplete}
              onAIMessage={addMessage}
            />
          )}
          {currentStage === 2 && (
            <StageNeedleInsertion
              onComplete={handleNeedleComplete}
              onAIMessage={addMessage}
            />
          )}
          {currentStage === 3 && (
            <AssessmentReport
              errors={errors}
              onAIMessage={addMessage}
              getDurationSeconds={getDurationSeconds}
            />
          )}
        </div>

        {/* AI Assistant Sidebar */}
        <div className="w-72 shrink-0 hidden lg:block">
          <AIAssistant messages={messages} />
        </div>
      </div>
    </div>
  );
}