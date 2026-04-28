export type EmotionState = "calm" | "neutral" | "stressed" | "anxious";

export interface EmotionSnapshot {
  state: EmotionState;
  confidence: number; // 0-100
  stress: number; // 0-100
  timestamp: number;
  stage: string;
}

export interface EmotionAnalysis {
  currentState: EmotionState;
  stress: number;
  confidence: number;
  history: EmotionSnapshot[];
}

export interface AdaptiveGuidance {
  shouldSlowDown: boolean;
  shouldSimplify: boolean;
  shouldEncourage: boolean;
  message: string;
  tone: "calm" | "encouraging" | "celebratory";
}

// Classify emotion based on stress and confidence levels
export function classifyEmotion(stress: number, confidence: number): EmotionState {
  if (stress >= 70) return "anxious";
  if (stress >= 40) return "stressed";
  if (confidence >= 60 && stress < 20) return "calm";
  return "neutral";
}

// Get emoji for emotion state
export function getEmotionEmoji(state: EmotionState): string {
  switch (state) {
    case "calm": return "😊";
    case "neutral": return "😐";
    case "stressed": return "😟";
    case "anxious": return "😰";
  }
}

// Get label for emotion state
export function getEmotionLabel(state: EmotionState): string {
  switch (state) {
    case "calm": return "Calm / Focused";
    case "neutral": return "Neutral";
    case "stressed": return "Slightly Stressed";
    case "anxious": return "Highly Anxious";
  }
}

// Get color class for emotion state
export function getEmotionColor(state: EmotionState): string {
  switch (state) {
    case "calm": return "text-emerald-400";
    case "neutral": return "text-blue-400";
    case "stressed": return "text-amber-400";
    case "anxious": return "text-red-400";
  }
}

export function getEmotionBgColor(state: EmotionState): string {
  switch (state) {
    case "calm": return "bg-emerald-500/20 border-emerald-500/30";
    case "neutral": return "bg-blue-500/20 border-blue-500/30";
    case "stressed": return "bg-amber-500/20 border-amber-500/30";
    case "anxious": return "bg-red-500/20 border-red-500/30";
  }
}

// Simulate emotion detection based on session context
// In a real system, this would use facial expression analysis from the camera feed
export function simulateEmotionDetection(
  errorCount: number,
  currentStage: string,
  elapsedSeconds: number,
  previousStress: number,
  previousConfidence: number
): { stress: number; confidence: number } {
  // Base stress increases with errors and time pressure
  const errorStress = Math.min(errorCount * 18, 60);
  const timeStress = Math.min(elapsedSeconds / 30, 20); // Gradual time pressure

  // Stage-based stress modifiers (harder stages = more stress)
  const stageStressMap: Record<string, number> = {
    preparation: 5,
    vein: 15,
    disinfection: 10,
    needle: 25,
    completion: 5,
  };
  const stageStress = stageStressMap[currentStage] || 10;

  // Add some natural variation (simulating micro-expression changes)
  const variation = (Math.random() - 0.5) * 12;

  // Calculate new stress with smoothing (don't jump too fast)
  const rawStress = Math.min(100, Math.max(0, errorStress + timeStress + stageStress + variation));
  const stress = Math.round(previousStress * 0.6 + rawStress * 0.4);

  // Confidence inversely related to stress, but also builds with successful progression
  const stageConfidenceMap: Record<string, number> = {
    preparation: 70,
    vein: 55,
    disinfection: 60,
    needle: 45,
    completion: 80,
  };
  const stageConfidence = stageConfidenceMap[currentStage] || 50;
  const errorPenalty = errorCount * 10;
  const rawConfidence = Math.min(100, Math.max(0, stageConfidence - errorPenalty + variation));
  const confidence = Math.round(previousConfidence * 0.6 + rawConfidence * 0.4);

  return {
    stress: Math.min(100, Math.max(0, stress)),
    confidence: Math.min(100, Math.max(0, confidence)),
  };
}

// Supportive messages based on emotion state
const calmMessages = [
  "Great focus! You're doing really well. 🌟",
  "Excellent concentration. Keep it up!",
  "You're in the zone. Steady hands! 💪",
  "Your confidence is showing. Well done!",
];

const neutralMessages = [
  "You're doing fine. Take your time.",
  "Nice and steady. No rush here.",
  "Good progress so far. Keep going!",
];

const stressedMessages = [
  "Take a deep breath. You've got this. 🫁",
  "It's okay to slow down. Let's go step by step.",
  "Don't worry, mistakes are part of learning.",
  "You're improving with every attempt. Keep going!",
  "Remember, even experienced nurses practice this many times.",
];

const anxiousMessages = [
  "I notice you might be feeling stressed. Take a deep breath — you're doing well. 💙",
  "Let's pause for a moment. You're safe here, and this is just practice.",
  "Don't worry, it's okay to make mistakes. Let's go step by step.",
  "You're improving. Try again slowly. There's no time pressure.",
  "Take a moment to relax your shoulders. You've got this!",
];

const positiveReinforcementMessages = [
  "Great job! Your confidence is improving! 🎉",
  "Excellent focus. Keep going! ⭐",
  "That was perfectly done! You should be proud.",
  "Wonderful technique! You're getting better every time.",
  "Impressive! You handled that like a pro. 🏆",
];

