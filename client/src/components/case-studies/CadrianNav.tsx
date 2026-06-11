import Link from "@/components/case-studies/AppLink";
import ThemeToggle from "@/components/case-studies/ThemeToggle";
import MotionControls from "@/components/case-studies/MotionControls";

export default function CadrianNav() {
  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="glass mx-auto flex h-14 max-w-6xl items-center justify-between rounded-2xl border border-line pl-4 pr-2 sm:pl-5">
        <Link href="/case-studies/cadrian" className="group flex items-center gap-2.5">
          <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-soft text-[13px] font-bold text-white shadow-[0_4px_16px_-4px_var(--accent)]">
            C
            <span className="absolute inset-0 rounded-lg bg-gradient-to-br from-accent to-accent-soft opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-[0.22em] text-fg">
            Cadrian
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/#use-cases"
            className="link-underline hidden px-3 py-2 text-sm text-muted transition-colors hover:text-fg sm:inline-block"
          >
            AcceLLM
          </Link>
          <Link
            href="/case-studies/cadrian#work"
            className="link-underline hidden px-3 py-2 text-sm text-muted transition-colors hover:text-fg sm:inline-block"
          >
            Case Studies
          </Link>
          <a
            href="https://cadrian.com"
            className="link-underline hidden px-3 py-2 text-sm text-muted transition-colors hover:text-fg md:inline-block"
          >
            cadrian.com
          </a>
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <MotionControls />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
