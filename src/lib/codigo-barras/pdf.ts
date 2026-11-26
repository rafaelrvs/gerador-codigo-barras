import "server-only";
import bwipjs from "bwip-js/node";
import PDFDocument from "pdfkit";
import type { Material, OpcoesEtiqueta } from "./tipos";

const MM = 72 / 25.4; // 1 mm em pontos PDF
const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM_A4 = 8 * MM;

export class ErroCodigo extends Error {
  constructor(public codigo: string, mensagem: string) {
    super(`Não foi possível gerar o código "${codigo}": ${mensagem}`);
  }
}

async function imagemBarras(codigo: string, simbologia: OpcoesEtiqueta["simbologia"]) {
  try {
    return await bwipjs.toBuffer({
      bcid: simbologia,
      text: codigo,
      scale: 4, // resolução alta para impressão
      ...(simbologia === "code128" || simbologia === "ean13" ? { height: 12 } : {}),
      includetext: false, // o número legível é escrito pelo PDF, com fonte maior
      // zona de silêncio de 10 módulos nas laterais (exigida pelos leitores de código linear)
      paddingwidth: simbologia === "code128" || simbologia === "ean13" ? 10 : 2,
      paddingheight: simbologia === "code128" || simbologia === "ean13" ? 0 : 2,
    });
  } catch (e) {
    throw new ErroCodigo(codigo, e instanceof Error ? e.message : String(e));
  }
}

function desenharEtiqueta(
  doc: PDFKit.PDFDocument,
  img: Buffer,
  material: Material,
  mostrarDescricao: boolean,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const margem = Math.min(w, h) * 0.06;
  const descricao = mostrarDescricao ? (material.descricao ?? "").trim() : "";
  const fonteCodigo = Math.max(7, Math.min(14, h * 0.11));
  const fonteDescricao = descricao ? Math.max(6, Math.min(10, h * 0.085)) : 0;
  const larguraUtil = w - 2 * margem;
  let topo = y + margem;

  if (descricao) {
    doc.font("Helvetica").fontSize(fonteDescricao).fillColor("#000000").text(descricao, x + margem, topo, {
      width: larguraUtil,
      align: "center",
      height: fonteDescricao * 2.4,
      ellipsis: true,
    });
    topo += fonteDescricao * 2.6;
  }

  const alturaBarras = Math.max(10, y + h - margem - fonteCodigo * 1.9 - topo);
  doc.image(img, x + margem, topo, {
    fit: [larguraUtil, alturaBarras],
    align: "center",
    valign: "center",
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(fonteCodigo)
    .fillColor("#000000")
    .text(material.codigo, x + margem, y + h - margem - fonteCodigo * 1.2, {
      width: larguraUtil,
      align: "center",
      lineBreak: false,
    });
}

/** Gera o PDF das etiquetas e devolve os bytes. */
export async function gerarPdf(materiais: Material[], opcoes: OpcoesEtiqueta): Promise<Buffer> {
  // Cada código vira imagem uma vez só, mesmo com várias cópias
  const imagens = new Map<string, Buffer>();
  for (const m of materiais) {
    if (!imagens.has(m.codigo)) imagens.set(m.codigo, await imagemBarras(m.codigo, opcoes.simbologia));
  }
  const etiquetas = materiais.flatMap((m) => Array.from({ length: opcoes.copias }, () => m));

  const doc =
    opcoes.modo === "etiqueta"
      ? new PDFDocument({ size: [opcoes.largura * MM, opcoes.altura * MM], margin: 0, autoFirstPage: false })
      : new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false });
  doc.info.Title = "Códigos de barras - materiais";
  doc.info.Creator = "Taylo";

  const partes: Buffer[] = [];
  doc.on("data", (p: Buffer) => partes.push(p));
  const fim = new Promise<Buffer>((ok, erro) => {
    doc.on("end", () => ok(Buffer.concat(partes)));
    doc.on("error", erro);
  });

  if (opcoes.modo === "etiqueta") {
    const w = opcoes.largura * MM;
    const h = opcoes.altura * MM;
    for (const m of etiquetas) {
      doc.addPage();
      desenharEtiqueta(doc, imagens.get(m.codigo)!, m, opcoes.mostrarDescricao, 0, 0, w, h);
    }
  } else {
    const w = (A4.largura - 2 * MARGEM_A4) / opcoes.colunas;
    const h = (A4.altura - 2 * MARGEM_A4) / opcoes.linhas;
    const porPagina = opcoes.colunas * opcoes.linhas;
    etiquetas.forEach((m, i) => {
      const pos = i % porPagina;
      if (pos === 0) doc.addPage();
      const x = MARGEM_A4 + (pos % opcoes.colunas) * w;
      const y = MARGEM_A4 + Math.floor(pos / opcoes.colunas) * h;
      // contorno leve para recorte
      doc.save().lineWidth(0.3).strokeColor("#cccccc").rect(x, y, w, h).stroke().restore();
      desenharEtiqueta(doc, imagens.get(m.codigo)!, m, opcoes.mostrarDescricao, x, y, w, h);
    });
  }

  doc.end();
  return fim;
}
