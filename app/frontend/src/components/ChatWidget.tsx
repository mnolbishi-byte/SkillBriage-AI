import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  BookOpen,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { client } from "@/lib/api";
import {
  CHATBOT_SYSTEM_PROMPT,
  CHATBOT_WELCOME_MESSAGE,
  SUGGESTED_QUESTIONS,
} from "@/lib/chatbotKnowledge";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  /** If true, renders as an embedded panel (no floating button) */
  embedded?: boolean;
  /** Additional class for the container */
  className?: string;
}

export default function ChatWidget({ embedded = false, className = "" }: ChatWidgetProps) {
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: CHATBOT_WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Build conversation history for context (last 10 messages)
    const history = [...messages, userMsg].slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const assistantMsgId = `assistant-${Date.now()}`;
    // Add empty assistant message for streaming
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    const aiMessages = [
      { role: "system" as const, content: CHATBOT_SYSTEM_PROMPT },
      ...history,
    ];

    /** Extract a user-friendly error message from various error shapes */
    const getErrorMessage = (err: unknown): string => {
      const detail =
        (err as { data?: { detail?: string } })?.data?.detail ||
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as { message?: string })?.message ||
        "";

      if (detail.toLowerCase().includes("balance") || detail.toLowerCase().includes("top up")) {
        return "⚠️ The AI service balance is currently insufficient. Please ask the administrator to top up credits in the platform settings, then try again.";
      }
      if (detail.toLowerCase().includes("rate limit") || detail.toLowerCase().includes("too many")) {
        return "⏳ Too many requests right now. Please wait a moment and try again.";
      }
      if (detail.toLowerCase().includes("timeout")) {
        return "⏱️ The request timed out. Please try a shorter question or try again later.";
      }
      return "";
    };

    /** Update the assistant message with an error */
    const setErrorContent = (message: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: message } : m
        )
      );
      setIsStreaming(false);
    };

    try {
      // Try streaming first
      await client.ai.gentxt({
        messages: aiMessages,
        model: "deepseek-v3.2",
        stream: true,
        onChunk: (chunk: { content?: string }) => {
          if (chunk.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: m.content + chunk.content }
                  : m
              )
            );
          }
        },
        onComplete: (finalResult: { content?: string }) => {
          setMessages((prev) => {
            const assistantMsg = prev.find((m) => m.id === assistantMsgId);
            if (assistantMsg && !assistantMsg.content && finalResult?.content) {
              return prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: finalResult.content || "" }
                  : m
              );
            }
            return prev;
          });
          setIsStreaming(false);
        },
        onError: (streamErr: unknown) => {
          console.warn("[ChatWidget] Streaming error:", streamErr);
          const friendly = getErrorMessage(streamErr);
          if (friendly) {
            // Known error (e.g. balance) — don't retry, show message directly
            setErrorContent(friendly);
            return;
          }
          // Unknown stream error — fallback to non-streaming
          (async () => {
            try {
              const response = await client.ai.gentxt({
                messages: aiMessages,
                model: "deepseek-v3.2",
                stream: false,
              });
              const content =
                response?.data?.content || "I couldn't generate a response. Please try again.";
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content } : m
                )
              );
            } catch (fallbackErr) {
              console.error("[ChatWidget] Fallback also failed:", fallbackErr);
              const fallbackMsg = getErrorMessage(fallbackErr);
              setErrorContent(
                fallbackMsg ||
                  "I'm having trouble connecting right now. Please check your connection and try again in a moment."
              );
            }
            setIsStreaming(false);
          })();
        },
        timeout: 60_000,
      });
    } catch (err) {
      console.error("[ChatWidget] AI gentxt error:", err);
      const friendly = getErrorMessage(err);
      if (friendly) {
        setErrorContent(friendly);
        return;
      }
      // Fallback: try non-streaming mode
      try {
        const response = await client.ai.gentxt({
          messages: aiMessages,
          model: "deepseek-v3.2",
          stream: false,
        });
        const content =
          response?.data?.content || "I couldn't generate a response. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, content } : m
          )
        );
      } catch (fallbackErr) {
        console.error("[ChatWidget] Fallback also failed:", fallbackErr);
        const fallbackMsg = getErrorMessage(fallbackErr);
        setErrorContent(
          fallbackMsg ||
            "I'm having trouble connecting right now. Please check your connection and try again in a moment."
        );
      }
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (question: string) => {
    sendMessage(question);
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting
    return content.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return (
          <p key={i} className="font-bold text-white">
            {line.replace(/\*\*/g, "")}
          </p>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={i} className="ml-4 list-disc text-slate-300">
            {line.slice(2)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={i} className="ml-4 list-decimal text-slate-300">
            {line.replace(/^\d+\.\s/, "")}
          </li>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return (
        <p key={i} className="text-slate-300">
          {line}
        </p>
      );
    });
  };

  // Floating button + popup chat
  if (!embedded) {
    return (
      <>
        {/* Floating Chat Button */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-110 transition-transform"
            title="Chat with AI Assistant"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}

        {/* Chat Popup */}
        {open && (
          <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[600px] flex flex-col rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/10 bg-[#0F1629]">
            {renderChatContent()}
          </div>
        )}
      </>
    );
  }

  // Embedded mode — full panel
  return (
    <div className={`flex flex-col h-full bg-[#0F1629] ${className}`}>
      {renderChatContent()}
    </div>
  );

  function renderChatContent() {
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-[#0F1629] to-[#131B33] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Assistant</h3>
              <p className="text-[10px] text-slate-500">
                Powered by Blackboard Ultra
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-0 text-[9px]">
              Online
            </Badge>
            {!embedded && (
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-slate-400 hover:text-white"
                onClick={() => setOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-cyan-500/20 border border-cyan-500/30 text-white"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <div className="text-sm leading-relaxed space-y-1">
                  {formatContent(msg.content)}
                  {msg.content === "" && isStreaming && msg.role === "assistant" && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  )}
                </div>
                {msg.role === "assistant" && msg.id !== "welcome" && msg.content !== "" && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                    <BookOpen className="w-3 h-3 text-slate-600" />
                    <span className="text-[9px] text-slate-600">
                      Source: Blackboard Ultra
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions (show only when few messages) */}
        {messages.length <= 2 && !isStreaming && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider">
              Suggested Questions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestion(q)}
                  className="text-[10px] px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scroll to bottom button */}
        {messages.length > 5 && (
          <div className="flex justify-center -mt-2 mb-1 shrink-0">
            <button
              onClick={scrollToBottom}
              className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="px-4 py-3 border-t border-white/10 bg-[#0A0F1C]/50 shrink-0"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about clinical procedures..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
              disabled={isStreaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 shrink-0"
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </>
    );
  }
}