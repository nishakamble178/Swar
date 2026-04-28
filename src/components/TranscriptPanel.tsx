import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Delete,
  Eraser,
  Gauge,
  Languages,
  MessageSquareQuote,
  Music2,
  Settings2,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Prediction } from "@/hooks/useSignDetection";
import { useSpeech } from "@/hooks/useSpeech";

interface TranscriptPanelProps {
  committed: Prediction[];
  onClear: () => void;
  onRemoveLast: () => void;
}

// Reference of the gestures the detector maps to full sentences.
// These match the SENTENCE_GESTURE_MAP in src/lib/signClassifier.ts so the
// list users see is exactly what they can sign to trigger each phrase.
const SENTENCE_GUIDE: { gesture: string; sentence: string }[] = [
  { gesture: "✋ Open Palm", sentence: "Hello" },
  { gesture: "🤙 Call Me", sentence: "Can you help me?" },
  { gesture: "👍 Thumbs Up", sentence: "Yes" },
  { gesture: "👎 Thumbs Down", sentence: "No" },
  { gesture: "✌️ Peace", sentence: "I am sad" },
  { gesture: "🤟 I Love You", sentence: "I am happy" },
  { gesture: "✊ Fist", sentence: "I am hungry" },
  { gesture: "🤘 Rock", sentence: "I need food" },
  { gesture: "👌 OK", sentence: "Where is hospital?" },
  { gesture: "👉 Point", sentence: "Goodbye" },
  { gesture: "🤞 Fingers Crossed", sentence: "Help!" },
  { gesture: "Sign letter H", sentence: "How are you?" },
  { gesture: "Sign letter F", sentence: "I am fine" },
  { gesture: "Sign letter P", sentence: "Please" },
  { gesture: "Sign letter S", sentence: "Sorry" },
  { gesture: "Sign letter Q", sentence: "I don't understand" },
  { gesture: "Sign letter T", sentence: "I am thirsty" },
  { gesture: "Sign letter W", sentence: "I need water" },
];

// Curated list of common languages. We'll filter to the ones the browser supports.
const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-IN", label: "English (India)" },
  { code: "hi-IN", label: "Hindi (हिन्दी)" },
  { code: "bn-IN", label: "Bengali (বাংলা)" },
  { code: "ta-IN", label: "Tamil (தமிழ்)" },
  { code: "te-IN", label: "Telugu (తెలుగు)" },
  { code: "mr-IN", label: "Marathi (मराठी)" },
  { code: "gu-IN", label: "Gujarati (ગુજરાતી)" },
  { code: "kn-IN", label: "Kannada (ಕನ್ನಡ)" },
  { code: "ml-IN", label: "Malayalam (മലയാളം)" },
  { code: "pa-IN", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "ur-PK", label: "Urdu (اردو)" },
  { code: "es-ES", label: "Spanish (España)" },
  { code: "es-MX", label: "Spanish (México)" },
  { code: "fr-FR", label: "French (Français)" },
  { code: "de-DE", label: "German (Deutsch)" },
  { code: "it-IT", label: "Italian (Italiano)" },
  { code: "pt-BR", label: "Portuguese (Brasil)" },
  { code: "ru-RU", label: "Russian (Русский)" },
  { code: "ja-JP", label: "Japanese (日本語)" },
  { code: "ko-KR", label: "Korean (한국어)" },
  { code: "zh-CN", label: "Chinese (简体)" },
  { code: "ar-SA", label: "Arabic (العربية)" },
];

