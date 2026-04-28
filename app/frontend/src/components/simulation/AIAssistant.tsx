import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Volume2,
  VolumeX,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Bot,
} from "lucide-react";

const AI_AVATAR =
  "https://mgx-backend-cdn.metadl.com/generate/images/1075756/2026-04-15/mu6hyqyaafaq/ai-assistant-avatar.png";

export interface AIMessage {
  id: string;
  text: string;
  type: "info" | "success" | "warning" | "critical" | "welcome";
  timestamp: number;
}

interface AIAssistantProps {
  messages: AIMessage[];
}

export default function AIAssistant({ messages }: AIAssistantProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getIcon = (type: AIMessage["type"]) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Bot className="w-4 h-4 text-cyan-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: AIMessage["type"]) => {
    switch (type) {
      case "critical":
        return "border-l-red-500 bg-red-500/5";
      case "warning":
        return "border-l-amber-500 bg-amber-500/5";
      case "success":
        return "border-l-emerald-500 bg-emerald-500/5";
      default:
        return "border-l-cyan-500 bg-cyan-500/5";
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0D1321] border-l border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <img
              src={AI_AVATAR}
              alt="AI Assistant"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#0D1321]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            AI Clinical Guide
          </h3>
          <p className="text-[10px] text-slate-500">Always monitoring</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 text-slate-400 hover:text-white"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
        >
          {voiceEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`border-l-2 rounded-r-lg p-3 transition-all duration-300 animate-in slide-in-from-right-2 ${getBorderColor(msg.type)}`}
            >
              <div className="flex items-start gap-2">
                {getIcon(msg.type)}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Voice indicator */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <div
            className={`w-2 h-2 rounded-full ${voiceEnabled ? "bg-green-500 animate-pulse" : "bg-slate-600"}`}
          />
          {voiceEnabled ? "Voice guidance active" : "Voice muted"}
        </div>
      </div>
    </div>
  );
}