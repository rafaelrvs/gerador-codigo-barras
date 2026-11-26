export type Material = {
  codigo: string;
  descricao?: string;
};

export type Simbologia = "code128" | "qrcode" | "datamatrix" | "ean13";

export type OpcoesEtiqueta = {
  /** a4 = grade de etiquetas numa folha A4; etiqueta = uma por página (impressora térmica) */
  modo: "a4" | "etiqueta";
  /** mm, modo etiqueta */
  largura: number;
  /** mm, modo etiqueta */
  altura: number;
  /** grade do modo a4 */
  colunas: number;
  linhas: number;
  copias: number;
  simbologia: Simbologia;
  mostrarDescricao: boolean;
};

export const OPCOES_PADRAO: OpcoesEtiqueta = {
  modo: "a4",
  largura: 100,
  altura: 50,
  colunas: 3,
  linhas: 8,
  copias: 1,
  simbologia: "code128",
  mostrarDescricao: true,
};

export const SIMBOLOGIAS: { valor: Simbologia; rotulo: string }[] = [
  { valor: "code128", rotulo: "Code 128 (padrão)" },
  { valor: "qrcode", rotulo: "QR Code" },
  { valor: "datamatrix", rotulo: "Data Matrix" },
  { valor: "ean13", rotulo: "EAN-13 (só 12/13 dígitos)" },
];

/** Limite de etiquetas por PDF, para não travar o servidor. */
export const MAX_ETIQUETAS = 5000;
