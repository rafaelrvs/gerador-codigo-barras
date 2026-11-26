# Taylo · Código de barras

App Next.js com a identidade do Taylo para gerar etiquetas com código de barras dos materiais do Sisplan em PDF.

- Digite ou cole os códigos (um por linha; `codigo;descrição` para incluir a descrição) ou importe um CSV.
  A planilha de estoque exportada serve direto: são lidas as colunas **Código** e **Descrição**.
- Zeros à esquerda são mantidos (`05013293`), e o `'` que planilhas colocam na frente é removido.
- Formatos: **Folha A4** (grade configurável, padrão 3 × 8 = 24 por folha) ou **Etiqueta térmica** (uma por página, em mm).
- Tipos: Code 128 (padrão), QR Code, Data Matrix e EAN-13.
- Pré-visualização na hora e aviso de código inválido antes de gerar.

## Rodar

Node.js 20.9 ou superior.

```bash
npm install
npm run dev        # http://localhost:3000
# produção
npm run build && npm start
```

Com Docker (ex.: EC2 atrás do nginx-proxy):

```bash
docker build -t taylo-codigo-barras .
docker run -d -p 3000:3000 --name taylo-codigo-barras taylo-codigo-barras
# com nginx-proxy: acrescente -e VIRTUAL_HOST=... -e VIRTUAL_PORT=3000 e a rede do proxy
```

## API

O PDF é gerado no servidor (`pdfkit` + `bwip-js`), então dá para chamar de outros sistemas (PPCP do Taylo, n8n...).

**GET**: abre o PDF no navegador. Bom para um link ou botão.

```
/api/codigo-barras?codigos=10018063,05013293&copias=2
/api/codigo-barras?codigos=10018063&modo=etiqueta&largura=100&altura=50&download=1
```

Parâmetros: `codigos` (separados por vírgula), `modo` (`a4` | `etiqueta`), `largura`/`altura` (mm), `colunas`/`linhas`, `copias`, `simbologia` (`code128` | `qrcode` | `datamatrix` | `ean13`), `download=1` para forçar o download.

**POST** com JSON, com descrição:

```bash
curl -X POST http://localhost:3000/api/codigo-barras \
  -H "Content-Type: application/json" \
  -d '{
    "materiais": [
      { "codigo": "10018063", "descricao": "EMBALAGEM 30 X 40 + 5 ABA ADESIVA" },
      { "codigo": "05013293", "descricao": "LINHA 80 100% POLIESTER MILITAR" }
    ],
    "opcoes": { "modo": "etiqueta", "largura": 100, "altura": 50, "copias": 2 }
  }' -o etiquetas.pdf
```

Também aceita `{ "texto": "<conteúdo do CSV ou um código por linha>", "opcoes": {...} }`.

Respostas de erro (JSON `{ "erro": "..." }`): `400` sem códigos ou acima de 5.000 etiquetas, `422` código inválido para a simbologia (traz o `codigo`).

## Estrutura

```
src/
  app/
    page.tsx                     tela (header no padrão do Taylo)
    layout.tsx                   fontes Poppins/Roboto self-hosted
    globals.css                  tokens taylo-* no @theme (Tailwind v4)
    api/codigo-barras/route.ts   GET/POST que devolvem o PDF
    fonts/                       arquivos .woff2 (licença OFL)
  components/
    taylo-shell.tsx              sidebar navy do Taylo
    gerador-codigo-barras.tsx    formulário, pré-visualização e download
  lib/codigo-barras/
    tipos.ts                     tipos e opções padrão
    entrada.ts                   leitura de CSV/texto e validação
    pdf.ts                       montagem do PDF (só servidor)
```

Para levar para dentro do Taylo, copie `src/lib/codigo-barras`, `src/components/gerador-codigo-barras.tsx` e a rota `api/codigo-barras`. Os tokens em `globals.css` já usam a mesma nomenclatura `taylo-*` do `@theme` do Taylo, e `next.config.ts` precisa de `serverExternalPackages: ["pdfkit", "bwip-js"]`.

## Observações

- As barras levam zona de silêncio de 10 módulos nas laterais; sem ela muitos leitores não leem.
- O limite por PDF é 5.000 etiquetas (`MAX_ETIQUETAS` em `tipos.ts`). A planilha de estoque inteira (2.970 materiais) gera 124 folhas A4 em poucos segundos.
- A sidebar é só moldura visual: os itens não navegam.
