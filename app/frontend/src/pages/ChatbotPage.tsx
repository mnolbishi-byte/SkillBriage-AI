import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ChatWidget from "@/components/ChatWidget";

export default function ChatbotPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  useEffect(() => {
    if (!user) login();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white flex flex-col">
      {/* Header */}
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
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
          >
            <BookOpen className="w-3 h-3 mr-1" />
            Smart Chatbot
          </Badge>
        </div>
      </header>

      {/* Chat Area — full height */}
      <div className="flex-1 min-h-0">
        <ChatWidget embedded className="h-full" />
      </div>
    </div>
  );
}