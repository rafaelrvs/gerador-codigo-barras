import { lerMateriais, normalizarOpcoes, validarQuantidade } from "@/lib/codigo-barras/entrada";
import { ErroCodigo, gerarPdf } from "@/lib/codigo-barras/pdf";
import type { Material, OpcoesEtiqueta } from "@/lib/codigo-barras/tipos";

function nomeArquivo(materiais: Material[]) {
  return materiais.length === 1
    ? `codigo-barras-${materiais[0].codigo.replace(/[^\w.-]/g, "_")}.pdf`
    : `codigos-de-barras-${materiais.length}-materiais.pdf`;
}

async function responder(materiais: Material[], opcoes: OpcoesEtiqueta, download: boolean) {
  const erro = validarQuantidade(materiais, opcoes);
  if (erro) return Response.json({ erro }, { status: 400 });

  try {
    const pdf = await gerarPdf(materiais, opcoes);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${nomeArquivo(materiais)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    if (e instanceof ErroCodigo) return Response.json({ erro: e.message, codigo: e.codigo }, { status: 422 });
    console.error("[codigo-barras] falha ao gerar PDF", e);
    return Response.json({ erro: "Falha ao gerar o PDF." }, { status: 500 });
  }
}

/**
 * POST /api/codigo-barras
 * Corpo JSON: { "materiais": [{ "codigo": "10018063", "descricao": "..." }], "opcoes": { ... } }
 * ou { "texto": "<CSV ou um código por linha>", "opcoes": { ... } }
 */
export async function POST(request: Request) {
  let corpo: { materiais?: Material[]; texto?: string; opcoes?: Partial<OpcoesEtiqueta> };
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Envie um JSON válido." }, { status: 400 });
  }

  const materiais = Array.isArray(corpo.materiais)
    ? corpo.materiais
        .filter((m) => m && typeof m.codigo === "string" && m.codigo.trim())
        .map((m) => ({
          codigo: m.codigo.trim().replace(/^'/, ""),
          descricao: typeof m.descricao === "string" ? m.descricao : "",
        }))
    : lerMateriais(typeof corpo.texto === "string" ? corpo.texto : "");

  return responder(materiais, normalizarOpcoes(corpo.opcoes), true);
}

/**
 * GET /api/codigo-barras?codigos=10018063,05013293&copias=2&modo=etiqueta&largura=100&altura=50
 * Abre o PDF direto no navegador (bom para link no Taylo/PPCP ou no n8n).
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const materiais = (p.get("codigos") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((codigo) => ({ codigo, descricao: "" }));

  const opcoes = normalizarOpcoes({
    modo: (p.get("modo") as OpcoesEtiqueta["modo"]) ?? undefined,
    largura: p.get("largura") ? Number(p.get("largura")) : undefined,
    altura: p.get("altura") ? Number(p.get("altura")) : undefined,
    colunas: p.get("colunas") ? Number(p.get("colunas")) : undefined,
    linhas: p.get("linhas") ? Number(p.get("linhas")) : undefined,
    copias: p.get("copias") ? Number(p.get("copias")) : undefined,
    simbologia: (p.get("simbologia") as OpcoesEtiqueta["simbologia"]) ?? undefined,
  });

  return responder(materiais, opcoes, p.get("download") === "1");
}
