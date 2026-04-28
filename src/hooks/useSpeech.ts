import { useCallback, useEffect, useState } from "react";

export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (
      text: string,
      opts?: {
        rate?: number;
        pitch?: number;
        lang?: string;
        voiceURI?: string;
        queue?: boolean;
      },
    ) => {
      if (!supported || !text.trim()) return;
      if (!opts?.queue) window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = opts?.rate ?? 1;
      utter.pitch = opts?.pitch ?? 1;
      utter.lang = opts?.lang ?? "en-US";
      let chosen: SpeechSynthesisVoice | undefined;
      if (opts?.voiceURI) {
        chosen = voices.find((v) => v.voiceURI === opts.voiceURI);
      }
      if (!chosen && opts?.lang) {
        chosen =
          voices.find((v) => v.lang === opts.lang) ??
          voices.find((v) => v.lang.startsWith(opts.lang!.split("-")[0]));
      }
      if (!chosen) chosen = voices[0];
      if (chosen) utter.voice = chosen;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [supported, voices],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { supported, speaking, speak, cancel, voices };
}
