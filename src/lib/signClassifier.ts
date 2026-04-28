/**
 * Geometric sign classifier for ASL-style A–Z (static) and 0–9 (static).
 *
 * INPUT: 21 hand landmarks from MediaPipe HandLandmarker (normalized 0..1).
 * OUTPUT: an array of {label, confidence} candidates (sorted desc).
 *
 * This classifier is deterministic and uses only the *geometry* of the hand
 * (which fingers are extended, finger tip distances, thumb position, etc.).
 * Because it operates on landmarks — not pixels — it is independent of
 * background, lighting, or skin color, which is exactly what the user asked
 * for: "capture only the signs, not the color of hand and background".
 *
 * NOTES on coverage:
 *  - Static ASL fingerspelling: A, B, C, D, E, F, G, H, I, K, L, M, N, O, P,
 *    Q, R, S, T, U, V, W, X, Y. (J and Z are motion signs and are emitted as
 *    best-effort static guesses based on the start pose.)
 *  - Numbers 0–9 use the common ASL number set.
 *
 * The label set MUST match `public/model/labels.json` ordering used by the
 * UI: "0".."9", "A".."Z".
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface SignCandidate {
  label: string;
  confidence: number;
}

const FINGERS = {
  THUMB: { tip: 4, dip: 3, pip: 2, mcp: 1 },
  INDEX: { tip: 8, dip: 7, pip: 6, mcp: 5 },
  MIDDLE: { tip: 12, dip: 11, pip: 10, mcp: 9 },
  RING: { tip: 16, dip: 15, pip: 14, mcp: 13 },
  PINKY: { tip: 20, dip: 19, pip: 18, mcp: 17 },
} as const;

const WRIST = 0;

function dist(a: Landmark, b: Landmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

interface HandFeatures {
  /** Per-finger extension flags (true = straight/extended). */
  extended: { thumb: boolean; index: boolean; middle: boolean; ring: boolean; pinky: boolean };
  /** Hand scale = wrist→middle MCP distance, used to normalize. */
  scale: number;
  /** Whether thumb tip is to the radial side of index MCP (left/right). */
  thumbOut: boolean;
  /** Average curl of folded fingers (0=straight, 1=fully curled). */
  fistTightness: number;
  /** Raw landmarks for downstream tweaks. */
  lm: Landmark[];
  /** Heuristic: thumb tip is above the index PIP (used by 'A' vs 'S'). */
  thumbAboveIndexPip: boolean;
  /** Index–middle tip separation in scale units. */
  indexMiddleSpread: number;
  /** Whether middle finger crosses over index (for 'R'). */
  middleOverIndex: boolean;
}

/**
 * Decide whether a finger is "extended" by comparing the tip distance from
 * the wrist vs the PIP joint distance. For the thumb we use a different
 * heuristic because it bends sideways.
 */
function isFingerExtended(lm: Landmark[], finger: { tip: number; pip: number; mcp: number }) {
  const tipToWrist = dist(lm[finger.tip], lm[WRIST]);
  const pipToWrist = dist(lm[finger.pip], lm[WRIST]);
  return tipToWrist > pipToWrist * 1.1;
}

function isThumbExtended(lm: Landmark[]) {
  // Thumb is "extended" when tip is far from index MCP relative to scale.
  const scale = dist(lm[WRIST], lm[FINGERS.MIDDLE.mcp]) || 1;
  const tipToIndexMcp = dist(lm[FINGERS.THUMB.tip], lm[FINGERS.INDEX.mcp]);
  return tipToIndexMcp / scale > 0.55;
}

function computeFeatures(lm: Landmark[]): HandFeatures {
  const scale = dist(lm[WRIST], lm[FINGERS.MIDDLE.mcp]) || 1;
  const extended = {
    thumb: isThumbExtended(lm),
    index: isFingerExtended(lm, FINGERS.INDEX),
    middle: isFingerExtended(lm, FINGERS.MIDDLE),
    ring: isFingerExtended(lm, FINGERS.RING),
    pinky: isFingerExtended(lm, FINGERS.PINKY),
  };

  const thumbOut = lm[FINGERS.THUMB.tip].x < lm[FINGERS.INDEX.mcp].x; // mirrored video
  const folded = [FINGERS.INDEX, FINGERS.MIDDLE, FINGERS.RING, FINGERS.PINKY]
    .filter((_, i) => !([extended.index, extended.middle, extended.ring, extended.pinky][i]))
    .map((f) => dist(lm[f.tip], lm[f.mcp]) / scale);
  const fistTightness =
    folded.length === 0 ? 0 : 1 - Math.min(1, folded.reduce((a, b) => a + b, 0) / folded.length / 0.6);

  const thumbAboveIndexPip = lm[FINGERS.THUMB.tip].y < lm[FINGERS.INDEX.pip].y;
  const indexMiddleSpread = dist(lm[FINGERS.INDEX.tip], lm[FINGERS.MIDDLE.tip]) / scale;
  const middleOverIndex =
    extended.index &&
    extended.middle &&
    lm[FINGERS.MIDDLE.tip].x > lm[FINGERS.INDEX.tip].x &&
    lm[FINGERS.MIDDLE.tip].y < lm[FINGERS.INDEX.pip].y;

  return {
    extended,
    scale,
    thumbOut,
    fistTightness,
    lm,
    thumbAboveIndexPip,
    indexMiddleSpread,
    middleOverIndex,
  };
}