export function getAdaptiveMessage(state: EmotionState, isPositiveEvent: boolean): string {
  if (isPositiveEvent) {
    return positiveReinforcementMessages[Math.floor(Math.random() * positiveReinforcementMessages.length)];
  }

  switch (state) {
    case "calm":
      return calmMessages[Math.floor(Math.random() * calmMessages.length)];
    case "neutral":
      return neutralMessages[Math.floor(Math.random() * neutralMessages.length)];
    case "stressed":
      return stressedMessages[Math.floor(Math.random() * stressedMessages.length)];
    case "anxious":
      return anxiousMessages[Math.floor(Math.random() * anxiousMessages.length)];
  }
}

// Determine adaptive guidance based on emotion + performance correlation
export function getAdaptiveGuidance(
  state: EmotionState,
  errorCount: number,
  stress: number
): AdaptiveGuidance {
  const highStressHighErrors = stress >= 50 && errorCount >= 2;
  const moderateStress = stress >= 30 && stress < 50;

  if (highStressHighErrors) {
    return {
      shouldSlowDown: true,
      shouldSimplify: true,
      shouldEncourage: true,
      message: getAdaptiveMessage("anxious", false),
      tone: "calm",
    };
  }

  if (state === "anxious") {
    return {
      shouldSlowDown: true,
      shouldSimplify: true,
      shouldEncourage: true,
      message: getAdaptiveMessage("anxious", false),
      tone: "calm",
    };
  }

  if (state === "stressed" || moderateStress) {
    return {
      shouldSlowDown: true,
      shouldSimplify: false,
      shouldEncourage: true,
      message: getAdaptiveMessage("stressed", false),
      tone: "encouraging",
    };
  }

  return {
    shouldSlowDown: false,
    shouldSimplify: false,
    shouldEncourage: false,
    message: getAdaptiveMessage(state, false),
    tone: state === "calm" ? "celebratory" : "encouraging",
  };
}

// Generate end-of-session report data
export interface EmotionReportData {
  averageStress: number;
  averageConfidence: number;
  peakStress: number;
  peakStressStage: string;
  confidenceProgression: { stage: string; confidence: number }[];
  stressTimeline: { time: number; stress: number; stage: string }[];
  emotionDistribution: Record<EmotionState, number>;
  performanceCorrelation: {
    highStressErrors: number;
    calmSuccesses: number;
    overallTrend: "improving" | "stable" | "declining";
  };
}

export function generateEmotionReport(
  history: EmotionSnapshot[],
  errors: string[]
): EmotionReportData {
  if (history.length === 0) {
    return {
      averageStress: 0,
      averageConfidence: 100,
      peakStress: 0,
      peakStressStage: "N/A",
      confidenceProgression: [],
      stressTimeline: [],
      emotionDistribution: { calm: 100, neutral: 0, stressed: 0, anxious: 0 },
      performanceCorrelation: {
        highStressErrors: 0,
        calmSuccesses: 0,
        overallTrend: "stable",
      },
    };
  }

  const avgStress = Math.round(history.reduce((s, h) => s + h.stress, 0) / history.length);
  const avgConfidence = Math.round(history.reduce((s, h) => s + h.confidence, 0) / history.length);

  let peakStress = 0;
  let peakStressStage = "";
  for (const h of history) {
    if (h.stress > peakStress) {
      peakStress = h.stress;
      peakStressStage = h.stage;
    }
  }

  // Confidence progression by stage
  const stageOrder = ["preparation", "vein", "disinfection", "needle", "completion"];
  const confidenceProgression = stageOrder
    .map((stage) => {
      const stageSnapshots = history.filter((h) => h.stage === stage);
      if (stageSnapshots.length === 0) return null;
      const avgConf = Math.round(stageSnapshots.reduce((s, h) => s + h.confidence, 0) / stageSnapshots.length);
      return { stage, confidence: avgConf };
    })
    .filter(Boolean) as { stage: string; confidence: number }[];

  // Stress timeline
  const startTime = history[0].timestamp;
  const stressTimeline = history.map((h) => ({
    time: Math.round((h.timestamp - startTime) / 1000),
    stress: h.stress,
    stage: h.stage,
  }));

  // Emotion distribution
  const distribution: Record<EmotionState, number> = { calm: 0, neutral: 0, stressed: 0, anxious: 0 };
  for (const h of history) {
    distribution[h.state]++;
  }
  const total = history.length;
  for (const key of Object.keys(distribution) as EmotionState[]) {
    distribution[key] = Math.round((distribution[key] / total) * 100);
  }

  // Performance correlation
  const highStressSnapshots = history.filter((h) => h.stress >= 50);
  const calmSnapshots = history.filter((h) => h.state === "calm");

  // Determine trend from first half vs second half confidence
  const midpoint = Math.floor(history.length / 2);
  const firstHalfConf = history.slice(0, midpoint).reduce((s, h) => s + h.confidence, 0) / Math.max(midpoint, 1);
  const secondHalfConf = history.slice(midpoint).reduce((s, h) => s + h.confidence, 0) / Math.max(history.length - midpoint, 1);
  const trend = secondHalfConf > firstHalfConf + 5 ? "improving" : secondHalfConf < firstHalfConf - 5 ? "declining" : "stable";

  return {
    averageStress: avgStress,
    averageConfidence: avgConfidence,
    peakStress,
    peakStressStage,
    confidenceProgression,
    stressTimeline,
    emotionDistribution: distribution,
    performanceCorrelation: {
      highStressErrors: Math.min(errors.length, highStressSnapshots.length),
      calmSuccesses: calmSnapshots.length,
      overallTrend: trend,
    },
  };
}