import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { type EmotionState, getEmotionColor } from "@/lib/emotionEngine";

interface AdaptiveMessageProps {
  message: string;
  emotionState: EmotionState;
  tone: "calm" | "encouraging" | "celebratory";
  visible: boolean;
}

export default function AdaptiveMessage({
  message,
  emotionState,
  tone,
  visible,
}: AdaptiveMessageProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible && message) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [visible, message]);

  if (!show || !message) return null;

  const toneStyles = {
    calm: "from-blue-500/20 to-purple-500/20 border-blue-500/30",
    encouraging: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    celebratory: "from-emerald-500/20 to-cyan-500/20 border-emerald-500/30",
  };

  return (
    <div className="absolute top-20 left-4 right-4 z-20 pointer-events-none">
      <div
        className={`bg-gradient-to-r ${toneStyles[tone]} border backdrop-blur-md rounded-xl px-4 py-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500`}
      >
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
          <Heart className={`w-4 h-4 ${getEmotionColor(emotionState)}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-400 font-medium mb-0.5">Emotional Support AI</p>
          <p className="text-xs text-white leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}