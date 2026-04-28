import { Hand, Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 backdrop-blur-xl bg-background/40">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Hand className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-gradient">SwarSetu</span>
              <Sparkles className="h-3.5 w-3.5 text-primary-glow" />
            </div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Sign · Text · Voice
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-3 text-sm text-muted-foreground sm:gap-6">
          <a href="#detect" className="hidden transition-colors hover:text-foreground sm:inline">
            Detect
          </a>
          <a href="#how" className="hidden transition-colors hover:text-foreground sm:inline">
            How it works
          </a>
          <ThemeToggle />
          <a
            href="#detect"
            className="rounded-full bg-gradient-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.03]"
          >
            Launch
          </a>
        </nav>
      </div>
    </header>
  );
}
