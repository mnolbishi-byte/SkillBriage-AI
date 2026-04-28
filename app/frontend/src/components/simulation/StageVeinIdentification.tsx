import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Crosshair,
} from "lucide-react";
import type { AIMessage } from "./AIAssistant";

const ARM_IMG =
  "https://mgx-backend-cdn.metadl.com/generate/images/1075756/2026-04-15/mu6hwcyaafaa/arm-anatomy-veins.png";

interface Vein {
  id: string;
  name: string;
  x: number;
  y: number;
  correct: boolean;
  description: string;
}

const VEINS: Vein[] = [
  {
    id: "median_cubital",
    name: "Median Cubital Vein",
    x: 48,
    y: 42,
    correct: true,
    description:
      "Excellent choice. The median cubital vein is the preferred site for venipuncture — it's large, well-anchored, and less prone to rolling.",
  },
  {
    id: "cephalic",
    name: "Cephalic Vein",
    x: 32,
    y: 38,
    correct: false,
    description:
      "The cephalic vein is an acceptable alternative, but the median cubital vein is preferred due to its stability and size.",
  },
  {
    id: "basilic",
    name: "Basilic Vein",
    x: 65,
    y: 45,
    correct: false,
    description:
      "The basilic vein is close to the brachial artery and median nerve. It should only be used as a last resort due to risk of nerve injury.",
  },
];

interface StageVeinIdentificationProps {
  onComplete: () => void;
  onAIMessage: (msg: Omit<AIMessage, "id" | "timestamp">) => void;
}

export default function StageVeinIdentification({
  onComplete,
  onAIMessage,
}: StageVeinIdentificationProps) {
  const [selectedVein, setSelectedVein] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [hoveredVein, setHoveredVein] = useState<string | null>(null);

  const handleSelectVein = (vein: Vein) => {
    if (confirmed) return;
    setSelectedVein(vein.id);

    if (vein.correct) {
      onAIMessage({ text: vein.description, type: "success" });
    } else {
      onAIMessage({
        text: vein.description,
        type: "warning",
      });
      onAIMessage({
        text: "Try selecting the median cubital vein — it's the safest and most common site for venipuncture.",
        type: "info",
      });
    }
  };

  const handleConfirm = () => {
    if (!selectedVein) return;
    const vein = VEINS.find((v) => v.id === selectedVein);
    if (vein?.correct) {
      setConfirmed(true);
      onAIMessage({
        text: "Vein selection confirmed. The antecubital fossa region is properly identified. Proceed to the next stage.",
        type: "success",
      });
    } else {
      onAIMessage({
        text: "Please select the correct vein before proceeding. The median cubital vein is the preferred site.",
        type: "warning",
      });
    }
  };

  const selectedVeinData = VEINS.find((v) => v.id === selectedVein);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-in fade-in duration-500">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-6">
          <Badge className="bg-cyan-500/20 text-cyan-400 border-0 mb-3">
            STAGE 2
          </Badge>
          <h2 className="text-2xl font-bold text-white mb-2">
            Vein Identification
          </h2>
          <p className="text-slate-400 text-sm">
            Identify the correct vein in the antecubital fossa for
            venipuncture.
          </p>
        </div>

        {/* AR Overlay Simulation */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 mb-6 bg-[#111827]">
          {/* AR scan lines effect */}
          <div className="absolute inset-0 pointer-events-none z-10 opacity-20">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6,182,212,0.1) 2px, rgba(6,182,212,0.1) 4px)",
              }}
            />
          </div>

          {/* AR overlay badge */}
          <div className="absolute top-3 left-3 z-20">
            <Badge className="bg-cyan-500/30 text-cyan-300 border-0 text-[10px] backdrop-blur-sm">
              <Crosshair className="w-3 h-3 mr-1" />
              AR OVERLAY ACTIVE
            </Badge>
          </div>

          <img
            src={ARM_IMG}
            alt="Arm anatomy"
            className="w-full h-80 object-contain"
          />

          {/* Vein selection points */}
          {VEINS.map((vein) => {
            const isSelected = selectedVein === vein.id;
            const isHovered = hoveredVein === vein.id;
            const isCorrectAndConfirmed = confirmed && vein.correct;

            return (
              <div
                key={vein.id}
                className="absolute z-20"
                style={{ left: `${vein.x}%`, top: `${vein.y}%` }}
              >
                {/* Pulse ring */}
                <div
                  className={`absolute -inset-3 rounded-full transition-all duration-500 ${
                    isSelected || isHovered
                      ? isCorrectAndConfirmed
                        ? "bg-emerald-500/20 animate-ping"
                        : isSelected && !vein.correct
                          ? "bg-amber-500/20 animate-ping"
                          : "bg-cyan-500/20 animate-ping"
                      : ""
                  }`}
                />

                {/* Main dot */}
                <button
                  onClick={() => handleSelectVein(vein)}
                  onMouseEnter={() => setHoveredVein(vein.id)}
                  onMouseLeave={() => setHoveredVein(null)}
                  className={`relative w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 -translate-x-1/2 -translate-y-1/2 ${
                    isCorrectAndConfirmed
                      ? "bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                      : isSelected
                        ? vein.correct
                          ? "bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                          : "bg-amber-500 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                        : "bg-cyan-500/50 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-white" />
                </button>

                {/* Label */}
                {(isSelected || isHovered) && (
                  <div className="absolute left-4 top-0 -translate-y-1/2 ml-2 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200">
                    <div
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md ${
                        isCorrectAndConfirmed
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : isSelected && !vein.correct
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}
                    >
                      {vein.name}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selection feedback */}
        {selectedVeinData && !confirmed && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-bottom-2 ${
              selectedVeinData.correct
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : "bg-amber-500/10 border border-amber-500/30"
            }`}
          >
            {selectedVeinData.correct ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`text-sm font-bold ${selectedVeinData.correct ? "text-emerald-400" : "text-amber-400"}`}
              >
                {selectedVeinData.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedVeinData.description}
              </p>
            </div>
          </div>
        )}

        {/* Confirmed success */}
        {confirmed && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-emerald-400 font-medium">
              Correct vein identified. Ready to proceed.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {!confirmed && (
            <Button
              onClick={handleConfirm}
              disabled={!selectedVein}
              className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all ${
                selectedVein && selectedVeinData?.correct
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                  : "bg-white/10 text-slate-400 hover:bg-white/15"
              }`}
            >
              Confirm Selection
            </Button>
          )}
          {confirmed && (
            <Button
              onClick={onComplete}
              className="flex-1 h-12 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-[0_0_25px_rgba(6,182,212,0.3)]"
            >
              Proceed to Needle Insertion
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}