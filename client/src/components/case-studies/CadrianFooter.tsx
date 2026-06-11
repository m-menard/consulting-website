import Link from "@/components/case-studies/AppLink";

export default function CadrianFooter() {
  return (
    <footer className="relative mt-32 border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-col gap-12 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-soft text-[13px] font-bold text-white">
                C
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.22em] text-fg">
                Cadrian
              </span>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-muted">
              Custom multi-agent AI systems for ambitious teams: engineered,
              shipped, and measured in production.
            </p>
          </div>

          <div className="flex gap-16">
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-faint">
                Explore
              </p>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link href="/case-studies/cadrian" className="text-muted transition-colors hover:text-fg">
                    Case Studies
                  </Link>
                </li>
                <li>
                  <Link href="/case-studies/cg-life" className="text-muted transition-colors hover:text-fg">
                    CG Life
                  </Link>
                </li>
                <li>
                  <Link href="/case-studies/givebutter" className="text-muted transition-colors hover:text-fg">
                    Givebutter
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-faint">
                Connect
              </p>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="https://cadrian.com" className="text-muted transition-colors hover:text-fg">
                    cadrian.com
                  </a>
                </li>
                <li>
                  <a href="mailto:hello@cadrian.com" className="text-muted transition-colors hover:text-fg">
                    hello@cadrian.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-xs text-faint sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Cadrian. All rights reserved.</p>
          <p className="font-mono tracking-wide">Built with multi-agent AI.</p>
        </div>
      </div>
    </footer>
  );
}
