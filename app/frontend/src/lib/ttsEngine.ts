/**
 * Text-to-Speech engine using the browser's built-in Web Speech API (SpeechSynthesis).
 * Provides a calm, moderate-speed voice suitable for clinical training guidance.
 */

let selectedVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

/** Try to pick a calm, natural English voice */
function pickVoice(): SpeechSynthesisVoice | null {
  if (selectedVoice) return selectedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Prefer these voice names (common high-quality English voices)
  const preferred = [
    "Google UK English Female",
    "Google US English",
    "Samantha",
    "Karen",
    "Microsoft Zira",
    "Microsoft Jenny",
    "Fiona",
    "Moira",
  ];

  for (const name of preferred) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) {
      selectedVoice = match;
      return match;
    }
  }

  // Fallback: first English voice
  const englishVoice = voices.find((v) => v.lang.startsWith("en"));
  if (englishVoice) {
    selectedVoice = englishVoice;
    return englishVoice;
  }

  // Last resort: first available voice
  selectedVoice = voices[0];
  return voices[0];
}

/** Initialize voice loading — call once on mount */
export function initTTS(): void {
  if (voicesLoaded) return;

  // Voices may load asynchronously
  if (window.speechSynthesis.getVoices().length > 0) {
    pickVoice();
    voicesLoaded = true;
  } else {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      pickVoice();
      voicesLoaded = true;
    }, { once: true });
  }
}

/** Strip emoji and special characters for cleaner speech */
function cleanTextForSpeech(text: string): string {
  // Remove surrogate pairs (most emoji) and common symbol ranges
  let cleaned = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Skip high surrogates and their low surrogate pairs (emoji in surrogate pair range)
    if (code >= 0xd800 && code <= 0xdbff) {
      i++; // skip the low surrogate too
      continue;
    }
    // Skip lone low surrogates
    if (code >= 0xdc00 && code <= 0xdfff) continue;
    // Skip misc symbols & dingbats (U+2600-U+27BF)
    if (code >= 0x2600 && code <= 0x27bf) continue;
    // Skip variation selectors (U+FE00-U+FE0F)
    if (code >= 0xfe00 && code <= 0xfe0f) continue;
    // Skip combining enclosing keycap (U+20E3)
    if (code === 0x20e3) continue;
    // Skip zero-width joiner (U+200D)
    if (code === 0x200d) continue;
    cleaned += text[i];
  }
  return cleaned.replace(/\s+/g, " ").trim();
}

/** Speak text aloud. Cancels any currently speaking utterance first. */
export function speak(text: string): void {
  if (!window.speechSynthesis) return;

  // Cancel any ongoing speech to avoid overlap
  window.speechSynthesis.cancel();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return;

  const utterance = new SpeechSynthesisUtterance(cleaned);

  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
  }

  // Calm, moderate settings for supportive clinical guidance
  utterance.rate = 0.9; // Slightly slower than normal
  utterance.pitch = 1.0; // Natural pitch
  utterance.volume = 0.85; // Comfortable volume for headphones

  window.speechSynthesis.speak(utterance);
}

/** Stop any current speech immediately */
export function stopSpeaking(): void {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/** Check if TTS is supported in this browser */
export function isTTSSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}