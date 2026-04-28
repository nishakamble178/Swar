import heroBg from "@/assets/hero-bg.jpg";
import nebula from "@/assets/nebula.jpg";
import waveRibbon from "@/assets/wave-ribbon.png";
import glassHand from "@/assets/glass-hand.png";
import orbWave from "@/assets/orb-wave.png";

/**
 * Full-bleed cinematic background:
 *  - Nebula sky behind everything
 *  - Two-hands hero image dominating the upper viewport with slow Ken-Burns drift
 *  - Wave ribbon flowing along the bottom
 *  - Floating glass hand + orb as side accents
 *  - Aurora blobs + subtle grid for depth
 *
 * Decorative only — aria-hidden, pointer-events-none, behind content.
 */
export function SceneryBackground() {
  return (
    <>
      {/* 1. Nebula sky — covers full viewport */}
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
        <div className="absolute inset-0 bg-background/30 dark:bg-background/35" />
      </div>

      {/* 2. Hero "hands reaching" image — large, dominates the top, slowly drifts */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-20 h-[100vh] overflow-hidden"
      >
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1080}
          className="animate-bg-drift h-full w-full object-cover opacity-85 dark:opacity-95 [mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_70%,transparent_100%)]"
        />
        {/* Subtle vignette to focus the eye */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,oklch(0.16_0.03_270/0.55)_85%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,oklch(0.10_0.03_270/0.7)_85%)]" />
      </div>

      {/* 3. Wave ribbon along the bottom */}
      <img
        aria-hidden
        src={waveRibbon}
        alt=""
        width={1536}
        height={1024}
        loading="lazy"
        className="pointer-events-none fixed inset-x-0 bottom-0 -z-20 h-auto w-full select-none opacity-30 mix-blend-screen dark:opacity-45"
      />

      {/* 4. Animated aurora blobs + grid */}
      <div className="aurora-bg" aria-hidden>
        <span />
      </div>
      <div className="grid-overlay" aria-hidden />

      {/* 5. Side accents (desktop only) */}
      <img
        aria-hidden
        src={glassHand}
        alt=""
        width={1024}
        height={1024}
        loading="lazy"
        className="pointer-events-none fixed -right-40 top-[55vh] -z-10 hidden h-[55vh] w-auto select-none opacity-25 mix-blend-screen animate-float lg:block dark:opacity-35"
      />
      <img
        aria-hidden
        src={orbWave}
        alt=""
        width={1024}
        height={1024}
        loading="lazy"
        className="pointer-events-none fixed -left-32 top-[35vh] -z-10 hidden h-[45vh] w-auto select-none opacity-25 mix-blend-screen lg:block dark:opacity-35"
      />
    </>
  );
}