export function TranscriptPanel({ committed, onClear, onRemoveLast }: TranscriptPanelProps) {
  const sentence = useMemo(() => committed.map((p) => p.label).join(" "), [committed]);
  const speech = useSpeech();
  const [copied, setCopied] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [lang, setLang] = useState<string>("en-US");
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const lastSpokenIndexRef = useRef(0);

  // Languages actually available in the browser, filtered against our curated list.
  const availableLangs = useMemo(() => {
    if (!speech.voices.length) return LANGUAGE_OPTIONS;
    const supportedSet = new Set(speech.voices.map((v) => v.lang));
    const supportedPrefixes = new Set(speech.voices.map((v) => v.lang.split("-")[0]));
    const filtered = LANGUAGE_OPTIONS.filter(
      (l) => supportedSet.has(l.code) || supportedPrefixes.has(l.code.split("-")[0]),
    );
    return filtered.length ? filtered : LANGUAGE_OPTIONS;
  }, [speech.voices]);

  // Voices for the currently selected language (exact match first, then prefix).
  const voicesForLang = useMemo(() => {
    const prefix = lang.split("-")[0];
    const exact = speech.voices.filter((v) => v.lang === lang);
    if (exact.length) return exact;
    return speech.voices.filter((v) => v.lang.startsWith(prefix));
  }, [speech.voices, lang]);

  // Reset/auto-pick a voice whenever language changes or voice list loads.
  useEffect(() => {
    if (!voicesForLang.length) {
      setVoiceURI("");
      return;
    }
    if (!voicesForLang.find((v) => v.voiceURI === voiceURI)) {
      setVoiceURI(voicesForLang[0].voiceURI);
    }
  }, [voicesForLang, voiceURI]);

  // Auto-speak each newly committed word as it arrives, using current settings.
  useEffect(() => {
    if (!autoSpeak || !speech.supported) {
      lastSpokenIndexRef.current = committed.length;
      return;
    }
    if (committed.length > lastSpokenIndexRef.current) {
      const newWords = committed
        .slice(lastSpokenIndexRef.current)
        .map((p) => p.label)
        .join(" ");
      speech.speak(newWords, { queue: true, lang, voiceURI, rate, pitch });
      lastSpokenIndexRef.current = committed.length;
    } else if (committed.length < lastSpokenIndexRef.current) {
      lastSpokenIndexRef.current = committed.length;
    }
  }, [committed, autoSpeak, speech, lang, voiceURI, rate, pitch]);

  const speakAll = () => speech.speak(sentence, { lang, voiceURI, rate, pitch });
  const previewVoice = () =>
    speech.speak("Hello, this is a voice preview.", { lang, voiceURI, rate, pitch });

  const copy = async () => {
    if (!sentence) return;
    try {
      await navigator.clipboard.writeText(sentence);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div className="glass-card gradient-border flex h-full flex-col overflow-hidden rounded-3xl shadow-elevated">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Transcript
          </div>
          <div className="text-base font-semibold">Detected sentence</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAutoSpeak((v) => !v)}
            title={autoSpeak ? "Auto-speak: ON" : "Auto-speak: OFF"}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium transition-colors ${
              autoSpeak
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Auto
          </button>
          <button
            onClick={() => setShowSettings((v) => !v)}
            title="Voice settings"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-border transition-colors ${
              showSettings
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            onClick={onRemoveLast}
            disabled={!committed.length}
            title="Remove last word"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            <Delete className="h-4 w-4" />
          </button>
          <button
            onClick={onClear}
            disabled={!committed.length}
            title="Clear all"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="animate-pop-in space-y-4 border-b border-border bg-background/40 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Languages className="h-3.5 w-3.5" /> Language
              </div>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {availableLangs.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <Volume2 className="h-3.5 w-3.5" /> Voice
              </div>
              <select
                value={voiceURI}
                onChange={(e) => setVoiceURI(e.target.value)}
                disabled={!voicesForLang.length}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              >
                {voicesForLang.length ? (
                  voicesForLang.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                ) : (
                  <option value="">Default voice</option>
                )}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> Rate
                </span>
                <span className="font-mono text-foreground/80">{rate.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full accent-[hsl(var(--primary))]"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Music2 className="h-3.5 w-3.5" /> Pitch
                </span>
                <span className="font-mono text-foreground/80">{pitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full accent-[hsl(var(--primary))]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={previewVoice}
              disabled={!speech.supported}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-40"
            >
              <Volume2 className="h-3.5 w-3.5" /> Preview voice
            </button>
            <button
              onClick={() => {
                setRate(1);
                setPitch(1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="relative flex-1 p-5">
        {sentence ? (
          <div className="flex flex-wrap gap-2">
            {committed.map((p, i) => (
              <span
                key={`${p.label}-${i}`}
                className="animate-pop-in rounded-full border border-border bg-secondary/60 px-3 py-1 text-sm font-medium"
              >
                {p.label}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center">
            <div className="mb-2 text-sm text-muted-foreground">No signs detected yet.</div>
            <div className="text-xs text-muted-foreground/70">
              Show a sign to the camera and hold it briefly to add it here.
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border bg-background/20 px-5 py-4">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <MessageSquareQuote className="h-3 w-3" /> Sign these to detect a sentence
        </div>
        <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
          {SENTENCE_GUIDE.map((g) => (
            <div
              key={g.sentence}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/30 px-2.5 py-1.5"
            >
              <span className="truncate text-xs text-muted-foreground">{g.gesture}</span>
              <span className="shrink-0 text-xs font-medium text-foreground">→ {g.sentence}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border bg-background/30 px-5 py-4">
        <div className="mb-3 rounded-xl border border-border bg-background/40 p-3 text-sm text-foreground/90">
          {sentence || (
            <span className="text-muted-foreground">Your sentence will appear here…</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={speakAll}
            disabled={!sentence || !speech.supported}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <Volume2 className="h-4 w-4" />
            {speech.speaking ? "Speaking…" : "Speak all"}
          </button>
          {speech.speaking && (
            <button
              onClick={speech.cancel}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
          <button
            onClick={copy}
            disabled={!sentence}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-40"
          >
            <Copy className="h-4 w-4" /> {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {!speech.supported && (
          <p className="mt-2 text-xs text-muted-foreground">
            Voice output isn&apos;t supported in this browser.
          </p>
        )}
      </div>
    </div>
  );
}
