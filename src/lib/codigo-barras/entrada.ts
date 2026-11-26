import {
  MAX_ETIQUETAS,
  OPCOES_PADRAO,
  SIMBOLOGIAS,
  type Material,
  type OpcoesEtiqueta,
} from "./tipos";

function normalizarCabecalho(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

/** Divide uma linha de CSV respeitando aspas. */
function dividirLinha(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else if (c === '"') aspas = false;
      else atual += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      campos.push(atual);
      atual = "";
    } else atual += c;
  }
  campos.push(atual);
  return campos.map((s) => s.trim());
}

/** Remove o apóstrofo que planilhas usam para manter zeros à esquerda (ex.: '05013293). */
function limparCodigo(codigo: string) {
  return codigo.trim().replace(/^'/, "");
}

/**
 * Lê o texto colado ou o conteúdo de um CSV.
 * - Com cabeçalho "Código" (e opcional "Descrição"): lê essas colunas e ignora as demais
 *   (serve a planilha de estoque exportada do Sheets).
 * - Sem cabeçalho: um material por linha, "codigo" ou "codigo;descrição" (também aceita vírgula ou tab).
 */
export function lerMateriais(texto: string): Material[] {
  const linhas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (linhas.length === 0) return [];

  const primeira = linhas[0];
  const contagem = (c: string) => primeira.split(c).length - 1;
  const sep = [";", "\t", ","].reduce((melhor, c) => (contagem(c) > contagem(melhor) ? c : melhor), ";");

  const cabecalho = dividirLinha(primeira, sep).map(normalizarCabecalho);
  const iCodigo = cabecalho.indexOf("codigo");

  if (iCodigo >= 0) {
    const iDescricao = cabecalho.indexOf("descricao");
    return linhas
      .slice(1)
      .map((l) => {
        const campos = dividirLinha(l, sep);
        return {
          codigo: limparCodigo(campos[iCodigo] ?? ""),
          descricao: iDescricao >= 0 ? (campos[iDescricao] ?? "").trim() : "",
        };
      })
      .filter((m) => m.codigo);
  }

  // Sem cabeçalho: na vírgula só divide se a linha tiver ";" ou tab, porque descrições têm vírgula
  return linhas
    .map((l) => {
      const s = l.includes(";") ? ";" : l.includes("\t") ? "\t" : null;
      if (!s) return { codigo: limparCodigo(l), descricao: "" };
      const [codigo, ...resto] = dividirLinha(l, s);
      return { codigo: limparCodigo(codigo), descricao: resto.join(" ").trim() };
    })
    .filter((m) => m.codigo);
}

function numero(valor: unknown, padrao: number, min: number, max: number) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Valida e completa as opções recebidas pela API. */
export function normalizarOpcoes(entrada: Partial<OpcoesEtiqueta> | undefined): OpcoesEtiqueta {
  const o = entrada ?? {};
  const simbologia = SIMBOLOGIAS.some((s) => s.valor === o.simbologia)
    ? (o.simbologia as OpcoesEtiqueta["simbologia"])
    : OPCOES_PADRAO.simbologia;
  return {
    modo: o.modo === "etiqueta" ? "etiqueta" : "a4",
    largura: numero(o.largura, OPCOES_PADRAO.largura, 20, 210),
    altura: numero(o.altura, OPCOES_PADRAO.altura, 10, 297),
    colunas: numero(o.colunas, OPCOES_PADRAO.colunas, 1, 6),
    linhas: numero(o.linhas, OPCOES_PADRAO.linhas, 1, 15),
    copias: numero(o.copias, OPCOES_PADRAO.copias, 1, 500),
    simbologia,
    mostrarDescricao: o.mostrarDescricao !== false,
  };
}

export function totalEtiquetas(materiais: Material[], opcoes: Pick<OpcoesEtiqueta, "copias">) {
  return materiais.length * opcoes.copias;
}

export function validarQuantidade(materiais: Material[], opcoes: OpcoesEtiqueta): string | null {
  if (materiais.length === 0) return "Informe ao menos um código de material.";
  const total = totalEtiquetas(materiais, opcoes);
  if (total > MAX_ETIQUETAS) {
    return `São ${total.toLocaleString("pt-BR")} etiquetas; o limite por PDF é ${MAX_ETIQUETAS.toLocaleString("pt-BR")}. Divida em mais de um arquivo ou reduza as cópias.`;
  }
  return null;
}
