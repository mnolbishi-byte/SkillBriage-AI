import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Camera,
  Headphones,
  Activity,
  Zap,
  BookOpen,
  ChevronRight,
  Sparkles,
  History,
  LogIn,
  LogOut,
  User,
  MessageCircle,
} from "lucide-react";
import ChatWidget from "@/components/ChatWidget";
import { useAuth } from "@/contexts/AuthContext";

const HERO_IMG =
  "https://mgx-backend-cdn.metadl.com/generate/images/1075756/2026-04-15/mu6h5fqaae7a/hero-virtual-lab.png";
const AI_AVATAR =
  "https://mgx-backend-cdn.metadl.com/generate/images/1075756/2026-04-15/mu6hyqyaafaq/ai-assistant-avatar.png";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading, login, logout } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [typedText, setTypedText] = useState("");
  const fullText =
    "Welcome to SkillBridge AI. Your intelligent clinical skills training platform integrated with Blackboard Ultra.";

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [loaded]);

  const handleEnterLab = () => {
    if (!user) {
      login();
      return;
    }
    navigate("/simulation");
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              opacity: 0.3 + Math.random() * 0.5,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/10 backdrop-blur-md bg-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-8 h-8 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              SkillBridge <span className="text-cyan-400">AI</span>
            </h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">
              Virtual Clinical Lab
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10"
          >
            <Zap className="w-3 h-3 mr-1" />
            Blackboard Ultra Connected
          </Badge>

          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white gap-2"
              onClick={() => navigate("/history")}
            >
              <History className="w-4 h-4" />
              <span className="hidden md:inline">My History</span>
            </Button>
          )}

          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white gap-2"
              onClick={() => navigate("/faculty")}
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Faculty</span>
            </Button>
          )}

          {loading ? (
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          ) : user ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
              onClick={logout}
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-cyan-400 hover:text-white gap-2"
              onClick={login}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
          >
            <Headphones className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center px-8 py-12 min-h-[calc(100vh-80px)]">
        {/* Hero Section */}
        <div
          className={`transition-all duration-1000 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* AI Avatar + Welcome */}
          <div className="flex flex-col items-center mb-10">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-cyan-400/50 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                <img
                  src={AI_AVATAR}
                  alt="AI Assistant"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-[#0A0F1C] flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
              Virtual Clinical Lab
            </h2>
            <p className="text-slate-400 text-center max-w-xl min-h-[3rem] text-lg">
              {typedText}
              <span className="animate-pulse text-cyan-400">|</span>
            </p>
          </div>

          {/* Hero Image */}
          <div className="relative mb-12 max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/10">
              <img
                src={HERO_IMG}
                alt="Virtual Clinical Lab"
                className="w-full h-64 md:h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-transparent to-transparent" />
            </div>
          </div>

          {/* Entry Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {/* 3D Virtual Lab Card */}
            <Card
              className="group relative bg-white/5 border-white/10 backdrop-blur-md p-8 cursor-pointer hover:border-cyan-400/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] transition-all duration-500 hover:-translate-y-1"
              onClick={handleEnterLab}
            >
              <div className="absolute top-4 right-4">
                <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-[10px]">
                  RECOMMENDED
                </Badge>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Monitor className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">
                Enter 3D Virtual Lab
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Full immersive simulation environment with AI-guided
                venipuncture procedure, real-time feedback, and smart
                assessment.
              </p>
              <div className="flex items-center text-cyan-400 text-sm font-medium group-hover:gap-3 gap-2 transition-all">
                {user ? "Start Simulation" : "Sign In to Start"}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>

            {/* AR Camera Mode Card */}
            <Card
              className="group relative bg-white/5 border-white/10 backdrop-blur-md p-8 cursor-pointer hover:border-blue-400/50 hover:shadow-[0_0_40px_rgba(59,130,246,0.15)] transition-all duration-500 hover:-translate-y-1"
              onClick={() => {
                if (!user) {
                  login();
                  return;
                }
                navigate("/ar-camera");
              }}
            >
              <div className="absolute top-4 right-4">
                <Badge
                  className="bg-blue-500/20 text-blue-400 border-0 text-[10px]"
                >
                  AR MODE
                </Badge>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Camera className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">
                Start AR Camera Mode
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Real-world training using your device camera with AR overlays
                for guided practice on physical equipment.
              </p>
              <div className="flex items-center text-blue-400 text-sm font-medium group-hover:gap-3 gap-2 transition-all">
                {user ? "Start AR Training" : "Sign In to Start"}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>

            {/* Smart Chatbot Card */}
            <Card
              className="group relative bg-white/5 border-white/10 backdrop-blur-md p-8 cursor-pointer hover:border-emerald-400/50 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] transition-all duration-500 hover:-translate-y-1"
              onClick={() => {
                if (!user) {
                  login();
                  return;
                }
                navigate("/chatbot");
              }}
            >
              <div className="absolute top-4 right-4">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-[10px]">
                  AI CHAT
                </Badge>
              </div>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">
                Smart AI Chatbot
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Get real-time guidance, ask questions about clinical procedures,
                and receive instant support during your training sessions.
              </p>
              <div className="flex items-center text-emerald-400 text-sm font-medium group-hover:gap-3 gap-2 transition-all">
                {user ? "Start Chatting" : "Sign In to Chat"}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </div>

          {/* Features Row */}
          <div className="flex flex-wrap justify-center gap-6 max-w-3xl mx-auto">
            {[
              {
                icon: BookOpen,
                label: "Auto-extracted from Blackboard",
                color: "text-blue-400",
              },
              {
                icon: Activity,
                label: "Real-time AI Feedback",
                color: "text-cyan-400",
              },
              {
                icon: Zap,
                label: "Smart Assessment Engine",
                color: "text-yellow-400",
              },
              {
                icon: History,
                label: "Track Your Progress",
                color: "text-emerald-400",
              },
            ].map((feature) => (
              <div
                key={feature.label}
                className="flex items-center gap-2 text-sm text-slate-400"
              >
                <feature.icon className={`w-4 h-4 ${feature.color}`} />
                {feature.label}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Chat Widget */}
      {user && <ChatWidget />}
    </div>
  );
}