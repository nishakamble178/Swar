# Add Real Hand-Sign Photos to the Background

## Goal
Replace the current AI-generated abstract visuals with **real photographs of hand signs** (sign language gestures) layered into the background, so the landing page feels authentic, human, and on-theme with SwarSetu's mission.

## What the user will see
- A subtle collage of real hand-sign photos floating in the background corners and edges (not centered, so they never block the camera or transcript).
- Photos are softly faded, slightly blurred at the edges, and tinted with the brand purple/blue gradient so they blend with the existing nebula/aurora look instead of feeling like stock photos pasted on top.
- Gentle float / drift animation on 1–2 of them for life.
- Fully responsive — on mobile only 1–2 photos show; on desktop up to 4 are visible at the edges.

## Source of the photos
We will use **real, free-to-use hand / sign-language photographs from Unsplash** (CC0-style license, no attribution required). Candidates:
- Open palm / "Hello" wave
- Thumbs up
- Peace sign / V
- OK sign
- Pointing hand
- Two hands signing

These will be downloaded into `src/assets/` as real `.jpg` files (e.g. `hand-hello.jpg`, `hand-peace.jpg`, `hand-ok.jpg`, `hand-thumbsup.jpg`) so they're bundled with the app and load instantly.

If a particular Unsplash fetch fails, we fall back to a different real photo from the same source — never AI-generated.

## Implementation

### 1. Download real photos
Fetch 4 real hand-sign photographs from Unsplash and save them to `src/assets/`:
- `hand-hello.jpg`
- `hand-peace.jpg`
- `hand-ok.jpg`
- `hand-thumbsup.jpg`

### 2. Update `src/components/SceneryBackground.tsx`
- Keep the existing nebula sky, aurora blobs, grid overlay, and wave ribbon (they provide the cinematic depth).
- **Remove** the AI-looking `glass-hand.png` and `orb-wave.png` side accents and the large `hero-bg.jpg` top hero (or dial it way down) so the real photos become the focal background texture.
- Add a new layer that positions the 4 real hand photos around the viewport edges:
  - top-left, top-right, bottom-left, bottom-right (desktop)
  - only top-right + bottom-left visible on mobile
- Each photo:
  - `object-cover`, rounded, ~30–40vh tall
  - Soft radial mask so edges fade to transparent (no hard rectangles)
  - `mix-blend-luminosity` or `mix-blend-screen` + low opacity (~0.25 light / ~0.35 dark) so the brand color tints them
  - `aria-hidden`, `pointer-events-none`, `-z-10`
  - `loading="lazy"`, explicit `width`/`height` for CLS
- Apply existing `animate-float` / `animate-bg-drift` to 1–2 of them for subtle motion.

### 3. No changes to detection, transcript, or layout
The detection stage (`DetectionStage`) and transcript panel (`TranscriptPanel`) are untouched. Confidence, gesture mappings, and the side-by-side camera + transcript layout stay exactly as they are.

## Technical notes
- Photos go in `src/assets/` (not `public/`) so Vite hashes and optimizes them.
- Use `import` statements like the existing background does — no raw URLs.
- Masks use `[mask-image:radial-gradient(...)]` Tailwind arbitrary values, matching the existing style in `SceneryBackground.tsx`.
- No new dependencies.

## Files touched
- `src/assets/hand-hello.jpg` (new, real photo)
- `src/assets/hand-peace.jpg` (new, real photo)
- `src/assets/hand-ok.jpg` (new, real photo)
- `src/assets/hand-thumbsup.jpg` (new, real photo)
- `src/components/SceneryBackground.tsx` (edited)
