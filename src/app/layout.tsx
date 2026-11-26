import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fontes do Taylo self-hosted (subconjunto latin, cobre os acentos do português)
const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  src: [
    { path: "./fonts/poppins-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/poppins-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/poppins-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/poppins-latin-700-normal.woff2", weight: "700" },
  ],
});

const roboto = localFont({
  variable: "--font-roboto",
  display: "swap",
  src: [
    { path: "./fonts/roboto-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/roboto-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/roboto-latin-700-normal.woff2", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "Código de barras · Taylo",
  description: "Gere etiquetas com código de barras dos materiais do Sisplan em PDF.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${roboto.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
