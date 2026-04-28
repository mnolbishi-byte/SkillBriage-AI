# Smart Emotional Support Mode - Development Plan

## Overview
Add emotion detection, adaptive AI responses, and end-of-session emotional report to the AR Camera Mode.

## Files to Create/Modify (max 8)

1. **src/lib/emotionEngine.ts** — Emotion detection engine (simulated via camera analysis intervals), emotion state types, adaptive message generator, performance-emotion correlation logic
2. **src/components/EmotionIndicator.tsx** — Real-time emotion indicator UI (😊😐😟) + toggle switch for "Enable Emotional Support"
3. **src/components/EmotionReport.tsx** — End-of-session emotional report with stress levels, confidence progression, performance correlation chart
4. **src/components/AdaptiveMessage.tsx** — Supportive AI message overlay that shows adaptive motivational messages based on emotional state
5. **src/pages/ARCameraPage.tsx** — Integrate emotion engine, indicator, adaptive messages, and report into existing AR flow

## Implementation Details

### emotionEngine.ts
- Types: EmotionState ('calm' | 'neutral' | 'stressed' | 'anxious'), EmotionLevel (0-100)
- Simulated detection: Uses timer-based analysis that factors in error count, stage progression, and time pressure
- Adaptive messages: Maps emotion + context to supportive messages
- Performance-emotion correlation: Links errors with emotional state to determine guidance adjustments (slow down, step-by-step, reduce load)
- Emotion history tracking for the report

### EmotionIndicator.tsx
- Small floating indicator with emoji (😊/😐/😟) and color-coded badge
- Toggle switch "Enable Emotional Support"
- Positioned in the camera view area

### AdaptiveMessage.tsx
- Motivational message overlay that appears when emotion changes or errors occur
- Always supportive, never critical
- Auto-dismisses after a few seconds

### EmotionReport.tsx
- Stress timeline visualization (simple bar chart)
- Confidence progression over time
- Correlation with performance metrics (errors vs stress)
- Integrated into the assessment stage

### ARCameraPage.tsx modifications
- Add emotion state management
- Wire up emotion engine on camera activation
- Show EmotionIndicator in camera view
- Show AdaptiveMessage when triggered
- Add EmotionReport section to assessment stage
- Pass emotion data to report saving