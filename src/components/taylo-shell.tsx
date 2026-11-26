import { IconBarcode } from "@tabler/icons-react";
import type { ReactNode } from "react";

/** Moldura com a navegação: sidebar navy + área de conteúdo clara. */
export function TayloShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-taylo-primary text-taylo-text-on-dark md:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-taylo-secondary text-white">
            <IconBarcode size={20} stroke={1.8} />
          </span>
          <span className="font-display text-base font-semibold leading-tight tracking-tight text-white">
            Gerador de código de barras
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="Menu principal">
          <span
            aria-current="page"
            className="flex items-center gap-3 rounded-lg bg-taylo-primary-surface px-3 py-2.5 font-display text-sm font-medium text-white"
          >
            <IconBarcode size={20} stroke={1.6} className="text-taylo-secondary" />
            Código de barras
          </span>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
