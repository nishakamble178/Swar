import { useCallback, useEffect, useRef, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { classifySign, type Landmark, type SignCandidate } from "@/lib/signClassifier";

/**
 * Sign detection hook powered by MediaPipe HandLandmarker + a geometric
 * classifier. It works on hand landmarks (21 points) instead of raw pixels,
 * so background, lighting, and skin color do not influence the result.
 */

export interface Prediction {
  label: string;
  confidence: number;
  margin?: number;
  uncertain?: boolean;
  alternatives?: SignCandidate[];
}

/**
 * ROI is now used purely as a visual placement guide. Detection itself
 * scans the entire frame via MediaPipe — but we still require the hand
 * center to be inside the ROI, so users get consistent framing.
 */
export const ROI = {
  size: 0.55,
  centerX: 0.65,
  centerY: 0.55,
} as const;

const HAND_LANDMARKER_TASK_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const VISION_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm";

export interface UseSignDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  intervalMs?: number;
  confidenceThreshold?: number;
  marginThreshold?: number;
  stabilityMs?: number;
  displayStableFrames?: number;
  commitStableFrames?: number;
  /** Minimum hand size (relative to shorter video edge) to accept. */
  minHandSize?: number;
}

export type DetectionStatus =
  | "idle"
  | "loading"
  | "ready"
  | "no_hand"
  | "out_of_box"
  | "too_small"
  | "unstable"
  | "predicting";

let landmarkerPromise: Promise<HandLandmarker> | null = null;

function loadLandmarkerOnce(): Promise<HandLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(VISION_WASM_URL);
      return HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: HAND_LANDMARKER_TASK_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

function bbox(landmarks: Landmark[]) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const p of landmarks) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return {
    minX, minY, maxX, maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    w: maxX - minX,
    h: maxY - minY,
  };
}

export function useSignDetection({
  videoRef,
  intervalMs = 80,
  confidenceThreshold = 0.001,
  marginThreshold = 0,
  stabilityMs = 0,
  displayStableFrames = 1,
  commitStableFrames = 1,
  minHandSize = 0.12,
}: UseSignDetectionOptions) {
  const [isRunning, setIsRunning] = useState(false);
  const [current, setCurrent] = useState<Prediction | null>(null);
  const [committed, setCommitted] = useState<Prediction[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [status, setStatus] = useState<DetectionStatus>("idle");

  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const lastLabelRef = useRef<string | null>(null);
  const lastSeenAtRef = useRef<number>(0);
  const lastCommittedRef = useRef<string | null>(null);
  const stableFramesRef = useRef(0);
  const intervalIdRef = useRef<number | null>(null);
  const inflightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    (async () => {
      try {
        const landmarker = await loadLandmarkerOnce();
        if (cancelled) return;
        landmarkerRef.current = landmarker;
        setModelReady(true);
        setStatus("ready");
      } catch (err) {
        console.error("[useSignDetection] landmarker load failed", err);
        if (!cancelled) {
          setModelError(err instanceof Error ? err.message : "Failed to load detector");
          setStatus("idle");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tick = useCallback(async () => {
    if (inflightRef.current) return;
    inflightRef.current = true;
    try {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2) return;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const result = landmarker.detectForVideo(video, performance.now());
      const hands = result?.landmarks ?? [];

      if (hands.length === 0) {
        setStatus("no_hand");
        setCurrent(null);
        lastLabelRef.current = null;
        stableFramesRef.current = 0;
        return;
      }

      const lm = hands[0] as Landmark[];
      const box = bbox(lm);

      // Require the hand to be inside the visible ROI box (mirrored video:
      // user's right-hand side appears on screen left). ROI.centerX is in
      // *video* coordinates, so we mirror it: the visible box on screen at
      // ROI.centerX corresponds to (1 - ROI.centerX) in video coords.
      const roiCxVideo = 1 - ROI.centerX;
      const roiCyVideo = ROI.centerY;
      const roiHalf = ROI.size / 2;
      const insideRoi =
        Math.abs(box.cx - roiCxVideo) < roiHalf * 1.1 &&
        Math.abs(box.cy - roiCyVideo) < roiHalf * 1.1;

      if (!insideRoi) {
        setStatus("out_of_box");
        setCurrent(null);
        lastLabelRef.current = null;
        stableFramesRef.current = 0;
        return;
      }

      const handSize = Math.max(box.w, box.h);
      if (handSize < minHandSize) {
        setStatus("too_small");
        setCurrent(null);
        lastLabelRef.current = null;
        stableFramesRef.current = 0;
        return;
      }

      const candidates = classifySign(lm);
      if (candidates.length === 0) {
        setStatus("unstable");
        setCurrent(null);
        return;
      }

      const top = candidates[0];
      const runnerUp = candidates[1]?.confidence ?? 0;
      const margin = top.confidence - runnerUp;
      const uncertain = top.confidence < confidenceThreshold || margin < marginThreshold;

      const pred: Prediction = {
        label: top.label,
        confidence: top.confidence,
        margin,
        uncertain,
        alternatives: candidates.slice(0, 3),
      };

      const now = performance.now();
      if (uncertain) {
        setStatus("unstable");
        setCurrent(null);
        lastLabelRef.current = null;
        stableFramesRef.current = 0;
        return;
      }

      if (pred.label !== lastLabelRef.current) {
        lastLabelRef.current = pred.label;
        lastSeenAtRef.current = now;
        stableFramesRef.current = 1;
        setStatus("unstable");
        setCurrent(null);
        return;
      }

      stableFramesRef.current += 1;
      const heldFor = now - lastSeenAtRef.current;
      const isDisplayReady = stableFramesRef.current >= displayStableFrames;
      setCurrent(isDisplayReady ? pred : null);
      setStatus(isDisplayReady ? "predicting" : "unstable");

      if (
        heldFor >= stabilityMs &&
        stableFramesRef.current >= commitStableFrames &&
        pred.label !== lastCommittedRef.current
      ) {
        lastCommittedRef.current = pred.label;
        setCommitted((prev) => [...prev, pred]);
      }
    } finally {
      inflightRef.current = false;
    }
  }, [
    videoRef,
    confidenceThreshold,
    marginThreshold,
    stabilityMs,
    displayStableFrames,
    commitStableFrames,
    minHandSize,
  ]);

  useEffect(() => {
    if (!isRunning || !modelReady) return;
    intervalIdRef.current = window.setInterval(tick, intervalMs);
    return () => {
      if (intervalIdRef.current) window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    };
  }, [isRunning, modelReady, tick, intervalMs]);

  const start = useCallback(() => setIsRunning(true), []);
  const stop = useCallback(() => {
    setIsRunning(false);
    setCurrent(null);
    setStatus(modelReady ? "ready" : "idle");
    lastLabelRef.current = null;
    lastSeenAtRef.current = 0;
    stableFramesRef.current = 0;
  }, [modelReady]);

  const reset = useCallback(() => {
    setCommitted([]);
    lastCommittedRef.current = null;
  }, []);

  const removeLast = useCallback(() => {
    setCommitted((prev) => {
      const next = prev.slice(0, -1);
      lastCommittedRef.current = next[next.length - 1]?.label ?? null;
      return next;
    });
  }, []);

  return {
    isRunning,
    current,
    committed,
    start,
    stop,
    reset,
    removeLast,
    modelReady,
    modelError,
    status,
  };
}
