"use client";

import * as React from "react";
import {
  ChefHat,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  X,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  order: number;
  content: string;
  durationMin: number | null;
};

type Props = {
  recipeTitle: string;
  steps: Step[];
};

export function CookingModeButton({
  recipeTitle,
  steps,
  enabled = true,
}: Props & { className?: string; enabled?: boolean }) {
  const [open, setOpen] = React.useState(false);

  if (steps.length === 0) return null;
  if (!enabled) {
    return (
      <Button
        variant="outline"
        disabled
        title="Disponible en plan Pro o superior"
      >
        <ChefHat className="size-4" />
        Cocinar paso a paso · Pro
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ChefHat className="size-4" />
        Cocinar paso a paso
      </Button>
      {open && (
        <CookingOverlay
          recipeTitle={recipeTitle}
          steps={steps}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function CookingOverlay({
  recipeTitle,
  steps,
  onClose,
}: Props & { onClose: () => void }) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [timer, setTimer] = React.useState<number | null>(null);
  const [timerRunning, setTimerRunning] = React.useState(false);
  const wakeLockRef = React.useRef<WakeLockSentinel | null>(null);
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null);

  const step = steps[stepIdx]!;
  const isLast = stepIdx === steps.length - 1;

  // Wake lock — keep the screen on while cooking
  React.useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          const lock = await navigator.wakeLock.request("screen");
          if (cancelled) {
            await lock.release();
            return;
          }
          wakeLockRef.current = lock;
        }
      } catch {
        // ignore
      }
    }
    acquire();
    return () => {
      cancelled = true;
      wakeLockRef.current?.release().catch(() => undefined);
    };
  }, []);

  // Reset timer when step changes
  React.useEffect(() => {
    if (step.durationMin && step.durationMin > 0) {
      setTimer(step.durationMin * 60);
      setTimerRunning(false);
    } else {
      setTimer(null);
      setTimerRunning(false);
    }
  }, [stepIdx, step.durationMin]);

  // Tick the timer
  React.useEffect(() => {
    if (!timerRunning || timer == null) return;
    if (timer <= 0) {
      setTimerRunning(false);
      // Notify with a beep + speech
      try {
        const u = new SpeechSynthesisUtterance("¡Tiempo!");
        u.lang = "es-ES";
        speechSynthesis.speak(u);
      } catch {
        // ignore
      }
      return;
    }
    const id = setTimeout(() => setTimer((t) => (t == null ? null : t - 1)), 1000);
    return () => clearTimeout(id);
  }, [timer, timerRunning]);

  // Speak the current step
  React.useEffect(() => {
    if (muted) {
      speechSynthesis.cancel();
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(
      `Paso ${step.order}. ${step.content}`
    );
    u.lang = "es-ES";
    u.rate = 0.95;
    utteranceRef.current = u;
    // Slight delay so the UI transitions before speech starts
    const timeoutId = setTimeout(() => speechSynthesis.speak(u), 200);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [stepIdx, muted, step.order, step.content]);

  // Stop speech on unmount
  React.useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  function next() {
    if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1);
  }
  function prev() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }
  function close() {
    speechSynthesis.cancel();
    onClose();
  }

  // Keyboard shortcuts
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  const progress = ((stepIdx + 1) / steps.length) * 100;
  const minutes = timer != null ? Math.floor(timer / 60) : 0;
  const seconds = timer != null ? timer % 60 : 0;

  return (
    <div
      className="fixed inset-0 z-[60] bg-background flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-4 border-b">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[3px] text-muted-foreground font-bold">
            Cocinando
          </p>
          <p className="font-semibold text-sm truncate">{recipeTitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Activar voz" : "Silenciar voz"}
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between text-xs font-medium mb-2">
          <span className="text-muted-foreground">
            Paso {stepIdx + 1} de {steps.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step body */}
      <main className="flex-1 overflow-y-auto px-5 py-8 flex flex-col items-center justify-center">
        <div
          className="size-20 rounded-full bg-primary text-primary-foreground grid place-items-center text-3xl font-bold mb-6"
          aria-hidden
        >
          {step.order}
        </div>
        <p className="text-2xl md:text-3xl text-center font-medium leading-snug max-w-2xl text-balance">
          {step.content}
        </p>

        {/* Timer */}
        {timer != null && (
          <div className="mt-10 rounded-3xl border bg-card px-8 py-6 flex items-center gap-5">
            <div className="text-5xl md:text-6xl font-bold tabular-nums tracking-tight">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant={timerRunning ? "outline" : "default"}
                onClick={() => setTimerRunning((r) => !r)}
              >
                {timerRunning ? (
                  <>
                    <Pause className="size-4" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    Iniciar
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTimer((step.durationMin ?? 0) * 60);
                  setTimerRunning(false);
                }}
              >
                <RotateCcw className="size-4" />
                Reiniciar
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Nav */}
      <footer className="px-5 py-4 border-t flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={prev}
          disabled={stepIdx === 0}
        >
          <ChevronLeft className="size-5" />
          Anterior
        </Button>
        {isLast ? (
          <Button size="lg" onClick={close}>
            Terminar
          </Button>
        ) : (
          <Button size="lg" onClick={next}>
            Siguiente
            <ChevronRight className="size-5" />
          </Button>
        )}
      </footer>
    </div>
  );
}

// WakeLock types are provided by lib.dom in modern TypeScript.
