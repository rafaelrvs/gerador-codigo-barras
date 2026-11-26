"use client";

import {
  IconAlertTriangle,
  IconBarcode,
  IconDownload,
  IconFileTypeCsv,
  IconLoader2,
  IconTrash,
} from "@tabler/icons-react";
import { toSVG } from "bwip-js/browser";
import { useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { lerMateriais, totalEtiquetas, validarQuantidade } from "@/lib/codigo-barras/entrada";
import { OPCOES_PADRAO, SIMBOLOGIAS, type Material, type OpcoesEtiqueta } from "@/lib/codigo-barras/tipos";

const EXEMPLO = "10018063;EMBALAGEM 30 X 40 + 5 ABA ADESIVA X 0,008\n05013293;LINHA 80 100% POLIESTER MILITAR 316 - 2096\n05015004;ETIQUETA AMALFIS M";
const MAX_PREVIA = 12;

type Previa = { material: Material; svg: string | null; erro: string | null };

function gerarPrevia(material: Material, simbologia: OpcoesEtiqueta["simbologia"]): Previa {
  try {
    const svg = toSVG({
      bcid: simbologia,
      text: material.codigo,
      scale: 2,
      ...(simbologia === "code128" || simbologia === "ean13" ? { height: 12 } : {}),
      includetext: false,
      paddingwidth: simbologia === "code128" || simbologia === "ean13" ? 10 : 2,
      paddingheight: simbologia === "code128" || simbologia === "ean13" ? 0 : 2,
    });
    return { material, svg, erro: null };
  } catch (e) {
    return { material, svg: null, erro: e instanceof Error ? e.message : String(e) };
  }
}

export function GeradorCodigoBarras() {
  const [texto, setTexto] = useState("10018063");
  const [opcoes, setOpcoes] = useState<OpcoesEtiqueta>(OPCOES_PADRAO);
  const [gerando, setGerando] = useState(false);
  const [erroServidor, setErroServidor] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const materiais = useMemo(() => lerMateriais(texto), [texto]);
  const total = totalEtiquetas(materiais, opcoes);
  const erroQuantidade = validarQuantidade(materiais, opcoes);

  // Valida todos os códigos (barato) e desenha só os primeiros
  const previas = useMemo(
    () => materiais.map((m, i) => (i < MAX_PREVIA ? gerarPrevia(m, opcoes.simbologia) : null)),
    [materiais, opcoes.simbologia],
  );
  const invalidos = useMemo(
    () =>
      materiais.filter((m, i) => {
        const p = previas[i] ?? gerarPrevia(m, opcoes.simbologia);
        return p.erro !== null;
      }),
    [materiais, previas, opcoes.simbologia],
  );

  const proporcao =
    opcoes.modo === "etiqueta"
      ? opcoes.largura / opcoes.altura
      : (194 / opcoes.colunas) / (281 / opcoes.linhas); // área útil do A4 (margem de 8 mm)

  function atualizar<K extends keyof OpcoesEtiqueta>(chave: K, valor: OpcoesEtiqueta[K]) {
    setOpcoes((o) => ({ ...o, [chave]: valor }));
    setErroServidor(null);
  }

  async function importarCsv(arquivo: File) {
    const conteudo = await arquivo.text();
    setTexto(conteudo);
    setErroServidor(null);
  }

  async function baixarPdf() {
    setGerando(true);
    setErroServidor(null);
    try {
      const resposta = await fetch("/api/codigo-barras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materiais, opcoes }),
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.erro ?? `Erro ${resposta.status} ao gerar o PDF.`);
      }
      const blob = await resposta.blob();
      const nome =
        resposta.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "codigos-de-barras.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErroServidor(e instanceof Error ? e.message : "Falha ao gerar o PDF.");
    } finally {
      setGerando(false);
    }
  }

  const podeGerar = !erroQuantidade && invalidos.length === 0 && !gerando;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card titulo="Materiais" subtitulo="Um código por linha. Para incluir a descrição, use código;descrição.">
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              setErroServidor(null);
            }}
            rows={8}
            spellCheck={false}
            placeholder={EXEMPLO}
            className="w-full resize-y rounded-lg border border-taylo-border bg-taylo-primary-background px-3 py-2.5 font-mono text-sm text-taylo-text placeholder:text-taylo-text-muted/70 focus:border-taylo-secondary focus:outline-none"
            aria-label="Códigos dos materiais"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <BotaoSecundario onClick={() => arquivoRef.current?.click()}>
              <IconFileTypeCsv size={18} stroke={1.6} />
              Importar CSV
            </BotaoSecundario>
            <BotaoSecundario onClick={() => setTexto(EXEMPLO)}>Exemplo</BotaoSecundario>
            {texto && (
              <BotaoSecundario onClick={() => setTexto("")} aria-label="Limpar">
                <IconTrash size={18} stroke={1.6} />
              </BotaoSecundario>
            )}
            <input
              ref={arquivoRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importarCsv(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-3 text-xs text-taylo-text-muted">
            O CSV pode ser a planilha de estoque exportada: são lidas as colunas <strong>Código</strong> e{" "}
            <strong>Descrição</strong>. Zeros à esquerda são mantidos.
          </p>
        </Card>

        <Card titulo="Etiqueta">
          <div className="space-y-4">
            <Campo rotulo="Formato">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Formato">
                {(
                  [
                    ["a4", "Folha A4", "Grade de etiquetas"],
                    ["etiqueta", "Etiqueta térmica", "Uma por página"],
                  ] as const
                ).map(([valor, rotulo, detalhe]) => (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={opcoes.modo === valor}
                    onClick={() => atualizar("modo", valor)}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      opcoes.modo === valor
                        ? "border-taylo-secondary bg-taylo-secondary-soft"
                        : "border-taylo-border bg-white hover:border-taylo-text-muted"
                    }`}
                  >
                    <span className="block font-display text-sm font-medium text-taylo-primary">{rotulo}</span>
                    <span className="block text-xs text-taylo-text-muted">{detalhe}</span>
                  </button>
                ))}
              </div>
            </Campo>

            {opcoes.modo === "etiqueta" ? (
              <div className="grid grid-cols-2 gap-3">
                <CampoNumero rotulo="Largura (mm)" valor={opcoes.largura} min={20} max={210} onChange={(v) => atualizar("largura", v)} />
                <CampoNumero rotulo="Altura (mm)" valor={opcoes.altura} min={10} max={297} onChange={(v) => atualizar("altura", v)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <CampoNumero rotulo="Colunas" valor={opcoes.colunas} min={1} max={6} onChange={(v) => atualizar("colunas", v)} />
                <CampoNumero rotulo="Linhas" valor={opcoes.linhas} min={1} max={15} onChange={(v) => atualizar("linhas", v)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <CampoNumero rotulo="Cópias de cada" valor={opcoes.copias} min={1} max={500} onChange={(v) => atualizar("copias", v)} />
              <label className="block">
                <span className="mb-1.5 block font-display text-xs font-medium text-taylo-primary">Tipo</span>
                <select
                  value={opcoes.simbologia}
                  onChange={(e) => atualizar("simbologia", e.target.value as OpcoesEtiqueta["simbologia"])}
                  className="h-10 w-full rounded-lg border border-taylo-border bg-taylo-primary-background px-3 text-sm focus:border-taylo-secondary focus:outline-none"
                >
                  {SIMBOLOGIAS.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-taylo-text">
              <input
                type="checkbox"
                checked={opcoes.mostrarDescricao}
                onChange={(e) => atualizar("mostrarDescricao", e.target.checked)}
                className="size-4 accent-taylo-secondary"
              />
              Mostrar descrição acima do código
            </label>
          </div>
        </Card>
      </div>

      <Card
        titulo="Pré-visualização"
        subtitulo={
          materiais.length === 0
            ? "Nenhum código informado"
            : `${materiais.length} código(s) · ${total.toLocaleString("pt-BR")} etiqueta(s)` +
              (opcoes.modo === "a4"
                ? ` · ${Math.ceil(total / (opcoes.colunas * opcoes.linhas))} folha(s) A4`
                : ` · ${opcoes.largura} × ${opcoes.altura} mm`)
        }
        acao={
          <button
            type="button"
            onClick={baixarPdf}
            disabled={!podeGerar}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-taylo-secondary px-4 font-display text-sm font-semibold text-white transition-colors hover:bg-taylo-secondary-border disabled:cursor-not-allowed disabled:opacity-50"
          >
            {gerando ? <IconLoader2 size={18} className="animate-spin" /> : <IconDownload size={18} stroke={1.8} />}
            {gerando ? "Gerando…" : "Gerar PDF"}
          </button>
        }
      >
        {(erroQuantidade && materiais.length > 0) || invalidos.length > 0 || erroServidor ? (
          <div className="mb-4 flex gap-2 rounded-lg bg-taylo-danger-soft px-4 py-3 text-sm text-taylo-danger" role="alert">
            <IconAlertTriangle size={18} stroke={1.8} className="mt-0.5 shrink-0" />
            <div>
              {erroServidor ?? (materiais.length > 0 ? erroQuantidade : null)}
              {invalidos.length > 0 && (
                <span>
                  {invalidos.length} código(s) não podem ser gerados como{" "}
                  {SIMBOLOGIAS.find((s) => s.valor === opcoes.simbologia)?.rotulo}:{" "}
                  {invalidos
                    .slice(0, 5)
                    .map((m) => m.codigo)
                    .join(", ")}
                  {invalidos.length > 5 ? "…" : ""}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {materiais.length === 0 ? (
          <div className="grid place-items-center rounded-lg border border-dashed border-taylo-border py-20 text-center text-taylo-text-muted">
            <IconBarcode size={40} stroke={1.2} />
            <p className="mt-2 text-sm">Digite ou importe os códigos para ver as etiquetas.</p>
          </div>
        ) : (
          <>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${opcoes.modo === "a4" ? Math.min(opcoes.colunas, 4) : proporcao >= 1.4 ? 2 : 3}, minmax(0, 1fr))`,
              }}
            >
              {previas.slice(0, MAX_PREVIA).map((p, i) =>
                p ? <EtiquetaPrevia key={`${p.material.codigo}-${i}`} previa={p} proporcao={proporcao} mostrarDescricao={opcoes.mostrarDescricao} /> : null,
              )}
            </div>
            {materiais.length > MAX_PREVIA && (
              <p className="mt-4 text-center text-xs text-taylo-text-muted">
                Mostrando {MAX_PREVIA} de {materiais.length} códigos. O PDF terá todos.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function EtiquetaPrevia({
  previa,
  proporcao,
  mostrarDescricao,
}: {
  previa: Previa;
  proporcao: number;
  mostrarDescricao: boolean;
}) {
  const { material, svg, erro } = previa;
  return (
    <div
      className={`flex flex-col items-center justify-between gap-1 rounded-md border bg-white p-[6%] ${
        erro ? "border-taylo-danger" : "border-taylo-border"
      }`}
      style={{ aspectRatio: proporcao }}
      title={erro ?? material.descricao ?? material.codigo}
    >
      {mostrarDescricao && material.descricao ? (
        <p className="line-clamp-2 w-full text-center text-[10px] leading-tight text-black">{material.descricao}</p>
      ) : null}
      {svg ? (
        // SVG gerado localmente pelo bwip-js a partir do código digitado (só barras, sem texto)
        <div className="etiqueta-barras min-h-0 w-full flex-1" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="grid min-h-0 w-full flex-1 place-items-center text-center text-[10px] text-taylo-danger">
          Código inválido para este tipo
        </div>
      )}
      <p className="font-mono text-xs font-bold tracking-wide text-black">{material.codigo}</p>
    </div>
  );
}

function Card({
  titulo,
  subtitulo,
  acao,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-taylo-border bg-white p-5 shadow-[0_1px_2px_rgba(19,37,57,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-taylo-primary">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-xs text-taylo-text-muted">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block font-display text-xs font-medium text-taylo-primary">{rotulo}</span>
      {children}
    </div>
  );
}

function CampoNumero({
  rotulo,
  valor,
  min,
  max,
  onChange,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-xs font-medium text-taylo-primary">{rotulo}</span>
      <input
        type="number"
        value={valor}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
        className="h-10 w-full rounded-lg border border-taylo-border bg-taylo-primary-background px-3 text-sm focus:border-taylo-secondary focus:outline-none"
      />
    </label>
  );
}

function BotaoSecundario({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-taylo-border bg-white px-3 font-display text-sm text-taylo-primary transition-colors hover:border-taylo-primary-surface hover:bg-taylo-primary-background"
    >
      {children}
    </button>
  );
}
