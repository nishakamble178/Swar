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

      <div className="grid gap-5 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="glass-card gradient-border group relative overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-primary opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-30"
            />
            <div className="absolute right-5 top-5 text-5xl font-black leading-none text-foreground/5 transition-colors group-hover:text-primary/15">
              0{i + 1}
            </div>
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <s.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        ))}
      </div>
    </section>
  );
}
