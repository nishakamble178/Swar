import nebula from "@/assets/nebula.jpg";
import waveRibbon from "@/assets/wave-ribbon.png";
import handHello from "@/assets/hand-hello.jpg";
import handPeace from "@/assets/hand-peace.jpg";
import handOk from "@/assets/hand-ok.jpg";
import handThumbsUp from "@/assets/hand-thumbsup.jpg";

/**
 * Cinematic background built from REAL hand-sign photographs (not AI-generated)
 * arranged at the edges of the viewport, blended into the brand palette.
 *
 * Layers (back to front):
 *  1. Nebula sky (full-bleed)
 *  2. Aurora blobs + grid
 *  3. Four real hand photos at corners (edge-faded, brand-tinted)
 *  4. Wave ribbon along bottom
 *
 * All decorative — aria-hidden, pointer-events-none, behind content.
 */

const cornerMask =
  "[mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]";

export function SceneryBackground() {
  return (
    <>
      {/* 1. Nebula sky */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-30 overflow-hidden"
      >
        <img
          src={nebula}
          alt=""
          width={1920}
          height={1280}
          className="h-full w-full object-cover opacity-90 dark:opacity-100"
        />
        <div className="absolute inset-0 bg-background/40 dark:bg-background/45" />
      </div>

      {/* 2. Aurora blobs + grid */}
      <div className="aurora-bg" aria-hidden>
        <span />
      </div>
      <div className="grid-overlay" aria-hidden />

      {/* 3. Real hand-sign photographs at the corners */}
      {/* Top-left — Hello / open palm (hidden on mobile) */}
      <img
        aria-hidden
        src={handHello}
        alt=""
        width={1200}
        height={1200}
        loading="lazy"
        className={`pointer-events-none fixed -left-24 top-16 -z-10 hidden h-[42vh] w-[42vh] select-none rounded-full object-cover opacity-25 mix-blend-luminosity animate-float md:block dark:opacity-40 ${cornerMask}`}
      />

      {/* Top-right — Peace / V (visible on all sizes) */}
      <img
        aria-hidden
        src={handPeace}
        alt=""
        width={1200}
        height={1200}
        loading="lazy"
        className={`pointer-events-none fixed -right-20 top-24 -z-10 h-[34vh] w-[34vh] select-none rounded-full object-cover opacity-25 mix-blend-luminosity dark:opacity-40 sm:h-[40vh] sm:w-[40vh] ${cornerMask}`}
      />

      {/* Bottom-left — OK sign (visible on all sizes) */}
      <img
        aria-hidden
        src={handOk}
        alt=""
        width={1200}
        height={1200}
        loading="lazy"
        className={`pointer-events-none fixed -left-20 bottom-24 -z-10 h-[34vh] w-[34vh] select-none rounded-full object-cover opacity-25 mix-blend-luminosity animate-float dark:opacity-40 sm:h-[42vh] sm:w-[42vh] ${cornerMask}`}
        style={{ animationDelay: "1.5s" }}
      />

      {/* Bottom-right — Thumbs up (hidden on mobile) */}
      <img
        aria-hidden
        src={handThumbsUp}
        alt=""
        width={1200}
        height={1200}
        loading="lazy"
        className={`pointer-events-none fixed -right-24 bottom-16 -z-10 hidden h-[42vh] w-[42vh] select-none rounded-full object-cover opacity-25 mix-blend-luminosity md:block dark:opacity-40 ${cornerMask}`}
      />

      {/* Brand color wash over the photos so they harmonize with the palette */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.15),transparent_55%)]"
      />

      {/* 4. Wave ribbon along the bottom */}
      <img
        aria-hidden
        src={waveRibbon}
        alt=""
        width={1536}
        height={1024}
        loading="lazy"
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-20 h-auto w-full select-none opacity-25 mix-blend-screen dark:opacity-40"
      />
    </>
  );
}
