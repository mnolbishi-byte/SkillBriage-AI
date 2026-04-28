import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, ShieldCheck, ShieldX, X } from "lucide-react";
import { client } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface TrackingConsentProps {
  onClose: () => void;
}

export default function TrackingConsent({ onClose }: TrackingConsentProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [choice, setChoice] = useState<boolean | null>(null);

  const handleChoice = async (allow: boolean) => {
    if (!user) return;
    setSubmitting(true);
    setChoice(allow);
    try {
      // Check if consent already exists
      const existing = await client.entities.student_consent.query({
        query: {},
        limit: 1,
      });
      if (existing?.data?.items?.length > 0) {
        // Update existing
        await client.entities.student_consent.update({
          id: existing.data.items[0].id,
          data: {
            allow_tracking: allow,
            student_name: user.name || user.email || "Student",
            student_email: user.email || "",
          },
        });
      } else {
        // Create new
        await client.entities.student_consent.create({
          data: {
            allow_tracking: allow,
            student_name: user.name || user.email || "Student",
            student_email: user.email || "",
            created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
          },
        });
      }
      setDone(true);
      setTimeout(onClose, 1500);
    } catch {
      // silently fail
      setDone(true);
      setTimeout(onClose, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
        <Card className="bg-[#0F1629] border-white/10 p-8 max-w-md w-full mx-4 text-center">
          {choice ? (
            <>
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Tracking Enabled</h3>
              <p className="text-slate-400 text-sm">
                Your instructor can now monitor your progress and provide personalized guidance.
              </p>
            </>
          ) : (
            <>
              <ShieldX className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Tracking Declined</h3>
              <p className="text-slate-400 text-sm">
                Your simulation data will remain private. You can change this anytime.
              </p>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
      <Card className="bg-[#0F1629] border-white/10 p-8 max-w-md w-full mx-4 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 text-slate-500 hover:text-white w-7 h-7"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-center mb-6">
          <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">
            Faculty Tracking Mode
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Do you allow your instructor to track your performance and help you
            improve your clinical skills?
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-slate-400">If you allow tracking, your instructor will be able to:</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              <li>• View your simulation scores and progress</li>
              <li>• See error patterns and skill gaps</li>
              <li>• Provide targeted feedback and recommendations</li>
              <li>• Schedule in-person training if needed</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => handleChoice(false)}
            disabled={submitting}
            variant="outline"
            className="flex-1 h-11 rounded-xl text-sm border-white/20 text-slate-300 bg-transparent hover:bg-white/5 gap-2"
          >
            <ShieldX className="w-4 h-4" />
            Decline
          </Button>
          <Button
            onClick={() => handleChoice(true)}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl text-sm bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? "Saving..." : "Allow Tracking"}
          </Button>
        </div>
      </Card>
    </div>
  );
}