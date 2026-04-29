import { useState } from "react";
import { ArrowDown, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { DetectionStage } from "@/components/DetectionStage";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { HowItWorks } from "@/components/HowItWorks";
import { SceneryBackground } from "@/components/SceneryBackground";
import type { Prediction } from "@/hooks/useSignDetection";

const Index = () => {
  const [committed, setCommitted] = useState<Prediction[]>([]);

  const handleCommit = (p: Prediction) => setCommitted((prev) => [...prev, p]);
  const removeLast = () => setCommitted((prev) => prev.slice(0, -1));
  const clear = () => setCommitted([]);

  return (
    <div className="relative min-h-screen">
      <SceneryBackground />
      <SiteHeader />

      <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-secondary/40 px-3 py-1 text-xs text-muted-foreground shadow-glow backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-glow opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-glow" />
            </span>
            <span className="font-medium text-foreground/90">Live AI</span>
            <span className="text-muted-foreground/60">·</span>
            <span>Sign → Text → Voice in real time</span>
            <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
          </div>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Bridging silence with <span className="text-sheen">SwarSetu</span>
            <span className="mt-2 block bg-gradient-to-r from-primary-glow via-foreground to-accent bg-clip-text text-2xl font-medium text-transparent sm:text-3xl">
              Your hands. Your voice. Instantly.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Show a hand sign to your camera. SwarSetu instantly converts it into{" "}
            <span className="text-foreground">text</span> and speaks it aloud as{" "}
            <span className="text-foreground">voice</span> — automatically.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#detect"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.04]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              Try detection <ArrowDown className="h-4 w-4 animate-bounce" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-6 py-3 text-sm font-medium backdrop-blur hover:bg-secondary"
            >
              How it works
            </a>
          </div>

          {/* Trust / stats strip */}
          <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 divide-x divide-border/60 rounded-2xl border border-border/60 bg-secondary/30 px-2 py-4 backdrop-blur">
            {[
              { v: "29+", l: "Sentences" },
              { v: "A–Z · 0–9", l: "Letters & numbers" },
              { v: "<100ms", l: "Live latency" },
            ].map((s) => (
              <div key={s.l} className="px-3 text-center">
                <div className="text-lg font-bold text-gradient sm:text-xl">{s.v}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="detect" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3">
            <DetectionStage onCommit={handleCommit} />
          </div>
          <div className="md:col-span-2">
            <TranscriptPanel
              committed={committed}
              onClear={clear}
              onRemoveLast={removeLast}
            />
          </div>
        </div>
      </section>

      <HowItWorks />

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          Built with ❤️ for accessibility · SwarSetu
        </div>
      </footer>
    </div>
  );
};

export default Index;
