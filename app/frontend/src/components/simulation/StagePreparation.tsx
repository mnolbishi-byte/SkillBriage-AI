import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  ShieldCheck,
  Hand,
  Stethoscope,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import type { AIMessage } from "./AIAssistant";

interface StagePreparationProps {
  onComplete: () => void;
  onAIMessage: (msg: Omit<AIMessage, "id" | "timestamp">) => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  required: boolean;
  critical: boolean;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: "introduce",
    label: "Introduce yourself to the patient",
    icon: <MessageSquare className="w-4 h-4" />,
    required: true,
    critical: false,
  },
  {
    id: "explain",
    label: "Explain the procedure",
    icon: <Stethoscope className="w-4 h-4" />,
    required: true,
    critical: false,
  },
  {
    id: "gloves",
    label: "Put on sterile gloves",
    icon: <Hand className="w-4 h-4" />,
    required: true,
    critical: true,
  },
  {
    id: "verify",
    label: "Verify patient identity",
    icon: <ShieldCheck className="w-4 h-4" />,
    required: true,
    critical: false,
  },
];

export default function StagePreparation({
  onComplete,
  onAIMessage,
}: StagePreparationProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [glovesWarning, setGlovesWarning] = useState(false);
  const [attemptedSkip, setAttemptedSkip] = useState(false);

  const handleToggle = (id: string) => {
    if (completed.includes(id)) return;

    setCompleted((prev) => [...prev, id]);

    if (id === "introduce") {
      onAIMessage({
        text: "Good communication. You've introduced yourself clearly to the patient.",
        type: "success",
      });
    } else if (id === "explain") {
      onAIMessage({
        text: "Excellent. The patient understands the procedure. Proceed with preparation.",
        type: "success",
      });
    } else if (id === "gloves") {
      setGlovesWarning(false);
      onAIMessage({
        text: "Sterile gloves detected. Infection control protocol satisfied.",
        type: "success",
      });
    } else if (id === "verify") {
      onAIMessage({
        text: "Patient identity confirmed. All preparation steps complete. You may proceed.",
        type: "success",
      });
    }
  };

  const handleProceed = () => {
    const allDone = CHECKLIST.every((item) => completed.includes(item.id));
    if (!allDone) {
      setAttemptedSkip(true);
      if (!completed.includes("gloves")) {
        setGlovesWarning(true);
        onAIMessage({
          text: "⚠️ WARNING: Gloves not detected! You must wear sterile gloves before proceeding. This is a mandatory safety requirement.",
          type: "warning",
        });
      } else {
        onAIMessage({
          text: "Please complete all preparation steps before proceeding to the next stage.",
          type: "warning",
        });
      }
      return;
    }
    onComplete();
  };

  const allCompleted = CHECKLIST.every((item) => completed.includes(item.id));

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in duration-500">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <Badge className="bg-cyan-500/20 text-cyan-400 border-0 mb-3">
            STAGE 1
          </Badge>
          <h2 className="text-2xl font-bold text-white mb-2">Preparation</h2>
          <p className="text-slate-400 text-sm">
            Complete all preparation steps before beginning the venipuncture
            procedure.
          </p>
        </div>

        {/* Gloves Warning Banner */}
        {glovesWarning && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 animate-in slide-in-from-top-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-amber-400 text-sm font-bold">
                Gloves Not Detected
              </p>
              <p className="text-amber-300/70 text-xs">
                You must put on sterile gloves before proceeding. Next step is
                blocked.
              </p>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="space-y-3 mb-8">
          {CHECKLIST.map((item) => {
            const isDone = completed.includes(item.id);
            const isMissing =
              attemptedSkip && !isDone && item.critical;

            return (
              <Card
                key={item.id}
                className={`p-4 cursor-pointer transition-all duration-300 border ${
                  isDone
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : isMissing
                      ? "bg-amber-500/10 border-amber-500/40 animate-pulse"
                      : "bg-white/5 border-white/10 hover:border-cyan-400/30 hover:bg-white/[0.07]"
                }`}
                onClick={() => handleToggle(item.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isMissing
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-white/10 text-slate-400"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${isDone ? "text-emerald-400" : "text-white"}`}
                    >
                      {item.label}
                    </p>
                    {item.critical && !isDone && (
                      <p className="text-[10px] text-amber-400/70 mt-0.5">
                        Required for safety
                      </p>
                    )}
                  </div>
                  <div
                    className={`${isDone ? "text-emerald-400" : isMissing ? "text-amber-400" : "text-slate-500"}`}
                  >
                    {item.icon}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Proceed Button */}
        <Button
          onClick={handleProceed}
          className={`w-full h-12 rounded-xl font-bold text-sm transition-all duration-300 ${
            allCompleted
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.3)]"
              : "bg-white/10 text-slate-400 hover:bg-white/15"
          }`}
        >
          Proceed to Vein Identification
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}