interface RuleHit {
  label: string;
  /** Score in 0..1 — higher is more confident. */
  score: number;
}

/**
 * Score every supported sign and return them sorted by confidence.
 *
 * The scoring is intentionally soft: each rule returns a value in [0, 1]
 * based on how well the pose matches expectations, so close-but-imperfect
 * signs still produce a top-1 with a believable confidence.
 */
function scoreAllSigns(f: HandFeatures): RuleHit[] {
  const e = f.extended;
  const ext = (b: boolean, weight = 1) => (b ? weight : 0);
  const notExt = (b: boolean, weight = 1) => (!b ? weight : 0);
  const hits: RuleHit[] = [];

  // ===== Numbers =====
  // 0 → all fingers curled into an "O" shape (thumb meets index tip).
  const oTouch = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.INDEX.tip]) / f.scale;
  hits.push({
    label: "0",
    score:
      notExt(e.index, 0.2) +
      notExt(e.middle, 0.2) +
      notExt(e.ring, 0.2) +
      notExt(e.pinky, 0.2) +
      Math.max(0, 0.2 - oTouch) * 1.0,
  });
  // 1 → only index up.
  hits.push({
    label: "1",
    score:
      ext(e.index, 0.5) +
      notExt(e.middle, 0.15) +
      notExt(e.ring, 0.15) +
      notExt(e.pinky, 0.15) +
      notExt(e.thumb, 0.05),
  });
  // 2 → index + middle up, slightly spread (between U and V). De-prioritized
  // so it doesn't steal from U (together) or V (wide).
  hits.push({
    label: "2",
    score:
      (ext(e.index, 0.32) +
        ext(e.middle, 0.32) +
        notExt(e.ring, 0.1) +
        notExt(e.pinky, 0.1) +
        Math.min(0.05, f.indexMiddleSpread * 0.2)) -
      0.05,
  });
  // 3 → thumb + index + middle (ASL number 3).
  hits.push({
    label: "3",
    score:
      ext(e.thumb, 0.3) +
      ext(e.index, 0.3) +
      ext(e.middle, 0.3) +
      notExt(e.ring, 0.05) +
      notExt(e.pinky, 0.05),
  });
  // 4 → 4 fingers up, thumb folded.
  hits.push({
    label: "4",
    score:
      notExt(e.thumb, 0.1) +
      ext(e.index, 0.225) +
      ext(e.middle, 0.225) +
      ext(e.ring, 0.225) +
      ext(e.pinky, 0.225),
  });
  // 5 → all 5 fingers up.
  hits.push({
    label: "5",
    score:
      ext(e.thumb, 0.2) +
      ext(e.index, 0.2) +
      ext(e.middle, 0.2) +
      ext(e.ring, 0.2) +
      ext(e.pinky, 0.2),
  });
  // Touch gate: a number sign that requires "touch" must actually touch.
  // If the touch distance > 0.12 of scale, treat the sign as not present.
  const touchGate = (d: number) => (d < 0.12 ? 1 : d < 0.2 ? 0.4 : 0);
  // 6 → pinky touches thumb, other 3 fingers up.
  const sixTouch = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.PINKY.tip]) / f.scale;
  hits.push({
    label: "6",
    score:
      (ext(e.index, 0.22) +
        ext(e.middle, 0.22) +
        ext(e.ring, 0.22) +
        notExt(e.pinky, 0.0) +
        0.34 * touchGate(sixTouch)) -
      (e.pinky ? 0.3 : 0),
  });
  // 7 → ring touches thumb.
  const sevenTouch = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.RING.tip]) / f.scale;
  hits.push({
    label: "7",
    score:
      (ext(e.index, 0.22) +
        ext(e.middle, 0.22) +
        ext(e.pinky, 0.22) +
        0.34 * touchGate(sevenTouch)) -
      (e.ring ? 0.3 : 0),
  });
  // 8 → middle touches thumb.
  const eightTouch = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.MIDDLE.tip]) / f.scale;
  hits.push({
    label: "8",
    score:
      (ext(e.index, 0.22) +
        ext(e.ring, 0.22) +
        ext(e.pinky, 0.22) +
        0.34 * touchGate(eightTouch)) -
      (e.middle ? 0.3 : 0),
  });
  // 9 → index touches thumb, others up. STRICT: must actually pinch.
  const nineTouch = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.INDEX.tip]) / f.scale;
  hits.push({
    label: "9",
    score:
      (ext(e.middle, 0.22) +
        ext(e.ring, 0.22) +
        ext(e.pinky, 0.22) +
        0.5 * touchGate(nineTouch)) -
      (e.index ? 0.4 : 0) -
      (nineTouch > 0.18 ? 0.5 : 0),
  });

  // ===== Letters =====
  // A → fist, thumb on the side.
  hits.push({
    label: "A",
    score:
      notExt(e.index, 0.2) +
      notExt(e.middle, 0.2) +
      notExt(e.ring, 0.2) +
      notExt(e.pinky, 0.2) +
      ext(f.thumbOut, 0.15) +
      Math.max(0, f.fistTightness - 0.3) * 0.3,
  });
  // B → 4 fingers straight, thumb across palm.
  hits.push({
    label: "B",
    score:
      notExt(e.thumb, 0.15) +
      ext(e.index, 0.21) +
      ext(e.middle, 0.21) +
      ext(e.ring, 0.21) +
      ext(e.pinky, 0.21) +
      Math.max(0, 0.1 - f.indexMiddleSpread) * 1.0,
  });
  // C → curved hand (fingers softly curled, thumb opposite).
  const cArc = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.INDEX.tip]) / f.scale;
  hits.push({
    label: "C",
    score:
      notExt(e.index, 0.15) +
      notExt(e.middle, 0.15) +
      notExt(e.ring, 0.15) +
      notExt(e.pinky, 0.15) +
      Math.max(0, Math.min(0.4, cArc - 0.25)) * 1.0,
  });
  // D → index up, others curled, thumb meets middle.
  hits.push({
    label: "D",
    score:
      ext(e.index, 0.4) +
      notExt(e.middle, 0.15) +
      notExt(e.ring, 0.15) +
      notExt(e.pinky, 0.15) +
      Math.max(0, 0.25 - dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.MIDDLE.tip]) / f.scale),
  });
  // E → all fingers curled, thumb tucked.
  hits.push({
    label: "E",
    score:
      notExt(e.thumb, 0.15) +
      notExt(e.index, 0.21) +
      notExt(e.middle, 0.21) +
      notExt(e.ring, 0.21) +
      notExt(e.pinky, 0.21) +
      Math.max(0, f.fistTightness - 0.5) * 0.2,
  });
  // F → thumb+index touch (ring), others up.
  const fTouch = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.INDEX.tip]) / f.scale;
  hits.push({
    label: "F",
    score:
      ext(e.middle, 0.22) +
      ext(e.ring, 0.22) +
      ext(e.pinky, 0.22) +
      Math.max(0, 0.34 - fTouch),
  });
  // G → index pointing sideways (~horizontal), others curled.
  const gIndexHoriz = Math.abs(f.lm[FINGERS.INDEX.tip].y - f.lm[FINGERS.INDEX.mcp].y);
  hits.push({
    label: "G",
    score:
      ext(e.index, 0.4) +
      notExt(e.middle, 0.15) +
      notExt(e.ring, 0.15) +
      notExt(e.pinky, 0.15) +
      Math.max(0, 0.15 - gIndexHoriz / f.scale) * 1.0,
  });
  // H → index + middle HORIZONTAL, together. Requires horizontal orientation
  // to distinguish from U (vertical, together).
  const hHoriz = Math.abs(f.lm[FINGERS.INDEX.tip].y - f.lm[FINGERS.INDEX.mcp].y) / f.scale;
  const isHorizontal = hHoriz < 0.3;
  hits.push({
    label: "H",
    score:
      (ext(e.index, 0.28) +
        ext(e.middle, 0.28) +
        notExt(e.ring, 0.1) +
        notExt(e.pinky, 0.1) +
        Math.max(0, 0.1 - f.indexMiddleSpread) * 1.0 +
        (isHorizontal ? 0.2 : 0)) -
      (isHorizontal ? 0 : 0.25),
  });
  // I → only pinky up.
  hits.push({
    label: "I",
    score:
      ext(e.pinky, 0.5) +
      notExt(e.index, 0.15) +
      notExt(e.middle, 0.15) +
      notExt(e.ring, 0.15) +
      notExt(e.thumb, 0.05),
  });
  // J → starts as I (motion). Static best guess: same as I but slightly weaker.
  hits.push({
    label: "J",
    score:
      ext(e.pinky, 0.4) +
      notExt(e.index, 0.1) +
      notExt(e.middle, 0.1) +
      notExt(e.ring, 0.1),
  });
  // K → index + middle up, spread, thumb between.
  hits.push({
    label: "K",
    score:
      ext(e.index, 0.3) +
      ext(e.middle, 0.3) +
      ext(e.thumb, 0.2) +
      notExt(e.ring, 0.05) +
      notExt(e.pinky, 0.05) +
      Math.min(0.1, f.indexMiddleSpread * 0.5),
  });
  // L → thumb + index, perpendicular.
  hits.push({
    label: "L",
    score:
      ext(e.thumb, 0.35) +
      ext(e.index, 0.35) +
      notExt(e.middle, 0.1) +
      notExt(e.ring, 0.1) +
      notExt(e.pinky, 0.1),
  });
  // M → thumb under three fingers (index, middle, ring curled over).
  hits.push({
    label: "M",
    score:
      notExt(e.index, 0.2) +
      notExt(e.middle, 0.2) +
      notExt(e.ring, 0.2) +
      notExt(e.pinky, 0.15) +
      ext(f.thumbAboveIndexPip ? false : true, 0.15),
  });
  // N → thumb under two fingers.
  hits.push({
    label: "N",
    score:
      notExt(e.index, 0.22) +
      notExt(e.middle, 0.22) +
      notExt(e.ring, 0.18) +
      notExt(e.pinky, 0.18) +
      ext(f.thumbAboveIndexPip ? false : true, 0.1),
  });
  // O → fingers form O (similar to 0).
  hits.push({
    label: "O",
    score:
      notExt(e.index, 0.18) +
      notExt(e.middle, 0.18) +
      notExt(e.ring, 0.18) +
      notExt(e.pinky, 0.18) +
      Math.max(0, 0.18 - oTouch) * 1.0,
  });
  // P → like K but pointing down.
  hits.push({
    label: "P",
    score:
      ext(e.index, 0.28) +
      ext(e.middle, 0.28) +
      ext(e.thumb, 0.18) +
      notExt(e.ring, 0.05) +
      notExt(e.pinky, 0.05) +
      ext(f.lm[FINGERS.MIDDLE.tip].y > f.lm[FINGERS.MIDDLE.mcp].y, 0.1),
  });
  // Q → like G pointing down.
  hits.push({
    label: "Q",
    score:
      ext(e.index, 0.35) +
      ext(e.thumb, 0.2) +
      notExt(e.middle, 0.1) +
      notExt(e.ring, 0.1) +
      notExt(e.pinky, 0.1) +
      ext(f.lm[FINGERS.INDEX.tip].y > f.lm[FINGERS.INDEX.mcp].y, 0.1),
  });
  // R → index + middle crossed.
  hits.push({
    label: "R",
    score:
      ext(e.index, 0.3) +
      ext(e.middle, 0.3) +
      notExt(e.ring, 0.1) +
      notExt(e.pinky, 0.1) +
      ext(f.middleOverIndex, 0.2),
  });
  // S → fist, thumb across front.
  hits.push({
    label: "S",
    score:
      notExt(e.index, 0.2) +
      notExt(e.middle, 0.2) +
      notExt(e.ring, 0.2) +
      notExt(e.pinky, 0.2) +
      notExt(f.thumbOut, 0.1) +
      Math.max(0, f.fistTightness - 0.4) * 0.2,
  });
  // T → fist, thumb between index & middle.
  const tThumbBetween = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.INDEX.pip]) / f.scale;
  hits.push({
    label: "T",
    score:
      notExt(e.index, 0.2) +
      notExt(e.middle, 0.2) +
      notExt(e.ring, 0.2) +
      notExt(e.pinky, 0.15) +
      Math.max(0, 0.25 - tThumbBetween) * 1.0,
  });
  // U → index + middle up TOGETHER (very low spread). Penalize spread.
  hits.push({
    label: "U",
    score:
      (ext(e.index, 0.32) +
        ext(e.middle, 0.32) +
        notExt(e.ring, 0.1) +
        notExt(e.pinky, 0.1) +
        Math.max(0, 0.08 - f.indexMiddleSpread) * 2.0) -
      Math.max(0, f.indexMiddleSpread - 0.08) * 2.5,
  });
  // V → index + middle up, SPREAD. Penalize when together.
  hits.push({
    label: "V",
    score:
      (ext(e.index, 0.3) +
        ext(e.middle, 0.3) +
        notExt(e.ring, 0.1) +
        notExt(e.pinky, 0.1) +
        Math.min(0.2, f.indexMiddleSpread * 1.0)) -
      Math.max(0, 0.12 - f.indexMiddleSpread) * 1.5,
  });
  // W → index + middle + ring up.
  hits.push({
    label: "W",
    score:
      ext(e.index, 0.27) +
      ext(e.middle, 0.27) +
      ext(e.ring, 0.27) +
      notExt(e.pinky, 0.1) +
      notExt(e.thumb, 0.05),
  });
  // X → index hooked.
  const xIndexCurl = dist(f.lm[FINGERS.INDEX.tip], f.lm[FINGERS.INDEX.mcp]) / f.scale;
  hits.push({
    label: "X",
    score:
      notExt(e.middle, 0.18) +
      notExt(e.ring, 0.18) +
      notExt(e.pinky, 0.18) +
      Math.max(0, 0.5 - xIndexCurl) * 0.6,
  });
  // Y → thumb + pinky out.
  hits.push({
    label: "Y",
    score:
      ext(e.thumb, 0.4) +
      ext(e.pinky, 0.4) +
      notExt(e.index, 0.07) +
      notExt(e.middle, 0.07) +
      notExt(e.ring, 0.06),
  });
  // Z → index pointing (motion). Best static guess close to 1/D.
  hits.push({
    label: "Z",
    score:
      ext(e.index, 0.4) +
      notExt(e.middle, 0.15) +
      notExt(e.ring, 0.15) +
      notExt(e.pinky, 0.15) -
      0.05,
  });

  // ===== Gestures (11) =====
  const thumbUp = f.lm[FINGERS.THUMB.tip].y < f.lm[FINGERS.THUMB.mcp].y - f.scale * 0.2;
  const thumbDown = f.lm[FINGERS.THUMB.tip].y > f.lm[FINGERS.THUMB.mcp].y + f.scale * 0.2;

  // 👍 Thumbs Up → thumb up, all fingers curled.
  hits.push({
    label: "👍 Thumbs Up",
    score:
      ext(e.thumb, 0.25) +
      notExt(e.index, 0.18) +
      notExt(e.middle, 0.18) +
      notExt(e.ring, 0.18) +
      notExt(e.pinky, 0.18) +
      ext(thumbUp, 0.15),
  });
  // 👎 Thumbs Down → thumb down, all fingers curled.
  hits.push({
    label: "👎 Thumbs Down",
    score:
      ext(e.thumb, 0.25) +
      notExt(e.index, 0.18) +
      notExt(e.middle, 0.18) +
      notExt(e.ring, 0.18) +
      notExt(e.pinky, 0.18) +
      ext(thumbDown, 0.15),
  });
  // ✌️ Peace → index + middle up spread, others curled (similar to V but distinct label).
  hits.push({
    label: "✌️ Peace",
    score:
      ext(e.index, 0.28) +
      ext(e.middle, 0.28) +
      notExt(e.ring, 0.12) +
      notExt(e.pinky, 0.12) +
      notExt(e.thumb, 0.05) +
      Math.min(0.15, f.indexMiddleSpread * 0.7),
  });
  // 👌 OK → thumb-index circle, middle/ring/pinky extended.
  const okTouch = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.INDEX.tip]) / f.scale;
  hits.push({
    label: "👌 OK",
    score:
      ext(e.middle, 0.2) +
      ext(e.ring, 0.2) +
      ext(e.pinky, 0.2) +
      Math.max(0, 0.2 - okTouch) * 1.2,
  });
  // 🤘 Rock → index + pinky up, others curled.
  hits.push({
    label: "🤘 Rock",
    score:
      ext(e.index, 0.32) +
      ext(e.pinky, 0.32) +
      notExt(e.middle, 0.15) +
      notExt(e.ring, 0.15) +
      notExt(e.thumb, 0.06),
  });
  // 🤙 Call Me → thumb + pinky out, others curled.
  hits.push({
    label: "🤙 Call Me",
    score:
      ext(e.thumb, 0.32) +
      ext(e.pinky, 0.32) +
      notExt(e.index, 0.12) +
      notExt(e.middle, 0.12) +
      notExt(e.ring, 0.12),
  });
  // ✊ Fist → all fingers curled, thumb tucked in.
  hits.push({
    label: "✊ Fist",
    score:
      notExt(e.thumb, 0.15) +
      notExt(e.index, 0.2) +
      notExt(e.middle, 0.2) +
      notExt(e.ring, 0.2) +
      notExt(e.pinky, 0.2) +
      Math.max(0, f.fistTightness - 0.4) * 0.2,
  });
  // ✋ Open Palm → all 5 fingers extended and spread.
  hits.push({
    label: "✋ Open Palm",
    score:
      ext(e.thumb, 0.2) +
      ext(e.index, 0.2) +
      ext(e.middle, 0.2) +
      ext(e.ring, 0.2) +
      ext(e.pinky, 0.2) +
      Math.min(0.1, f.indexMiddleSpread * 0.5),
  });
  // 👉 Point → only index extended, thumb NOT clearly out (distinguishes from "1"/L).
  // Strong penalty if thumb is touching index (would be 9).
  const pointThumbTouch = dist(f.lm[FINGERS.THUMB.tip], f.lm[FINGERS.INDEX.tip]) / f.scale;
  hits.push({
    label: "👉 Point",
    score:
      (ext(e.index, 0.5) +
        notExt(e.middle, 0.18) +
        notExt(e.ring, 0.18) +
        notExt(e.pinky, 0.18) +
        notExt(e.thumb, 0.1)) -
      (pointThumbTouch < 0.18 ? 0.6 : 0),
  });
  // 🤞 Fingers Crossed → index + middle up, middle crossed over index.
  hits.push({
    label: "🤞 Fingers Crossed",
    score:
      ext(e.index, 0.28) +
      ext(e.middle, 0.28) +
      notExt(e.ring, 0.12) +
      notExt(e.pinky, 0.12) +
      ext(f.middleOverIndex, 0.25),
  });
  // 🤟 I Love You → thumb + index + pinky up, middle + ring curled.
  hits.push({
    label: "🤟 I Love You",
    score:
      ext(e.thumb, 0.25) +
      ext(e.index, 0.25) +
      ext(e.pinky, 0.25) +
      notExt(e.middle, 0.15) +
      notExt(e.ring, 0.15),
  });

  return hits.sort((a, b) => b.score - a.score);
}

