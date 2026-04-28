import { Camera, MessageSquareText, Volume2 } from "lucide-react";

const steps = [
  {
    icon: Camera,
    title: "1. Show the sign",
    desc: "Open your camera and present the hand sign clearly within the frame.",
  },
  {
    icon: MessageSquareText,
    title: "2. AI predicts",
    desc: "Our model analyzes each frame and converts the sign into text in real-time.",
  },
  {
    icon: Volume2,
    title: "3. Hear it spoken",
    desc: "Tap Speak to convert the detected sentence into natural-sounding voice.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-primary-glow">
          How SwarSetu works
        </div>
        <h2 className="text-3xl font-bold sm:text-4xl">
          From <span className="text-gradient">sign</span> to{" "}
          <span className="text-gradient">voice</span> in seconds
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.title}
            className="glass-card group rounded-2xl p-6 transition-transform hover:-translate-y-1"
          >
            <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <s.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
