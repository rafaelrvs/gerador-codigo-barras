import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // pdfkit lê os arquivos de fonte (.afm) do próprio pacote em tempo de execução,
  // e bwip-js/node usa APIs do Node: os dois ficam fora do bundle do servidor.
  serverExternalPackages: ["pdfkit", "bwip-js"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