/**
 * Maps a base sign label (letter / number / emoji-gesture) to a full
 * sentence. The detection geometry, scoring, and confidence are unchanged —
 * we simply rename the output label so users can express common phrases
 * with a single hand sign.
 *
 * Each sentence is bound to a *unique* base sign so there is exactly one
 * gesture per sentence (no ambiguity, confidence stays as-is).
 */
const SENTENCE_GESTURE_MAP: Record<string, string> = {
  "✋ Open Palm": "Hello",
  G: "Good Morning",
  E: "Good Evening",
  H: "How are you?",
  F: "I am Fine",
  Y: "Thank You",
  P: "Please",
  S: "Sorry",
  "👍 Thumbs Up": "Yes",
  "👎 Thumbs Down": "No",
  U: "I Understand",
  Q: "I Don't Understand",
  "🤙 Call Me": "Can You Help Me?",
  "✊ Fist": "I Am Hungry",
  T: "I Am Thirsty",
  W: "I Need Water",
  "🤘 Rock": "I Need Food",
  "🤟 I Love You": "I Am Happy",
  "✌️ Peace": "I Am Sad",
  "🤞 Fingers Crossed": "Help!",
  "👉 Point": "Goodbye",
};

export function classifySign(landmarks: Landmark[]): SignCandidate[] {
  if (!landmarks || landmarks.length < 21) return [];
  const features = computeFeatures(landmarks);
  const ranked = scoreAllSigns(features);
  // Convert raw scores to probabilities via softmax-lite.
  const top = ranked.slice(0, 5);
  const expScores = top.map((h) => Math.exp(h.score * 4));
  const sum = expScores.reduce((a, b) => a + b, 0) || 1;
  return top.map((h, i) => ({
    label: SENTENCE_GESTURE_MAP[h.label] ?? h.label,
    confidence: expScores[i] / sum,
  }));
}

