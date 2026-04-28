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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-glow opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-glow" />
            </span>
            Real-time AI · Auto voice output
            <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Bridging silence with <span className="text-sheen">SwarSetu</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Show a hand sign to your camera. SwarSetu instantly converts it into{" "}
            <span className="text-foreground">text</span> and speaks it aloud as{" "}
            <span className="text-foreground">voice</span> — automatically.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <a
              href="#detect"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
            >
              Try detection <ArrowDown className="h-4 w-4" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-5 py-2.5 text-sm font-medium hover:bg-secondary"
            >
              How it works
            </a>
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
