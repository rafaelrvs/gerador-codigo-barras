import { GeradorCodigoBarras } from "@/components/gerador-codigo-barras";
import { TayloShell } from "@/components/taylo-shell";

export default function Page() {
  return (
    <TayloShell>
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="mb-8">
          <h1 className="font-display text-2xl font-bold text-taylo-primary">Código de barras</h1>
          <p className="mt-1 text-sm text-taylo-text-muted">
            Gere etiquetas com o código de barras dos materiais do Sisplan e baixe em PDF para imprimir.
          </p>
        </header>
        <GeradorCodigoBarras />
      </div>
    </TayloShell>
  );
}
