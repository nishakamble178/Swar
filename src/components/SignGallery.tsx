import handHello from "@/assets/hand-hello.jpg";
import handPeace from "@/assets/hand-peace.jpg";
import handOk from "@/assets/hand-ok.jpg";
import handThumbsUp from "@/assets/hand-thumbsup.jpg";
import handFist from "@/assets/hand-fist.jpg";
import handPoint from "@/assets/hand-point.jpg";
import handRock from "@/assets/hand-rock.jpg";
import handLove from "@/assets/hand-love.jpg";

const SIGNS: { src: string; label: string; meaning: string }[] = [
  { src: handHello, label: "Open Palm", meaning: "Hello" },
  { src: handThumbsUp, label: "Thumbs Up", meaning: "Yes" },
  { src: handPeace, label: "Peace / V", meaning: "I Am Sad" },
  { src: handOk, label: "OK", meaning: "I Understand" },
  { src: handFist, label: "Fist", meaning: "I Am Hungry" },
  { src: handLove, label: "I Love You", meaning: "I Am Happy" },
  { src: handRock, label: "Rock", meaning: "I Need Food" },
  { src: handPoint, label: "Point", meaning: "Goodbye" },
];

/**
 * Real photographs of common hand signs (sourced from Unsplash, CC0).
 * Helps users see exactly what each gesture looks like before signing it.
 */
export function SignGallery() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="mb-6 text-center">
        <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-primary-glow">
          Real reference photos
        </div>
        <h2 className="text-2xl font-bold sm:text-3xl">
          Common <span className="text-gradient">hand signs</span> SwarSetu recognizes
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Real photographs — not AI-generated. Mimic any of these in front of your camera.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {SIGNS.map((s) => (
          <figure
            key={s.label}
            className="group glass-card relative aspect-square overflow-hidden rounded-2xl border border-border/60 shadow-elevated transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
          >
            <img
              src={s.src}
              alt={`${s.label} hand sign — ${s.meaning}`}
              loading="lazy"
              width={400}
              height={400}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-accent/0 opacity-0 transition-opacity duration-300 group-hover:from-primary/20 group-hover:to-accent/20 group-hover:opacity-100 mix-blend-overlay"
            />
            <figcaption className="absolute inset-x-0 bottom-0 p-3 text-left">
              <div className="text-[10px] uppercase tracking-[0.16em] text-primary-glow">
                {s.label}
              </div>
              <div className="text-sm font-semibold text-foreground">→ {s.meaning}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
