import { useEffect } from "react";
import { Camera, CameraOff, Loader2, Radio, Hand, AlertCircle } from "lucide-react";
import { useWebcam } from "@/hooks/useWebcam";
import { useSignDetection, ROI, type Prediction, type DetectionStatus } from "@/hooks/useSignDetection";

interface DetectionStageProps {
  onPrediction?: (p: Prediction) => void;
  onCommit?: (p: Prediction) => void;
}

const STATUS_LABEL: Record<DetectionStatus, string> = {
  idle: "Camera off",
  loading: "Loading hand detector…",
  ready: "Ready — press Start detection",
  no_hand: "No hand detected — show your hand inside the box",
  out_of_box: "Move your hand inside the dashed box",
  too_small: "Move your hand closer to the camera",
  unstable: "Hold the sign steady…",
  predicting: "Sign detected",
};

export function DetectionStage({ onPrediction, onCommit }: DetectionStageProps) {
  const { videoRef, isActive, error, start, stop } = useWebcam();
  const detection = useSignDetection({ videoRef });
  const currentPrediction = detection.current;
  const confidence = currentPrediction?.confidence ?? 0;
  const alternatives = currentPrediction?.alternatives?.slice(0, 3) ?? [];
  const status = detection.status;

  useEffect(() => {
    if (currentPrediction) onPrediction?.(currentPrediction);
  }, [currentPrediction, onPrediction]);

  useEffect(() => {
    const last = detection.committed[detection.committed.length - 1];
    if (last) onCommit?.(last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detection.committed.length]);

  const toggleCamera = async () => {
    if (isActive) {
      detection.stop();
      stop();
    } else {
      await start();
    }
  };

  const toggleDetect = () => {
    if (detection.isRunning) detection.stop();
    else detection.start();
  };

  return (
    <div className="space-y-4">
      {/* ===== Camera card ===== */}
      <div className="glass-card gradient-border relative overflow-hidden rounded-3xl p-4 shadow-elevated sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-primary opacity-20 blur-3xl"
        />

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black/60 ring-1 ring-primary/20 ring-offset-2 ring-offset-background/0">
          {/* Cinematic corner brackets */}
          {isActive && (
            <>
              <span aria-hidden className="pointer-events-none absolute left-3 top-3 z-20 h-5 w-5 border-l-2 border-t-2 border-primary-glow/80" />
              <span aria-hidden className="pointer-events-none absolute right-3 top-3 z-20 h-5 w-5 border-r-2 border-t-2 border-primary-glow/80" />
              <span aria-hidden className="pointer-events-none absolute bottom-3 left-3 z-20 h-5 w-5 border-b-2 border-l-2 border-primary-glow/80" />
              <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 z-20 h-5 w-5 border-b-2 border-r-2 border-primary-glow/80" />
            </>
          )}
          <div className="absolute inset-0 -scale-x-100">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {isActive && (
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-xl border-2 border-dashed border-primary"
                style={{
                  width: `${ROI.size * 100}%`,
                  aspectRatio: "1 / 1",
                  left: `${(ROI.centerX - ROI.size / 2) * 100}%`,
                  top: `${(ROI.centerY - ROI.size / 2) * 100}%`,
                  boxShadow: "0 0 0 2000px rgba(0, 0, 0, 0.35) inset",
                }}
              />
            )}
          </div>

          {isActive && detection.isRunning && (
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-background/70 px-3 py-1 text-[11px] font-medium text-foreground backdrop-blur">
              {STATUS_LABEL[status]}
            </div>
          )}

          {!isActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-glow animate-float">
                <Camera className="h-7 w-7 text-primary-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {error ? error : "Camera is off. Tap Start to begin detection."}
              </p>
              {detection.modelError ? (
                <p className="max-w-xs text-center text-xs text-destructive">
                  Detector failed to load: {detection.modelError}
                </p>
              ) : !detection.modelReady ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading hand detector…
                </p>
              ) : (
                <p className="text-xs text-primary-glow">✓ Hand detector ready (A–Z, 0–9)</p>
              )}
            </div>
          )}

          {isActive && (
            <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 text-xs backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                </span>
                <span className="font-medium">LIVE</span>
              </div>
              {detection.isRunning && (
                <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 text-xs backdrop-blur">
                  <Radio className="h-3 w-3 text-primary-glow" />
                  <span>Detecting…</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={toggleCamera}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {isActive ? (
              <>
                <CameraOff className="h-4 w-4" /> Stop camera
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" /> Start camera
              </>
            )}
          </button>

          <button
            onClick={toggleDetect}
            disabled={!isActive || !detection.modelReady}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            {detection.isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Pause detection
              </>
            ) : !detection.modelReady ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading detector…
              </>
            ) : (
              <>
                <Radio className="h-4 w-4" /> Start detection
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== Confidence card (under camera) ===== */}
      <div className="glass-card rounded-3xl border border-border p-4 shadow-elevated sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Hand className="h-3 w-3" />
              {currentPrediction ? "Predicted sign" : "Waiting for sign"}
            </div>
            <div className="truncate text-4xl font-bold text-gradient">
              {currentPrediction?.label ?? "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Confidence
            </div>
            <div className="text-2xl font-semibold tabular-nums">
              {currentPrediction ? `${(confidence * 100).toFixed(0)}%` : "--"}
            </div>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-300"
            style={{ width: `${Math.min(100, confidence * 100)}%` }}
          />
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>{STATUS_LABEL[status]}</span>
        </div>

        {/* Top guesses table */}
        <div className="mt-4">
          <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Top guesses
          </div>
          {alternatives.length > 0 ? (
            <div className="space-y-2">
              {alternatives.map((alt, i) => (
                <div key={`${alt.label}-${i}`} className="flex items-center gap-3">
                  <span className="w-6 text-sm font-semibold tabular-nums">{alt.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        i === 0 ? "bg-gradient-primary" : "bg-muted-foreground/40"
                      }`}
                      style={{ width: `${Math.min(100, alt.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                    {(alt.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Show a clear hand sign inside the dashed box to see candidate predictions.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
