import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  AlertCircle,
  CheckCircle2,
  Droplets,
  Syringe,
  ChevronRight,
  ShieldAlert,
  Timer,
  Heart,
} from "lucide-react";
import type { AIMessage } from "./AIAssistant";

const PATIENT_IMG =
  "https://mgx-backend-cdn.metadl.com/generate/images/1075756/2026-04-15/mu6h5gaaae7q/virtual-patient.png";

type SubStage = "disinfection" | "needle" | "completion";

interface StageNeedleInsertionProps {
  onComplete: (errors: string[]) => void;
  onAIMessage: (msg: Omit<AIMessage, "id" | "timestamp">) => void;
}

export default function StageNeedleInsertion({
  onComplete,
  onAIMessage,
}: StageNeedleInsertionProps) {
  const [subStage, setSubStage] = useState<SubStage>("disinfection");
  const [disinfected, setDisinfected] = useState(false);
  const [criticalError, setCriticalError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [needleAngle, setNeedleAngle] = useState([22]);
  const [angleConfirmed, setAngleConfirmed] = useState(false);
  const [angleError, setAngleError] = useState(false);
  const [bloodFlow, setBloodFlow] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [attemptedSkipDisinfect, setAttemptedSkipDisinfect] = useState(false);

  // Countdown timer for critical error
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && criticalError) {
      setCriticalError(false);
    }
  }, [countdown, criticalError]);

  const handleDisinfect = useCallback(() => {
    setDisinfected(true);
    setCriticalError(false);
    setCountdown(0);
    setAttemptedSkipDisinfect(false);
    onAIMessage({
      text: "Disinfection complete. The puncture site has been properly cleaned with antiseptic. You may proceed with needle insertion.",
      type: "success",
    });
  }, [onAIMessage]);

  const handleSkipDisinfection = useCallback(() => {
    if (!disinfected) {
      setAttemptedSkipDisinfect(true);
      setCriticalError(true);
      setCountdown(5);
      setErrors((prev) =>
        prev.includes("Skipped disinfection")
          ? prev
          : [...prev, "Skipped disinfection"]
      );
      onAIMessage({
        text: "🚨 CRITICAL ERROR: Disinfection skipped! Risk of infection. You must disinfect the site before proceeding. Action blocked.",
        type: "critical",
      });
    }
  }, [disinfected, onAIMessage]);

  const handleProceedToNeedle = useCallback(() => {
    if (!disinfected) {
      handleSkipDisinfection();
      return;
    }
    setSubStage("needle");
    onAIMessage({
      text: "Position the needle at a 15–30 degree angle. The bevel should face up. Take your time to ensure proper alignment.",
      type: "info",
    });
  }, [disinfected, handleSkipDisinfection, onAIMessage]);

  const handleConfirmAngle = useCallback(() => {
    const angle = needleAngle[0];
    if (angle >= 15 && angle <= 30) {
      setAngleConfirmed(true);
      setAngleError(false);
      onAIMessage({
        text: `Needle angle: ${angle}°. Perfect insertion angle. Proceeding with venipuncture...`,
        type: "success",
      });
      // Simulate blood flow after a delay
      setTimeout(() => {
        setBloodFlow(true);
        setSubStage("completion");
        onAIMessage({
          text: "Blood flow detected! Procedure successful. Good job. Remember to apply the label at the bedside.",
          type: "success",
        });
      }, 1500);
    } else {
      setAngleError(true);
      setErrors((prev) =>
        prev.includes("Incorrect needle angle")
          ? prev
          : [...prev, "Incorrect needle angle"]
      );
      onAIMessage({
        text: `🚨 Incorrect angle: ${angle}°. The correct range is 15–30°. Risk of hematoma or nerve damage. The virtual patient is showing signs of discomfort.`,
        type: "critical",
      });
    }
  }, [needleAngle, onAIMessage]);

  const handleFinish = useCallback(() => {
    onComplete(errors);
  }, [errors, onComplete]);

  const isAngleCorrect = needleAngle[0] >= 15 && needleAngle[0] <= 30;

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in duration-500">
      <div className="max-w-2xl w-full">
        {/* Sub-stage: Disinfection */}
        {subStage === "disinfection" && (
          <>
            <div className="text-center mb-6">
              <Badge className="bg-cyan-500/20 text-cyan-400 border-0 mb-3">
                STAGE 3 — DISINFECTION
              </Badge>
              <h2 className="text-2xl font-bold text-white mb-2">
                Site Preparation
              </h2>
              <p className="text-slate-400 text-sm">
                Disinfect the puncture site before needle insertion.
              </p>
            </div>

            {/* Critical Error Alert */}
            {criticalError && (
              <div className="mb-6 p-5 rounded-xl bg-red-500/10 border-2 border-red-500/50 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-red-400 font-bold text-sm">
                      CRITICAL ERROR
                    </p>
                    <p className="text-red-300/70 text-xs">
                      Disinfection skipped — Risk of infection
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <Timer className="w-3 h-3" />
                  Action blocked. Correction required.
                  {countdown > 0 && (
                    <span className="ml-auto font-mono font-bold">
                      {countdown}s
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Patient view */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 mb-6">
              <img
                src={PATIENT_IMG}
                alt="Patient arm"
                className="w-full h-56 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-transparent to-transparent" />
              {disinfected && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-emerald-500/30 text-emerald-300 border-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    DISINFECTED
                  </Badge>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleDisinfect}
                disabled={disinfected}
                className={`flex-1 h-12 rounded-xl font-bold text-sm ${
                  disinfected
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white"
                }`}
              >
                <Droplets className="w-4 h-4 mr-2" />
                {disinfected ? "Site Disinfected ✓" : "Apply Antiseptic"}
              </Button>
              <Button
                onClick={handleProceedToNeedle}
                disabled={criticalError && countdown > 0}
                className={`flex-1 h-12 rounded-xl font-bold text-sm ${
                  disinfected
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                    : "bg-white/10 text-slate-400 hover:bg-white/15"
                }`}
              >
                Proceed to Insertion
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* Sub-stage: Needle Insertion */}
        {subStage === "needle" && (
          <>
            <div className="text-center mb-6">
              <Badge className="bg-cyan-500/20 text-cyan-400 border-0 mb-3">
                STAGE 3 — NEEDLE INSERTION
              </Badge>
              <h2 className="text-2xl font-bold text-white mb-2">
                Needle Insertion
              </h2>
              <p className="text-slate-400 text-sm">
                Adjust the needle angle to 15–30° and insert.
              </p>
            </div>

            {/* Angle Error */}
            {angleError && !angleConfirmed && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/40 flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 text-sm font-bold">
                    Incorrect Angle — Risk of Hematoma
                  </p>
                  <p className="text-red-300/70 text-xs mt-1">
                    The virtual patient is showing signs of discomfort. Adjust
                    the angle to 15–30°.
                  </p>
                </div>
              </div>
            )}

            {/* Needle angle control */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Syringe className="w-5 h-5 text-cyan-400" />
                  <span className="text-sm font-medium text-white">
                    Needle Angle
                  </span>
                </div>
                <div
                  className={`text-3xl font-mono font-bold ${
                    isAngleCorrect
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {needleAngle[0]}°
                </div>
              </div>

              {/* Angle visualization */}
              <div className="relative h-32 mb-6 flex items-end justify-center">
                <div className="relative w-64 h-1 bg-white/20 rounded">
                  {/* Correct range indicator */}
                  <div
                    className="absolute h-full bg-emerald-500/30 rounded"
                    style={{
                      left: `${(15 / 90) * 100}%`,
                      width: `${((30 - 15) / 90) * 100}%`,
                    }}
                  />
                  {/* Needle line */}
                  <div
                    className="absolute bottom-0 left-1/2 origin-bottom-left h-24 w-0.5 transition-transform duration-300"
                    style={{
                      transform: `rotate(-${needleAngle[0]}deg)`,
                      background: isAngleCorrect
                        ? "linear-gradient(to top, #10B981, #06B6D4)"
                        : "linear-gradient(to top, #EF4444, #F59E0B)",
                    }}
                  >
                    <div
                      className={`absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full ${isAngleCorrect ? "bg-emerald-400" : "bg-red-400"}`}
                    />
                  </div>
                </div>
                {/* Labels */}
                <div className="absolute bottom-0 left-[calc(50%-128px+16.7%)] text-[10px] text-emerald-400/70 -translate-x-1/2">
                  15°
                </div>
                <div className="absolute bottom-0 left-[calc(50%-128px+33.3%)] text-[10px] text-emerald-400/70 -translate-x-1/2">
                  30°
                </div>
              </div>

              {/* Slider */}
              <Slider
                value={needleAngle}
                onValueChange={setNeedleAngle}
                min={0}
                max={90}
                step={1}
                disabled={angleConfirmed}
                className="mb-4"
              />

              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0° (Too shallow)</span>
                <span className="text-emerald-400">15–30° (Correct)</span>
                <span>90° (Too steep)</span>
              </div>
            </div>

            {/* Virtual patient reaction */}
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 transition-all ${
                isAngleCorrect
                  ? "bg-emerald-500/10 border border-emerald-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <Heart
                className={`w-5 h-5 ${isAngleCorrect ? "text-emerald-400" : "text-red-400 animate-pulse"}`}
              />
              <p
                className={`text-xs ${isAngleCorrect ? "text-emerald-400" : "text-red-400"}`}
              >
                {isAngleCorrect
                  ? "Patient is comfortable. Angle looks correct."
                  : "Patient showing signs of discomfort. Adjust the angle."}
              </p>
            </div>

            <Button
              onClick={handleConfirmAngle}
              disabled={angleConfirmed}
              className={`w-full h-12 rounded-xl font-bold text-sm transition-all ${
                angleConfirmed
                  ? "bg-emerald-500/20 text-emerald-400"
                  : isAngleCorrect
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                    : "bg-white/10 text-slate-400 hover:bg-white/15"
              }`}
            >
              {angleConfirmed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Needle Inserted — Detecting blood flow...
                </>
              ) : (
                "Insert Needle"
              )}
            </Button>
          </>
        )}

        {/* Sub-stage: Completion */}
        {subStage === "completion" && (
          <>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-0 mb-3">
                PROCEDURE COMPLETE
              </Badge>
              <h2 className="text-2xl font-bold text-white mb-2">
                Venipuncture Successful
              </h2>
              <p className="text-slate-400 text-sm">
                Blood flow detected. The procedure has been completed
                successfully.
              </p>
            </div>

            {/* Blood flow animation */}
            {bloodFlow && (
              <div className="mb-6 p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-center animate-in fade-in duration-700">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Droplets className="w-5 h-5 text-red-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold text-sm">
                    Blood Flow Confirmed
                  </span>
                </div>
                <p className="text-slate-400 text-xs">
                  Remember: Apply the label at the bedside before transporting
                  the sample.
                </p>
              </div>
            )}

            <Button
              onClick={handleFinish}
              className="w-full h-12 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.3)]"
            >
              View Assessment Report
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}